@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.."
for %%I in ("%ROOT%") do set "ROOT=%%~fI"
set "BACKEND=%ROOT%\BACKEND"

pushd "%BACKEND%"
if "%~1"=="" (
  docker compose logs -f --tail=120
) else (
  docker compose logs -f --tail=120 "%~1"
)
popd
exit /b %ERRORLEVEL%
