#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Runs comprehensive integration tests for the Machine Rental System
.DESCRIPTION
    This script executes all integration tests including:
    - Backend API integration tests
    - Frontend component integration tests  
    - IoT controller integration tests
    - End-to-end system tests
    - Performance and load tests
.PARAMETER TestType
    Type of tests to run: all, backend, frontend, iot, e2e, performance
.PARAMETER Verbose
    Enable verbose output
.PARAMETER Coverage
    Generate test coverage reports
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("all", "backend", "frontend", "iot", "e2e", "performance")]
    [string]$TestType = "all",
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose,
    
    [Parameter(Mandatory=$false)]
    [switch]$Coverage
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = $Reset)
    Write-Host "$Color$Message$Reset"
}

function Test-Prerequisites {
    Write-ColorOutput "🔍 Checking prerequisites..." $Blue
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-ColorOutput "✅ Node.js version: $nodeVersion" $Green
    } catch {
        Write-ColorOutput "❌ Node.js not found. Please install Node.js 18+" $Red
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-ColorOutput "✅ npm version: $npmVersion" $Green
    } catch {
        Write-ColorOutput "❌ npm not found" $Red
        exit 1
    }
    
    # Check if dependencies are installed
    if (-not (Test-Path "node_modules")) {
        Write-ColorOutput "📦 Installing dependencies..." $Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "❌ Failed to install dependencies" $Red
            exit 1
        }
    }
    
    Write-ColorOutput "✅ Prerequisites check passed" $Green
}

function Start-TestServices {
    Write-ColorOutput "🚀 Starting test services..." $Blue
    
    # Start PostgreSQL (if using Docker)
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        Write-ColorOutput "🐳 Starting PostgreSQL container..." $Yellow
        docker run -d --name postgres-test -e POSTGRES_PASSWORD=testpass -e POSTGRES_DB=machine_rental_test -p 5433:5432 postgres:15
        Start-Sleep 5
    }
    
    # Start Redis (if using Docker)
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        Write-ColorOutput "🐳 Starting Redis container..." $Yellow
        docker run -d --name redis-test -p 6380:6379 redis:7
        Start-Sleep 2
    }
    
    # Start MQTT Broker (if using Docker)
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        Write-ColorOutput "🐳 Starting MQTT broker..." $Yellow
        docker run -d --name mosquitto-test -p 1884:1883 eclipse-mosquitto:2
        Start-Sleep 2
    }
    
    Write-ColorOutput "✅ Test services started" $Green
}

function Stop-TestServices {
    Write-ColorOutput "🛑 Stopping test services..." $Blue
    
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        docker stop postgres-test redis-test mosquitto-test 2>$null
        docker rm postgres-test redis-test mosquitto-test 2>$null
    }
    
    Write-ColorOutput "✅ Test services stopped" $Green
}

function Run-BackendTests {
    Write-ColorOutput "🧪 Running backend integration tests..." $Blue
    
    Set-Location "packages/backend"
    
    $env:NODE_ENV = "test"
    $env:DATABASE_URL = "postgresql://postgres:testpass@localhost:5433/machine_rental_test"
    $env:REDIS_URL = "redis://localhost:6380"
    $env:MQTT_BROKER_URL = "mqtt://localhost:1884"
    
    if ($Coverage) {
        npm run test -- --coverage --reporter=verbose src/test/integration.test.ts
    } else {
        npm run test -- --reporter=verbose src/test/integration.test.ts
    }
    
    $backendResult = $LASTEXITCODE
    Set-Location "../.."
    
    if ($backendResult -eq 0) {
        Write-ColorOutput "✅ Backend integration tests passed" $Green
    } else {
        Write-ColorOutput "❌ Backend integration tests failed" $Red
    }
    
    return $backendResult
}

function Run-FrontendTests {
    Write-ColorOutput "🧪 Running frontend integration tests..." $Blue
    
    Set-Location "packages/frontend"
    
    $env:NODE_ENV = "test"
    
    if ($Coverage) {
        npm run test -- --coverage --reporter=verbose src/test/integration.test.tsx
    } else {
        npm run test -- --reporter=verbose src/test/integration.test.tsx
    }
    
    $frontendResult = $LASTEXITCODE
    Set-Location "../.."
    
    if ($frontendResult -eq 0) {
        Write-ColorOutput "✅ Frontend integration tests passed" $Green
    } else {
        Write-ColorOutput "❌ Frontend integration tests failed" $Red
    }
    
    return $frontendResult
}

