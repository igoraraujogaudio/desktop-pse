# Build final com assinatura funcionando
# A chave agora nao tem senha

$ErrorActionPreference = "Stop"

Write-Host "=== BUILD COM ASSINATURA ===" -ForegroundColor Cyan

# Configurar variaveis de ambiente
Write-Host "`nConfigurando chave privada..." -ForegroundColor Yellow
$privateKey = Get-Content "src-tauri\tauri.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY = $privateKey.Trim()
$env:TAURI_KEY_PASSWORD = ""

Write-Host "Chave configurada (sem senha)" -ForegroundColor Green

# Build
Write-Host "`nGerando build..." -ForegroundColor Yellow
Write-Host "Isso pode demorar alguns minutos..." -ForegroundColor Gray

npm run tauri build

# Verificar arquivos .sig
Write-Host "`nVerificando arquivos gerados..." -ForegroundColor Yellow

$nsisPath = "C:\cargo-target\release\bundle\nsis"
if (Test-Path $nsisPath) {
    $files = Get-ChildItem -Path $nsisPath | Select-Object Name, Length
    
    Write-Host "`nArquivos em $nsisPath`:" -ForegroundColor Cyan
    $files | Format-Table -AutoSize
    
    $sigFiles = Get-ChildItem -Path $nsisPath -Filter "*.sig"
    if ($sigFiles) {
        Write-Host "`n=== SUCESSO! ===" -ForegroundColor Green
        Write-Host "Arquivos .sig gerados:" -ForegroundColor Cyan
        foreach ($sig in $sigFiles) {
            Write-Host "  - $($sig.Name)" -ForegroundColor Green
        }
    } else {
        Write-Host "`nAVISO: Nenhum arquivo .sig encontrado" -ForegroundColor Yellow
    }
}
