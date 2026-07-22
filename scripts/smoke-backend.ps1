$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "[smoke] $Message"
}

function Assert-Ready {
    param(
        [string]$Name,
        [string]$Url
    )

    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 10
    $content = $response.Content.Trim()
    if ($response.StatusCode -ne 200 -or $content -ne "Healthy") {
        throw "$Name ready check failed. Status=$($response.StatusCode), Body=$content"
    }

    Write-Host "[ok] $Name ready"
}

$gatewayBase = "http://127.0.0.1:8080"

Write-Step "checking ready endpoints"
Assert-Ready "Edge Gateway" "$gatewayBase/health/ready"

Write-Step "logging in with development seed admin"
$loginBody = @{
    email = "admin@fraudcell.local"
    password = "ChangeMe123!"
} | ConvertTo-Json

$login = Invoke-RestMethod `
    -Method Post `
    -Uri "$gatewayBase/api/v1/auth/staff/login" `
    -ContentType "application/json" `
    -Body $loginBody `
    -SessionVariable loginSession `
    -TimeoutSec 20

if (-not $login.success -or -not $login.data.accessToken) {
    throw "Staff login did not return an access token."
}

$token = $login.data.accessToken
$headers = @{ Authorization = "Bearer $token" }
Write-Host "[ok] admin login"

Write-Step "checking identity protected endpoint"
$me = Invoke-RestMethod `
    -Method Get `
    -Uri "$gatewayBase/api/v1/auth/me" `
    -Headers $headers `
    -WebSession $loginSession `
    -TimeoutSec 20

if (-not $me.success -or $me.data.role -ne "ADMIN") {
    throw "Identity /auth/me failed or did not return ADMIN role."
}

Write-Host "[ok] identity token works"

Write-Step "checking single-use realtime stream ticket"
$streamTicket = Invoke-RestMethod `
    -Method Post `
    -Uri "$gatewayBase/api/v1/events/tickets" `
    -Headers $headers `
    -TimeoutSec 20

if (-not $streamTicket.success -or [string]::IsNullOrWhiteSpace($streamTicket.data.ticket)) {
    throw "Realtime ticket endpoint did not return a ticket."
}

$streamUrl = "$gatewayBase/api/v1/events?ticket=$($streamTicket.data.ticket)"
$streamProbe = & curl.exe -sN --max-time 1 $streamUrl
if (($streamProbe -join "`n") -notmatch ": connected") {
    throw "Realtime stream did not open with the issued ticket."
}

$reusedTicketStatus = & curl.exe -s -o NUL -w "%{http_code}" $streamUrl
if ($reusedTicketStatus -ne "401") {
    throw "Realtime ticket reuse should return 401, got $reusedTicketStatus."
}

Write-Host "[ok] realtime stream ticket is short-lived and single-use"

Write-Step "checking staff creation and staff login"
$staffSuffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$staffEmail = "smoke.analyst.$staffSuffix@fraudcell.local"
$staffPassword = "ChangeMe123!"

$staffBody = @{
    firstName = "Smoke"
    lastName = "Analyst"
    email = $staffEmail
    password = $staffPassword
    role = "ANALYST"
    specialties = @("CALINTI_KART")
    regions = @("MARMARA")
    assignmentEnabled = $true
} | ConvertTo-Json -Depth 4

$createdStaff = Invoke-RestMethod `
    -Method Post `
    -Uri "$gatewayBase/api/v1/staff" `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $staffBody `
    -TimeoutSec 20

if (-not $createdStaff.success -or -not $createdStaff.data.id -or $createdStaff.data.role -ne "ANALYST") {
    throw "Staff creation did not return an ANALYST profile."
}

$staffLoginBody = @{
    email = $staffEmail
    password = $staffPassword
} | ConvertTo-Json

