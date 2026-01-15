use serde::{Deserialize, Serialize};

use crate::biometric_sdk;

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
#[tauri::command]
pub fn validate_or_enroll_fingerprint(
    app: tauri::AppHandle,
    user_id: String,
    min_percent: i32,
    finger_id: Option<String>,
) -> Result<BiometricValidationResult, String> {
    // 1) inicializar SDK (porta opcional via env, ex.: "COM3")
    let port = std::env::var("IDBIO_PORT").ok();
    biometric_sdk::init_sdk(port.as_deref())?;

    let supabase_url = std::env::var("SUPABASE_URL")
        .map_err(|e| format!("SUPABASE_URL não configurada: {e}"))?;
    let service_key = std::env::var("SUPABASE_SERVICE_ROLE_KEY")
        .map_err(|e| format!("SUPABASE_SERVICE_ROLE_KEY não configurada: {e}"))?;

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
        .map_err(|e| format!("Erro ao criar client HTTP: {e}"))?;

    let list_url = format!(
        "{}/rest/v1/biometric_templates?user_id=eq.{}&select=id,template,quality",
        supabase_url, user_id
    );

    let resp = client
        .get(&list_url)
        .send()
        .map_err(|e| format!("Erro HTTP ao buscar templates: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!(
            "Falha ao buscar templates (status {}): {:?}",
            resp.status(),
            resp.text().ok()
        ));
    }

    let templates: Vec<RemoteTemplate> = resp
        .json()
        .map_err(|e| format!("Erro ao parsear templates: {e}"))?;

    // 3) se não tiver template -> capturar e cadastrar (ENROLLMENT ROBUSTO)
    if templates.is_empty() {
        use tauri::Emitter;
        
        let mut best_template = String::new();
        let mut best_quality = -1;

        // Loop de 3 capturas
        for i in 1..=3 {
            // Avisar frontend para pedir o dedo
            let _ = app.emit("biometric-instruction", format!("Posicione o dedo ({}/3)", i));
            
            // Captura (bloqueante - espera o dedo)
            // Pequeno delay para garantir que o usuário viu a mensagem ou tirou o dedo anterior
            std::thread::sleep(std::time::Duration::from_millis(500)); 

            let (tmpl, quality) = match biometric_sdk::capture_with_sdk() {
                Ok(res) => res,
                Err(e) => {
                    let _ = app.emit("biometric-instruction", format!("Erro na captura {}: {}", i, e));
                    return Err(e);
                }
            };

            log::info!("Captura {}/3: Qualidade {}", i, quality);

            if quality > best_quality {
                best_quality = quality;
                best_template = tmpl;
            }

            // Avisar sucesso parcial
            let _ = app.emit("biometric-instruction", format!("Leitura {} OK (Qualidade: {})", i, quality));
            
            // Pedir para retirar o dedo (se não for a última)
            if i < 3 {
                 let _ = app.emit("biometric-instruction", "Retire o dedo...");
                 std::thread::sleep(std::time::Duration::from_secs(2));
            }
        }

        // Validar qualidade mínima (90% exigido)
        if best_quality < 90 {
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

        let resp = client
            .post(&register_url)
            .json(&body)
            .send()
            .map_err(|e| format!("Erro HTTP ao registrar template: {e}"))?;

        if !resp.status().is_success() {
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
    let (live_template, live_quality) = biometric_sdk::capture_with_sdk()?;

    let mut best_raw = 0;
    let mut best_percent = 0;

    for t in &templates {
        let (raw, percent) = biometric_sdk::compare_templates_with_sdk(&t.template, &live_template)?;
        if percent > best_percent {
            best_percent = percent;
            best_raw = raw;
        }
    }

    if best_percent < min_percent {
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

    Ok(BiometricValidationResult {
        success: true,
        reason: "Biometria validada com sucesso.".into(),
        score: Some(best_raw),
        percent: Some(best_percent),
        quality: Some(live_quality),
        enrolled: false,
    })
}

