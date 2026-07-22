@echo off
setlocal EnableExtensions

call "%~dp0start-backend.bat" --build
exit /b %ERRORLEVEL%
