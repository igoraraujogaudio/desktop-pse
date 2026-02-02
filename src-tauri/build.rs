fn main() {
    tauri_build::build();

    // Copiar libcidbio.dll do exemplo C# (que funciona) para o diretório de build
    // IMPORTANTE: A DLL do exemplo C# é diferente e funciona corretamente
    let sdk_dir = std::path::Path::new("../IDBIO_SDK/example/C#/bin");
    let sdk_dll_path = sdk_dir.join("libcidbio.dll");
    
    // NOTA: Não precisamos linkar a biblioteca estaticamente, apenas carregar a DLL em runtime
    // A DLL será carregada automaticamente pelo Windows quando o executável rodar

    if sdk_dll_path.exists() {
        let out_dir = std::env::var("OUT_DIR").unwrap();
        let target_dir = std::path::Path::new(&out_dir)
            .ancestors()
            .nth(3)
            .unwrap();
        
        let dest_dll = target_dir.join("libcidbio.dll");
        
        if let Err(e) = std::fs::copy(&sdk_dll_path, &dest_dll) {
            println!("cargo:warning=Erro ao copiar DLL do SDK: {}", e);
        } else {
            println!("cargo:warning=DLL do SDK copiada para: {:?}", dest_dll);
        }
    } else {
        println!("cargo:warning=DLL do SDK não encontrada em: {:?}", sdk_dll_path);
    }
}
