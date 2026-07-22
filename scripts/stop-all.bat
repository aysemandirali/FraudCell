@echo off
setlocal EnableExtensions
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" -Action stop -Mode all
exit /b %ERRORLEVEL%
