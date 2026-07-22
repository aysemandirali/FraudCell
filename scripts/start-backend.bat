@echo off
setlocal EnableExtensions

set "BUILD_SWITCH="
if /I "%~1"=="--build" set "BUILD_SWITCH=-Build"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" -Action start -Mode docker -BackendOnly %BUILD_SWITCH%
exit /b %ERRORLEVEL%
