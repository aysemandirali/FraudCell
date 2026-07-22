[CmdletBinding()]
param(
    [ValidateSet("start", "stop", "status", "logs", "preflight")]
    [string]$Action = "status",

    [ValidateSet("mock", "local", "hybrid", "docker", "all")]
    [string]$Mode = "hybrid",

    [switch]$Build,
    [switch]$BackendOnly,
    [string]$Service = "all"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$Backend = Join-Path $Root "BACKEND"
$Frontend = Join-Path $Root "FRONTEND\app"
$Ai = Join-Path $Backend "src\Ai\fraudcell-ai"
$Runtime = Join-Path $Backend ".runtime"
$PidDirectory = Join-Path $Runtime "pids"
$LogDirectory = Join-Path $Runtime "logs"
$KeyDirectory = Join-Path $Runtime "keys\identity"
$InfraCompose = Join-Path $Backend "compose.infra.yml"
$FullCompose = Join-Path $Backend "docker-compose.yml"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "[fraudcell] $Message"
}

function Ensure-RuntimeDirectories {
    foreach ($path in @($Runtime, $PidDirectory, $LogDirectory, $KeyDirectory)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
}

function Assert-Command([string]$Name, [string]$InstallHint) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name was not found. $InstallHint"
    }
}

function Test-DockerReady {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        return $false
    }

    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        & docker info *> $null
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
}

function Assert-DockerReady {
    if (-not (Test-DockerReady)) {
        throw "Docker is not ready. Start Docker Desktop explicitly, then retry. FraudCell scripts never auto-start it."
    }
}

function Show-HostWarnings {
    try {
        $computerSystem = Get-CimInstance Win32_ComputerSystem
        if (-not $computerSystem.AutomaticManagedPagefile) {
            Write-Host "[warn] Windows pagefile is disabled. Full Docker builds can exhaust commit memory."
            Write-Host "[next] Run scripts\configure-pagefile.bat --apply from an Administrator terminal."
        }
    }
    catch {
        Write-Host "[warn] Windows pagefile status could not be read."
    }

    $wslTemplate = Join-Path $PSScriptRoot "config\wslconfig.fraudcell"
    $wslTarget = Join-Path $env:USERPROFILE ".wslconfig"
    if (-not (Test-Path -LiteralPath $wslTarget) -or
        (Get-Content -LiteralPath $wslTarget -Raw).Trim() -ne (Get-Content -LiteralPath $wslTemplate -Raw).Trim()) {
        Write-Host "[warn] FraudCell WSL limits are not applied. Run scripts\configure-wsl.bat --apply."
    }
}

function Show-NodeVersionWarning {
    try {
        $raw = (& node --version).Trim().TrimStart('v')
        $version = [version]$raw
        if ($version.Major -eq 22 -and $version -lt [version]"22.13.0") {
            Write-Host "[warn] Node $raw is below 22.13.0; some development tools report an engine warning."
        }
    }
    catch {
        Write-Host "[warn] Node version could not be parsed."
    }
}

function Read-DotEnv([string]$Path) {
    $values = @{}
    if (-not (Test-Path -LiteralPath $Path)) {
        return $values
    }

    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -notmatch '^\s*([^#][^=]*)=(.*)$') {
            continue
        }

        $key = $Matches[1].Trim()
        $value = $Matches[2].Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        $values[$key] = $value
    }

    return $values
}

