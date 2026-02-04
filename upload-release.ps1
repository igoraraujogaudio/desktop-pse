# Script para fazer upload dos instaladores para a release v1.0.4
param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$ErrorActionPreference = "Stop"

$version = "1.0.4"
$tag = "v$version"

Write-Host "Criando release $tag no GitHub..." -ForegroundColor Cyan

$headers = @{
    "Authorization" = "token $Token"
    "Accept" = "application/vnd.github.v3+json"
}

# Criar release
$releaseBody = @{
    tag_name = $tag
    name = "v1.0.4 - Correção Modal Entrega Equipe"
    body = @"
## Correções

- **Modal de Entrega para Equipe**: Corrigido bug onde responsável e itens avulsos não estavam sendo carregados
  - Responsável agora busca todos os funcionários ativos (não apenas membros da equipe)
  - Itens avulsos agora carregam todo o catálogo da base selecionada
  - Alinhado com comportamento do site web

## Instalação

- **MSI**: Instalador tradicional Windows
- **NSIS**: Instalador portátil

Ambos incluem auto-update integrado.
"@
    draft = $false
    prerelease = $false
} | ConvertTo-Json

try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/igoraraujogaudio/desktop-pse/releases" -Method Post -Headers $headers -Body $releaseBody -ContentType "application/json"
    Write-Host "Release criado com sucesso!" -ForegroundColor Green
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorDetails.errors[0].code -eq "already_exists") {
        Write-Host "Release já existe, buscando..." -ForegroundColor Yellow
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/igoraraujogaudio/desktop-pse/releases/tags/$tag" -Headers $headers
    } else {
        throw
    }
}

Write-Host "URL da release: $($release.html_url)" -ForegroundColor Cyan

# Upload dos instaladores
$files = @(
    @{
        Path = "C:\cargo-target\release\bundle\msi\Almoxarifado Desktop_1.0.4_x64_pt-BR.msi"
        Name = "Almoxarifado-Desktop_1.0.4_x64_pt-BR.msi"
        ContentType = "application/x-msi"
    },
    @{
        Path = "C:\cargo-target\release\bundle\nsis\Almoxarifado Desktop_1.0.4_x64-setup.exe"
        Name = "Almoxarifado-Desktop_1.0.4_x64-setup.exe"
        ContentType = "application/x-msdownload"
    }
)

foreach ($file in $files) {
    if (Test-Path $file.Path) {
        Write-Host "`nFazendo upload de $($file.Name)..." -ForegroundColor Yellow
        
        $uploadUrl = $release.upload_url -replace '\{\?name,label\}', "?name=$($file.Name)"
        $fileBytes = [System.IO.File]::ReadAllBytes($file.Path)
        
        $uploadHeaders = @{
            "Authorization" = "token $Token"
            "Content-Type" = $file.ContentType
        }
        
        try {
            Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $uploadHeaders -Body $fileBytes
            Write-Host "✓ $($file.Name) enviado com sucesso!" -ForegroundColor Green
        } catch {
            Write-Host "✗ Erro ao enviar $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Arquivo não encontrado: $($file.Path)" -ForegroundColor Red
    }
}

Write-Host "`n✓ Processo concluído!" -ForegroundColor Green
Write-Host "Acesse: $($release.html_url)" -ForegroundColor Cyan
