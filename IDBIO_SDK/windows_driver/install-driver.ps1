# iDBio Driver Installer Script
# Este script instala o driver USB do leitor biométrico iDBio

$ErrorActionPreference = "Stop"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Instalador do Driver iDBio" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Verifica se está rodando como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERRO: Este instalador precisa ser executado como Administrador!" -ForegroundColor Red
    Write-Host "Clique com o botão direito e selecione 'Executar como Administrador'" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Pressione ENTER para sair"
    exit 1
}

# Obtém o diretório do script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Verifica se os arquivos do driver existem
$infFile = Join-Path $scriptDir "controlidbio.inf"
if (-not (Test-Path $infFile)) {
    Write-Host "ERRO: Arquivo controlidbio.inf não encontrado!" -ForegroundColor Red
    Read-Host "Pressione ENTER para sair"
    exit 1
}

Write-Host "Instalando driver iDBio..." -ForegroundColor Green
Write-Host "Arquivo INF: $infFile" -ForegroundColor Gray
Write-Host ""

try {
    # Instala o driver usando pnputil
    $result = & pnputil.exe /add-driver "$infFile" /install
    
    Write-Host ""
    Write-Host "==================================" -ForegroundColor Green
    Write-Host "Driver instalado com sucesso!" -ForegroundColor Green
    Write-Host "==================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE - PRÓXIMOS PASSOS:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. REINICIE O WINDOWS" -ForegroundColor Cyan
    Write-Host "   O driver precisa ser carregado pelo sistema" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Após reiniciar, conecte o leitor biométrico USB" -ForegroundColor Cyan
    Write-Host "   Aguarde o Windows reconhecer o dispositivo" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Verifique no Device Manager:" -ForegroundColor Cyan
    Write-Host "   - Abra 'Gerenciador de Dispositivos'" -ForegroundColor Gray
    Write-Host "   - Procure por 'iDBio' em 'Portas (COM e LPT)'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Execute o aplicativo e teste a conexão" -ForegroundColor Cyan
    Write-Host "   Use o painel de diagnóstico: '🔌 Testar Conexão do Leitor'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Resultado esperado:" -ForegroundColor Green
    Write-Host "✅ Leitor funcionando corretamente na porta COMX" -ForegroundColor Green
    Write-Host "✅ Qualidade da captura: 100%" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "ERRO ao instalar o driver:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Read-Host "Pressione ENTER para sair"
    exit 1
}

Read-Host "Pressione ENTER para continuar"
