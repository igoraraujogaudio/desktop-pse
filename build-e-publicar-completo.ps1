# Script DEFINITIVO - Build com assinatura + Publicacao no GitHub
# Uso: .\build-e-publicar-completo.ps1 -Token "seu_token" -Message "Descricao"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    [string]$Message = "Nova versao"
)

$ErrorActionPreference = "Stop"

Write-Host "=== BUILD E PUBLICACAO COMPLETA ===" -ForegroundColor Cyan

# 1. Ler versao
Write-Host "`n[1/7] Lendo versao..." -ForegroundColor Yellow
$tauriConfig = Get-Content "src-tauri\tauri.conf.json" | ConvertFrom-Json
$version = $tauriConfig.version
$tag = "v$version"
Write-Host "      Versao: $version" -ForegroundColor Green

# 2. Build
Write-Host "`n[2/7] Gerando build..." -ForegroundColor Yellow
npm run tauri build

# 3. Localizar EXE
Write-Host "`n[3/7] Localizando arquivo EXE..." -ForegroundColor Yellow
$exePath = "C:\cargo-target\release\bundle\nsis\Almoxarifado Desktop_$version`_x64-setup.exe"

if (-not (Test-Path $exePath)) {
    Write-Host "      ERRO: $exePath nao encontrado!" -ForegroundColor Red
    exit 1
}
Write-Host "      Encontrado: $exePath" -ForegroundColor Green

# 4. Assinar EXE
Write-Host "`n[4/7] Assinando arquivo..." -ForegroundColor Yellow
npx tauri signer sign "$exePath" -f "src-tauri\tauri.key" -p "empty"

$sigPath = "$exePath.sig"
if (-not (Test-Path $sigPath)) {
    Write-Host "      ERRO: Arquivo .sig nao foi gerado!" -ForegroundColor Red
    exit 1
}
Write-Host "      Assinatura gerada: $sigPath" -ForegroundColor Green

# 5. Criar latest.json
Write-Host "`n[5/7] Criando latest.json..." -ForegroundColor Yellow
$signature = Get-Content $sigPath -Raw
$exeName = Split-Path $exePath -Leaf

$latestJson = @{
    version = $version
    notes = $Message
    pub_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    platforms = @{
        "windows-x86_64" = @{
            signature = $signature.Trim()
            url = "https://github.com/igoraraujogaudio/desktop-pse/releases/download/$tag/$exeName"
        }
    }
} | ConvertTo-Json -Depth 10

$latestJson | Out-File "latest.json" -Encoding UTF8
Write-Host "      latest.json criado com assinatura!" -ForegroundColor Green

# 6. Git
Write-Host "`n[6/7] Git add, commit, push e tag..." -ForegroundColor Yellow
git add .
git commit -m "$Message"
git push

try {
    git tag -d $tag 2>$null
    git push origin :refs/tags/$tag 2>$null
} catch {}

git tag $tag
git push origin $tag
Write-Host "      Tag $tag enviada!" -ForegroundColor Green

# 7. GitHub Release
Write-Host "`n[7/7] Criando release no GitHub..." -ForegroundColor Yellow

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
    # Deletar release existente
    try {
        $existingRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/igoraraujogaudio/desktop-pse/releases/tags/$tag" -Headers $headers -Method Get
        Invoke-RestMethod -Uri "https://api.github.com/repos/igoraraujogaudio/desktop-pse/releases/$($existingRelease.id)" -Headers $headers -Method Delete
        Write-Host "      Release anterior removido" -ForegroundColor Yellow
    } catch {}
    
    # Criar release
    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/igoraraujogaudio/desktop-pse/releases" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    
    # Upload latest.json
    Write-Host "      Enviando latest.json..." -ForegroundColor Yellow
    $uploadUrl = $response.upload_url -replace '\{\?name,label\}', "?name=latest.json"
    $uploadHeaders = @{
        "Authorization" = "token $Token"
        "Content-Type" = "application/json"
    }
    Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $uploadHeaders -Body $latestJson
    
    # Upload EXE
    Write-Host "      Enviando $exeName..." -ForegroundColor Yellow
    $uploadUrl = $response.upload_url -replace '\{\?name,label\}', "?name=$exeName"
    $uploadHeaders = @{
        "Authorization" = "token $Token"
        "Content-Type" = "application/octet-stream"
    }
    $exeContent = [System.IO.File]::ReadAllBytes($exePath)
    Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $uploadHeaders -Body $exeContent
    
    # Upload SIG
    Write-Host "      Enviando $exeName.sig..." -ForegroundColor Yellow
    $uploadUrl = $response.upload_url -replace '\{\?name,label\}', "?name=$exeName.sig"
    $sigContent = [System.IO.File]::ReadAllBytes($sigPath)
    Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $uploadHeaders -Body $sigContent
    
    Write-Host "`n=== SUCESSO TOTAL! ===" -ForegroundColor Green
    Write-Host "Release: $($response.html_url)" -ForegroundColor Cyan
    Write-Host "Updater endpoint: https://github.com/igoraraujogaudio/desktop-pse/releases/download/$tag/latest.json" -ForegroundColor Cyan
    Write-Host "`nO sistema de atualizacao automatica esta FUNCIONANDO!" -ForegroundColor Green
    
} catch {
    Write-Host "      ERRO: $($_.Exception.Message)" -ForegroundColor Red
    throw
}