$staffLogin = Invoke-RestMethod `
    -Method Post `
    -Uri "$gatewayBase/api/v1/auth/staff/login" `
    -ContentType "application/json" `
    -Body $staffLoginBody `
    -TimeoutSec 20

if (-not $staffLogin.success -or -not $staffLogin.data.accessToken -or $staffLogin.data.user.role -ne "ANALYST") {
    throw "Created analyst could not log in."
}

Write-Host "[ok] staff creation and staff login"

Write-Step "checking customer OTP registration"
$gsmSuffix = ([DateTimeOffset]::UtcNow.ToUnixTimeSeconds() % 1000000000).ToString("D9")
$gsmNumber = "5$gsmSuffix"

$challengeBody = @{
    gsmNumber = $gsmNumber
    purpose = "CustomerRegister"
} | ConvertTo-Json

$challenge = Invoke-RestMethod `
    -Method Post `
    -Uri "$gatewayBase/api/v1/auth/customer/otp/challenges" `
    -ContentType "application/json" `
    -Body $challengeBody `
    -TimeoutSec 20

if (-not $challenge.success -or -not $challenge.data.challengeId) {
    throw "OTP challenge did not return a challenge id."
}

$verifyBody = @{
    challengeId = $challenge.data.challengeId
    code = "1234"
    customer = @{
        firstName = "Smoke"
        lastName = "Customer"
        email = $null
    }
} | ConvertTo-Json -Depth 4

$customerVerifyResponse = Invoke-WebRequest `
    -UseBasicParsing `
    -Method Post `
    -Uri "$gatewayBase/api/v1/auth/customer/otp/verifications" `
    -ContentType "application/json" `
    -Body $verifyBody `
    -TimeoutSec 20

$customerLogin = $customerVerifyResponse.Content | ConvertFrom-Json
if (-not $customerLogin.success -or -not $customerLogin.data.accessToken -or $customerLogin.data.user.role -ne "CUSTOMER") {
    throw "OTP verification did not return a CUSTOMER access token."
}

$refreshCookie = $customerVerifyResponse.Headers["Set-Cookie"] |
    Where-Object { $_ -like "fraudcell_refresh=*" } |
    Select-Object -First 1

if (-not $refreshCookie) {
    throw "OTP verification did not return the refresh cookie."
}

$refreshCookieHeader = ($refreshCookie -split ";")[0]
$customerHeaders = @{ Authorization = "Bearer $($customerLogin.data.accessToken)" }
$customerMe = Invoke-RestMethod `
    -Method Get `
    -Uri "$gatewayBase/api/v1/auth/me" `
    -Headers $customerHeaders `
    -TimeoutSec 20

if (-not $customerMe.success -or $customerMe.data.role -ne "CUSTOMER") {
    throw "Customer /auth/me failed or did not return CUSTOMER role."
}

Write-Host "[ok] customer OTP registration"

Write-Step "checking refresh token rotation"
$refreshRaw = & curl.exe -s -X POST -H "Cookie: $refreshCookieHeader" "$gatewayBase/api/v1/auth/refresh"
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($refreshRaw)) {
    throw "Refresh endpoint request failed."
}

$refresh = $refreshRaw | ConvertFrom-Json

if (-not $refresh.success -or -not $refresh.data.accessToken) {
    throw "Refresh endpoint did not return a new access token."
}

Write-Host "[ok] refresh token rotation"

Write-Step "checking transaction create and idempotency"
$idempotencyKey = "smoke-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
$highRiskOccurredAt = [DateTimeOffset]::new([DateTime]::UtcNow.Date.AddHours(1), [TimeSpan]::Zero)
$transactionHeaders = @{
    Authorization = "Bearer $($customerLogin.data.accessToken)"
    "Idempotency-Key" = $idempotencyKey
}

$transactionBody = @{
    amount = 50000.00
    currency = "TRY"
    transactionType = "TRANSFER"
    recipient = @{
        reference = "TR-SMOKE-$staffSuffix"
    }
    device = @{
        fingerprint = "smoke-device-$staffSuffix"
    }
    location = @{
        city = "New York"
        countryCode = "US"
    }
    occurredAt = $highRiskOccurredAt.ToString("o")
} | ConvertTo-Json -Depth 4

$createdTransaction = Invoke-RestMethod `
    -Method Post `
    -Uri "$gatewayBase/api/v1/transactions" `
    -Headers $transactionHeaders `
    -ContentType "application/json" `
    -Body $transactionBody `
    -TimeoutSec 20

if (-not $createdTransaction.success -or -not $createdTransaction.data.transactionId -or $createdTransaction.data.assessmentStatus -ne "PENDING") {
    throw "Transaction create did not return a PENDING transaction."
}