function Ensure-DotEnv([string]$Path, [string]$TemplatePath) {
    if (-not (Test-Path -LiteralPath $Path)) {
        Copy-Item -LiteralPath $TemplatePath -Destination $Path
        $displayPath = $Path.Replace("$Root\", "")
        Write-Host "[env] Created $displayPath from its example. Review secrets before non-local use."
        return
    }

    $existing = Read-DotEnv $Path
    $missing = [Collections.Generic.List[string]]::new()
    foreach ($line in Get-Content -LiteralPath $TemplatePath) {
        if ($line -notmatch '^\s*([^#][^=]*)=(.*)$') {
            continue
        }

        $key = $Matches[1].Trim()
        if (-not $existing.ContainsKey($key)) {
            $missing.Add("$key=$($Matches[2])")
        }
    }

    if ($missing.Count -gt 0) {
        $newLines = @("", "# Added automatically from the current .env.example") + $missing.ToArray()
        Add-Content -LiteralPath $Path -Encoding utf8 -Value $newLines
        Write-Host "[env] Added $($missing.Count) missing local setting(s); existing values were preserved."
    }
}

function Get-Setting([hashtable]$Values, [string]$Name, [string]$Default = "") {
    if ($Values.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace([string]$Values[$Name])) {
        return [string]$Values[$Name]
    }
    return $Default
}

function Invoke-WithEnvironment([hashtable]$Environment, [scriptblock]$ScriptBlock) {
    $previous = @{}
    try {
        foreach ($entry in $Environment.GetEnumerator()) {
            $previous[$entry.Key] = [Environment]::GetEnvironmentVariable($entry.Key, "Process")
            [Environment]::SetEnvironmentVariable($entry.Key, [string]$entry.Value, "Process")
        }
        return & $ScriptBlock
    }
    finally {
        foreach ($entry in $previous.GetEnumerator()) {
            [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, "Process")
        }
    }
}

function Invoke-Checked([string]$FilePath, [string[]]$Arguments, [string]$WorkingDirectory, [hashtable]$Environment = @{}) {
    $argumentCopy = $Arguments
    Invoke-WithEnvironment $Environment {
        Push-Location $WorkingDirectory
        try {
            & $FilePath @argumentCopy
            if ($LASTEXITCODE -ne 0) {
                throw "$FilePath failed with exit code $LASTEXITCODE."
            }
        }
        finally {
            Pop-Location
        }
    }
}

function Get-ManagedState([string]$Name) {
    $path = Join-Path $PidDirectory "$Name.json"
    if (-not (Test-Path -LiteralPath $path)) {
        return $null
    }

    try {
        return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    }
    catch {
        Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
        return $null
    }
}

function Get-ManagedProcess([string]$Name) {
    $state = Get-ManagedState $Name
    if ($null -eq $state) {
        return $null
    }

    $process = Get-Process -Id ([int]$state.pid) -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        Remove-Item -LiteralPath (Join-Path $PidDirectory "$Name.json") -Force -ErrorAction SilentlyContinue
        return $null
    }

    $actualStart = $process.StartTime.ToUniversalTime().ToString("o")
    if ($actualStart -ne [string]$state.startedAtUtc) {
        Remove-Item -LiteralPath (Join-Path $PidDirectory "$Name.json") -Force -ErrorAction SilentlyContinue
        return $null
    }

    return $process
}

function Start-ManagedProcess {
    param(
        [string]$Name,
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory,
        [hashtable]$Environment = @{}
    )

    $existing = Get-ManagedProcess $Name
    if ($null -ne $existing) {
        Write-Host "[skip] $Name is already running (PID $($existing.Id))."
        return
    }

    Ensure-RuntimeDirectories
    $stdout = Join-Path $LogDirectory "$Name.out.log"
    $stderr = Join-Path $LogDirectory "$Name.err.log"
    Remove-Item -LiteralPath $stdout, $stderr -Force -ErrorAction SilentlyContinue

    $fileCopy = $FilePath
    $argumentCopy = $Arguments
    $workingCopy = $WorkingDirectory
    $process = Invoke-WithEnvironment $Environment {
        Start-Process -FilePath $fileCopy `
            -ArgumentList $argumentCopy `
            -WorkingDirectory $workingCopy `
            -WindowStyle Hidden `
            -PassThru `
            -RedirectStandardOutput $stdout `
            -RedirectStandardError $stderr
    }

    Start-Sleep -Milliseconds 300
    if ($process.HasExited) {
        $errorTail = if (Test-Path -LiteralPath $stderr) { Get-Content -LiteralPath $stderr -Tail 30 } else { @() }
        throw "$Name exited during startup.`n$($errorTail -join [Environment]::NewLine)"
    }

    [pscustomobject]@{
        name = $Name
        pid = $process.Id
        startedAtUtc = $process.StartTime.ToUniversalTime().ToString("o")
        command = $FilePath
        workingDirectory = $WorkingDirectory
    } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $PidDirectory "$Name.json") -Encoding UTF8

    Write-Host "[start] $Name (PID $($process.Id))"
}

