# Script para verificar status do dispositivo iDBio
Write-Host "=== Verificando Dispositivos USB ===" -ForegroundColor Cyan

# Listar dispositivos USB
Write-Host "`nDispositivos USB conectados:" -ForegroundColor Yellow
Get-PnpDevice -Class USB | Where-Object {$_.Status -ne 'Unknown'} | Select-Object Status, Class, FriendlyName, InstanceId | Format-Table -AutoSize

# Listar portas COM
Write-Host "`nPortas COM disponíveis:" -ForegroundColor Yellow
Get-PnpDevice -Class Ports | Select-Object Status, FriendlyName, InstanceId | Format-Table -AutoSize

# Verificar dispositivos com problema
Write-Host "`nDispositivos com problema:" -ForegroundColor Red
Get-PnpDevice | Where-Object {$_.Status -eq 'Error' -or $_.Status -eq 'Degraded'} | Select-Object Status, Class, FriendlyName, InstanceId | Format-Table -AutoSize

# Verificar drivers instalados relacionados ao iDBio
Write-Host "`nDrivers instalados (iDBio/Control):" -ForegroundColor Yellow
pnputil /enum-drivers | Select-String -Pattern "idbio|control" -Context 2,2

Write-Host "`n=== Verificação Concluída ===" -ForegroundColor Cyan
