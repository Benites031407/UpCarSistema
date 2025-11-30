# Test Services Health Check Script

$ErrorActionPreference = "Continue"

function Write-ColorOutput($ForegroundColor, $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

function Test-ServiceHealth {
    param($ServiceName, $Port, $TestCommand)
    
    Write-Output ""
    Write-Output "Testing $ServiceName on port $Port..."
    
    # Check if port is listening
    $portCheck = netstat -ano | Select-String ":$Port.*LISTENING"
    
    if ($portCheck) {
        Write-ColorOutput Green "  ✅ Port $Port is listening"
        
        # Run specific test command if provided
        if ($TestCommand) {
            try {
                $result = Invoke-Expression $TestCommand 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-ColorOutput Green "  ✅ Service is responding correctly"
                    return $true
                } else {
                    Write-ColorOutput Yellow "  ⚠️  Service is listening but may not be ready"
                    return $false
                }
            } catch {
                Write-ColorOutput Yellow "  ⚠️  Could not verify service health"
                return $false
            }
        }
        return $true
    } else {
        Write-ColorOutput Red "  ❌ Port $Port is not listening"
        return $false
    }
}

Write-ColorOutput Cyan "🔍 Checking Test Infrastructure Health..."
Write-Output ""

# Check Docker
Write-Output "Checking Docker..."
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-ColorOutput Green "  ✅ Docker is running"
} else {
    Write-ColorOutput Red "  ❌ Docker is not running or not installed"
    Write-Output ""
    Write-Output "Please start Docker Desktop and try again."
    exit 1
}

# Check if test containers are running
Write-Output ""
Write-Output "Checking test containers..."
$containers = docker-compose -f docker-compose.test.yml ps --services --filter "status=running" 2>&1

if ($containers -match "postgres-test") {
    Write-ColorOutput Green "  ✅ PostgreSQL container is running"
} else {
    Write-ColorOutput Red "  ❌ PostgreSQL container is not running"
}

if ($containers -match "redis-test") {
    Write-ColorOutput Green "  ✅ Redis container is running"
} else {
    Write-ColorOutput Red "  ❌ Redis container is not running"
}

if ($containers -match "mosquitto-test") {
    Write-ColorOutput Green "  ✅ MQTT container is running"
} else {
    Write-ColorOutput Red "  ❌ MQTT container is not running"
}

# Test service connectivity
$postgresHealthy = Test-ServiceHealth "PostgreSQL" "5433" "docker exec machine-rental-system-postgres-test-1 pg_isready -U postgres"
$redisHealthy = Test-ServiceHealth "Redis" "6380" "docker exec machine-rental-system-redis-test-1 redis-cli ping"
$mqttHealthy = Test-ServiceHealth "MQTT" "1884"

# Summary
Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output ""

$allHealthy = $postgresHealthy -and $redisHealthy -and $mqttHealthy

if ($allHealthy) {
    Write-ColorOutput Green "✅ All test services are healthy and ready!"
    Write-Output ""
    Write-Output "You can now run tests with:"
    Write-ColorOutput Cyan "  cd packages/backend"
    Write-ColorOutput Cyan "  npm test"
} else {
    Write-ColorOutput Yellow "⚠️  Some services are not ready"
    Write-Output ""
    Write-Output "Try these steps:"
    Write-Output "  1. Start services: .\scripts\test-infrastructure.ps1 start"
    Write-Output "  2. Wait 10 seconds for services to initialize"
    Write-Output "  3. Run this check again: .\scripts\check-test-services.ps1"
    Write-Output ""
    Write-Output "If problems persist, check logs:"
    Write-ColorOutput Cyan "  .\scripts\test-infrastructure.ps1 logs"
}

Write-Output ""
