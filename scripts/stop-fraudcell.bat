@echo off
rem ===========================================================================
rem  FraudCell - Tum sistemi durdurur.
rem
rem  Varsayilan            : konteynerleri durdurur, VERILER KORUNUR.
rem  scripts\stop-fraudcell.bat --temizle
rem                          : konteynerleri VE tum verileri siler (sifir baslangic).
rem ===========================================================================

setlocal EnableExtensions
title FraudCell - Sistem Durduruluyor

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%..\BACKEND"

echo.
echo  ============================================================
echo    FraudCell - Sistem Durduruluyor
echo  ============================================================
echo.

where docker >nul 2>&1
if errorlevel 1 goto :no_docker

if /I "%~1"=="--temizle" goto :purge

rem --- Normal durdurma (veriler korunur) ---
pushd "%BACKEND_DIR%"
docker compose down --remove-orphans
popd
echo.
echo  [OK] Sistem durduruldu. Veriler korundu.
echo      Tekrar baslatmak icin: scripts\start-fraudcell.bat
goto :end

rem --- Temizle: konteyner + volume siler ---
:purge
echo  [!] --temizle secildi: konteynerler VE tum veriler silinecek.
echo      Bir sonraki baslatmada veritabani sifirdan kurulur.
echo.
choice /C EH /N /M "  Emin misiniz? [E]vet / [H]ayir: "
if errorlevel 2 goto :cancelled

pushd "%BACKEND_DIR%"
docker compose down -v --remove-orphans
popd
echo.
echo  [OK] Sistem durduruldu ve veriler silindi.
goto :end

:cancelled
echo.
echo  Iptal edildi. Hicbir sey silinmedi.
goto :end

:no_docker
echo  [HATA] Docker bulunamadi.

:end
echo.
pause
exit /b 0
