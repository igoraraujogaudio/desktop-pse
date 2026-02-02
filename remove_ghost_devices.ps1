# Script para remover dispositivos iDBio fantasma
# EXECUTE COMO ADMINISTRADOR

Write-Host "=== Removendo Dispositivos iDBio Fantasma ===" -ForegroundColor Cyan

# Listar dispositivos iDBio com problema
Write-Host "`nDispositivos iDBio encontrados:" -ForegroundColor Yellow
$devices = Get-PnpDevice -Class Ports | Where-Object {$_.FriendlyName -like '*iDBio*'}
$devices | Select-Object Status, FriendlyName, InstanceId | Format-Table -AutoSize

# Remover dispositivos com status Unknown
Write-Host "`nRemovendo dispositivos com status Unknown..." -ForegroundColor Red
foreach ($device in $devices) {
    if ($device.Status -eq 'Unknown') {
        Write-Host "Removendo: $($device.FriendlyName) - $($device.InstanceId)" -ForegroundColor Yellow
        try {
            pnputil /remove-device $device.InstanceId
            Write-Host "  ✓ Removido com sucesso" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Erro ao remover: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "Mantendo: $($device.FriendlyName) (Status: $($device.Status))" -ForegroundColor Green
    }
}

Write-Host "`n=== Dispositivos após limpeza ===" -ForegroundColor Cyan
Get-PnpDevice -Class Ports | Where-Object {$_.FriendlyName -like '*iDBio*'} | Select-Object Status, FriendlyName, InstanceId | Format-Table -AutoSize

Write-Host "`nAgora:" -ForegroundColor Yellow
Write-Host "1. Desconecte o leitor USB" -ForegroundColor White
Write-Host "2. Aguarde 5 segundos" -ForegroundColor White
Write-Host "3. Reconecte o leitor USB" -ForegroundColor White
Write-Host "4. Teste novamente no aplicativo" -ForegroundColor White
