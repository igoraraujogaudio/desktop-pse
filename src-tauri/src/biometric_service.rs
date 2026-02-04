use serde::{Deserialize, Serialize};
use std::fs::OpenOptions;
use std::io::Write;

use crate::biometric_sdk;

fn log_biometric(message: &str) {
    let mut log_dir = std::env::var("PROGRAMDATA")
        .map(|p| std::path::PathBuf::from(p).join("AlmoxarifadoDesktop"))
        .unwrap_or_else(|_| std::env::temp_dir().join("AlmoxarifadoDesktop"));

    if let Err(e) = std::fs::create_dir_all(&log_dir) {
        log::warn!("Falha ao criar diretório de log biométrico: {}", e);
        return;
    }

    log_dir.push("biometria.log");

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_dir) {
        let _ = writeln!(file, "[{}] {}", chrono::Local::now().to_rfc3339(), message);
    }
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct RemoteTemplate {
    id: String,
    template: String,
    quality: i32,
}

#[derive(Serialize)]
pub struct BiometricValidationResult {
    pub success: bool,
    pub reason: String,
    pub score: Option<i32>,
    pub percent: Option<i32>,
    pub quality: Option<i32>,
    pub enrolled: bool,
}

/// Comando Tauri: valida a biometria do usuário ou cadastra se não existir.
///
/// - Fala DIRETO com o Supabase (sem depender do site / Next)
/// - Busca templates na tabela `biometric_templates` via REST
/// - Se não tiver nenhum, captura e cadastra
/// - Se tiver, captura e compara via SDK
/// - Exige `min_percent` (ex.: 90) de similaridade mínima
/// - ASYNC para não bloquear a UI durante a captura
#[tauri::command]
pub async fn validate_or_enroll_fingerprint(
    app: tauri::AppHandle,
    user_id: String,
    min_percent: i32,
    finger_id: Option<String>,
    supabase_url: String,
    service_key: String,
) -> Result<BiometricValidationResult, String> {
    // Executar todo o processamento bloqueante em uma thread separada
    tokio::task::spawn_blocking(move || {
        validate_or_enroll_fingerprint_blocking(app, user_id, min_percent, finger_id, supabase_url, service_key)
    })
    .await
    .map_err(|e| format!("Erro ao executar tarefa biométrica: {}", e))?
}