function Stop-ManagedProcess([string]$Name) {
    $process = Get-ManagedProcess $Name
    if ($null -ne $process) {
        Write-Host "[stop] $Name (PID $($process.Id))"
        & taskkill.exe /PID $process.Id /T /F *> $null
        if ($LASTEXITCODE -ne 0) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
        try { Wait-Process -Id $process.Id -Timeout 10 -ErrorAction SilentlyContinue } catch { }
    }
    Remove-Item -LiteralPath (Join-Path $PidDirectory "$Name.json") -Force -ErrorAction SilentlyContinue
}

function Wait-Http([string]$Name, [string]$Url, [string]$BodyPattern, [int]$TimeoutSeconds = 90) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 4
            if ($response.StatusCode -eq 200 -and $response.Content -match $BodyPattern) {
                Write-Host "[ready] $Name"
                return
            }
        }
        catch { }
        Start-Sleep -Seconds 2
    }

    $log = Join-Path $LogDirectory "$Name.err.log"
    $tail = if (Test-Path -LiteralPath $log) { Get-Content -LiteralPath $log -Tail 40 } else { @() }
    throw "$Name did not become ready at $Url.`n$($tail -join [Environment]::NewLine)"
}

function Ensure-FrontendDependencies {
    $lockPath = Join-Path $Frontend "package-lock.json"
    $markerPath = Join-Path $Runtime "frontend-package-lock.sha256"
    $lockHash = (Get-FileHash -LiteralPath $lockPath -Algorithm SHA256).Hash
    $installedHash = if (Test-Path -LiteralPath $markerPath) {
        (Get-Content -LiteralPath $markerPath -Raw).Trim()
    } else {
        ""
    }

    if (-not (Test-Path -LiteralPath (Join-Path $Frontend "node_modules")) -or $installedHash -ne $lockHash) {
        Write-Step "Installing frontend dependencies from package-lock.json"
        Invoke-Checked "npm.cmd" @("ci", "--no-audit", "--no-fund") $Frontend
        Set-Content -LiteralPath $markerPath -Value $lockHash -Encoding ASCII
    }
}

function Build-NativeApplications {
    Write-Step "Building .NET services serially"
    Invoke-Checked "dotnet" @("build", "FraudCell.sln", "-c", "Release", "-m:1") $Backend

    Write-Step "Synchronizing AI dependencies"
    Invoke-Checked "uv" @("sync", "--group", "dev") $Ai
}

function Get-AppEnvironment([string]$SelectedMode, [hashtable]$Settings) {
    $dbHost = if ($SelectedMode -eq "hybrid") { "127.0.0.1" } else { Get-Setting $Settings "POSTGRES_HOST" "127.0.0.1" }
    $dbPort = if ($SelectedMode -eq "hybrid") { "55432" } else { Get-Setting $Settings "POSTGRES_PORT" "5432" }
    $rabbitHost = if ($SelectedMode -eq "hybrid") { "127.0.0.1" } else { Get-Setting $Settings "RABBITMQ_HOST" "127.0.0.1" }
    $rabbitPort = Get-Setting $Settings "RABBITMQ_PORT" "5672"
    $rabbitUser = Get-Setting $Settings "RABBITMQ_USER" "fraudcell"
    $rabbitPassword = Get-Setting $Settings "RABBITMQ_PASSWORD" "devpassword"

    return @{
        DbHost = $dbHost
        DbPort = $dbPort
        IdentityDbPassword = Get-Setting $Settings "IDENTITY_DB_PASSWORD" "devpassword"
        TransactionDbPassword = Get-Setting $Settings "TRANSACTION_DB_PASSWORD" "devpassword"
        GamificationDbPassword = Get-Setting $Settings "GAMIFICATION_DB_PASSWORD" "devpassword"
        AiDbPassword = Get-Setting $Settings "AI_DB_PASSWORD" "devpassword"
        RabbitHost = $rabbitHost
        RabbitPort = $rabbitPort
        RabbitUser = $rabbitUser
        RabbitPassword = $rabbitPassword
        AiInternalToken = Get-Setting $Settings "AI_INTERNAL_API_TOKEN" "local-development-only"
        SeedAdminEmail = Get-Setting $Settings "SEED_ADMIN_EMAIL" "admin@fraudcell.local"
        SeedAdminPassword = Get-Setting $Settings "SEED_ADMIN_PASSWORD" "ChangeMe123!"
    }
}

