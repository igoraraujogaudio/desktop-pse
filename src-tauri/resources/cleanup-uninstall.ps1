# Script executado automaticamente durante a desinstalacao
# Remove a pasta de dados do aplicativo em ProgramData

$appDataPath = "$env:PROGRAMDATA\AlmoxarifadoDesktop"

if (Test-Path $appDataPath) {
    try {
        Remove-Item -Path $appDataPath -Recurse -Force -ErrorAction Stop
        Write-Host "Dados do aplicativo removidos: $appDataPath"
    } catch {
        Write-Host "Erro ao remover dados: $_"
    }
} else {
    Write-Host "Pasta de dados nao existe: $appDataPath"
}
