# Script para criar release v1.0.5 no GitHub
# Uso: .\criar-release.ps1 -Token "seu_github_token"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$ErrorActionPreference = "Stop"

$version = "1.0.5"
$tag = "v$version"

Write-Host "=== Criando Release $tag ===" -ForegroundColor Cyan

# Criar tag local
Write-Host "`nCriando tag local..." -ForegroundColor Yellow
try {
    git tag $tag 2>$null
    Write-Host "Tag criada" -ForegroundColor Green
} catch {
    Write-Host "Tag já existe localmente" -ForegroundColor Yellow
}

# Push da tag
Write-Host "Enviando tag para GitHub..." -ForegroundColor Yellow
git push origin $tag

# Criar release via API
Write-Host "`nCriando release no GitHub..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "token $Token"
    "Accept" = "application/vnd.github.v3+json"
}

$releaseBody = @{
    tag_name = $tag
    name = "v1.0.5 - Correções Modal Entrega + Biometria"
    body = @"
## Correções

### Modal de Entrega para Equipe
- **Responsável**: Corrigido bug onde responsável não estava sendo carregado
  - Agora busca todos os funcionários ativos (não apenas membros da equipe)
  - Alinhado com comportamento do site web

- **Itens Avulsos**: Corrigido bug onde itens não estavam sendo carregados
  - Agora carrega todo o catálogo da base selecionada
  - Busca local para melhor performance

### Biometria
- **Mensagens de Cadastro**: Corrigido loop de mensagens durante cadastro biométrico
  - Adicionados delays apropriados entre instruções
  - Mensagens mais claras com ícones (✓)
  - Melhor feedback visual durante as 3 capturas

## Instalação

- **MSI**: Instalador tradicional Windows (recomendado)
- **NSIS**: Instalador portátil

Ambos incluem auto-update integrado.
"@
    draft = $false
    prerelease = $false
} | ConvertTo-Json

try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/igoraraujogaudio/desktop-pse/releases" -Method Post -Headers $headers -Body $releaseBody -ContentType "application/json"
    Write-Host "✓ Release criado!" -ForegroundColor Green
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorDetails.errors[0].code -eq "already_exists") {
        Write-Host "Release já existe, buscando..." -ForegroundColor Yellow
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/igoraraujogaudio/desktop-pse/releases/tags/$tag" -Headers $headers
    } else {
        throw
    }
}

Write-Host "URL: $($release.html_url)" -ForegroundColor Cyan

# Upload dos instaladores
$files = @(
    @{
        Path = "C:\cargo-target\release\bundle\msi\Almoxarifado Desktop_1.0.5_x64_pt-BR.msi"
        Name = "Almoxarifado-Desktop_1.0.5_x64_pt-BR.msi"
        ContentType = "application/x-msi"
    },
    @{
        Path = "C:\cargo-target\release\bundle\nsis\Almoxarifado Desktop_1.0.5_x64-setup.exe"
        Name = "Almoxarifado-Desktop_1.0.5_x64-setup.exe"
        ContentType = "application/x-msdownload"
    }
)

Write-Host "`n=== Upload de Instaladores ===" -ForegroundColor Cyan

foreach ($file in $files) {
    if (Test-Path $file.Path) {
        Write-Host "`nEnviando $($file.Name)..." -ForegroundColor Yellow
        
        $uploadUrl = $release.upload_url -replace '\{\?name,label\}', "?name=$($file.Name)"
        $fileBytes = [System.IO.File]::ReadAllBytes($file.Path)
        
        $uploadHeaders = @{
            "Authorization" = "token $Token"
            "Content-Type" = $file.ContentType
        }
        
        try {
            Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $uploadHeaders -Body $fileBytes | Out-Null
            Write-Host "✓ $($file.Name) enviado!" -ForegroundColor Green
        } catch {
            Write-Host "✗ Erro: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Arquivo não encontrado: $($file.Path)" -ForegroundColor Red
    }
}

Write-Host "`n=== Concluído ===" -ForegroundColor Green
Write-Host "Release: $($release.html_url)" -ForegroundColor Cyan