function New-CommonDotNetEnvironment([hashtable]$Config) {
    return @{
        ASPNETCORE_ENVIRONMENT = "Development"
        RabbitMq__Host = $Config.RabbitHost
        RabbitMq__Port = $Config.RabbitPort
        RabbitMq__UserName = $Config.RabbitUser
        RabbitMq__Password = $Config.RabbitPassword
        "Logging__LogLevel__Microsoft.EntityFrameworkCore.Database.Command" = "Warning"
        "Serilog__MinimumLevel__Override__Microsoft.EntityFrameworkCore.Database.Command" = "Warning"
    }
}

function Get-AiEnvironment([hashtable]$Config) {
    return @{
        AI_DB_HOST = $Config.DbHost
        AI_DB_PORT = $Config.DbPort
        AI_DB_NAME = "fraudcell_ai"
        AI_DB_USER = "ai_app"
        AI_DB_PASSWORD = $Config.AiDbPassword
        RABBITMQ_HOST = $Config.RabbitHost
        RABBITMQ_PORT = $Config.RabbitPort
        RABBITMQ_USER_NAME = $Config.RabbitUser
        RABBITMQ_PASSWORD = $Config.RabbitPassword
        INTERNAL_API_TOKEN = $Config.AiInternalToken
        AI_HTTP_HOST = "127.0.0.1"
        AI_HTTP_PORT = "8090"
    }
}

function Initialize-NativeDatabases([hashtable]$Settings) {
    $hostName = Get-Setting $Settings "POSTGRES_HOST" "127.0.0.1"
    $port = Get-Setting $Settings "POSTGRES_PORT" "5432"
    $admin = Get-Setting $Settings "POSTGRES_ADMIN_USER" "postgres"
    $adminPassword = Get-Setting $Settings "POSTGRES_ADMIN_PASSWORD"
    if ([string]::IsNullOrWhiteSpace($adminPassword) -or $adminPassword -eq "CHANGE_ME") {
        throw "Set POSTGRES_ADMIN_PASSWORD in BACKEND\.env.local before Docker-free startup."
    }

    $roles = @(
        @{ Role = "identity_app"; Database = "fraudcell_identity"; Password = Get-Setting $Settings "IDENTITY_DB_PASSWORD" "devpassword" },
        @{ Role = "transaction_app"; Database = "fraudcell_transaction"; Password = Get-Setting $Settings "TRANSACTION_DB_PASSWORD" "devpassword" },
        @{ Role = "gamification_app"; Database = "fraudcell_gamification"; Password = Get-Setting $Settings "GAMIFICATION_DB_PASSWORD" "devpassword" },
        @{ Role = "ai_app"; Database = "fraudcell_ai"; Password = Get-Setting $Settings "AI_DB_PASSWORD" "devpassword" }
    )

    $adminEnvironment = @{ PGPASSWORD = $adminPassword }
    foreach ($item in $roles) {
        $escapedPassword = ([string]$item.Password).Replace("'", "''")
        $roleExists = Invoke-WithEnvironment $adminEnvironment {
            & psql -h $hostName -p $port -U $admin -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$($item.Role)'"
            if ($LASTEXITCODE -ne 0) { throw "Could not connect to native PostgreSQL as $admin." }
        }
        if (($roleExists | Out-String).Trim() -ne "1") {
            Invoke-Checked "psql" @("-h", $hostName, "-p", $port, "-U", $admin, "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", "CREATE ROLE $($item.Role) LOGIN PASSWORD '$escapedPassword'") $Backend $adminEnvironment
        } else {
            Invoke-Checked "psql" @("-h", $hostName, "-p", $port, "-U", $admin, "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", "ALTER ROLE $($item.Role) WITH LOGIN PASSWORD '$escapedPassword'") $Backend $adminEnvironment
        }

        $databaseExists = Invoke-WithEnvironment $adminEnvironment {
            & psql -h $hostName -p $port -U $admin -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$($item.Database)'"
            if ($LASTEXITCODE -ne 0) { throw "Could not inspect PostgreSQL databases." }
        }
        if (($databaseExists | Out-String).Trim() -ne "1") {
            Invoke-Checked "psql" @("-h", $hostName, "-p", $port, "-U", $admin, "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", "CREATE DATABASE $($item.Database) OWNER $($item.Role)") $Backend $adminEnvironment
        }
    }
}

