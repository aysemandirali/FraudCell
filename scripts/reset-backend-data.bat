@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.."
for %%I in ("%ROOT%") do set "ROOT=%%~fI"
set "BACKEND=%ROOT%\BACKEND"

echo This will stop backend containers and DELETE PostgreSQL/RabbitMQ Docker volumes.
echo Demo data, generated DB data, and RabbitMQ state will be removed.
set /P CONFIRM=Type RESET to continue: 
if /I not "%CONFIRM%"=="RESET" (
  echo [cancelled] No data was deleted.
  exit /b 0
)

pushd "%BACKEND%"
docker compose down -v
popd

echo [done] Backend Docker volumes were deleted.
exit /b 0
