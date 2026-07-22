@echo off
setlocal EnableExtensions
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" -Action start -Mode hybrid
exit /b %ERRORLEVEL%