function Ensure-NativeRabbitMq([hashtable]$Settings) {
    $rabbitServer = Get-Command "rabbitmq-server.bat" -ErrorAction SilentlyContinue
    $rabbitCtl = Get-Command "rabbitmqctl.bat" -ErrorAction SilentlyContinue
    if ($null -eq $rabbitServer -or $null -eq $rabbitCtl) {
        throw "Native RabbitMQ was not found. Install RabbitMQ 4.x and Erlang, or use scripts\start-hybrid.bat."
    }

    & $rabbitCtl.Source await_startup *> $null
    if ($LASTEXITCODE -ne 0) {
        & $rabbitServer.Source -detached
        if ($LASTEXITCODE -ne 0) { throw "Native RabbitMQ could not be started." }
        & $rabbitCtl.Source await_startup
        if ($LASTEXITCODE -ne 0) { throw "Native RabbitMQ did not become ready." }
    }

    $user = Get-Setting $Settings "RABBITMQ_USER" "fraudcell"
    $password = Get-Setting $Settings "RABBITMQ_PASSWORD" "devpassword"
    $users = (& $rabbitCtl.Source list_users --silent | Out-String)
    if ($users -notmatch "(?m)^$([regex]::Escape($user))\s") {
        & $rabbitCtl.Source add_user $user $password
        if ($LASTEXITCODE -ne 0) { throw "Could not create RabbitMQ development user." }
    } else {
        & $rabbitCtl.Source change_password $user $password
        if ($LASTEXITCODE -ne 0) { throw "Could not update RabbitMQ development user." }
    }
    & $rabbitCtl.Source set_permissions -p / $user ".*" ".*" ".*"
    if ($LASTEXITCODE -ne 0) { throw "Could not configure RabbitMQ permissions." }
}

function Start-HybridInfrastructure([hashtable]$Settings) {
    Assert-DockerReady
    Write-Step "Removing inactive full-stack containers while preserving volumes"
    Invoke-Checked "docker" @("compose", "-f", "docker-compose.yml", "down") $Backend @{ COMPOSE_PARALLEL_LIMIT = "1" }
    Write-Step "Starting lightweight PostgreSQL and RabbitMQ infrastructure"
    $composeEnvironment = @{ COMPOSE_PARALLEL_LIMIT = "1" }
    Invoke-Checked "docker" @("compose", "--env-file", ".env", "-f", "compose.infra.yml", "up", "-d", "--wait") $Backend $composeEnvironment
}