function Run-IoTTests {
    Write-ColorOutput "🧪 Running IoT controller integration tests..." $Blue
    
    Set-Location "packages/iot-controller"
    
    $env:NODE_ENV = "test"
    $env:MQTT_BROKER_URL = "mqtt://localhost:1884"
    $env:PIGPIO_MOCK = "true"  # Use mock GPIO for testing
    
    if ($Coverage) {
        npm run test -- --coverage --reporter=verbose src/test/integration.test.ts
    } else {
        npm run test -- --reporter=verbose src/test/integration.test.ts
    }
    
    $iotResult = $LASTEXITCODE
    Set-Location "../.."
    
    if ($iotResult -eq 0) {
        Write-ColorOutput "✅ IoT controller integration tests passed" $Green
    } else {
        Write-ColorOutput "❌ IoT controller integration tests failed" $Red
    }
    
    return $iotResult
}

function Run-E2ETests {
    Write-ColorOutput "🧪 Running end-to-end system tests..." $Blue
    
    Set-Location "packages/backend"
    
    $env:NODE_ENV = "test"
    $env:DATABASE_URL = "postgresql://postgres:testpass@localhost:5433/machine_rental_test"
    $env:REDIS_URL = "redis://localhost:6380"
    $env:MQTT_BROKER_URL = "mqtt://localhost:1884"
    $env:WHATSAPP_MOCK = "true"  # Use mock WhatsApp API
    $env:PIX_MOCK = "true"       # Use mock PIX payment gateway
    
    if ($Coverage) {
        npm run test -- --coverage --reporter=verbose src/test/e2e.test.ts
    } else {
        npm run test -- --reporter=verbose src/test/e2e.test.ts
    }
    
    $e2eResult = $LASTEXITCODE
    Set-Location "../.."
    
    if ($e2eResult -eq 0) {
        Write-ColorOutput "✅ End-to-end tests passed" $Green
    } else {
        Write-ColorOutput "❌ End-to-end tests failed" $Red
    }
    
    return $e2eResult
}

function Run-PerformanceTests {
    Write-ColorOutput "🧪 Running performance tests..." $Blue
    
    # Performance tests are included in the e2e tests
    # But we can run them with specific performance flags
    Set-Location "packages/backend"
    
    $env:NODE_ENV = "test"
    $env:DATABASE_URL = "postgresql://postgres:testpass@localhost:5433/machine_rental_test"
    $env:REDIS_URL = "redis://localhost:6380"
    $env:MQTT_BROKER_URL = "mqtt://localhost:1884"
    $env:PERFORMANCE_TEST = "true"
    
    npm run test -- --reporter=verbose --grep="Performance and Load Testing"
    
    $perfResult = $LASTEXITCODE
    Set-Location "../.."
    
    if ($perfResult -eq 0) {
        Write-ColorOutput "✅ Performance tests passed" $Green
    } else {
        Write-ColorOutput "❌ Performance tests failed" $Red
    }
    
    return $perfResult
}

function Generate-TestReport {
    Write-ColorOutput "📊 Generating test report..." $Blue
    
    $reportPath = "test-results"
    if (-not (Test-Path $reportPath)) {
        New-Item -ItemType Directory -Path $reportPath
    }
    
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $reportFile = "$reportPath/integration-test-report-$timestamp.md"
    
    @"
# Integration Test Report

**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Test Type:** $TestType
**Coverage:** $($Coverage ? "Enabled" : "Disabled")

## Test Results

| Test Suite | Status | Duration |
|------------|--------|----------|
| Backend Integration | $($script:backendStatus ? "✅ PASS" : "❌ FAIL") | $($script:backendDuration)ms |
| Frontend Integration | $($script:frontendStatus ? "✅ PASS" : "❌ FAIL") | $($script:frontendDuration)ms |
| IoT Controller | $($script:iotStatus ? "✅ PASS" : "❌ FAIL") | $($script:iotDuration)ms |
| End-to-End | $($script:e2eStatus ? "✅ PASS" : "❌ FAIL") | $($script:e2eDuration)ms |
| Performance | $($script:perfStatus ? "✅ PASS" : "❌ FAIL") | $($script:perfDuration)ms |

## Summary

- **Total Tests:** $script:totalTests
- **Passed:** $script:passedTests
- **Failed:** $script:failedTests
- **Success Rate:** $([math]::Round(($script:passedTests / $script:totalTests) * 100, 2))%

## Coverage

$($Coverage ? "Coverage reports generated in coverage/ directories" : "Coverage not enabled")

## Recommendations

$($script:failedTests -gt 0 ? "❌ Some tests failed. Review the logs above for details." : "✅ All tests passed successfully!")

"@ | Out-File -FilePath $reportFile -Encoding UTF8
    
    Write-ColorOutput "📊 Test report saved to: $reportFile" $Green
}

