[CmdletBinding()]
param(
    [ValidateSet("export", "check")]
    [string]$Action = "check",
    [ValidateSet("native", "docker")]
    [string]$Runtime = "native"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$contractRoot = Join-Path $repoRoot "BACKEND\contracts\openapi"
$backendRoot = Join-Path $repoRoot "BACKEND"

$services = @(
    @{ Name = "identity"; Url = "http://127.0.0.1:8081/openapi/v1.json"; DockerUrl = "http://identity-service:8080/openapi/v1.json" },
    @{ Name = "transaction"; Url = "http://127.0.0.1:8082/openapi/v1.json"; DockerUrl = "http://transaction-service:8080/openapi/v1.json" },
    @{ Name = "gamification"; Url = "http://127.0.0.1:8083/openapi/v1.json"; DockerUrl = "http://gamification-service:8080/openapi/v1.json" },
    @{ Name = "ai"; Url = "http://127.0.0.1:8090/openapi.json"; DockerUrl = "http://ai-service:8000/openapi.json" }
)

function ConvertTo-NormalizedJson {
    param([Parameter(Mandatory = $true)][string]$Json)

    $document = $Json | ConvertFrom-Json
    # OpenAPI servers URL'i request hostundan turetilir; host/container DNS
    # farki bir API sozlesmesi degisikligi degildir.
    $document.PSObject.Properties.Remove("servers")
    return ($document | ConvertTo-Json -Depth 100)
}

function Get-LiveContract {
    param([Parameter(Mandatory = $true)][hashtable]$Service)

    if ($Runtime -eq "docker") {
        Push-Location $backendRoot
        try {
            $content = (& docker compose --env-file .env -f docker-compose.yml exec -T edge-gateway curl -fsS $Service.DockerUrl | Out-String)
            if ($LASTEXITCODE -ne 0) {
                throw "docker compose exec exited with code $LASTEXITCODE"
            }
            return ConvertTo-NormalizedJson -Json $content
        }
        catch {
            throw "$($Service.Name) OpenAPI belgesine Docker agindan ulasilamadi ($($Service.DockerUrl)). $($_.Exception.Message)"
        }
        finally {
            Pop-Location
        }
    }

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Service.Url -TimeoutSec 10
        $content = if ($null -ne $response.RawContentStream) {
            [Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray())
        }
        else {
            $response.Content
        }
        return ConvertTo-NormalizedJson -Json $content
    }
    catch {
        throw "$($Service.Name) OpenAPI belgesine ulasilamadi ($($Service.Url)). Once scripts\start-hybrid.bat calistirin. $($_.Exception.Message)"
    }
}

if ($Action -eq "export") {
    New-Item -ItemType Directory -Force -Path $contractRoot | Out-Null

    foreach ($service in $services) {
        $target = Join-Path $contractRoot "$($service.Name).json"
        $content = Get-LiveContract -Service $service
        [System.IO.File]::WriteAllText($target, "$content`n", [System.Text.UTF8Encoding]::new($false))
        Write-Host "[ok] $($service.Name) -> $target"
    }

    Write-Host "OpenAPI snapshotlari guncellendi. Degisiklikleri commit etmeden once gozden gecirin."
    exit 0
}

$failed = $false
foreach ($service in $services) {
    $snapshot = Join-Path $contractRoot "$($service.Name).json"
    if (-not (Test-Path -LiteralPath $snapshot)) {
        Write-Host "[fail] $($service.Name): snapshot yok. scripts\export-openapi.bat calistirin." -ForegroundColor Red
        $failed = $true
        continue
    }

    $expected = ConvertTo-NormalizedJson -Json ([System.IO.File]::ReadAllText($snapshot))
    $actual = Get-LiveContract -Service $service

    if ($actual -ne $expected) {
        Write-Host "[fail] $($service.Name): calisan servis ile snapshot farkli." -ForegroundColor Red
        $failed = $true
    }
    else {
        Write-Host "[ok] $($service.Name)"
    }
}

if ($failed) {
    throw "OpenAPI contract kontrolu basarisiz. Degisiklik kasitliysa scripts\export-openapi.bat ile snapshotlari yenileyin."
}

Write-Host "Tum OpenAPI contractlari guncel."
