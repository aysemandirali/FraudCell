@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.."
for %%I in ("%ROOT%") do set "ROOT=%%~fI"
set "BACKEND=%ROOT%\BACKEND"

echo This deletes only the lightweight hybrid PostgreSQL and RabbitMQ volumes.
echo Full Docker demo volumes and native PostgreSQL data are not touched.
set /P CONFIRM=Type RESET-HYBRID to continue: 
if /I not "%CONFIRM%"=="RESET-HYBRID" (
  echo [cancelled] No data was deleted.
  exit /b 0
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" -Action stop -Mode local
if errorlevel 1 exit /b 1

pushd "%BACKEND%"
docker compose -f compose.infra.yml down -v
set "RESULT=%ERRORLEVEL%"
popd

if not "%RESULT%"=="0" exit /b %RESULT%
echo [done] Hybrid development data was deleted.
exit /b 0
