@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.."
for %%I in ("%ROOT%") do set "ROOT=%%~fI"
set "FRONTEND=%ROOT%\FRONTEND\app"

call "%~dp0start-backend.bat"
if errorlevel 1 exit /b 1

if not exist "%FRONTEND%\package.json" (
  echo [error] Frontend package.json not found: "%FRONTEND%"
  exit /b 1
)

if not exist "%FRONTEND%\.env" (
  echo [env] FRONTEND\app\.env not found. Creating it from .env.example.
  copy /Y "%FRONTEND%\.env.example" "%FRONTEND%\.env" >nul
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [error] npm was not found in PATH. Install Node.js first.
  exit /b 1
)

if not exist "%FRONTEND%\node_modules" (
  echo [frontend] node_modules not found. Running npm install once.
  pushd "%FRONTEND%"
  npm install
  if errorlevel 1 (
    popd
    exit /b 1
  )
  popd
)

echo [frontend] Starting Vite in a new terminal window.
start "FraudCell Frontend" cmd /k "cd /d ""%FRONTEND%"" && npm run dev"

echo.
echo [done] Backend is running in Docker.
echo [done] Frontend URL: http://localhost:5173
echo [done] API Gateway URL: http://localhost:8080
echo [note] Set VITE_API_MODE=live in FRONTEND\app\.env when you want real API calls.
exit /b 0
