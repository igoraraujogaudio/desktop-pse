use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int, c_uchar, c_uint};

#[cfg(feature = "biometric")]
/// ATENÇÃO:
/// - A DLL libcidbio.dll será carregada dinamicamente pelo Windows em runtime
/// - Os nomes das funções (`CIDBIO_*`) batem com o `cidbiolib.h`.
/// - Usando extern "system" que é stdcall em win32 e C em win64
#[link(name = "libcidbio", kind = "raw-dylib")]
extern "system" {
    fn CIDBIO_SetSerialCommPort(port: *const c_char) -> c_int;
    fn CIDBIO_Init() -> c_int;
    fn CIDBIO_Terminate() -> c_int;

    fn CIDBIO_CaptureImageAndTemplate(
        t: *mut *mut c_char,
        image_buf: *mut *mut c_uchar,
        width: *mut c_uint,
        height: *mut c_uint,
        quality: *mut c_int,
    ) -> c_int;

    /// Função de comparação de templates (cidbiolib.h: CIDBIO_MatchTemplates)
    fn CIDBIO_MatchTemplates(
        stored_template: *const c_char,
        live_template: *const c_char,
        score: *mut c_int,
    ) -> c_int;

    /// Free helpers (cidbiolib.h)
    fn CIDBIO_FreeByteArray(array: *mut c_uchar) -> c_int;
    fn CIDBIO_FreeString(array: *mut c_char) -> c_int;
}

/// Mapeia o score bruto do SDK (0-20000) para porcentagem 0-100.
pub fn score_to_percent(score: i32) -> i32 {
    (((score as f64) / 20000.0) * 100.0).round() as i32
}

