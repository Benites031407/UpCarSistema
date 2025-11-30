# Test Infrastructure Management Script
# This script helps you start/stop the test infrastructure services

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'logs')]
    [string]$Action
)

$ErrorActionPreference = "Stop"

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Start-TestInfrastructure {
    Write-ColorOutput Green "🚀 Starting test infrastructure services..."
    Write-Output ""
    
    # Start services in detached mode
    docker-compose -f docker-compose.test.yml up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Output ""
        Write-ColorOutput Green "✅ Test infrastructure started successfully!"
        Write-Output ""
        Write-Output "Services running:"
        Write-Output "  📊 PostgreSQL: localhost:5433"
        Write-Output "  🔴 Redis: localhost:6380"
        Write-Output "  📡 MQTT (Mosquitto): localhost:1884"
        Write-Output ""
        Write-ColorOutput Yellow "⏳ Waiting for services to be ready..."
        Start-Sleep -Seconds 5
        
        # Check if services are healthy
        $postgresReady = docker-compose -f docker-compose.test.yml ps postgres-test | Select-String "Up"
        $redisReady = docker-compose -f docker-compose.test.yml ps redis-test | Select-String "Up"
        $mqttReady = docker-compose -f docker-compose.test.yml ps mosquitto-test | Select-String "Up"
        
        if ($postgresReady -and $redisReady -and $mqttReady) {
            Write-ColorOutput Green "✅ All services are ready!"
        } else {
            Write-ColorOutput Yellow "⚠️  Some services may still be starting. Check status with: .\scripts\test-infrastructure.ps1 status"
        }
        
        Write-Output ""
        Write-Output "You can now run tests with: npm test"
    } else {
        Write-ColorOutput Red "❌ Failed to start test infrastructure"
        exit 1
    }
}

function Stop-TestInfrastructure {
    Write-ColorOutput Yellow "🛑 Stopping test infrastructure services..."
    docker-compose -f docker-compose.test.yml down
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✅ Test infrastructure stopped successfully!"
    } else {
        Write-ColorOutput Red "❌ Failed to stop test infrastructure"
        exit 1
    }
}

function Restart-TestInfrastructure {
    Write-ColorOutput Yellow "🔄 Restarting test infrastructure..."
    Stop-TestInfrastructure
    Start-Sleep -Seconds 2
    Start-TestInfrastructure
}

function Show-Status {
    Write-ColorOutput Cyan "📊 Test Infrastructure Status"
    Write-Output ""
    docker-compose -f docker-compose.test.yml ps
}

function Show-Logs {
    Write-ColorOutput Cyan "📋 Test Infrastructure Logs"
    Write-Output ""
    Write-Output "Press Ctrl+C to exit logs"
    Write-Output ""
    docker-compose -f docker-compose.test.yml logs -f
}

# Main execution
switch ($Action) {
    'start' { Start-TestInfrastructure }
    'stop' { Stop-TestInfrastructure }
    'restart' { Restart-TestInfrastructure }
    'status' { Show-Status }
    'logs' { Show-Logs }
}