function Start-NativeApplications([string]$SelectedMode, [hashtable]$Settings) {
    $config = Get-AppEnvironment $SelectedMode $Settings
    Build-NativeApplications

    Write-Step "Applying one-shot AI database schema"
    Invoke-Checked "uv" @("run", "python", "-m", "app.migrate") $Ai (Get-AiEnvironment $config)

    $identityDir = Join-Path $Backend "src\Services\Identity\FraudCell.Identity.Service"
    $transactionDir = Join-Path $Backend "src\Services\Transaction\FraudCell.Transaction.Service"
    $gamificationDir = Join-Path $Backend "src\Services\Gamification\FraudCell.Gamification.Service"
    $edgeDir = Join-Path $Backend "src\Services\Edge\FraudCell.Edge.Gateway"
    $publicKey = Join-Path $KeyDirectory "public.pem"
    $privateKey = Join-Path $KeyDirectory "private.pem"

    $identityEnv = New-CommonDotNetEnvironment $config
    $identityEnv["ASPNETCORE_URLS"] = "http://127.0.0.1:8081"
    $identityEnv["ConnectionStrings__IdentityDb"] = "Host=$($config.DbHost);Port=$($config.DbPort);Database=fraudcell_identity;Username=identity_app;Password=$($config.IdentityDbPassword)"
    $identityEnv["Jwt__PrivateKeyPath"] = $privateKey
    $identityEnv["Jwt__PublicKeyPath"] = $publicKey
    $identityEnv["Seed__AdminEmail"] = $config.SeedAdminEmail
    $identityEnv["Seed__AdminPassword"] = $config.SeedAdminPassword

    Start-ManagedProcess "identity" "dotnet" @("run", "--no-build", "-c", "Release", "--no-launch-profile") $identityDir $identityEnv
    Wait-Http "identity" "http://127.0.0.1:8081/health/ready" '^Healthy$'

    $transactionEnv = New-CommonDotNetEnvironment $config
    $transactionEnv["ASPNETCORE_URLS"] = "http://127.0.0.1:8082"
    $transactionEnv["ConnectionStrings__TransactionDb"] = "Host=$($config.DbHost);Port=$($config.DbPort);Database=fraudcell_transaction;Username=transaction_app;Password=$($config.TransactionDbPassword)"
    $transactionEnv["Jwt__PublicKeyPath"] = $publicKey
    Start-ManagedProcess "transaction" "dotnet" @("run", "--no-build", "-c", "Release", "--no-launch-profile") $transactionDir $transactionEnv
    Wait-Http "transaction" "http://127.0.0.1:8082/health/ready" '^Healthy$'

    $gamificationEnv = New-CommonDotNetEnvironment $config
    $gamificationEnv["ASPNETCORE_URLS"] = "http://127.0.0.1:8083"
    $gamificationEnv["ConnectionStrings__GamificationDb"] = "Host=$($config.DbHost);Port=$($config.DbPort);Database=fraudcell_gamification;Username=gamification_app;Password=$($config.GamificationDbPassword)"
    $gamificationEnv["Jwt__PublicKeyPath"] = $publicKey
    Start-ManagedProcess "gamification" "dotnet" @("run", "--no-build", "-c", "Release", "--no-launch-profile") $gamificationDir $gamificationEnv
    Wait-Http "gamification" "http://127.0.0.1:8083/health/ready" '^Healthy$'

    Start-ManagedProcess "ai" "uv" @("run", "python", "-m", "app.run") $Ai (Get-AiEnvironment $config)
    Wait-Http "ai" "http://127.0.0.1:8090/health/ready" '"status"\s*:\s*"Healthy"' 120

    $edgeEnv = New-CommonDotNetEnvironment $config
    $edgeEnv["ASPNETCORE_URLS"] = "http://127.0.0.1:8080"
    $edgeEnv["Jwt__PublicKeyPath"] = $publicKey
    Start-ManagedProcess "edge" "dotnet" @("run", "--no-build", "-c", "Release", "--no-launch-profile") $edgeDir $edgeEnv
    Wait-Http "edge" "http://127.0.0.1:8080/health/ready" '^Healthy$'
}

function Start-Frontend([string]$ApiMode) {
    Ensure-FrontendDependencies
    $frontendEnv = @{
        VITE_API_MODE = $ApiMode
        VITE_GATEWAY_URL = "http://127.0.0.1:8080"
        VITE_REALTIME_ENABLED = if ($ApiMode -eq "live") { "true" } else { "false" }
    }
    Start-ManagedProcess "frontend" "npm.cmd" @("run", "dev", "--", "--host", "127.0.0.1", "--port", "5173") $Frontend $frontendEnv
    Wait-Http "frontend" "http://127.0.0.1:5173" '<!doctype html>' 60
}

