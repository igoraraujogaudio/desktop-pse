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
    Write-Host "Conecte o leitor biométrico iDBio agora." -ForegroundColor Yellow
    Write-Host "O Windows deve reconhecê-lo automaticamente." -ForegroundColor Yellow
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

Read-Host "Pressione ENTER para sair"
