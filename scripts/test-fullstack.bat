@echo off
setlocal EnableExtensions

set "MODE=hybrid"
if not "%~1"=="" set "MODE=%~1"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0test-fullstack.ps1" -Mode "%MODE%"
exit /b %ERRORLEVEL%
