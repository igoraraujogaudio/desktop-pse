# Gerar nova chave de assinatura SEM senha
# Isso vai substituir a chave atual

$ErrorActionPreference = "Stop"

Write-Host "=== GERAR NOVA CHAVE SEM SENHA ===" -ForegroundColor Cyan

# Backup da chave antiga
if (Test-Path "src-tauri\tauri.key") {
    Copy-Item "src-tauri\tauri.key" "src-tauri\tauri.key.backup"
    Write-Host "Backup criado: src-tauri\tauri.key.backup" -ForegroundColor Yellow
}

# Gerar nova chave sem senha
Write-Host "`nGerando nova chave..." -ForegroundColor Yellow
Write-Host "Quando pedir senha, apenas pressione ENTER (senha vazia)" -ForegroundColor Cyan

npm run tauri signer generate -- --force -w "src-tauri\tauri.key"

Write-Host "`n=== CHAVE GERADA ===" -ForegroundColor Green
Write-Host "Agora voce precisa atualizar a chave publica no tauri.conf.json" -ForegroundColor Yellow
Write-Host "`nExecute:" -ForegroundColor Cyan
Write-Host "  npm run tauri signer generate -- --force -w src-tauri\tauri.key" -ForegroundColor White
Write-Host "`nDepois copie a chave publica que aparecer e cole no tauri.conf.json" -ForegroundColor Yellow