#[cfg(all(feature = "biometric", target_os = "windows"))]
/// Busca o nome amigável (Friendly Name) de um dispositivo no registro do Windows
fn get_device_friendly_name(port_name: &str) -> Option<String> {
    use winreg::enums::*;
    use winreg::RegKey;
    
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let enum_path = r"SYSTEM\CurrentControlSet\Enum";
    
    log::debug!("Buscando nome amigável para porta {}", port_name);
    
    if let Ok(enum_key) = hklm.open_subkey(enum_path) {
        // Percorrer todas as classes de dispositivos
        for class_name in enum_key.enum_keys().filter_map(|x| x.ok()) {
            let class_path = format!("{}\\{}", enum_path, class_name);
            
            if let Ok(class_key) = hklm.open_subkey(&class_path) {
                // Percorrer todos os dispositivos nesta classe
                for device_id in class_key.enum_keys().filter_map(|x| x.ok()) {
                    let device_full_path = format!("{}\\{}", class_path, device_id);
                    
                    if let Ok(device_key) = hklm.open_subkey(&device_full_path) {
                        // Percorrer instâncias do dispositivo
                        for instance_id in device_key.enum_keys().filter_map(|x| x.ok()) {
                            let instance_path = format!("{}\\{}", device_full_path, instance_id);
                            
                            if let Ok(instance_key) = hklm.open_subkey(&instance_path) {
                                // Verificar Device Parameters para PortName
                                let params_path = format!("{}\\Device Parameters", instance_path);
                                if let Ok(params_key) = hklm.open_subkey(&params_path) {
                                    if let Ok(device_port) = params_key.get_value::<String, _>("PortName") {
                                        // Se a porta bate, buscar o FriendlyName
                                        if device_port == port_name {
                                            if let Ok(friendly_name) = instance_key.get_value::<String, _>("FriendlyName") {
                                                log::debug!("Nome amigável encontrado: {} -> {}", port_name, friendly_name);
                                                return Some(friendly_name);
                                            }
                                            // Se não tem FriendlyName, tentar DeviceDesc
                                            if let Ok(device_desc) = instance_key.get_value::<String, _>("DeviceDesc") {
                                                log::debug!("DeviceDesc encontrado: {} -> {}", port_name, device_desc);
                                                return Some(device_desc);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    log::debug!("Nome amigável não encontrado para porta {}", port_name);
    None
}

#[cfg(all(feature = "biometric", target_os = "windows"))]
/// Detecta automaticamente a porta COM do leitor biométrico
/// Busca no registro do Windows por dispositivos COM e identifica o leitor pelo nome amigável
fn detect_biometric_port() -> Option<String> {
    use winreg::enums::*;
    use winreg::RegKey;
    
    log::info!("🔍 Detectando porta COM do leitor biométrico via registro do Windows...");
    log::info!("💡 Certifique-se de que o driver iDBio está instalado e o leitor está conectado");
    
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    
    // Buscar portas COM e seus nomes amigáveis
    let mut com_devices: Vec<(String, String, String)> = Vec::new(); // (device_path, port, friendly_name)
    
    // 1. Listar todas as portas COM disponíveis
    if let Ok(serialcomm) = hklm.open_subkey(r"HARDWARE\DEVICEMAP\SERIALCOMM") {
        for (device_path, value) in serialcomm.enum_values().filter_map(|x| x.ok()) {
            let port = value.to_string();
            
            // 2. Tentar buscar o nome amigável (Friendly Name) do dispositivo
            let friendly_name = get_device_friendly_name(&port);
            
            log::info!("📋 Porta: {} | Dispositivo: {} | Nome: {}", 
                port, device_path, friendly_name.as_deref().unwrap_or("(desconhecido)"));
            
            com_devices.push((
                device_path.clone(), 
                port, 
                friendly_name.unwrap_or_else(|| device_path.clone())
            ));
        }
    }
    
    if com_devices.is_empty() {
        log::error!("❌ Nenhuma porta COM encontrada no sistema");
        return None;
    }
    
    // 3. Procurar por dispositivos que contenham palavras-chave no nome amigável
    let keywords = ["idbio", "fingerprint", "biometric", "digital", "nitgen", "suprema"];
    
    for (device_path, port, friendly_name) in &com_devices {
        let name_lower = friendly_name.to_lowercase();
        
        for keyword in &keywords {
            if name_lower.contains(keyword) {
                log::info!("✅✅✅ LEITOR BIOMÉTRICO IDENTIFICADO ✅✅✅");
                log::info!("📍 Nome do dispositivo: {}", friendly_name);
                log::info!("🔌 Porta: {}", port);
                log::info!("🔗 Caminho: {}", device_path);
                return Some(port.clone());
            }
        }
    }
    
    // Se não encontrou por palavra-chave, tentar validar cada porta COM encontrada
    log::warn!("⚠️ Não foi possível identificar o leitor pelo nome do dispositivo");
    log::info!("🔍 Testando portas COM encontradas no sistema...");
    
    unsafe {
        // Terminar SDK anterior
        let _ = CIDBIO_Terminate();
        std::thread::sleep(std::time::Duration::from_millis(500));
        
        for (device_path, port, friendly_name) in &com_devices {
            log::info!("🔌 Testando {} ({})...", port, friendly_name);
            
            let c_port = match CString::new(port.as_str()) {
                Ok(p) => p,
                Err(_) => continue,
            };
            
            let set_result = CIDBIO_SetSerialCommPort(c_port.as_ptr());
            if set_result != 0 {
                log::debug!("   ❌ SetSerialCommPort falhou (código {})", set_result);
                continue;
            }
            
            std::thread::sleep(std::time::Duration::from_millis(300));
            let init_result = CIDBIO_Init();
            
            if init_result == 0 || init_result == 1 {
                log::info!("✅✅✅ LEITOR BIOMÉTRICO DETECTADO EM {} ✅✅✅", port);
                log::info!("📍 Nome: {}", friendly_name);
                log::info!("🔗 Caminho: {}", device_path);
                let _ = CIDBIO_Terminate();
                std::thread::sleep(std::time::Duration::from_millis(500));
                return Some(port.clone());
            }
            
            let _ = CIDBIO_Terminate();
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
    }
    
    log::error!("❌ Nenhum leitor biométrico detectado");
    log::error!("💡 Verifique:");
    log::error!("   1. O driver iDBio está instalado?");
    log::error!("   2. O leitor está conectado na porta USB?");
    log::error!("   3. O LED do leitor está aceso (azul)?");
    None
}

#[cfg(all(feature = "biometric", not(target_os = "windows")))]
fn detect_biometric_port() -> Option<String> {
    log::error!("Detecção automática de porta disponível apenas no Windows");
    None
}

#[cfg(feature = "biometric")]
/// Comando Tauri: Reinicializa o SDK biométrico
/// Útil quando o sensor é reconectado ou muda de porta USB
#[tauri::command]
pub fn reinitialize_biometric_sdk() -> Result<String, String> {
    log::info!("🔄 Reinicializando SDK biométrico...");
    
    unsafe {
        // Terminar SDK atual
        let _ = CIDBIO_Terminate();
        std::thread::sleep(std::time::Duration::from_millis(500));
    }
    
    // Inicializar novamente (vai detectar a porta automaticamente)
    let port = std::env::var("IDBIO_PORT").ok();
    init_sdk(port.as_deref())?;
    
    Ok("SDK biométrico reinicializado com sucesso".to_string())
}

#[cfg(not(feature = "biometric"))]
#[tauri::command]
pub fn reinitialize_biometric_sdk() -> Result<String, String> {
    Err("Funcionalidade biométrica não está habilitada nesta build".to_string())
}

#[cfg(feature = "biometric")]
/// Comando Tauri: Testa a conexão com o leitor biométrico
/// Retorna informações detalhadas sobre o status da conexão
#[tauri::command]
pub fn test_biometric_connection() -> Result<String, String> {
    use serde_json::json;
    
    log::info!("🔬 Testando conexão com o leitor biométrico...");
    
    // Verificar se consegue detectar a porta
    let detected_port = detect_biometric_port();
    
    if detected_port.is_none() {
        return Err("Não foi possível detectar o leitor em nenhuma porta COM1-COM20. Verifique se o driver está instalado e o leitor está conectado.".to_string());
    }
    
    let port = detected_port.unwrap();
    log::info!("✅ Porta detectada: {}", port);
    
    // Tentar inicializar
    match init_sdk(Some(&port)) {
        Ok(_) => {
            log::info!("✅ SDK inicializado com sucesso");
            
            // Aguardar um pouco mais para o hardware estabilizar
            log::info!("⏳ Aguardando estabilização do hardware...");
            std::thread::sleep(std::time::Duration::from_millis(1000));
            
            // Tentar uma captura de teste (sem salvar)
            log::info!("🔬 Testando captura (posicione o dedo no leitor)...");
            match capture_with_sdk() {
                Ok((_, quality)) => {
                    let result = json!({
                        "success": true,
                        "port": port,
                        "quality": quality,
                        "message": format!("Leitor funcionando corretamente na porta {}. Qualidade da captura: {}%", port, quality)
                    });
                    Ok(result.to_string())
                },
                Err(e) => {
                    if e.contains("código de erro -1") || e.contains("código: -1") {
                        Err(format!(
                            "⚠️ PROBLEMA DE DRIVER DETECTADO\n\n\
                            ✅ Porta detectada: {}\n\
                            ✅ SDK inicializado com sucesso\n\
                            ❌ Falha ao capturar digital (erro -1)\n\n\
                            Isso confirma que:\n\
                            - O leitor está conectado na porta correta ({})\n\
                            - A comunicação serial funciona\n\
                            - MAS o DRIVER não está instalado/funcionando\n\n\
                            SOLUÇÃO:\n\
                            1. Clique no botão '💾 Instalar Driver'\n\
                            2. Siga as instruções do instalador (requer admin)\n\
                            3. Reinicie o aplicativo após instalar\n\
                            4. Teste novamente\n\n\
                            Detalhes técnicos: {}", 
                            port, port, e
                        ))
                    } else {
                        Err(format!("SDK inicializado na porta {} mas falha na captura: {}. Tente posicionar o dedo no leitor.", port, e))
                    }
                }
            }
        },
        Err(e) => {
            Err(format!("Porta {} detectada mas falha na inicialização: {}", port, e))
        }
    }
}

#[cfg(not(feature = "biometric"))]
#[tauri::command]
pub fn test_biometric_connection() -> Result<String, String> {
    Err("Funcionalidade biométrica não está habilitada nesta build".to_string())
}

#[cfg(all(feature = "biometric", target_os = "windows"))]
/// Lista todas as portas COM disponíveis no sistema Windows
#[tauri::command]
pub fn list_com_ports() -> Result<String, String> {
    use serde_json::json;
    use std::process::Command;
    
    log::info!("📋 Listando portas COM disponíveis no sistema...");
    
    // Usar comando mode do Windows para listar portas COM
    let output = Command::new("cmd")
        .args(&["/C", "mode"])
        .output()
        .map_err(|e| format!("Erro ao executar comando mode: {}", e))?;
    
    let output_str = String::from_utf8_lossy(&output.stdout);
    
    // Extrair portas COM da saída
    let mut com_ports = Vec::new();
    for line in output_str.lines() {
        if line.contains("COM") {
            com_ports.push(line.trim().to_string());
        }
    }
    
    // Também tentar via registro do Windows
    use winreg::enums::*;
    use winreg::RegKey;
    
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let mut registry_ports = Vec::new();
    
    if let Ok(serialcomm) = hklm.open_subkey(r"HARDWARE\DEVICEMAP\SERIALCOMM") {
        for (name, value) in serialcomm.enum_values().filter_map(|x| x.ok()) {
            let port = value.to_string();
            registry_ports.push(format!("{} -> {}", name, port));
        }
    }
    
    let result = json!({
        "mode_output": com_ports,
        "registry_ports": registry_ports,
        "total_found": com_ports.len() + registry_ports.len(),
        "message": format!("Encontradas {} portas COM no sistema", com_ports.len() + registry_ports.len())
    });
    
    log::info!("Portas COM encontradas: {:?}", result);
    Ok(result.to_string())
}

#[cfg(not(all(feature = "biometric", target_os = "windows")))]
#[tauri::command]
pub fn list_com_ports() -> Result<String, String> {
    Err("Listagem de portas COM disponível apenas no Windows".to_string())
}

#[cfg(feature = "biometric")]
/// Inicializa o SDK de biometria (porta opcional, ex.: "COM3").
/// Se nenhuma porta for especificada, tenta detectar automaticamente.
/// Se falhar, tenta fazer Terminate + Init novamente (útil para reconexão USB).
pub fn init_sdk(_port: Option<&str>) -> Result<(), String> {
    unsafe {
        // IMPORTANTE: O exemplo oficial do SDK funciona SEM chamar SetSerialCommPort
        // O SDK detecta automaticamente o leitor biométrico
        // Apenas chamamos CIDBIO_Init() diretamente
        
        log::info!("🔧 Inicializando SDK biométrico (detecção automática)...");
        log::debug!("Chamando CIDBIO_Init() - SDK detectará o leitor automaticamente");
        let r = CIDBIO_Init();
        log::debug!("CIDBIO_Init retornou: {}", r);
        
        if r == 1 {
            log::warn!("SDK já estava inicializado (CIDBIO_WARNING_ALREADY_INIT). Continuando...");
            std::thread::sleep(std::time::Duration::from_millis(500));
            return Ok(());
        } else if r == 0 {
            log::info!("✅ SDK inicializado com sucesso!");
            std::thread::sleep(std::time::Duration::from_millis(800));
            return Ok(());
        } else {
            // Erro na inicialização
            log::error!("❌ CIDBIO_Init falhou com código: {}", r);
            
            if r == -2 {
                let driver_check = crate::sdk_manager::check_driver_installed();
                
                if driver_check {
                    return Err(format!(
                        "⚠️ DRIVER INSTALADO MAS LEITOR NÃO DETECTADO\n\n\
                        ✅ Driver instalado no sistema\n\
                        ❌ SDK não consegue detectar o leitor\n\n\
                        POSSÍVEIS CAUSAS:\n\
                        1. Leitor não está conectado corretamente\n\
                        2. Cabo USB com problema\n\
                        3. Porta USB sem energia suficiente\n\
                        4. Driver precisa ser reinstalado\n\n\
                        SOLUÇÃO:\n\
                        1. Desconecte o leitor USB\n\
                        2. Aguarde 10 segundos\n\
                        3. Conecte em outra porta USB (preferencialmente USB 2.0)\n\
                        4. Aguarde o Windows reconhecer o dispositivo\n\
                        5. Teste novamente\n\n\
                        Se o problema persistir, reinstale o driver.\n\n\
                        Código de erro: CIDBIO_Init retornou -2 (CIDBIO_ERROR_NO_DEVICE)"
                    ));
                } else {
                    return Err(format!(
                        "⚠️ DRIVER iDBio NÃO INSTALADO\n\n\
                        ❌ Driver não está instalado\n\n\
                        SOLUÇÃO:\n\
                        1. Clique no botão '💾 Instalar Driver' no painel de diagnóstico\n\
                        2. REINICIE O WINDOWS após instalar\n\
                        3. Reconecte o leitor USB\n\
                        4. Teste novamente\n\n\
                        Código de erro: CIDBIO_Init retornou -2 (CIDBIO_ERROR_NO_DEVICE)"
                    ));
                }
            }
            
            // Outros erros
            return Err(format!(
                "Erro ao inicializar SDK biométrico. Código: {}. Verifique se o leitor está conectado.",
                r
            ));
        }
    }
}

#[cfg(feature = "biometric")]
/// Comando Tauri: Inicializa ou reinicializa o SDK biométrico
/// Útil para reconectar o sensor após desconexão USB ou mudança de porta
#[tauri::command]
pub fn initialize_biometric_sdk() -> Result<String, String> {
    let port = std::env::var("IDBIO_PORT").ok();
    init_sdk(port.as_deref())?;
    Ok("SDK biométrico inicializado com sucesso".to_string())
}

#[cfg(not(feature = "biometric"))]
#[tauri::command]
pub fn initialize_biometric_sdk() -> Result<String, String> {
    Err("Funcionalidade biométrica não está habilitada nesta build".to_string())
}

#[cfg(not(feature = "biometric"))]
/// Stub: Inicializa o SDK de biometria (desabilitado - feature 'biometric' não está ativa).
pub fn init_sdk(_port: Option<&str>) -> Result<(), String> {
    Err("Funcionalidade biométrica não está habilitada nesta build".to_string())
}

#[cfg(feature = "biometric")]
/// Opcional: encerrar SDK (se quiser chamar em shutdown).
pub fn terminate_sdk() {
    unsafe {
        let _ = CIDBIO_Terminate();
    }
}

#[cfg(not(feature = "biometric"))]
/// Stub: encerrar SDK (desabilitado).
pub fn terminate_sdk() {
    // Nada a fazer quando biometric está desabilitado
}

#[cfg(feature = "biometric")]
/// Captura uma digital e retorna (template_base64, qualidade).
/// Se falhar com erro -1 (SDK não inicializado), tenta reinicializar automaticamente.
pub fn capture_with_sdk() -> Result<(String, i32), String> {
    unsafe {
        let mut tmpl_ptr: *mut c_char = std::ptr::null_mut();
        let mut img_ptr: *mut c_uchar = std::ptr::null_mut();
        let mut w: c_uint = 0;
        let mut h: c_uint = 0;
        let mut quality: c_int = 0;

        let r = CIDBIO_CaptureImageAndTemplate(
            &mut tmpl_ptr,
            &mut img_ptr,
            &mut w,
            &mut h,
            &mut quality,
        );

        if r == -1 {
            // Erro -1 geralmente indica SDK não inicializado
            log::warn!("CIDBIO_CaptureImageAndTemplate retornou -1 (SDK não inicializado). Tentando reinicializar...");
            
            // Tentar reinicializar o SDK
            let _ = CIDBIO_Terminate();
            std::thread::sleep(std::time::Duration::from_millis(500));
            
            let port = std::env::var("IDBIO_PORT").ok();
            init_sdk(port.as_deref())?;
            
            // Tentar capturar novamente
            log::info!("SDK reinicializado. Tentando captura novamente...");
            let r2 = CIDBIO_CaptureImageAndTemplate(
                &mut tmpl_ptr,
                &mut img_ptr,
                &mut w,
                &mut h,
                &mut quality,
            );
            
            if r2 != 0 {
                return Err(format!(
                    "CIDBIO_CaptureImageAndTemplate falhou mesmo após reinicialização. Código: {}. Verifique se o leitor está conectado.",
                    r2
                ));
            }
        } else if r != 0 {
            return Err(format!(
                "CIDBIO_CaptureImageAndTemplate retornou código de erro {}",
                r
            ));
        }

        if tmpl_ptr.is_null() {
            return Err("Template retornou ponteiro nulo".into());
        }

        let c_str = CStr::from_ptr(tmpl_ptr);
        let template = c_str.to_string_lossy().into_owned();

        // Libera string alocada pelo SDK (CIDBIO_FreeString)
        let _ = CIDBIO_FreeString(tmpl_ptr);

        Ok((template, quality as i32))
    }
}

#[cfg(not(feature = "biometric"))]
/// Stub: Captura digital (desabilitado).
pub fn capture_with_sdk() -> Result<(String, i32), String> {
    Err("Funcionalidade biométrica não está habilitada nesta build".to_string())
}

#[cfg(feature = "biometric")]
/// Compara dois templates e retorna (score_bruto, porcentagem_0_a_100).
pub fn compare_templates_with_sdk(stored: &str, live: &str) -> Result<(i32, i32), String> {
    unsafe {
        let c_stored = CString::new(stored).map_err(|e| e.to_string())?;
        let c_live = CString::new(live).map_err(|e| e.to_string())?;
        let mut raw_score: c_int = 0;

        let r = CIDBIO_MatchTemplates(c_stored.as_ptr(), c_live.as_ptr(), &mut raw_score);

        if r != 0 {
            return Err(format!(
                "CIDBIO_MatchTemplate retornou código de erro {}",
                r
            ));
        }

        let percent = score_to_percent(raw_score);
        Ok((raw_score, percent))
    }
}

#[cfg(not(feature = "biometric"))]
/// Stub: Compara templates (desabilitado).
pub fn compare_templates_with_sdk(_stored: &str, _live: &str) -> Result<(i32, i32), String> {
    Err("Funcionalidade biométrica não está habilitada nesta build".to_string())
}


