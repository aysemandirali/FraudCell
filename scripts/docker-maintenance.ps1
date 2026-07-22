[CmdletBinding()]
param(
    [ValidateSet("report", "prune-build-cache")]
    [string]$Action = "report"
)

$ErrorActionPreference = "Stop"

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker is not running. This command never starts Docker Desktop automatically."
}

if ($Action -eq "report") {
    docker system df
    docker buildx du
    exit $LASTEXITCODE
}

Write-Host "This removes only unused BuildKit cache above the 8 GB retained budget."
Write-Host "Containers, images in use, and volumes are not deleted."
$confirmation = Read-Host "Type PRUNE to continue"
if ($confirmation -cne "PRUNE") {
    Write-Host "[cancelled] No Docker data was changed."
    exit 0
}

docker buildx prune --force --max-used-space 8gb
exit $LASTEXITCODE
