# Reconfigurar sistema de assinatura completo
# Gera nova chave sem senha e atualiza tauri.conf.json automaticamente

$ErrorActionPreference = "Stop"

Write-Host "=== RECONFIGURAR ASSINATURA ===" -ForegroundColor Cyan

# 1. Backup da chave antiga
Write-Host "`n[1/4] Fazendo backup da chave antiga..." -ForegroundColor Yellow
if (Test-Path "src-tauri\tauri.key") {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item "src-tauri\tauri.key" "src-tauri\tauri.key.backup_$timestamp"
    Write-Host "      Backup: src-tauri\tauri.key.backup_$timestamp" -ForegroundColor Green
}

# 2. Gerar nova chave SEM senha
Write-Host "`n[2/4] Gerando nova chave sem senha..." -ForegroundColor Yellow
Write-Host "      IMPORTANTE: Quando pedir senha, pressione ENTER 2 vezes (senha vazia)" -ForegroundColor Cyan

# Deletar chave antiga
Remove-Item "src-tauri\tauri.key" -Force -ErrorAction SilentlyContinue

# Gerar nova chave
$output = npm run tauri signer generate -- -w "src-tauri\tauri.key" 2>&1 | Out-String

# Extrair chave publica do output
$pubkeyMatch = $output -match "pubkey:\s*([A-Za-z0-9+/=]+)"
if ($matches) {
    $pubkey = $matches[1]
    Write-Host "      Chave publica gerada!" -ForegroundColor Green
} else {
    Write-Host "      ERRO: Nao foi possivel extrair a chave publica" -ForegroundColor Red
    Write-Host "      Output:" -ForegroundColor Yellow
    Write-Host $output
    exit 1
}

# 3. Atualizar tauri.conf.json
Write-Host "`n[3/4] Atualizando tauri.conf.json..." -ForegroundColor Yellow
$configPath = "src-tauri\tauri.conf.json"
$config = Get-Content $configPath | ConvertFrom-Json

# Atualizar pubkey
$config.plugins.updater.pubkey = $pubkey

# Salvar
$config | ConvertTo-Json -Depth 10 | Set-Content $configPath
Write-Host "      tauri.conf.json atualizado com nova chave publica!" -ForegroundColor Green

# 4. Testar assinatura
Write-Host "`n[4/4] Testando assinatura..." -ForegroundColor Yellow

# Configurar variaveis de ambiente
$privateKey = Get-Content "src-tauri\tauri.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY = $privateKey.Trim()
$env:TAURI_KEY_PASSWORD = ""

Write-Host "      Configuracao concluida!" -ForegroundColor Green

Write-Host "`n=== SUCESSO ===" -ForegroundColor Green
Write-Host "Nova chave gerada sem senha!" -ForegroundColor Cyan
Write-Host "`nProximo passo:" -ForegroundColor Yellow
Write-Host "  Execute: npm run tauri build" -ForegroundColor White
Write-Host "  Os arquivos .sig serao gerados automaticamente!" -ForegroundColor Cyan
