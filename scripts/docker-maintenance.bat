@echo off
setlocal EnableExtensions

set "ACTION=report"
if /I "%~1"=="prune-build-cache" set "ACTION=prune-build-cache"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0docker-maintenance.ps1" -Action "%ACTION%"
exit /b %ERRORLEVEL%