function Start-FullDocker {
    Assert-DockerReady
    Write-Step "Stopping native application processes before claiming port 8080"
    Stop-LocalApplications

    $envPath = Join-Path $Backend ".env"
    Ensure-DotEnv $envPath (Join-Path $Backend ".env.example")

    $composeEnvironment = @{ COMPOSE_PARALLEL_LIMIT = "1" }
    Write-Step "Stopping lightweight infrastructure while preserving volumes"
    Invoke-Checked "docker" @("compose", "-f", "compose.infra.yml", "down") $Backend $composeEnvironment

    Write-Step "Validating full Docker configuration"
    Invoke-Checked "docker" @("compose", "--env-file", ".env", "-f", "docker-compose.yml", "config", "--quiet") $Backend $composeEnvironment

    if ($Build) {
        Write-Step "Building full Docker stack sequentially"
        Invoke-Checked "docker" @("compose", "--env-file", ".env", "-f", "docker-compose.yml", "build") $Backend $composeEnvironment
    }

    Write-Step "Starting resource-limited full Docker stack without implicit rebuild"
    $arguments = @("compose", "--env-file", ".env", "-f", "docker-compose.yml", "up", "-d", "--wait", "--remove-orphans")
    if (-not $Build) { $arguments += "--no-build" }
    Invoke-Checked "docker" $arguments $Backend $composeEnvironment
}

function Invoke-Preflight([string]$SelectedMode) {
    Write-Step "Preflight: $SelectedMode"
    Show-HostWarnings
    if ($SelectedMode -eq "mock") {
        Assert-Command "node" "Install the repository Node.js version."
        Assert-Command "npm.cmd" "Install npm."
        Show-NodeVersionWarning
        Write-Host "[ok] Mock frontend prerequisites are available."
        return
    }

    if ($SelectedMode -eq "docker") {
        Assert-DockerReady
        Write-Host "[ok] Docker daemon is available."
        return
    }

    Assert-Command "dotnet" "Install the .NET SDK from BACKEND\global.json."
    Assert-Command "node" "Install Node.js."
    Assert-Command "npm.cmd" "Install npm."
    Show-NodeVersionWarning
    Assert-Command "uv" "Install uv for the Python service."
    Assert-Command "psql" "Install PostgreSQL client tools."

    if ($SelectedMode -eq "hybrid") {
        Assert-DockerReady
        Write-Host "[ok] Native app and hybrid infrastructure prerequisites are available."
        return
    }

    Assert-Command "pg_isready" "Install PostgreSQL 18 server/client tools."
    Assert-Command "rabbitmq-server.bat" "Install RabbitMQ 4.x and Erlang, or use hybrid mode."
    Assert-Command "rabbitmqctl.bat" "Install RabbitMQ 4.x and Erlang, or use hybrid mode."
    $localEnv = Join-Path $Backend ".env.local"
    if (-not (Test-Path -LiteralPath $localEnv)) {
        Copy-Item -LiteralPath (Join-Path $Backend ".env.local.example") -Destination $localEnv
        throw "Created BACKEND\.env.local. Set POSTGRES_ADMIN_PASSWORD, then run start-local.bat again."
    }
    Write-Host "[ok] Docker-free prerequisites are available."
}

function Stop-LocalApplications {
    foreach ($name in @("frontend", "edge", "ai", "gamification", "transaction", "identity")) {
        Stop-ManagedProcess $name
    }
}

function Stop-Compose([string]$ComposeFile, [string]$ProjectLabel) {
    if (-not (Test-DockerReady)) {
        Write-Host "[skip] Docker is not running; $ProjectLabel was not changed."
        return
    }
    Invoke-Checked "docker" @("compose", "-f", $ComposeFile, "down") $Backend @{ COMPOSE_PARALLEL_LIMIT = "1" }
}

