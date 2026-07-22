@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.."
for %%I in ("%ROOT%") do set "ROOT=%%~fI"
set "BACKEND=%ROOT%\BACKEND"

pushd "%BACKEND%"
echo [backend] Stopping Docker services.
docker compose down
popd

echo [done] Docker backend stopped.
echo [note] If the frontend terminal is open, close that terminal with Ctrl+C.
exit /b 0
