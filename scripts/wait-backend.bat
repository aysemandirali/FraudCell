@echo off
setlocal EnableExtensions

echo [health] Waiting for Edge Gateway...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$url='http://127.0.0.1:8080/health/ready'; $deadline=(Get-Date).AddSeconds(150); while((Get-Date) -lt $deadline){ try { $r=Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 5; if($r.Content.Trim() -eq 'Healthy'){ Write-Host '[health] edge gateway is Healthy'; exit 0 } } catch { }; Write-Host '[health] still waiting: Edge Gateway'; Start-Sleep -Seconds 3 }; Write-Host '[health] timeout waiting for Edge Gateway'; exit 1"
exit /b %ERRORLEVEL%
