# Script Completo de Configuração do Leitor Biométrico iDBio
# Versão: 2.0 - Solução Testada e Funcionando
# Data: 02/02/2026

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuração Completa - Leitor iDBio" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verifica se está rodando como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ ERRO: Este script precisa ser executado como Administrador!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Clique com o botão direito no arquivo e selecione:" -ForegroundColor Yellow
    Write-Host "'Executar com PowerShell' como Administrador" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Pressione ENTER para sair"
    exit 1
}

Write-Host "✅ Executando como Administrador" -ForegroundColor Green
Write-Host ""

# Passo 1: Verificar DLL Correta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "PASSO 1: Verificando DLL do SDK" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$correctDll = ".\IDBIO_SDK\example\C#\bin\libcidbio.dll"
$incorrectDll = ".\IDBIO_SDK\lib\C_C++\win64\libcidbio.dll"

if (Test-Path $correctDll) {
    $dllSize = (Get-Item $correctDll).Length
    Write-Host "✅ DLL correta encontrada: $correctDll" -ForegroundColor Green
    Write-Host "   Tamanho: $dllSize bytes (deve ser ~1,488,896)" -ForegroundColor Gray
    
    if ($dllSize -lt 1400000) {
        Write-Host ""
        Write-Host "⚠️  AVISO: DLL parece ser a versão incorreta!" -ForegroundColor Yellow
        Write-Host "   Tamanho esperado: ~1,488,896 bytes (1.4 MB)" -ForegroundColor Yellow
        Write-Host "   Tamanho atual: $dllSize bytes" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ DLL correta NÃO encontrada em: $correctDll" -ForegroundColor Red
    Write-Host ""
    Read-Host "Pressione ENTER para sair"
    exit 1
}

Write-Host ""

# Passo 2: Verificar/Instalar Driver
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "PASSO 2: Verificando Driver iDBio" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Verifica se driver já está instalado
$driverCheck = & pnputil /enum-drivers | Select-String -Pattern "idbio|Control iD" -Quiet

if ($driverCheck) {
    Write-Host "✅ Driver iDBio já está instalado" -ForegroundColor Green
    Write-Host ""
    Write-Host "Detalhes do driver:" -ForegroundColor Gray
    & pnputil /enum-drivers | Select-String -Pattern "controlidbio" -Context 2,2
    Write-Host ""
} else {
    Write-Host "⚠️  Driver iDBio NÃO está instalado" -ForegroundColor Yellow
    Write-Host ""
    
    $infFile = ".\IDBIO_SDK\windows_driver\controlidbio.inf"
    
    if (-not (Test-Path $infFile)) {
        Write-Host "❌ Arquivo de driver não encontrado: $infFile" -ForegroundColor Red
        Read-Host "Pressione ENTER para sair"
        exit 1
    }
    
    Write-Host "Instalando driver..." -ForegroundColor Cyan
    try {
        $result = & pnputil.exe /add-driver "$infFile" /install
        Write-Host ""
        Write-Host "✅ Driver instalado com sucesso!" -ForegroundColor Green
        Write-Host ""
    }
    catch {
        Write-Host "❌ Erro ao instalar driver: $_" -ForegroundColor Red
        Read-Host "Pressione ENTER para sair"
        exit 1
    }
}

# Passo 3: Verificar Dispositivo USB
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "PASSO 3: Verificando Dispositivo USB" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$devices = Get-PnpDevice -Class Ports | Where-Object {$_.FriendlyName -like '*iDBio*'}

if ($devices) {
    Write-Host "✅ Leitor iDBio encontrado:" -ForegroundColor Green
    $devices | ForEach-Object {
        Write-Host "   Nome: $($_.FriendlyName)" -ForegroundColor Gray
        Write-Host "   Status: $($_.Status)" -ForegroundColor Gray
        
        if ($_.Status -eq "OK") {
            Write-Host "   ✅ Dispositivo funcionando corretamente" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Status: $($_.Status)" -ForegroundColor Yellow
        }
    }
    Write-Host ""
} else {
    Write-Host "⚠️  Leitor iDBio NÃO detectado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Possíveis causas:" -ForegroundColor Gray
    Write-Host "- Leitor não está conectado" -ForegroundColor Gray
    Write-Host "- Windows precisa ser reiniciado após instalar driver" -ForegroundColor Gray
    Write-Host "- Cabo USB com problema" -ForegroundColor Gray
    Write-Host ""
}

# Passo 4: Verificar Configuração do Build
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "PASSO 4: Verificando Configuração" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$buildRs = ".\src-tauri\build.rs"
if (Test-Path $buildRs) {
    $buildContent = Get-Content $buildRs -Raw
    
    if ($buildContent -match 'example/C#/bin') {
        Write-Host "✅ build.rs configurado para usar DLL correta (exemplo C#)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  build.rs pode estar usando DLL incorreta" -ForegroundColor Yellow
        Write-Host "   Verifique se aponta para: IDBIO_SDK/example/C#/bin" -ForegroundColor Yellow
    }
    
    if ($buildContent -match 'raw-dylib') {
        Write-Host "✅ Configuração FFI correta (raw-dylib)" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Arquivo build.rs não encontrado" -ForegroundColor Yellow
}

Write-Host ""

# Resumo Final
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "RESUMO E PRÓXIMOS PASSOS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if (-not $driverCheck) {
    Write-Host "⚠️  AÇÃO NECESSÁRIA: REINICIE O WINDOWS" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "O driver foi instalado mas precisa ser carregado pelo sistema." -ForegroundColor Gray
    Write-Host "Após reiniciar:" -ForegroundColor Gray
    Write-Host "1. Conecte o leitor USB" -ForegroundColor Gray
    Write-Host "2. Aguarde o Windows reconhecer" -ForegroundColor Gray
    Write-Host "3. Execute o aplicativo e teste" -ForegroundColor Gray
    Write-Host ""
} elseif (-not $devices) {
    Write-Host "⚠️  AÇÃO NECESSÁRIA: Conecte o leitor USB" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "O driver está instalado mas o leitor não foi detectado." -ForegroundColor Gray
    Write-Host "1. Conecte o leitor em uma porta USB 2.0" -ForegroundColor Gray
    Write-Host "2. Aguarde o Windows reconhecer (LED deve acender)" -ForegroundColor Gray
    Write-Host "3. Execute este script novamente para verificar" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "✅ TUDO PRONTO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configuração completa:" -ForegroundColor Gray
    Write-Host "✅ DLL correta (exemplo C#)" -ForegroundColor Green
    Write-Host "✅ Driver instalado" -ForegroundColor Green
    Write-Host "✅ Leitor detectado" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximo passo:" -ForegroundColor Cyan
    Write-Host "1. Compile o projeto: npm run tauri dev" -ForegroundColor Gray
    Write-Host "2. Teste a conexão: '🔌 Testar Conexão do Leitor'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Resultado esperado:" -ForegroundColor Cyan
    Write-Host "✅ Leitor funcionando corretamente na porta COMX" -ForegroundColor Green
    Write-Host "✅ Qualidade da captura: 100%" -ForegroundColor Green
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Read-Host "Pressione ENTER para finalizar"
