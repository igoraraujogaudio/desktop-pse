# Script de Diagnóstico - DLL do Leitor Biométrico
# Verifica se a DLL correta está sendo usada no build

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Diagnóstico - DLL Leitor Biométrico" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar DLL no src-tauri (usada no bundle)
Write-Host "1. Verificando DLL no src-tauri/ (usada no instalador)..." -ForegroundColor Yellow
$srcTauriDll = ".\src-tauri\libcidbio.dll"

if (Test-Path $srcTauriDll) {
    $dllInfo = Get-Item $srcTauriDll
    $size = $dllInfo.Length
    
    Write-Host "   [OK] Encontrada: $srcTauriDll" -ForegroundColor Green
    Write-Host "   Tamanho: $size bytes" -ForegroundColor Gray
    
    # A DLL correta tem ~1.4 MB (1,369,088 bytes)
    if ($size -gt 1300000 -and $size -lt 1500000) {
        Write-Host "   [OK] TAMANHO CORRETO! (DLL do exemplo C#)" -ForegroundColor Green
    } else {
        Write-Host "   [ERRO] TAMANHO INCORRETO!" -ForegroundColor Red
        Write-Host "   Esperado: ~1,369,088 bytes (1.4 MB)" -ForegroundColor Yellow
        Write-Host "   Atual: $size bytes" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   SOLUÇÃO: Execute o comando abaixo para copiar a DLL correta:" -ForegroundColor Cyan
        Write-Host "   Copy-Item '.\IDBIO_SDK\example\C#\bin\libcidbio.dll' -Destination '.\src-tauri\libcidbio.dll' -Force" -ForegroundColor White
    }
} else {
    Write-Host "   [ERRO] DLL NAO ENCONTRADA em src-tauri/" -ForegroundColor Red
    Write-Host ""
    Write-Host "   SOLUCAO: Execute o comando abaixo:" -ForegroundColor Cyan
    Write-Host "   Copy-Item '.\IDBIO_SDK\example\C#\bin\libcidbio.dll' -Destination '.\src-tauri\libcidbio.dll' -Force" -ForegroundColor White
}

Write-Host ""

# 2. Verificar DLL de origem (exemplo C#)
Write-Host "2. Verificando DLL de origem (exemplo C#)..." -ForegroundColor Yellow
$correctDll = ".\IDBIO_SDK\example\C#\bin\libcidbio.dll"

if (Test-Path $correctDll) {
    $correctSize = (Get-Item $correctDll).Length
    Write-Host "   [OK] DLL correta encontrada" -ForegroundColor Green
    Write-Host "   Tamanho: $correctSize bytes" -ForegroundColor Gray
} else {
    Write-Host "   [ERRO] DLL de origem nao encontrada!" -ForegroundColor Red
    Write-Host "   Caminho esperado: $correctDll" -ForegroundColor Yellow
}

Write-Host ""

# 3. Verificar DLL incorreta (win64)
Write-Host "3. Verificando DLL incorreta (win64 - NÃO usar)..." -ForegroundColor Yellow
$incorrectDll = ".\IDBIO_SDK\lib\C_C++\win64\libcidbio.dll"

if (Test-Path $incorrectDll) {
    $incorrectSize = (Get-Item $incorrectDll).Length
    Write-Host "   [INFO] DLL win64 encontrada (NAO usar esta!)" -ForegroundColor Gray
    Write-Host "   Tamanho: $incorrectSize bytes" -ForegroundColor Gray
    Write-Host "   [AVISO] Esta versao NAO funciona em producao (falta dependencias)" -ForegroundColor Yellow
}

Write-Host ""

# 4. Verificar build.rs
Write-Host "4. Verificando configuração do build.rs..." -ForegroundColor Yellow
$buildRs = ".\src-tauri\build.rs"

if (Test-Path $buildRs) {
    $buildContent = Get-Content $buildRs -Raw
    
    if ($buildContent -match 'example/C#/bin') {
        Write-Host "   [OK] build.rs configurado CORRETAMENTE (example/C#/bin)" -ForegroundColor Green
    } elseif ($buildContent -match 'lib/C_C\+\+/win64') {
        Write-Host "   [ERRO] build.rs configurado INCORRETAMENTE (win64)" -ForegroundColor Red
        Write-Host "   [AVISO] Precisa apontar para: IDBIO_SDK/example/C#/bin" -ForegroundColor Yellow
    } else {
        Write-Host "   [AVISO] Configuracao nao identificada" -ForegroundColor Yellow
    }
}

Write-Host ""

# 5. Verificar tauri.conf.json
Write-Host "5. Verificando tauri.conf.json..." -ForegroundColor Yellow
$tauriConf = ".\src-tauri\tauri.conf.json"

if (Test-Path $tauriConf) {
    $confContent = Get-Content $tauriConf -Raw
    
    if ($confContent -match '"libcidbio\.dll"') {
        Write-Host "   [OK] libcidbio.dll esta listada nos resources do bundle" -ForegroundColor Green
    } else {
        Write-Host "   [ERRO] libcidbio.dll NAO esta nos resources!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "DLL CORRETA:" -ForegroundColor Green
Write-Host "  Origem: .\IDBIO_SDK\example\C#\bin\libcidbio.dll" -ForegroundColor Gray
Write-Host "  Tamanho: ~1,369,088 bytes (1.4 MB)" -ForegroundColor Gray
Write-Host "  [OK] Inclui todas as dependencias necessarias" -ForegroundColor Gray
Write-Host ""
Write-Host "DLL INCORRETA (NAO USAR):" -ForegroundColor Red
Write-Host "  .\IDBIO_SDK\lib\C_C++\win64\libcidbio.dll" -ForegroundColor Gray
Write-Host "  [ERRO] Versao pura sem dependencias - NAO funciona em producao" -ForegroundColor Gray
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "  1. Certifique-se que src-tauri\libcidbio.dll tem ~1.4 MB" -ForegroundColor White
Write-Host "  2. Certifique-se que build.rs aponta para example/C#/bin" -ForegroundColor White
Write-Host "  3. Faca um novo build: npm run tauri build" -ForegroundColor White
Write-Host "  4. Teste o instalador em outro PC" -ForegroundColor White
Write-Host ""
