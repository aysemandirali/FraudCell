[CmdletBinding()]
param(
    [ValidateSet("check", "apply")]
    [string]$Action = "check"
)

$ErrorActionPreference = "Stop"

$computerSystem = Get-CimInstance Win32_ComputerSystem
if ($computerSystem.AutomaticManagedPagefile) {
    Write-Host "[ok] Windows system-managed pagefile is enabled."
    exit 0
}

if ($Action -eq "check") {
    Write-Host "[warn] Windows pagefile is disabled."
    Write-Host "[next] Open an Administrator terminal and run scripts\configure-pagefile.bat --apply"
    exit 1
}

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Administrator rights are required. Reopen the terminal as Administrator and retry."
}

Set-CimInstance -InputObject $computerSystem -Property @{ AutomaticManagedPagefile = $true } | Out-Null
Write-Host "[ok] Windows system-managed pagefile was enabled."
Write-Host "[required] Restart Windows before running the full Docker topology."