$replayedTransaction = Invoke-RestMethod `
    -Method Post `
    -Uri "$gatewayBase/api/v1/transactions" `
    -Headers $transactionHeaders `
    -ContentType "application/json" `
    -Body $transactionBody `
    -TimeoutSec 20

if (-not $replayedTransaction.success -or $replayedTransaction.data.transactionId -ne $createdTransaction.data.transactionId) {
    throw "Transaction idempotency replay did not return the original transaction."
}

$transactionDetail = Invoke-RestMethod `
    -Method Get `
    -Uri "$gatewayBase/api/v1/transactions/$($createdTransaction.data.transactionId)" `
    -Headers $customerHeaders `
    -TimeoutSec 20

if (-not $transactionDetail.success -or $transactionDetail.data.transactionId -ne $createdTransaction.data.transactionId) {
    throw "Transaction detail did not return the created transaction."
}

$customerTransactions = Invoke-RestMethod `
    -Method Get `
    -Uri "$gatewayBase/api/v1/transactions?limit=5" `
    -Headers $customerHeaders `
    -TimeoutSec 20

if (-not $customerTransactions.success -or $customerTransactions.data.items.Count -lt 1) {
    throw "Customer transaction list did not return any item."
}

Write-Host "[ok] transaction create and idempotency"

Write-Step "checking transaction -> RabbitMQ -> AI -> risk case flow"
$assessmentStartedAt = [DateTimeOffset]::UtcNow
$assessmentDeadline = $assessmentStartedAt.AddSeconds(20)

do {
    $transactionDetail = Invoke-RestMethod `
        -Method Get `
        -Uri "$gatewayBase/api/v1/transactions/$($createdTransaction.data.transactionId)" `
        -Headers $customerHeaders `
        -TimeoutSec 20

    if ($transactionDetail.data.assessment.status -eq "COMPLETED") {
        break
    }

    if ($transactionDetail.data.assessment.status -in @("FAILED", "TIMED_OUT")) {
        throw "AI assessment ended with status $($transactionDetail.data.assessment.status)."
    }

    Start-Sleep -Milliseconds 250
} while ([DateTimeOffset]::UtcNow -lt $assessmentDeadline)

if ($transactionDetail.data.assessment.status -ne "COMPLETED") {
    throw "AI assessment did not complete within 20 seconds."
}

if ($null -eq $transactionDetail.data.assessment.riskScore -or
    [string]::IsNullOrWhiteSpace($transactionDetail.data.assessment.modelVersion) -or
    [string]::IsNullOrWhiteSpace($transactionDetail.data.caseId)) {
    throw "AI assessment did not return a persisted risk score, model version, and risk case."
}

$riskCase = Invoke-RestMethod `
    -Method Get `
    -Uri "$gatewayBase/api/v1/cases/$($transactionDetail.data.caseId)" `
    -Headers $headers `
    -TimeoutSec 20

if (-not $riskCase.success -or $riskCase.data.transaction.transactionId -ne $createdTransaction.data.transactionId) {
    throw "The AI-created risk case could not be read through the gateway."
}

$assessmentElapsed = [Math]::Round(([DateTimeOffset]::UtcNow - $assessmentStartedAt).TotalMilliseconds)
Write-Host "[ok] AI assessment and risk case ($assessmentElapsed ms, decision=$($transactionDetail.data.assessment.screeningDecision))"

Write-Step "checking transaction service JWT validation"
$transactions = Invoke-RestMethod `
    -Method Get `
    -Uri "$gatewayBase/api/v1/transactions?limit=1" `
    -Headers $headers `
    -TimeoutSec 20

if (-not $transactions.success) {
    throw "Transaction list endpoint did not return a successful envelope."
}

Write-Host "[ok] transaction service accepts shared JWT"

Write-Step "checking gamification service JWT validation"
$badges = Invoke-RestMethod `
    -Method Get `
    -Uri "$gatewayBase/api/v1/game/badges" `
    -Headers $headers `
    -TimeoutSec 20

if (-not $badges.success) {
    throw "Gamification badges endpoint did not return a successful envelope."
}

Write-Host "[ok] gamification service accepts shared JWT"

Write-Host ""
Write-Host "[smoke] backend smoke passed"
