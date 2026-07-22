[CmdletBinding()]
param(
    [ValidateSet("check", "apply")]
    [string]$Action = "check"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$templatePath = Join-Path $PSScriptRoot "config\wslconfig.fraudcell"
$targetPath = Join-Path $env:USERPROFILE ".wslconfig"
$expected = (Get-Content -LiteralPath $templatePath -Raw).Trim()
$actual = if (Test-Path -LiteralPath $targetPath) {
    (Get-Content -LiteralPath $targetPath -Raw).Trim()
} else {
    ""
}

if ($Action -eq "check") {
    Write-Host "[wsl] Target: $targetPath"
    if ($actual -eq $expected) {
        Write-Host "[ok] FraudCell WSL limits are active."
        exit 0
    }

    Write-Host "[warn] FraudCell WSL limits are not applied."
    Write-Host "[next] Run scripts\configure-wsl.bat --apply"
    exit 1
}

if ($actual -eq $expected) {
    Write-Host "[ok] WSL configuration is already current."
    exit 0
}

if (Test-Path -LiteralPath $targetPath) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupPath = "$targetPath.fraudcell-backup-$stamp"
    Copy-Item -LiteralPath $targetPath -Destination $backupPath
    Write-Host "[backup] $backupPath"
}

Copy-Item -LiteralPath $templatePath -Destination $targetPath -Force
Write-Host "[wsl] Applied 8 GB RAM, 6 CPU and 4 GB swap limits."
Write-Host "[wsl] Shutting down WSL so the limits take effect on next start."
& wsl.exe --shutdown
if ($LASTEXITCODE -ne 0) {
    throw "wsl --shutdown failed with exit code $LASTEXITCODE."
}

Write-Host "[ok] WSL configuration applied."
