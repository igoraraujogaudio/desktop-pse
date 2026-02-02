# Assinar executavel e publicar release
# Uso: .\assinar-e-publicar.ps1 -Token "seu_token" -Message "Descricao"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    [string]$Message = "Nova versao com melhorias"
)

$ErrorActionPreference = "Stop"

Write-Host "=== ASSINAR E PUBLICAR RELEASE ===" -ForegroundColor Cyan

# 1. Ler versao
Write-Host "`n[1/5] Lendo versao..." -ForegroundColor Yellow
$tauriConfig = Get-Content "src-tauri\tauri.conf.json" | ConvertFrom-Json
$version = $tauriConfig.version
$tag = "v$version"
Write-Host "      Versao: $version" -ForegroundColor Green

# 2. Localizar arquivo EXE
Write-Host "`n[2/5] Localizando arquivo EXE..." -ForegroundColor Yellow
$exePath = "C:\cargo-target\release\bundle\nsis\Almoxarifado Desktop_$version`_x64-setup.exe"

if (-not (Test-Path $exePath)) {
    Write-Host "      ERRO: Arquivo nao encontrado: $exePath" -ForegroundColor Red
    Write-Host "      Execute primeiro: npm run tauri build" -ForegroundColor Yellow
    exit 1
}

Write-Host "      Encontrado: $exePath" -ForegroundColor Green

# 3. Assinar arquivo manualmente
Write-Host "`n[3/5] Assinando arquivo..." -ForegroundColor Yellow

$privateKey = Get-Content "src-tauri\tauri.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY = $privateKey.Trim()
$env:TAURI_KEY_PASSWORD = ""

# Usar tauri CLI para assinar
try {
    & npm run tauri signer sign "$exePath" 2>&1 | Out-Null
} catch {
    # Se falhar, criar assinatura vazia (para teste)
    Write-Host "      Aviso: Nao foi possivel assinar automaticamente" -ForegroundColor Yellow
    Write-Host "      Criando latest.json sem assinatura para teste..." -ForegroundColor Yellow
}

# 4. Criar latest.json
Write-Host "`n[4/5] Criando latest.json..." -ForegroundColor Yellow

$sigPath = "$exePath.sig"
$signature = ""

if (Test-Path $sigPath) {
    $signature = Get-Content $sigPath -Raw
    Write-Host "      Assinatura encontrada!" -ForegroundColor Green
} else {
    Write-Host "      Aviso: Arquivo .sig nao encontrado, usando assinatura vazia" -ForegroundColor Yellow
}

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
Write-Host "      latest.json criado!" -ForegroundColor Green

# 5. Git e Release
Write-Host "`n[5/5] Publicando no GitHub..." -ForegroundColor Yellow

git add latest.json
git commit -m "$Message - latest.json atualizado"
git push

try {
    git tag -d $tag 2>$null
    git push origin :refs/tags/$tag 2>$null
} catch {}

git tag $tag
git push origin $tag

# Criar release
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
    
    # Criar novo release
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
    
    # Upload SIG se existir
    if (Test-Path $sigPath) {
        Write-Host "      Enviando $exeName.sig..." -ForegroundColor Yellow
        $uploadUrl = $response.upload_url -replace '\{\?name,label\}', "?name=$exeName.sig"
        $sigContent = [System.IO.File]::ReadAllBytes($sigPath)
        Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $uploadHeaders -Body $sigContent
    }
    
    Write-Host "`n=== SUCESSO! ===" -ForegroundColor Green
    Write-Host "Release: $($response.html_url)" -ForegroundColor Cyan
    Write-Host "Endpoint: https://github.com/igoraraujogaudio/desktop-pse/releases/download/$tag/latest.json" -ForegroundColor Cyan
    
} catch {
    Write-Host "      ERRO: $($_.Exception.Message)" -ForegroundColor Red
    throw
}
