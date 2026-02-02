# Script de Release Completo - Git + GitHub Release Automático
# Uso: .\release-completo.ps1 -Message "Descrição da versão"

param(
    [string]$Message = "Nova versão com melhorias e correções"
)

Write-Host "🚀 Iniciando processo de release completo..." -ForegroundColor Cyan

# 1. Git add, commit e push
Write-Host "`n📦 Git add..." -ForegroundColor Yellow
git add .

Write-Host "💾 Git commit..." -ForegroundColor Yellow
git commit -m "$Message"

Write-Host "⬆️  Git push..." -ForegroundColor Yellow
git push

# 2. Ler versão
Write-Host "`n🔍 Lendo versão..." -ForegroundColor Yellow
$tauriConfig = Get-Content "src-tauri\tauri.conf.json" | ConvertFrom-Json
$version = $tauriConfig.version
$tag = "v$version"
Write-Host "   Versão: $version" -ForegroundColor Green

# 3. Criar e push tag
Write-Host "`n🏷️  Criando tag $tag..." -ForegroundColor Yellow
git tag $tag
git push origin $tag

# 4. Criar release no GitHub usando GitHub CLI (gh)
Write-Host "`n🎉 Criando release no GitHub..." -ForegroundColor Yellow

# Verificar se gh está instalado
if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Host "   Usando GitHub CLI para criar release..." -ForegroundColor Cyan
    
    # Criar release
    gh release create $tag `
        --title "$tag" `
        --notes "$Message" `
        --repo igoraraujogaudio/desktop-pse
    
    Write-Host "`n✅ Release criado com sucesso!" -ForegroundColor Green
    Write-Host "`n📋 Próximo passo:" -ForegroundColor Cyan
    Write-Host "   Execute o build e faça upload dos arquivos:" -ForegroundColor White
    Write-Host "   npm run tauri build" -ForegroundColor Yellow
    Write-Host "`n   Depois faça upload dos arquivos para o release:" -ForegroundColor White
    Write-Host "   https://github.com/igoraraujogaudio/desktop-pse/releases/tag/$tag" -ForegroundColor Cyan
} else {
    Write-Host "   ⚠️  GitHub CLI (gh) não instalado" -ForegroundColor Yellow
    Write-Host "`n📋 Próximos passos manuais:" -ForegroundColor Cyan
    Write-Host "   1. Acesse: https://github.com/igoraraujogaudio/desktop-pse/releases/new" -ForegroundColor White
    Write-Host "   2. Selecione a tag: $tag" -ForegroundColor White
    Write-Host "   3. Título: $tag" -ForegroundColor White
    Write-Host "   4. Descrição: $Message" -ForegroundColor White
    Write-Host "   5. Faça upload dos arquivos de build" -ForegroundColor White
    Write-Host "   6. Publique o release" -ForegroundColor White
}
