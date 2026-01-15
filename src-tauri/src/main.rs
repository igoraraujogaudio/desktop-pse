// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod biometric_sdk;
mod biometric_service;
mod sdk_manager;

use tauri::{AppHandle, Manager};

/// Comando para executar o instalador do driver do leitor biométrico
#[tauri::command]
fn install_biometric_driver(app: AppHandle) -> Result<(), String> {
    use tauri::Manager;
    
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Erro ao obter resource_dir: {e}"))?;

    // Procurar pelo arquivo .inf do driver
    let inf_path = resource_dir.join("controlidbio.inf");

    if !inf_path.exists() {
        log::warn!("Arquivo INF não encontrado em {:?}, tentando caminhos alternativos...", inf_path);
        
        // Tentar múltiplos caminhos alternativos para desenvolvimento
        let possible_paths = vec![
            // Caminho relativo ao diretório atual
            std::env::current_dir()
                .ok()
                .map(|p| p.join("src-tauri").join("resources").join("controlidbio.inf")),
            // Caminho relativo ao executável
            std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|p| p.to_path_buf()))
                .map(|p| p.join("..").join("..").join("src-tauri").join("resources").join("controlidbio.inf")),
            // Caminho absoluto conhecido
            Some(std::path::PathBuf::from("c:\\Dev\\app.pse\\almoxarifado-desktop\\src-tauri\\resources\\controlidbio.inf")),
        ];
        
        for possible_path in possible_paths.into_iter().flatten() {
            if possible_path.exists() {
                log::info!("Arquivo INF encontrado em: {:?}", possible_path);
                install_driver_with_pnputil(&possible_path)?;
                return Ok(());
            } else {
                log::debug!("Caminho não existe: {:?}", possible_path);
            }
        }
        
        return Err(format!(
            "Arquivo INF do driver não encontrado. Tentou:\n- {:?}\n- src-tauri/resources/controlidbio.inf\nVerifique se o arquivo existe.",
            inf_path
        ));
    }

    install_driver_with_pnputil(&inf_path)?;
    Ok(())
}

/// Instala o driver usando pnputil com elevação de privilégios (Windows)
#[cfg(windows)]
fn install_driver_with_pnputil(inf_path: &std::path::Path) -> Result<(), String> {
    let inf_str = inf_path.to_string_lossy().to_string();
    
    log::info!("Instalando driver com pnputil: {}", inf_str);
    
    // Criar um script temporário para executar pnputil
    let temp_dir = std::env::temp_dir();
    let script_path = temp_dir.join("install_idbio_driver.bat");
    
    let script_content = format!(
        "@echo off\r\necho Instalando driver iDBio...\r\npnputil.exe /add-driver \"{}\" /install\r\nif %ERRORLEVEL% EQU 0 (\r\n    echo.\r\n    echo Driver instalado com sucesso!\r\n) else (\r\n    echo.\r\n    echo Erro ao instalar driver. Codigo: %ERRORLEVEL%\r\n)\r\necho.\r\npause\r\n",
        inf_str
    );
    
    std::fs::write(&script_path, script_content)
        .map_err(|e| format!("Erro ao criar script de instalação: {}", e))?;
    
    log::info!("Script criado em: {:?}", script_path);
    
    // Executar o script com elevação usando PowerShell Start-Process
    let script_str = script_path.to_string_lossy().to_string();
    let ps_command = format!(
        "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c',\"{}\" -Verb RunAs",
        script_str
    );
    
    std::process::Command::new("powershell")
        .args(&["-WindowStyle", "Hidden", "-Command", &ps_command])
        .spawn()
        .map_err(|e| format!("Erro ao executar instalador do driver: {}", e))?;

    log::info!("Instalador do driver iniciado. Aguarde o prompt UAC e a janela de instalação.");
    Ok(())
}

/// Instala o driver (não-Windows - fallback)
#[cfg(not(windows))]
fn install_driver_with_pnputil(inf_path: &std::path::Path) -> Result<(), String> {
    Err("Instalação de driver não suportada nesta plataforma".to_string())
}

