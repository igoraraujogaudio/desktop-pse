# Instalação do Leitor Biométrico iDBio

## ✅ Solução Completa e Testada

Este guia documenta a configuração correta do leitor biométrico iDBio que foi testada e está funcionando perfeitamente.

## 🔑 Componentes Críticos

### 1. DLL Correta
**IMPORTANTE:** Use a DLL do exemplo C# (1.4 MB), NÃO a DLL do SDK C/C++ (1.3 MB)

- ✅ **Correta:** `IDBIO_SDK/example/C#/bin/libcidbio.dll` (1,488,896 bytes)
- ❌ **Incorreta:** `IDBIO_SDK/lib/C_C++/win64/libcidbio.dll` (1,369,088 bytes)

A DLL do exemplo C# é mais completa e funciona corretamente com o driver instalado.

### 2. Configuração do Build

**Arquivo:** `src-tauri/build.rs`

```rust
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
```

### 3. Declaração FFI Correta

**Arquivo:** `src-tauri/src/biometric_sdk.rs`

```rust
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
    // ... outras funções
}
```

**Pontos-chave:**
- `kind = "raw-dylib"` - carregamento dinâmico sem precisar de arquivo `.lib`
- `extern "system"` - compatível com x64 (stdcall em win32, C em win64)

### 4. Inicialização Simplificada

**NÃO configure a porta manualmente!** Deixe o SDK detectar automaticamente:

```rust
pub fn init_sdk(_port: Option<&str>) -> Result<(), String> {
    unsafe {
        // IMPORTANTE: O exemplo oficial do SDK funciona SEM chamar SetSerialCommPort
        // O SDK detecta automaticamente o leitor biométrico
        // Apenas chamamos CIDBIO_Init() diretamente
        
        log::info!("🔧 Inicializando SDK biométrico (detecção automática)...");
        let r = CIDBIO_Init();
        
        if r == 0 {
            log::info!("✅ SDK inicializado com sucesso!");
            return Ok(());
        } else if r == 1 {
            log::warn!("SDK já estava inicializado");
            return Ok(());
        } else {
            // Tratar erros...
        }
    }
}
```

## 📦 Instalação do Driver

### Passo 1: Instalar Driver iDBio

Execute como **Administrador**:

```powershell
cd IDBIO_SDK\windows_driver
.\install-driver.ps1
```

Ou manualmente:

```powershell
pnputil /add-driver controlidbio.inf /install
```

### Passo 2: Reiniciar Windows

**IMPORTANTE:** Após instalar o driver, **REINICIE O WINDOWS** para que o driver seja carregado corretamente.

### Passo 3: Conectar o Leitor

1. Conecte o leitor biométrico em uma porta USB (preferencialmente USB 2.0)
2. Aguarde o Windows reconhecer o dispositivo
3. Verifique no Device Manager se aparece "iDBio" em "Ports (COM & LPT)"

### Passo 4: Testar

Execute o aplicativo e use o painel de diagnóstico:

```
🔌 Testar Conexão do Leitor
```

Resultado esperado:
```
✅ Sucesso
Leitor funcionando corretamente na porta COM10. Qualidade da captura: 100%
```

## 🔍 Detecção Automática de Porta

O sistema detecta automaticamente a porta COM do leitor através do registro do Windows:

1. Lista todas as portas COM em `HKLM\HARDWARE\DEVICEMAP\SERIALCOMM`
2. Para cada porta, busca o nome amigável (Friendly Name) em `HKLM\SYSTEM\CurrentControlSet\Enum`
3. Identifica o leitor procurando por palavras-chave: "idbio", "fingerprint", "biometric", etc.
4. Retorna a porta encontrada (ex: COM10)

**O SDK então detecta automaticamente o leitor sem precisar configurar a porta!**

## ⚠️ Troubleshooting

### Erro: "CIDBIO_Init retornou -2"

**Causa:** Driver não instalado ou não ativo

**Solução:**
1. Verifique se o driver está instalado: `pnputil /enum-drivers | findstr idbio`
2. Se não estiver, instale o driver
3. **REINICIE O WINDOWS**
4. Reconecte o leitor USB
5. Teste novamente

### Erro: "DLL não encontrada"

**Causa:** DLL incorreta ou não copiada

**Solução:**
1. Verifique se `libcidbio.dll` existe em `C:\cargo-target\debug\`
2. Confirme que é a DLL do exemplo C# (1.4 MB)
3. Se for a DLL errada, copie manualmente:
   ```powershell
   Copy-Item .\IDBIO_SDK\example\C#\bin\libcidbio.dll C:\cargo-target\debug\libcidbio.dll -Force
   ```
4. Recompile o projeto

### Erro de Linkagem: "cannot open input file 'libcidbio.lib'"

**Causa:** Configuração FFI incorreta

**Solução:**
1. Verifique se está usando `#[link(name = "libcidbio", kind = "raw-dylib")]`
2. Verifique se está usando `extern "system"` (não `extern "stdcall"`)
3. Certifique-se de que `build.rs` NÃO tem `println!("cargo:rustc-link-lib=libcidbio")`

## ✅ Checklist de Verificação

- [ ] DLL correta do exemplo C# (1.4 MB) copiada
- [ ] `build.rs` configurado para copiar DLL do exemplo C#
- [ ] FFI usando `raw-dylib` e `extern "system"`
- [ ] Driver iDBio instalado (`pnputil /enum-drivers | findstr idbio`)
- [ ] Windows reiniciado após instalar driver
- [ ] Leitor USB conectado e reconhecido
- [ ] Device Manager mostra "iDBio" em Ports (COM & LPT)
- [ ] Teste de conexão retorna sucesso com 100% de qualidade

## 📊 Resultado Esperado

```
✅ SDK inicializado com sucesso!
✅ Porta detectada automaticamente: COM10
✅ Leitor funcionando corretamente
✅ Qualidade da captura: 100%
```

## 🎯 Resumo da Solução

1. **DLL Correta:** Use a DLL do exemplo C# (1.4 MB), não a do SDK C/C++
2. **Detecção Automática:** Não configure porta manualmente, deixe o SDK detectar
3. **Raw DyLib:** Use `raw-dylib` com `extern "system"` para carregamento dinâmico
4. **Driver Instalado:** Instale o driver e **reinicie o Windows**
5. **Teste:** Use o painel de diagnóstico para confirmar funcionamento

---

**Data da solução:** 02/02/2026  
**Status:** ✅ Testado e funcionando perfeitamente
