use std::fs;
use std::path::PathBuf;

/// Remove a pasta de dados do aplicativo em ProgramData durante a desinstalação
pub fn cleanup_app_data() -> Result<(), String> {
    let programdata = std::env::var("PROGRAMDATA")
        .unwrap_or_else(|_| "C:\\ProgramData".to_string());
    
    let app_data_dir = PathBuf::from(programdata).join("AlmoxarifadoDesktop");
    
    if app_data_dir.exists() {
        log::info!("Removendo dados do aplicativo: {:?}", app_data_dir);
        fs::remove_dir_all(&app_data_dir)
            .map_err(|e| format!("Erro ao remover pasta de dados: {}", e))?;
        log::info!("Dados do aplicativo removidos com sucesso");
    } else {
        log::info!("Pasta de dados não existe, nada a remover");
    }
    
    Ok(())
}
