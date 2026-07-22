[CmdletBinding()]
param(
    [ValidateSet("local", "hybrid", "docker")]
    [string]$Mode = "hybrid",
    [switch]$KeepRunning
)

$ErrorActionPreference = "Stop"
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$backend = Join-Path $root "BACKEND"
$aiService = Join-Path $backend "src\Ai\fraudcell-ai"
$frontend = Join-Path $root "FRONTEND\app"
$startedHere = $false
$dockerCompose = Join-Path $backend "docker-compose.yml"

function Invoke-NpmScript([string]$Script, [string]$FailureMessage) {
    & npm.cmd run $Script
    if ($LASTEXITCODE -ne 0) { throw $FailureMessage }
}

try {
    $requestedStackIsReady = $false
    try {
        $health = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:8080/health/ready" -TimeoutSec 3
        if ($health.StatusCode -ne 200) { throw "Gateway is not ready." }

        if ($Mode -eq "docker") {
            $containerId = (& docker compose -f $dockerCompose ps --status running -q edge-gateway | Out-String).Trim()
            $requestedStackIsReady = $LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($containerId)
        }
        else {
            $containerId = if (Get-Command docker -ErrorAction SilentlyContinue) {
                (& docker compose -f $dockerCompose ps --status running -q edge-gateway 2>$null | Out-String).Trim()
            } else { "" }
            $requestedStackIsReady = [string]::IsNullOrWhiteSpace($containerId)
        }
    }
    catch { $requestedStackIsReady = $false }

    if (-not $requestedStackIsReady) {
        Write-Host "[test] Stack is down; starting $Mode mode."
        if ($Mode -eq "docker") {
            & (Join-Path $PSScriptRoot "dev.ps1") -Action start -Mode $Mode -Build
        }
        else {
            & (Join-Path $PSScriptRoot "dev.ps1") -Action start -Mode $Mode
        }
        if ($LASTEXITCODE -ne 0) { throw "Could not start $Mode mode." }
        $startedHere = $true
    }

    Write-Host "[test] Building .NET solution serially."
    Push-Location $backend
    try {
        & dotnet build FraudCell.sln -c Debug -m:1 --nologo
        if ($LASTEXITCODE -ne 0) { throw ".NET build failed." }
    }
    finally {
        Pop-Location
    }

    Write-Host "[test] Checking AI code."
    Push-Location $aiService
    try {
        & uv run --group dev --group test ruff check app tests
        if ($LASTEXITCODE -ne 0) { throw "AI Ruff check failed." }
        & uv run --group dev --group test mypy app
        if ($LASTEXITCODE -ne 0) { throw "AI Mypy check failed." }
        & uv run --group test pytest -q
        if ($LASTEXITCODE -ne 0) { throw "AI Pytest suite failed." }
    }
    finally {
        Pop-Location
    }

    Write-Host "[test] Running gateway smoke flow."
    & (Join-Path $PSScriptRoot "smoke-backend.ps1")
    if ($LASTEXITCODE -ne 0) { throw "Gateway smoke flow failed." }

    Write-Host "[test] Checking AI readiness."
    if ($Mode -eq "docker") {
        Push-Location $backend
        try {
            $aiJson = (& docker compose --env-file .env -f docker-compose.yml exec -T edge-gateway curl -fsS http://ai-service:8000/health/ready | Out-String)
            if ($LASTEXITCODE -ne 0) { throw "AI container readiness request failed." }
            $ai = $aiJson | ConvertFrom-Json
        }
        finally { Pop-Location }
    }
    else {
        $ai = Invoke-RestMethod -Uri "http://127.0.0.1:8090/health/ready" -TimeoutSec 5
    }
    if ($ai.status -ne "Healthy") { throw "AI service is not healthy." }

    Write-Host "[test] Checking OpenAPI contract snapshots."
    $contractRuntime = if ($Mode -eq "docker") { "docker" } else { "native" }
    & (Join-Path $PSScriptRoot "openapi-contracts.ps1") -Action check -Runtime $contractRuntime
    if ($LASTEXITCODE -ne 0) { throw "OpenAPI contract check failed." }

    Write-Host "[test] Running frontend verification."
    Push-Location $frontend
    try {
        Invoke-NpmScript "contracts:generate" "Frontend contract generation failed."
        Invoke-NpmScript "test" "Frontend unit tests failed."
        Invoke-NpmScript "typecheck" "Frontend typecheck failed."
        Invoke-NpmScript "build" "Frontend build failed."
        $previousBaseUrl = $env:PLAYWRIGHT_BASE_URL
        try {
            $env:PLAYWRIGHT_BASE_URL = if ($Mode -eq "docker") { "http://127.0.0.1:8080" } else { "http://127.0.0.1:5173" }
            Invoke-NpmScript "e2e" "Frontend live E2E tests failed."
        }
        finally { $env:PLAYWRIGHT_BASE_URL = $previousBaseUrl }
    }
    finally {
        Pop-Location
    }

    Write-Host "[ok] Full-stack baseline passed in $Mode mode."
}
finally {
    if ($startedHere -and -not $KeepRunning) {
        Write-Host "[test] Stopping stack started by this test."
        & (Join-Path $PSScriptRoot "dev.ps1") -Action stop -Mode $Mode
    }
}
