# Script de Release TOTALMENTE Automatico
# Uso: .\release-auto.ps1 -Token "seu_github_token" -Message "Descricao"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    [string]$Message = "Nova versao com melhorias e correcoes"
)

$ErrorActionPreference = "Stop"

Write-Host "Iniciando processo de release automatico..." -ForegroundColor Cyan

# 1. Git add, commit e push
Write-Host "`nAdicionando arquivos ao Git..." -ForegroundColor Yellow
git add .

Write-Host "Fazendo commit..." -ForegroundColor Yellow
git commit -m "$Message"

Write-Host "Fazendo push..." -ForegroundColor Yellow
git push

# 2. Ler versao
Write-Host "`nLendo versao do tauri.conf.json..." -ForegroundColor Yellow
$tauriConfig = Get-Content "src-tauri\tauri.conf.json" | ConvertFrom-Json
$version = $tauriConfig.version
$tag = "v$version"
Write-Host "   Versao: $version" -ForegroundColor Green

# 3. Criar e push tag (se nao existir)
Write-Host "`nCriando tag $tag..." -ForegroundColor Yellow
try {
    git tag $tag 2>$null
    Write-Host "Tag criada" -ForegroundColor Green
} catch {
    Write-Host "Tag ja existe" -ForegroundColor Yellow
}

Write-Host "Fazendo push da tag..." -ForegroundColor Yellow
git push origin $tag

# 4. Criar release no GitHub via API
Write-Host "`nCriando release no GitHub..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "token $Token"
    "Accept" = "application/vnd.github.v3+json"
}

$body = @{
    tag_name = $tag
    name = $tag
    body = $Message
    draft = $false
    prerelease = $false
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/igoraraujogaudio/desktop-pse/releases" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "Release criado com sucesso!" -ForegroundColor Green
    Write-Host "URL: $($response.html_url)" -ForegroundColor Cyan
    
    # 5. Upload do latest.json (se existir)
    if (Test-Path "latest.json") {
        Write-Host "`nFazendo upload do latest.json..." -ForegroundColor Yellow
        
        $uploadUrl = $response.upload_url -replace '\{\?name,label\}', "?name=latest.json"
        $fileContent = Get-Content "latest.json" -Raw
        
        $uploadHeaders = @{
            "Authorization" = "token $Token"
            "Content-Type" = "application/json"
        }
        
        Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $uploadHeaders -Body $fileContent
        Write-Host "latest.json enviado!" -ForegroundColor Green
    }
    
    Write-Host "`nProcesso concluido!" -ForegroundColor Green
    Write-Host "Acesse: $($response.html_url)" -ForegroundColor Cyan
    
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorDetails.errors[0].code -eq "already_exists") {
        Write-Host "Release ja existe para esta tag" -ForegroundColor Yellow
        Write-Host "Acesse: https://github.com/igoraraujogaudio/desktop-pse/releases/tag/$tag" -ForegroundColor Cyan
    } else {
        Write-Host "Erro ao criar release: $($errorDetails.message)" -ForegroundColor Red
        throw
    }
}
