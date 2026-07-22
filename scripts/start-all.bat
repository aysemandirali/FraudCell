@echo off
setlocal EnableExtensions

rem Recommended daily mode: only PostgreSQL and RabbitMQ use Docker.
call "%~dp0start-hybrid.bat"
exit /b %ERRORLEVEL%
