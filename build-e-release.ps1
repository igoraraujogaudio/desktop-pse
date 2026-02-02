# Script Completo: Build + Release Automatico
# Uso: .\build-e-release.ps1 -Token "seu_token" -Message "Descricao"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    [string]$Message = "Nova versao com melhorias e correcoes"
)

$ErrorActionPreference = "Stop"

Write-Host "=== BUILD E RELEASE AUTOMATICO ===" -ForegroundColor Cyan

# 1. Ler versao
Write-Host "`n[1/6] Lendo versao..." -ForegroundColor Yellow
$tauriConfig = Get-Content "src-tauri\tauri.conf.json" | ConvertFrom-Json
$version = $tauriConfig.version
$tag = "v$version"
Write-Host "      Versao: $version" -ForegroundColor Green

# 2. Build do Tauri
Write-Host "`n[2/6] Gerando build do Tauri..." -ForegroundColor Yellow
Write-Host "      Isso pode demorar alguns minutos..." -ForegroundColor Gray
npm run tauri build

# 3. Localizar arquivos gerados
Write-Host "`n[3/6] Localizando arquivos de build..." -ForegroundColor Yellow

$buildPaths = @(
    "src-tauri\target\release\bundle\nsis",
    "src-tauri\target\release\bundle\msi",
    "..\target\release\bundle\nsis",
    "..\target\release\bundle\msi",
    "C:\cargo-target\release\bundle\nsis",
    "C:\cargo-target\release\bundle\msi"
)

$exeFile = $null
$sigFile = $null

foreach ($path in $buildPaths) {
    if (Test-Path $path) {
        $exeFile = Get-ChildItem -Path $path -Filter "*setup.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        $sigFile = Get-ChildItem -Path $path -Filter "*setup.exe.sig" -ErrorAction SilentlyContinue | Select-Object -First 1
        
        if ($exeFile -and $sigFile) {
            Write-Host "      Encontrado em: $path" -ForegroundColor Green
            break
        }
    }
}

if (-not $exeFile -or -not $sigFile) {
    Write-Host "      ERRO: Arquivos de build nao encontrados!" -ForegroundColor Red
    Write-Host "      Procurado em:" -ForegroundColor Yellow
    foreach ($path in $buildPaths) {
        Write-Host "        - $path" -ForegroundColor Gray
    }
    exit 1
}

Write-Host "      EXE: $($exeFile.Name)" -ForegroundColor Green
Write-Host "      SIG: $($sigFile.Name)" -ForegroundColor Green

# 4. Ler assinatura e criar latest.json
Write-Host "`n[4/6] Criando latest.json com assinatura..." -ForegroundColor Yellow
$signature = Get-Content $sigFile.FullName -Raw

$latestJson = @{
    version = $version
    notes = $Message
    pub_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    platforms = @{
        "windows-x86_64" = @{
            signature = $signature.Trim()
            url = "https://github.com/igoraraujogaudio/desktop-pse/releases/download/$tag/$($exeFile.Name)"
        }
    }
} | ConvertTo-Json -Depth 10

$latestJson | Out-File "latest.json" -Encoding UTF8
Write-Host "      latest.json criado com assinatura!" -ForegroundColor Green

# 5. Git add, commit, push e tag
Write-Host "`n[5/6] Git add, commit, push e tag..." -ForegroundColor Yellow
git add .
git commit -m "$Message"
git push

try {
    git tag $tag 2>$null
} catch {}
git push origin $tag

# 6. Criar release no GitHub
Write-Host "`n[6/6] Criando release no GitHub..." -ForegroundColor Yellow

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
    # Deletar release existente se houver
    try {
        $existingRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/igoraraujogaudio/desktop-pse/releases/tags/$tag" -Headers $headers -Method Get
        Invoke-RestMethod -Uri "https://api.github.com/repos/igoraraujogaudio/desktop-pse/releases/$($existingRelease.id)" -Headers $headers -Method Delete
        Write-Host "      Release anterior removido" -ForegroundColor Yellow
    } catch {}
    
    # Criar novo release
    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/igoraraujogaudio/desktop-pse/releases" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "      Release criado!" -ForegroundColor Green
    
    # Upload latest.json
    Write-Host "      Enviando latest.json..." -ForegroundColor Yellow
    $uploadUrl = $response.upload_url -replace '\{\?name,label\}', "?name=latest.json"
    $uploadHeaders = @{
        "Authorization" = "token $Token"
        "Content-Type" = "application/json"
    }
    Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $uploadHeaders -Body $latestJson
    Write-Host "      latest.json enviado!" -ForegroundColor Green
    
    # Upload EXE
    Write-Host "      Enviando $($exeFile.Name)..." -ForegroundColor Yellow
    $uploadUrl = $response.upload_url -replace '\{\?name,label\}', "?name=$($exeFile.Name)"
    $uploadHeaders = @{
        "Authorization" = "token $Token"
        "Content-Type" = "application/octet-stream"
    }
    $exeContent = [System.IO.File]::ReadAllBytes($exeFile.FullName)
    Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $uploadHeaders -Body $exeContent
    Write-Host "      $($exeFile.Name) enviado!" -ForegroundColor Green
    
    # Upload SIG
    Write-Host "      Enviando $($sigFile.Name)..." -ForegroundColor Yellow
    $uploadUrl = $response.upload_url -replace '\{\?name,label\}', "?name=$($sigFile.Name)"
    $uploadHeaders = @{
        "Authorization" = "token $Token"
        "Content-Type" = "application/octet-stream"
    }
    $sigContent = [System.IO.File]::ReadAllBytes($sigFile.FullName)
    Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $uploadHeaders -Body $sigContent
    Write-Host "      $($sigFile.Name) enviado!" -ForegroundColor Green
    
    Write-Host "`n=== SUCESSO! ===" -ForegroundColor Green
    Write-Host "Release: $($response.html_url)" -ForegroundColor Cyan
    Write-Host "Updater endpoint: https://github.com/igoraraujogaudio/desktop-pse/releases/download/$tag/latest.json" -ForegroundColor Cyan
    
} catch {
    Write-Host "      ERRO: $($_.Exception.Message)" -ForegroundColor Red
    throw
}
