@echo off
setlocal EnableExtensions
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" -Action status -Mode all
exit /b %ERRORLEVEL%
