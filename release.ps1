# Script de Release Automatico
# Uso: .\release.ps1

param(
    [string]$Message = "Nova versao"
)

Write-Host "Iniciando processo de release..." -ForegroundColor Cyan

# 1. Git add, commit e push
Write-Host "`nAdicionando arquivos ao Git..." -ForegroundColor Yellow
git add .

Write-Host "`nFazendo commit..." -ForegroundColor Yellow
git commit -m "$Message"

Write-Host "`nFazendo push..." -ForegroundColor Yellow
git push

# 2. Ler versao do tauri.conf.json
Write-Host "`nLendo versao do tauri.conf.json..." -ForegroundColor Yellow
$tauriConfig = Get-Content "src-tauri\tauri.conf.json" | ConvertFrom-Json
$version = $tauriConfig.version
Write-Host "   Versao: $version" -ForegroundColor Green

# 3. Criar e fazer push da tag
$tag = "v$version"
Write-Host "`nCriando tag $tag..." -ForegroundColor Yellow
git tag $tag

Write-Host "`nFazendo push da tag..." -ForegroundColor Yellow
git push origin $tag

Write-Host "`nProcesso concluido!" -ForegroundColor Green
Write-Host "`nProximos passos:" -ForegroundColor Cyan
Write-Host "   1. Acesse: https://github.com/igoraraujogaudio/desktop-pse/releases" -ForegroundColor White

Write-Host "   2. Clique em Draft a new release" -ForegroundColor White
Write-Host "   3. Selecione a tag: $tag" -ForegroundColor White
Write-Host "   4. Faca upload dos arquivos de build" -ForegroundColor White
Write-Host "   5. Publique o release" -ForegroundColor White
