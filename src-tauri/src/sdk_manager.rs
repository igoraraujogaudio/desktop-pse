use serde::Serialize;
use std::path::PathBuf;
use tauri::AppHandle;

#[derive(Serialize, Clone)]
pub struct SdkStatus {
    pub dll_found: bool,
    pub dll_path: Option<String>,
    pub driver_installed: bool,
    pub sdk_ready: bool,
    pub error_message: Option<String>,
}

/// Verifica se a DLL libcidbio.dll está acessível
pub fn check_dll_exists() -> (bool, Option<PathBuf>) {
    // Verificar no diretório atual (onde o executável está)
    let current_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()));

    if let Some(dir) = current_dir {
        let dll_path = dir.join("libcidbio.dll");
        if dll_path.exists() {
            return (true, Some(dll_path));
        }
    }

    // Verificar no PATH do sistema
    if let Ok(path_var) = std::env::var("PATH") {
        for path in std::env::split_paths(&path_var) {
            let dll_path = path.join("libcidbio.dll");
            if dll_path.exists() {
                return (true, Some(dll_path));
            }
        }
    }

    (false, None)
}

/// Verifica se o driver iDBio está instalado no Windows
/// Procura por drivers instalados usando pnputil
#[cfg(target_os = "windows")]
pub fn check_driver_installed() -> bool {
    // Método 1: Verificar usando pnputil para listar drivers instalados
    if let Ok(output) = std::process::Command::new("pnputil")
        .args(&["/enum-drivers"])
        .output()
    {
        // Usar lossy conversion para evitar erro se o terminal Windows usar encoding não-UTF8 (ex: CP850)
        let stdout = String::from_utf8_lossy(&output.stdout);
        
        // Procurar por strings exatas que o usuário relatou
        if stdout.contains("Control iD") 
            || stdout.contains("iDBio")
            || stdout.contains("controlidbio") {
            log::info!("Driver iDBio detectado via pnputil: {}", stdout.lines().find(|l| l.contains("Control iD")).unwrap_or("Encontrado algo"));
            return true;
        }
    }
    
    // Método 2: Verificar no registro do Windows (fallback)
    use winreg::enums::*;
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    
    // Procurar por serviços relacionados ao iDBio
    let services_path = r"SYSTEM\CurrentControlSet\Services";
    if let Ok(services) = hklm.open_subkey(services_path) {
        for service_name in &["controlidbio", "controlid", "ControliDBio", "ControlID"] {
            if services.open_subkey(service_name).is_ok() {
                log::info!("Driver iDBio detectado via registro (serviço: {})", service_name);
                return true;
            }
        }
    }

    // Verificar em HKEY_LOCAL_MACHINE\SOFTWARE\ControlID
    let software_path = r"SOFTWARE\ControlID";
    if hklm.open_subkey(software_path).is_ok() {
        log::info!("Driver iDBio detectado via registro (SOFTWARE)");
        return true;
    }

    // Verificar em HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\ControlID
    let software_wow_path = r"SOFTWARE\WOW6432Node\ControlID";
    if hklm.open_subkey(software_wow_path).is_ok() {
        log::info!("Driver iDBio detectado via registro (WOW6432Node)");
        return true;
    }

    log::warn!("Driver iDBio não detectado");
    false
}


#[cfg(not(target_os = "windows"))]
pub fn check_driver_installed() -> bool {
    // Em sistemas não-Windows, assumir que não precisa de driver
    true
}

/// Copia a DLL do SDK bundled para o diretório do aplicativo
pub fn sync_sdk_dll(app: &AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;
    
    // Obter o diretório de recursos do app
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Erro ao obter resource_dir: {}", e))?;

    // Procurar a DLL em resources/ primeiro
    let source_dll = resource_dir.join("libcidbio.dll");
    
    if !source_dll.exists() {
        return Err(format!(
            "DLL do SDK não encontrada em: {:?}",
            source_dll
        ));
    }

    // Obter o diretório do executável
    let exe_dir = std::env::current_exe()
        .map_err(|e| format!("Erro ao obter caminho do executável: {}", e))?
        .parent()
        .ok_or("Erro ao obter diretório do executável")?
        .to_path_buf();

    let dest_dll = exe_dir.join("libcidbio.dll");

    // Copiar a DLL
    std::fs::copy(&source_dll, &dest_dll)
        .map_err(|e| format!("Erro ao copiar DLL: {}", e))?;

    log::info!("DLL copiada com sucesso para: {:?}", dest_dll);
    Ok(dest_dll)
}

/// Retorna o status completo do SDK
pub fn get_sdk_status(_app: Option<&AppHandle>) -> SdkStatus {
    let (dll_found, dll_path) = check_dll_exists();
    let driver_installed = check_driver_installed();
    
    let dll_path_str = dll_path.as_ref().map(|p| p.to_string_lossy().to_string());
    
    let sdk_ready = dll_found && driver_installed;
    
    let error_message = if !sdk_ready {
        let mut errors = Vec::new();
        if !dll_found {
            errors.push("DLL libcidbio.dll não encontrada");
        }
        if !driver_installed {
            errors.push("Driver iDBio não instalado");
        }
        Some(errors.join("; "))
    } else {
        None
    };

    SdkStatus {
        dll_found,
        dll_path: dll_path_str,
        driver_installed,
        sdk_ready,
        error_message,
    }
}

/// Comando Tauri: Verifica o status do SDK
#[tauri::command]
pub fn check_sdk_status(app: AppHandle) -> Result<SdkStatus, String> {
    Ok(get_sdk_status(Some(&app)))
}

/// Comando Tauri: Sincroniza os arquivos do SDK
#[tauri::command]
pub fn sync_sdk_files(app: AppHandle) -> Result<SdkStatus, String> {
    // Tentar copiar a DLL
    match sync_sdk_dll(&app) {
        Ok(path) => {
            log::info!("SDK sincronizado com sucesso: {:?}", path);
        }
        Err(e) => {
            log::warn!("Erro ao sincronizar SDK: {}", e);
            return Err(e);
        }
    }

    // Retornar status atualizado
    Ok(get_sdk_status(Some(&app)))
}
