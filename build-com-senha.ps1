# Build com assinatura usando senha da chave
# Uso: .\build-com-senha.ps1 -Password "sua_senha"

param(
    [Parameter(Mandatory=$true)]
    [string]$Password
)

$ErrorActionPreference = "Stop"

Write-Host "=== BUILD COM ASSINATURA ===" -ForegroundColor Cyan

# Configurar variaveis de ambiente
$privateKey = Get-Content "src-tauri\tauri.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY = $privateKey.Trim()
$env:TAURI_KEY_PASSWORD = $Password

Write-Host "`nChave privada e senha configuradas" -ForegroundColor Green
Write-Host "Gerando build..." -ForegroundColor Yellow

# Build
npm run tauri build

Write-Host "`n=== BUILD CONCLUIDO ===" -ForegroundColor Green
Write-Host "Verificando arquivos .sig..." -ForegroundColor Yellow

$sigFiles = Get-ChildItem -Path "C:\cargo-target\release\bundle" -Filter "*.sig" -Recurse -ErrorAction SilentlyContinue

if ($sigFiles) {
    Write-Host "Arquivos .sig encontrados:" -ForegroundColor Green
    foreach ($file in $sigFiles) {
        Write-Host "  - $($file.FullName)" -ForegroundColor Cyan
    }
} else {
    Write-Host "ERRO: Nenhum arquivo .sig foi gerado!" -ForegroundColor Red
    Write-Host "Verifique se a senha esta correta" -ForegroundColor Yellow
}
