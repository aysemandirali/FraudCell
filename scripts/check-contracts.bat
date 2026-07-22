@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0openapi-contracts.ps1" -Action check
exit /b %errorlevel%
