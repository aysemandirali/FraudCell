@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0openapi-contracts.ps1" -Action export
exit /b %errorlevel%
