# End-to-End Test Runner Script
# Automatically starts services and runs E2E tests

param(
    [switch]$KeepServerRunning
)

$ErrorActionPreference = "Stop"

function Write-ColorOutput($ForegroundColor, $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

function Test-Port {
    param($Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet 2>$null
    return $connection
}

function Wait-ForHealthCheck {
    param($MaxAttempts = 30)
    
    Write-ColorOutput Yellow "Waiting for backend server to be ready..."
    
    for ($i = 1; $i -le $MaxAttempts; $i++) {
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.status -eq "healthy" -or $response.status -eq "degraded") {
                Write-ColorOutput Green "Backend server is ready!"
                return $true
            }
        } catch {
            # Not ready yet
        }
        
        if ($i -eq 1 -or $i % 5 -eq 0) {
            Write-Output "  Waiting... ($i/$MaxAttempts)"
        }
        Start-Sleep -Seconds 1
    }
    
    return $false
}

# Banner
Write-Output ""
Write-ColorOutput Cyan "=========================================="
Write-ColorOutput Cyan "  E2E Test Runner"
Write-ColorOutput Cyan "=========================================="
Write-Output ""

# Step 1: Check infrastructure
Write-ColorOutput Cyan "[1/5] Checking infrastructure services..."
Write-Output ""

$allGood = $true

if (Test-Port 5432) {
    Write-ColorOutput Green "  PostgreSQL: Running"
} else {
    Write-ColorOutput Red "  PostgreSQL: NOT running"
    Write-Output "  Please start PostgreSQL"
    $allGood = $false
}

if (Test-Port 6380) {
    Write-ColorOutput Green "  Redis: Running"
} else {
    Write-ColorOutput Yellow "  Redis: Starting..."
    docker-compose -f docker-compose.test-local.yml up -d redis-test 2>&1 | Out-Null
    Start-Sleep -Seconds 3
    if (Test-Port 6380) {
        Write-ColorOutput Green "  Redis: Started"
    } else {
        Write-ColorOutput Red "  Redis: Failed to start"
        $allGood = $false
    }
}

if (Test-Port 1884) {
    Write-ColorOutput Green "  MQTT: Running"
} else {
    Write-ColorOutput Yellow "  MQTT: Starting..."
    docker-compose -f docker-compose.test-local.yml up -d mosquitto-test 2>&1 | Out-Null
    Start-Sleep -Seconds 3
    if (Test-Port 1884) {
        Write-ColorOutput Green "  MQTT: Started"
    } else {
        Write-ColorOutput Red "  MQTT: Failed to start"
        $allGood = $false
    }
}

if (-not $allGood) {
    Write-Output ""
    Write-ColorOutput Red "Some services failed to start. Please fix and try again."
    exit 1
}

Write-Output ""

# Step 2: Check if server is already running
Write-ColorOutput Cyan "[2/5] Checking backend server..."
Write-Output ""

$serverProcess = $null
$serverAlreadyRunning = Test-Port 3000

if ($serverAlreadyRunning) {
    Write-ColorOutput Yellow "Backend server already running on port 3000"
    Write-ColorOutput Yellow "Using existing server..."
} else {
    # Step 3: Start backend server
    Write-ColorOutput Cyan "[3/5] Starting backend server..."
    Write-Output ""
    
    # Start server in background
    $serverProcess = Start-Process powershell -ArgumentList @(
        "-NoProfile",
        "-Command",
        "cd '$PWD\packages\backend'; npm run dev"
    ) -PassThru -WindowStyle Minimized
    
    Write-ColorOutput Yellow "Server starting (PID: $($serverProcess.Id))..."
    
    # Wait for health check
    $ready = Wait-ForHealthCheck -MaxAttempts 30
    
    if (-not $ready) {
        Write-ColorOutput Red "Backend server failed to start!"
        if ($serverProcess) {
            Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
        }
        exit 1
    }
}

Write-Output ""

# Step 4: Run tests
Write-ColorOutput Cyan "[4/5] Running E2E and Load tests..."
Write-Output ""

Push-Location packages/backend

# Run E2E tests
npm test -- --run src/test/e2e.test.ts src/test/load.test.ts src/test/final-integration.test.ts 2>&1

$testExitCode = $LASTEXITCODE

Pop-Location

Write-Output ""

# Step 5: Cleanup
Write-ColorOutput Cyan "[5/5] Cleanup..."
Write-Output ""

if ($serverProcess -and -not $KeepServerRunning) {
    Write-ColorOutput Yellow "Stopping backend server..."
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    Write-ColorOutput Green "Server stopped"
} elseif ($serverProcess) {
    Write-ColorOutput Cyan "Server still running (PID: $($serverProcess.Id))"
    Write-ColorOutput Cyan "To stop: Stop-Process -Id $($serverProcess.Id)"
}

Write-Output ""

# Results
Write-ColorOutput Cyan "=========================================="
if ($testExitCode -eq 0) {
    Write-ColorOutput Green "All tests passed!"
} else {
    Write-ColorOutput Yellow "Some tests failed (see output above)"
}
Write-ColorOutput Cyan "=========================================="
Write-Output ""

exit $testExitCode
