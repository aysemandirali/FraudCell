@echo off
setlocal EnableExtensions

set "SERVICE=all"
if not "%~1"=="" set "SERVICE=%~1"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" -Action logs -Mode all -Service "%SERVICE%"
exit /b %ERRORLEVEL%