function Show-Status {
    Write-Step "Managed local processes"
    foreach ($name in @("identity", "transaction", "gamification", "ai", "edge", "frontend")) {
        $process = Get-ManagedProcess $name
        if ($null -eq $process) {
            Write-Host ("{0,-16} DOWN" -f $name)
        } else {
            Write-Host ("{0,-16} UP   PID {1}" -f $name, $process.Id)
        }
    }

    Write-Step "Public endpoints"
    foreach ($item in @(
        @{ Name = "Gateway"; Url = "http://127.0.0.1:8080/health/ready" },
        @{ Name = "Frontend"; Url = "http://127.0.0.1:5173" }
    )) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $item.Url -TimeoutSec 2
            Write-Host ("{0,-16} UP   {1}" -f $item.Name, $item.Url)
        } catch {
            Write-Host ("{0,-16} DOWN {1}" -f $item.Name, $item.Url)
        }
    }

    if (Test-DockerReady) {
        Write-Step "Hybrid infrastructure"
        & docker compose -f $InfraCompose ps
        Write-Step "Full Docker backend"
        & docker compose -f $FullCompose ps
    } else {
        Write-Host ""
        Write-Host "[docker] daemon is stopped"
    }
}

function Show-Logs([string]$SelectedService) {
    Ensure-RuntimeDirectories
    $paths = if ($SelectedService -eq "all") {
        Get-ChildItem -LiteralPath $LogDirectory -Filter "*.log" -File -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
    } else {
        @(Join-Path $LogDirectory "$SelectedService.out.log", Join-Path $LogDirectory "$SelectedService.err.log") |
            Where-Object { Test-Path -LiteralPath $_ }
    }

    if (-not $paths -or $paths.Count -eq 0) {
        Write-Host "[logs] No managed-process logs found in $LogDirectory"
        return
    }
    Get-Content -LiteralPath $paths -Tail 120 -Wait
}

switch ($Action) {
    "preflight" {
        if ($Mode -eq "all") { throw "Preflight requires mock, local, hybrid, or docker mode." }
        Invoke-Preflight $Mode
    }
    "start" {
        if ($Mode -eq "all") { throw "Start requires mock, local, hybrid, or docker mode." }
        Ensure-RuntimeDirectories
        Invoke-Preflight $Mode

        try {
            if ($Mode -eq "mock") {
                Start-Frontend "mock"
            }
            elseif ($Mode -eq "docker") {
                Start-FullDocker
            }
            else {
                if ($Mode -eq "local" -and (Test-DockerReady)) {
                    Stop-Compose $FullCompose "full Docker stack"
                }
                $settingsPath = if ($Mode -eq "hybrid") { Join-Path $Backend ".env" } else { Join-Path $Backend ".env.local" }
                if ($Mode -eq "hybrid") {
                    Ensure-DotEnv $settingsPath (Join-Path $Backend ".env.example")
                }
                $settings = Read-DotEnv $settingsPath
                if ($Mode -eq "hybrid") {
                    Start-HybridInfrastructure $settings
                } else {
                    Initialize-NativeDatabases $settings
                    Ensure-NativeRabbitMq $settings
                }
                Start-NativeApplications $Mode $settings
                if (-not $BackendOnly) { Start-Frontend "live" }
            }

            Write-Host ""
            if ($Mode -eq "docker") {
                Write-Host "[ready] Full stack: http://127.0.0.1:8080"
            }
            else {
                Write-Host "[ready] Frontend:  http://127.0.0.1:5173"
                Write-Host "[ready] Gateway:   http://127.0.0.1:8080"
            }
        }
        catch {
            Write-Host "[error] Startup failed; stopping managed application processes."
            Stop-LocalApplications
            throw
        }
    }
    "stop" {
        Stop-LocalApplications
        if ($Mode -eq "hybrid" -or $Mode -eq "all") { Stop-Compose $InfraCompose "hybrid infrastructure" }
        if ($Mode -eq "docker" -or $Mode -eq "all") { Stop-Compose $FullCompose "full Docker backend" }
    }
    "status" { Show-Status }
    "logs" { Show-Logs $Service }
}
