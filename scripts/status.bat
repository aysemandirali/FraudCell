@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.."
for %%I in ("%ROOT%") do set "ROOT=%%~fI"
set "BACKEND=%ROOT%\BACKEND"

if not exist "%BACKEND%\docker-compose.yml" (
  echo [error] Backend docker-compose.yml not found: "%BACKEND%"
  exit /b 1
)

pushd "%BACKEND%"
echo [docker] compose status
docker compose ps
popd

echo.
echo [health] public gateway
powershell -NoProfile -ExecutionPolicy Bypass -Command "$url='http://127.0.0.1:8080/health/ready'; try { $r=Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 5; Write-Host ('Edge Gateway: ' + $r.Content.Trim()) } catch { Write-Host 'Edge Gateway: DOWN' }"

echo.
echo [urls]
echo API Gateway:   http://127.0.0.1:8080
echo RabbitMQ UI:   http://127.0.0.1:15672
echo Frontend:      http://localhost:5173
exit /b 0
