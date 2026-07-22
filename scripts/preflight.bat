@echo off
setlocal EnableExtensions

set "MODE=hybrid"
if not "%~1"=="" set "MODE=%~1"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" -Action preflight -Mode "%MODE%"
exit /b %ERRORLEVEL%
