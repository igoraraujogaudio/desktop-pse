use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int, c_uchar, c_uint};

#[cfg(feature = "biometric")]
/// ATENÇÃO:
/// - A DLL no SDK é `libcidbio.dll`, então usamos `#[link(name = "libcidbio")]`.
/// - Os nomes das funções (`CIDBIO_*`) batem com o `cidbiolib.h`.
#[link(name = "libcidbio")]
extern "stdcall" {
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

#[cfg(feature = "biometric")]
/// Inicializa o SDK de biometria (porta opcional, ex.: "COM3").
pub fn init_sdk(port: Option<&str>) -> Result<(), String> {
    unsafe {
        if let Some(p) = port {
            log::info!("Configurando porta serial SDK: {}", p);
            let c_port = CString::new(p).map_err(|e| e.to_string())?;
            let r = CIDBIO_SetSerialCommPort(c_port.as_ptr());
            if r != 0 {
                return Err(format!(
                    "CIDBIO_SetSerialCommPort retornou código de erro {}",
                    r
                ));
            }
        }

        let r = CIDBIO_Init();
        if r == 1 {
            log::warn!("SDK já estava inicializado (CIDBIO_WARNING_ALREADY_INIT). Continuando...");
        } else if r != 0 {
            return Err(format!("CIDBIO_Init retornou código de erro {}", r));
        }
    }
    Ok(())
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

        if r != 0 {
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


