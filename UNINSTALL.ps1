# Script de Desinstalação Completa - Almoxarifado Desktop
# Remove o aplicativo e todos os arquivos criados durante a execução

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Desinstalação Completa - Almoxarifado Desktop" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Desinstalar via MSI
Write-Host "1. Procurando instalação MSI..." -ForegroundColor Yellow
$app = Get-WmiObject -Class Win32_Product | Where-Object { $_.Name -like "*Almoxarifado Desktop*" }

if ($app) {
    Write-Host "   Encontrado: $($app.Name) v$($app.Version)" -ForegroundColor Green
    Write-Host "   Desinstalando via MSI..." -ForegroundColor Yellow
    $app.Uninstall() | Out-Null
    Write-Host "   ✓ Desinstalação MSI concluída" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Instalação MSI não encontrada" -ForegroundColor Yellow
}

Write-Host ""

# 2. Remover arquivos residuais
Write-Host "2. Removendo arquivos residuais..." -ForegroundColor Yellow

$installPaths = @(
    "$env:ProgramFiles\Almoxarifado Desktop",
    "$env:LOCALAPPDATA\Almoxarifado Desktop"
)

foreach ($path in $installPaths) {
    if (Test-Path $path) {
        Write-Host "   Removendo: $path" -ForegroundColor Yellow
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   ✓ Removido" -ForegroundColor Green
    }
}

Write-Host ""

# 3. Limpar registro (opcional)
Write-Host "3. Limpando entradas do registro..." -ForegroundColor Yellow
$regPaths = @(
    "HKCU:\Software\PSE\Almoxarifado Desktop",
    "HKLM:\Software\PSE\Almoxarifado Desktop"
)

foreach ($regPath in $regPaths) {
    if (Test-Path $regPath) {
        Write-Host "   Removendo: $regPath" -ForegroundColor Yellow
        Remove-Item -Path $regPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   ✓ Removido" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Desinstalação completa finalizada!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
