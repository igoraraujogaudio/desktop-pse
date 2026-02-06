# Script para buildar com assinatura
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "src-tauri\tauri.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""

Write-Host "Building with signing enabled..."
npm run tauri:build
