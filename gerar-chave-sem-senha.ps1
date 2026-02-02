# Gerar chave sem senha de forma automatica
# Usa echo para enviar senha vazia automaticamente

$ErrorActionPreference = "Stop"

Write-Host "=== GERAR CHAVE SEM SENHA ===" -ForegroundColor Cyan

# Deletar chaves existentes
Write-Host "`nRemovendo chaves antigas..." -ForegroundColor Yellow
Remove-Item "src-tauri\tauri.key" -Force -ErrorAction SilentlyContinue
Remove-Item "src-tauri\tauri.key.pub" -Force -ErrorAction SilentlyContinue

# Gerar nova chave com senha vazia (automatico)
Write-Host "Gerando nova chave sem senha..." -ForegroundColor Yellow

# Criar arquivo temporario com senhas vazias
$tempFile = [System.IO.Path]::GetTempFileName()
"`n`n" | Out-File $tempFile -NoNewline

# Executar comando com input automatico
Get-Content $tempFile | npm run tauri signer generate -- -w "src-tauri\tauri.key"

Remove-Item $tempFile -Force

# Ler chave publica
Write-Host "`nLendo chave publica..." -ForegroundColor Yellow
$pubkey = Get-Content "src-tauri\tauri.key.pub" -Raw

Write-Host "`n=== CHAVE GERADA ===" -ForegroundColor Green
Write-Host "Chave publica:" -ForegroundColor Cyan
Write-Host $pubkey -ForegroundColor White

Write-Host "`nAtualizando tauri.conf.json..." -ForegroundColor Yellow
# Atualizar tauri.conf.json
$configPath = "src-tauri\tauri.conf.json"
$configContent = Get-Content $configPath -Raw

# Substituir pubkey usando regex
$newConfigContent = $configContent -replace '"pubkey":\s*"[^"]*"', "`"pubkey`": `"$($pubkey.Trim())`""

$newConfigContent | Set-Content $configPath

Write-Host "tauri.conf.json atualizado!" -ForegroundColor Green

Write-Host "`n=== CONCLUIDO ===" -ForegroundColor Green
Write-Host "Chave gerada SEM senha!" -ForegroundColor Cyan
Write-Host "Agora execute: .\build-final.ps1" -ForegroundColor Yellow