# Main execution
try {
    Write-ColorOutput "🚀 Machine Rental System - Integration Test Suite" $Blue
    Write-ColorOutput "=================================================" $Blue
    
    Test-Prerequisites
    Start-TestServices
    
    # Initialize tracking variables
    $script:totalTests = 0
    $script:passedTests = 0
    $script:failedTests = 0
    
    $script:backendStatus = $true
    $script:frontendStatus = $true
    $script:iotStatus = $true
    $script:e2eStatus = $true
    $script:perfStatus = $true
    
    # Run tests based on type
    switch ($TestType) {
        "all" {
            Write-ColorOutput "🧪 Running all integration tests..." $Blue
            
            $start = Get-Date
            $backendResult = Run-BackendTests
            $script:backendDuration = ((Get-Date) - $start).TotalMilliseconds
            $script:backendStatus = ($backendResult -eq 0)
            $script:totalTests++
            if ($script:backendStatus) { $script:passedTests++ } else { $script:failedTests++ }
            
            $start = Get-Date
            $frontendResult = Run-FrontendTests
            $script:frontendDuration = ((Get-Date) - $start).TotalMilliseconds
            $script:frontendStatus = ($frontendResult -eq 0)
            $script:totalTests++
            if ($script:frontendStatus) { $script:passedTests++ } else { $script:failedTests++ }
            
            $start = Get-Date
            $iotResult = Run-IoTTests
            $script:iotDuration = ((Get-Date) - $start).TotalMilliseconds
            $script:iotStatus = ($iotResult -eq 0)
            $script:totalTests++
            if ($script:iotStatus) { $script:passedTests++ } else { $script:failedTests++ }
            
            $start = Get-Date
            $e2eResult = Run-E2ETests
            $script:e2eDuration = ((Get-Date) - $start).TotalMilliseconds
            $script:e2eStatus = ($e2eResult -eq 0)
            $script:totalTests++
            if ($script:e2eStatus) { $script:passedTests++ } else { $script:failedTests++ }
            
            $start = Get-Date
            $perfResult = Run-PerformanceTests
            $script:perfDuration = ((Get-Date) - $start).TotalMilliseconds
            $script:perfStatus = ($perfResult -eq 0)
            $script:totalTests++
            if ($script:perfStatus) { $script:passedTests++ } else { $script:failedTests++ }
        }
        "backend" {
            $start = Get-Date
            $backendResult = Run-BackendTests
            $script:backendDuration = ((Get-Date) - $start).TotalMilliseconds
            $script:backendStatus = ($backendResult -eq 0)
            $script:totalTests = 1
            if ($script:backendStatus) { $script:passedTests = 1 } else { $script:failedTests = 1 }
        }
        "frontend" {
            $start = Get-Date
            $frontendResult = Run-FrontendTests
            $script:frontendDuration = ((Get-Date) - $start).TotalMilliseconds
            $script:frontendStatus = ($frontendResult -eq 0)
            $script:totalTests = 1
            if ($script:frontendStatus) { $script:passedTests = 1 } else { $script:failedTests = 1 }
        }
        "iot" {
            $start = Get-Date
            $iotResult = Run-IoTTests
            $script:iotDuration = ((Get-Date) - $start).TotalMilliseconds
            $script:iotStatus = ($iotResult -eq 0)
            $script:totalTests = 1
            if ($script:iotStatus) { $script:passedTests = 1 } else { $script:failedTests = 1 }
        }
        "e2e" {
            $start = Get-Date
            $e2eResult = Run-E2ETests
            $script:e2eDuration = ((Get-Date) - $start).TotalMilliseconds
            $script:e2eStatus = ($e2eResult -eq 0)
            $script:totalTests = 1
            if ($script:e2eStatus) { $script:passedTests = 1 } else { $script:failedTests = 1 }
        }
        "performance" {
            $start = Get-Date
            $perfResult = Run-PerformanceTests
            $script:perfDuration = ((Get-Date) - $start).TotalMilliseconds
            $script:perfStatus = ($perfResult -eq 0)
            $script:totalTests = 1
            if ($script:perfStatus) { $script:passedTests = 1 } else { $script:failedTests = 1 }
        }
    }
    
    # Generate report
    Generate-TestReport
    
    # Final summary
    Write-ColorOutput "=================================================" $Blue
    Write-ColorOutput "🏁 Integration Test Suite Complete" $Blue
    Write-ColorOutput "Total Tests: $script:totalTests" $Blue
    Write-ColorOutput "Passed: $script:passedTests" $Green
    Write-ColorOutput "Failed: $script:failedTests" $Red
    
    if ($script:failedTests -eq 0) {
        Write-ColorOutput "🎉 All integration tests passed!" $Green
        $exitCode = 0
    } else {
        Write-ColorOutput "💥 Some integration tests failed!" $Red
        $exitCode = 1
    }
    
} catch {
    Write-ColorOutput "💥 Error running integration tests: $_" $Red
    $exitCode = 1
} finally {
    Stop-TestServices
}

exit $exitCode