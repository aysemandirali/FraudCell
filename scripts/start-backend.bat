@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.."
for %%I in ("%ROOT%") do set "ROOT=%%~fI"
set "BACKEND=%ROOT%\BACKEND"
set "COMPOSE_ARGS=up -d"

if /I "%~1"=="--build" set "COMPOSE_ARGS=up -d --build"

if not exist "%BACKEND%\docker-compose.yml" (
  echo [error] Backend docker-compose.yml not found: "%BACKEND%"
  exit /b 1
)

call :ensure_docker
if errorlevel 1 exit /b 1

if not exist "%BACKEND%\.env" (
  echo [env] BACKEND\.env not found. Creating it from .env.example.
  copy /Y "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
)

pushd "%BACKEND%"
echo [backend] docker compose %COMPOSE_ARGS%
docker compose %COMPOSE_ARGS%
if errorlevel 1 (
  popd
  exit /b 1
)
popd

call "%~dp0wait-backend.bat"
if errorlevel 1 (
  call "%~dp0status.bat"
  exit /b 1
)

call "%~dp0status.bat"
exit /b 0

:ensure_docker
docker info >nul 2>nul
if not errorlevel 1 exit /b 0

echo [docker] Docker is not ready. Trying to start Docker Desktop.
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
  start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
)

for /L %%I in (1,1,60) do (
  docker info >nul 2>nul
  if not errorlevel 1 exit /b 0
  timeout /t 2 /nobreak >nul
)

echo [error] Docker did not become ready in 120 seconds.
exit /b 1