fn main() {
    // Load .env file (try multiple paths)
    let current_dir = std::env::current_dir().unwrap_or_default();
    println!("CWD: {:?}", current_dir);
    
    if dotenv::dotenv().is_err() {
        println!("dotenv() failed to find .env in CWD or parents.");
        
        // Try explicitly in the parent dir (project root) if we are in src-tauri
        let parent_env = std::path::Path::new("..").join(".env");
        if parent_env.exists() {
             println!("Found .env in parent: {:?}", parent_env);
             if let Err(e) = dotenv::from_path(&parent_env) {
                 println!("Failed to load ../.env: {}", e);
             } else {
                 println!("Loaded ../.env successfully.");
             }
        } else {
            // Try absolute path based on CWD if needed, or check normal .env
            let root_env = std::path::Path::new(".env");
            if root_env.exists() {
                 println!("Found .env in CWD (manual check).");
            } else {
                 println!(".env NOT found in CWD or parent.");
            }
        }
    } else {
        println!("dotenv loaded successfully.");
    }
    
    // Validar se SUPABASE_URL carregou
    match std::env::var("SUPABASE_URL") {
        Ok(val) => println!("SUPABASE_URL loaded: {}...", &val.chars().take(10).collect::<String>()),
        Err(_) => println!("SUPABASE_URL NOT FOUND in env vars after dotenv check."),
    }

    env_logger::init();
    
    #[cfg(feature = "biometric")]
    log::info!("BIOMETRIC FEATURE: ENABLED ✅");
    #[cfg(not(feature = "biometric"))]
    log::error!("BIOMETRIC FEATURE: DISABLED ❌ (Check Cargo.toml)");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            biometric_service::validate_or_enroll_fingerprint,
            install_biometric_driver,
            sdk_manager::check_sdk_status,
            sdk_manager::sync_sdk_files
        ])
        .setup(|app| {
            // Verificar status do SDK na inicialização
            let status = sdk_manager::get_sdk_status(Some(&app.handle()));
            
            if !status.dll_found {
                log::warn!("DLL do SDK não encontrada. Tentando sincronizar...");
                match sdk_manager::sync_sdk_dll(&app.handle()) {
                    Ok(path) => log::info!("SDK sincronizado com sucesso: {:?}", path),
                    Err(e) => log::error!("Erro ao sincronizar SDK: {}", e),
                }
            }
            
            if !status.driver_installed {
                log::warn!("Driver iDBio não detectado. O usuário precisará instalá-lo manualmente.");
            }
            
            // A segunda janela (employee) é configurada via tauri.conf.json
            // Tentar mover a janela 'employee' para o segundo monitor, se existir
            if let Some(employee_window) = app.get_webview_window("employee") {
                // Force show regardless of monitor count for debugging
                if let Err(e) = employee_window.show() {
                     log::error!("Erro ao mostrar janela employee: {}", e);
                }

                if let Ok(monitors) = employee_window.available_monitors() {
                    log::info!("Monitores detectados: {}", monitors.len());
                    for (i, m) in monitors.iter().enumerate() {
                        log::info!("Monitor {}: Pos {:?} Size {:?}", i, m.position(), m.size());
                    }

                    if monitors.len() > 1 {
                        // Assumindo que o segundo monitor é o que queremos (índice 1)
                        let target_monitor = &monitors[1];
                        let pos = target_monitor.position();
                        
                        log::info!("Movendo janela 'employee' para o segundo monitor em: {:?} (Tamanho: {:?})", pos, target_monitor.size());
                        
                        // Mover a janela
                        if let Err(e) = employee_window.set_position(*pos) {
                            log::error!("Erro ao mover janela employee: {}", e);
                        }
                        
                        // Fullscreen (igual F11)
                        if let Err(e) = employee_window.set_fullscreen(true) {
                             log::error!("Erro ao colocar janela employee em fullscreen: {}", e);
                        }
                        
                        // Garantir foco
                         if let Err(e) = employee_window.set_focus() {
                             log::error!("Erro ao focar janela employee: {}", e);
                        }

                    } else {
                        log::warn!("Apenas 1 monitor detectado. Mantendo janela 'employee' no principal.");
                    }
                } else {
                   log::error!("Erro ao listar monitores.");
                }
            } else {
                log::warn!("Janela 'employee' não encontrada na inicialização.");
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
            }
        });
}
