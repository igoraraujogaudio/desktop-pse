# Build com geracao de arquivos .sig
# Configura variaveis de ambiente ANTES do build

$ErrorActionPreference = "Stop"

Write-Host "=== BUILD COM ASSINATURA .SIG ===" -ForegroundColor Cyan

# 1. Configurar variaveis de ambiente GLOBAIS
Write-Host "`nConfigurando variaveis de ambiente..." -ForegroundColor Yellow

$privateKeyPath = Resolve-Path "src-tauri\tauri.key"
$privateKeyContent = Get-Content $privateKeyPath -Raw

[Environment]::SetEnvironmentVariable("TAURI_SIGNING_PRIVATE_KEY", $privateKeyContent.Trim(), "Process")
[Environment]::SetEnvironmentVariable("TAURI_KEY_PASSWORD", "", "Process")

Write-Host "TAURI_SIGNING_PRIVATE_KEY: Configurado" -ForegroundColor Green
Write-Host "TAURI_KEY_PASSWORD: (vazio)" -ForegroundColor Green

# 2. Verificar configuracao
Write-Host "`nVerificando configuracao..." -ForegroundColor Yellow
if ($env:TAURI_SIGNING_PRIVATE_KEY) {
    Write-Host "Variavel TAURI_SIGNING_PRIVATE_KEY: OK" -ForegroundColor Green
} else {
    Write-Host "ERRO: Variavel nao configurada!" -ForegroundColor Red
    exit 1
}

# 3. Build
Write-Host "`nIniciando build..." -ForegroundColor Yellow
Write-Host "Isso pode demorar alguns minutos..." -ForegroundColor Gray

& npm run tauri build

# 4. Verificar .sig
Write-Host "`nVerificando arquivos .sig..." -ForegroundColor Yellow

$nsisPath = "C:\cargo-target\release\bundle\nsis"
$sigFiles = Get-ChildItem -Path $nsisPath -Filter "*.sig" -ErrorAction SilentlyContinue

if ($sigFiles) {
    Write-Host "`n=== SUCESSO! ===" -ForegroundColor Green
    Write-Host "Arquivos .sig gerados:" -ForegroundColor Cyan
    foreach ($sig in $sigFiles) {
        Write-Host "  - $($sig.Name)" -ForegroundColor Green
        Write-Host "    Tamanho: $($sig.Length) bytes" -ForegroundColor Gray
    }
} else {
    Write-Host "`nERRO: Arquivos .sig nao foram gerados!" -ForegroundColor Red
    Write-Host "`nArquivos encontrados:" -ForegroundColor Yellow
    Get-ChildItem -Path $nsisPath | Format-Table Name, Length -AutoSize
}
