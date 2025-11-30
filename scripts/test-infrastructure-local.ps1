# Test Infrastructure Management Script (Local PostgreSQL)
# This script helps you start/stop Redis and MQTT (uses local PostgreSQL)

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'logs')]
    [string]$Action
)

$ErrorActionPreference = "Stop"

function Write-ColorOutput($ForegroundColor, $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

function Start-TestInfrastructure {
    Write-ColorOutput Green "Starting test infrastructure services (Redis + MQTT)..."
    Write-Output ""
    Write-ColorOutput Cyan "Using local PostgreSQL installation"
    Write-Output ""
    
    # Start services in detached mode
    docker-compose -f docker-compose.test-local.yml up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Output ""
        Write-ColorOutput Green "Test infrastructure started successfully!"
        Write-Output ""
        Write-Output "Services running:"
        Write-Output "  PostgreSQL: localhost:5432 (local installation)"
        Write-Output "  Redis: localhost:6380 (Docker)"
        Write-Output "  MQTT (Mosquitto): localhost:1884 (Docker)"
        Write-Output ""
        Write-ColorOutput Yellow "Waiting for services to be ready..."
        Start-Sleep -Seconds 5
        
        # Check if services are healthy
        $redisReady = docker-compose -f docker-compose.test-local.yml ps redis-test | Select-String "Up"
        $mqttReady = docker-compose -f docker-compose.test-local.yml ps mosquitto-test | Select-String "Up"
        
        if ($redisReady -and $mqttReady) {
            Write-ColorOutput Green "Docker services are ready!"
        } else {
            Write-ColorOutput Yellow "Some services may still be starting. Check status with: .\scripts\test-infrastructure-local.ps1 status"
        }
        
        Write-Output ""
        Write-ColorOutput Cyan "Make sure your local PostgreSQL is running and configured:"
        Write-Output "  - Host: localhost"
        Write-Output "  - Port: 5432"
        Write-Output "  - Database: machine_rental"
        Write-Output "  - User: postgres"
        Write-Output ""
        Write-Output "You can now run tests with: npm test"
    } else {
        Write-ColorOutput Red "Failed to start test infrastructure"
        exit 1
    }
}

function Stop-TestInfrastructure {
    Write-ColorOutput Yellow "Stopping test infrastructure services..."
    docker-compose -f docker-compose.test-local.yml down
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "Test infrastructure stopped successfully!"
        Write-Output ""
        Write-ColorOutput Cyan "Your local PostgreSQL is still running (not managed by this script)"
    } else {
        Write-ColorOutput Red "Failed to stop test infrastructure"
        exit 1
    }
}

function Restart-TestInfrastructure {
    Write-ColorOutput Yellow "Restarting test infrastructure..."
    Stop-TestInfrastructure
    Start-Sleep -Seconds 2
    Start-TestInfrastructure
}

function Show-Status {
    Write-ColorOutput Cyan "Test Infrastructure Status"
    Write-Output ""
    Write-Output "Docker Services:"
    docker-compose -f docker-compose.test-local.yml ps
    Write-Output ""
    Write-ColorOutput Cyan "Local PostgreSQL:"
    Write-Output "  Check if PostgreSQL is running in your Services or pgAdmin"
}

function Show-Logs {
    Write-ColorOutput Cyan "Test Infrastructure Logs (Docker services only)"
    Write-Output ""
    Write-Output "Press Ctrl+C to exit logs"
    Write-Output ""
    docker-compose -f docker-compose.test-local.yml logs -f
}

# Main execution
switch ($Action) {
    'start' { Start-TestInfrastructure }
    'stop' { Stop-TestInfrastructure }
    'restart' { Restart-TestInfrastructure }
    'status' { Show-Status }
    'logs' { Show-Logs }
}
