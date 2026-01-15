fn main() {
    tauri_build::build();

    // Copiar libcidbio.dll do SDK para o diretório de build
    let sdk_dir = std::path::Path::new("../IDBIO_SDK/lib/C_C++/win64");
    let sdk_dll_path = sdk_dir.join("libcidbio.dll");
    
    // Adicionar diretório do SDK ao search path do linker
    println!("cargo:rustc-link-search=native={}", std::fs::canonicalize(sdk_dir).unwrap().display());
    println!("cargo:rustc-link-lib=libcidbio");

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
