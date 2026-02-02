# Build com Assinatura Automatica
# Gera build do Tauri com arquivos .sig incluidos

$ErrorActionPreference = "Stop"

Write-Host "=== BUILD COM ASSINATURA ===" -ForegroundColor Cyan

# 1. Ler chave privada
Write-Host "`n[1/3] Carregando chave privada..." -ForegroundColor Yellow
if (-not (Test-Path "src-tauri\tauri.key")) {
    Write-Host "      ERRO: Arquivo src-tauri\tauri.key nao encontrado!" -ForegroundColor Red
    exit 1
}

$privateKey = Get-Content "src-tauri\tauri.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY = $privateKey.Trim()
$env:TAURI_KEY_PASSWORD = ""

Write-Host "      Chave privada carregada!" -ForegroundColor Green

# 2. Build
Write-Host "`n[2/3] Gerando build com assinatura..." -ForegroundColor Yellow
Write-Host "      Isso pode demorar alguns minutos..." -ForegroundColor Gray

npm run tauri build

# 3. Verificar arquivos .sig
Write-Host "`n[3/3] Verificando arquivos gerados..." -ForegroundColor Yellow

$buildPaths = @(
    "src-tauri\target\release\bundle\nsis",
    "C:\cargo-target\release\bundle\nsis"
)

$exeFile = $null
$sigFile = $null

foreach ($path in $buildPaths) {
    if (Test-Path $path) {
        $exeFile = Get-ChildItem -Path $path -Filter "*setup.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        $sigFile = Get-ChildItem -Path $path -Filter "*setup.exe.sig" -ErrorAction SilentlyContinue | Select-Object -First 1
        
        if ($exeFile) {
            Write-Host "      EXE: $($exeFile.Name)" -ForegroundColor Green
            Write-Host "      Caminho: $($exeFile.FullName)" -ForegroundColor Gray
            
            if ($sigFile) {
                Write-Host "      SIG: $($sigFile.Name)" -ForegroundColor Green
                Write-Host "      Caminho: $($sigFile.FullName)" -ForegroundColor Gray
            } else {
                Write-Host "      AVISO: Arquivo .sig nao encontrado!" -ForegroundColor Yellow
            }
            break
        }
    }
}

if (-not $exeFile) {
    Write-Host "      ERRO: Arquivos de build nao encontrados!" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== BUILD CONCLUIDO ===" -ForegroundColor Green
Write-Host "Arquivos em: $($exeFile.DirectoryName)" -ForegroundColor Cyan