/// Função bloqueante interna que executa a validação/cadastro biométrico
fn validate_or_enroll_fingerprint_blocking(
    app: tauri::AppHandle,
    user_id: String,
    min_percent: i32,
    finger_id: Option<String>,
    supabase_url: String,
    service_key: String,
) -> Result<BiometricValidationResult, String> {
    log_biometric(&format!(
        "validate_or_enroll_fingerprint() user_id={} min_percent={} enrolled_finger={:?}",
        user_id, min_percent, finger_id
    ));
    // 1) inicializar SDK (porta opcional via env, ex.: "COM3")
    // Se falhar, tentar reinicializar (útil quando o sensor é reconectado)
    let port = std::env::var("IDBIO_PORT").ok();
    if let Err(e) = biometric_sdk::init_sdk(port.as_deref()) {
        log_biometric(&format!("init_sdk() error: {}", e));
        log::warn!("Falha na inicialização do SDK: {}. Tentando reinicializar...", e);
        
        // Tentar terminar e reinicializar
        biometric_sdk::terminate_sdk();
        std::thread::sleep(std::time::Duration::from_millis(500));
        
        // Segunda tentativa
        biometric_sdk::init_sdk(port.as_deref())?;
    }

    log_biometric("SDK inicializado com sucesso");
    log_biometric(&format!("SUPABASE_URL recebido: {}...", &supabase_url.chars().take(20).collect::<String>()));
    log_biometric("SERVICE_KEY recebido do frontend");

    // 2) buscar templates do usuário no Supabase (REST direto, sincrono via reqwest blocking)
    let client = reqwest::blocking::Client::builder()
        .default_headers({
            let mut h = reqwest::header::HeaderMap::new();
            let api_key = reqwest::header::HeaderValue::from_str(&service_key)
                .map_err(|e| format!("Erro ao montar header apikey: {e}"))?;
            h.insert("apikey", api_key.clone());
            let auth = format!("Bearer {}", service_key);
            let auth_val = reqwest::header::HeaderValue::from_str(&auth)
                .map_err(|e| format!("Erro ao montar header Authorization: {e}"))?;
            h.insert(reqwest::header::AUTHORIZATION, auth_val);
            h
        })
        .build()
        .map_err(|e| {
            let msg = format!("Erro ao criar client HTTP: {e}");
            log_biometric(&msg);
            msg
        })?;

    let list_url = format!(
        "{}/rest/v1/biometric_templates?user_id=eq.{}&select=id,template,quality",
        supabase_url, user_id
    );

    log_biometric(&format!("HTTP GET templates: {}", list_url));

    let resp = client
        .get(&list_url)
        .send()
        .map_err(|e| {
            let msg = format!("Erro HTTP ao buscar templates: {e}");
            log_biometric(&msg);
            msg
        })?;

    if !resp.status().is_success() {
        log_biometric(&format!("HTTP templates failed status: {}", resp.status()));
        return Err(format!(
            "Falha ao buscar templates (status {}): {:?}",
            resp.status(),
            resp.text().ok()
        ));
    }

    let templates: Vec<RemoteTemplate> = resp
        .json()
        .map_err(|e| {
            let msg = format!("Erro ao parsear templates: {e}");
            log_biometric(&msg);
            msg
        })?;

    log_biometric(&format!("Templates encontrados: {}", templates.len()));

    // 3) se não tiver template -> capturar e cadastrar (ENROLLMENT ROBUSTO)
    if templates.is_empty() {
        use tauri::Emitter;
        log_biometric("Nenhum template encontrado. Iniciando cadastro.");
        
        let mut best_template = String::new();
        let mut best_quality = -1;

        // Loop de 3 capturas
        for i in 1..=3 {
            log_biometric(&format!("=== INÍCIO CAPTURA {}/3 ===", i));
            
            // Avisar frontend para pedir o dedo
            log_biometric(&format!("Emitindo: Posicione o dedo ({}/3)", i));
            let _ = app.emit("biometric-instruction", format!("📍 Posicione o dedo no leitor ({}/3)", i));
            
            // Delay maior para garantir que o usuário viu a mensagem e posicionou o dedo
            std::thread::sleep(std::time::Duration::from_millis(3000)); 

            // Avisar que está aguardando a captura
            log_biometric(&format!("Emitindo: Aguardando leitura {}/3", i));
            let _ = app.emit("biometric-instruction", format!("⏳ Aguardando leitura {}/3...", i));

            log_biometric(&format!("Chamando capture_with_sdk() para captura {}/3", i));
            let (tmpl, quality) = match biometric_sdk::capture_with_sdk() {
                Ok(res) => {
                    log_biometric(&format!("capture_with_sdk() retornou OK para captura {}/3", i));
                    res
                },
                Err(e) => {
                    log_biometric(&format!("Erro na captura {}: {}", i, e));
                    let _ = app.emit("biometric-instruction", format!("❌ Erro na captura {}: {}", i, e));
                    return Err(e);
                }
            };

            log::info!("Captura {}/3: Qualidade {}", i, quality);
            log_biometric(&format!("Qualidade captura {}/3: {}", i, quality));

            if quality > best_quality {
                best_quality = quality;
                best_template = tmpl;
            }

            // Avisar sucesso e aguardar para usuário ver a mensagem
            log_biometric(&format!("Emitindo: Leitura {} concluída", i));
            let _ = app.emit("biometric-instruction", format!("✅ Leitura {} concluída! Qualidade: {}%", i, quality));
            std::thread::sleep(std::time::Duration::from_millis(2000));
            
            // Pedir para retirar o dedo (se não for a última)
            if i < 3 {
                 log_biometric("Emitindo: Retire o dedo");
                 let _ = app.emit("biometric-instruction", "👆 Retire o dedo do leitor...");
                 std::thread::sleep(std::time::Duration::from_millis(3000));
            }
            
            log_biometric(&format!("=== FIM CAPTURA {}/3 ===", i));
        }

        // Validar qualidade mínima (90% exigido)
        if best_quality < 90 {
            log_biometric(&format!("Qualidade insuficiente: {}", best_quality));
            return Ok(BiometricValidationResult {
                success: false,
                reason: format!("Qualidade insuficiente (Melhor: {}%). Tente novamente com mais precisão.", best_quality),
                score: None,
                percent: None,
                quality: Some(best_quality),
                enrolled: false,
            });
        }

        let register_url = format!("{}/rest/v1/biometric_templates", supabase_url);
        let body = serde_json::json!({
            "user_id": user_id,
            "template": best_template,
            "quality": best_quality,
            "user_id": user_id,
            "template": best_template,
            "quality": best_quality,
            "finger": finger_id.unwrap_or_else(|| "right_index".to_string())
        });

        log_biometric("HTTP POST register template");

        let resp = client
            .post(&register_url)
            .json(&body)
            .send()
            .map_err(|e| {
                let msg = format!("Erro HTTP ao registrar template: {e}");
                log_biometric(&msg);
                msg
            })?;

        if !resp.status().is_success() {
            log_biometric(&format!("HTTP register failed status: {}", resp.status()));
            return Err(format!(
                "Falha ao registrar template (status {}): {:?}",
                resp.status(),
                resp.text().ok()
            ));
        }

        return Ok(BiometricValidationResult {
            success: true,
            reason: format!("Biometria cadastrada com sucesso! (Qualidade: {}%)", best_quality),
            score: None,
            percent: None,
            quality: Some(best_quality),
            enrolled: true,
        });
    }

    // 4) se já tem templates -> capturar e comparar
    log_biometric("Template encontrado. Iniciando captura para validação.");
    let (live_template, live_quality) = biometric_sdk::capture_with_sdk().map_err(|e| {
        log_biometric(&format!("Erro na captura para validação: {}", e));
        e
    })?;

    log_biometric(&format!("Captura OK. quality={}", live_quality));

    let mut best_raw = 0;
    let mut best_percent = 0;

    for t in &templates {
        let (raw, percent) = biometric_sdk::compare_templates_with_sdk(&t.template, &live_template)
            .map_err(|e| {
                log_biometric(&format!("Erro no compare_templates_with_sdk: {}", e));
                e
            })?;
        if percent > best_percent {
            best_percent = percent;
            best_raw = raw;
        }
    }

    if best_percent < min_percent {
        log_biometric(&format!("Score abaixo do mínimo: {} < {}", best_percent, min_percent));
        return Ok(BiometricValidationResult {
            success: false,
            reason: format!(
                "Score {}% abaixo do mínimo de {}%",
                best_percent, min_percent
            ),
            score: Some(best_raw),
            percent: Some(best_percent),
            quality: Some(live_quality),
            enrolled: false,
        });
    }

    log_biometric(&format!("Biometria validada. score={} percent={}", best_raw, best_percent));
    Ok(BiometricValidationResult {
        success: true,
        reason: "Biometria validada com sucesso.".into(),
        score: Some(best_raw),
        percent: Some(best_percent),
        quality: Some(live_quality),
        enrolled: false,
    })
}

