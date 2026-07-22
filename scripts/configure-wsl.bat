@echo off
setlocal EnableExtensions

set "ACTION=check"
if /I "%~1"=="--apply" set "ACTION=apply"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0configure-wsl.ps1" -Action "%ACTION%"
exit /b %ERRORLEVEL%
