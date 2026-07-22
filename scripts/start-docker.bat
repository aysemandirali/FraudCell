@echo off
setlocal EnableExtensions
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" -Action start -Mode docker -Build
exit /b %ERRORLEVEL%
