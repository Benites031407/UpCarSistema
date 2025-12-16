# Complete Test Suite Runner
# Runs all tests: Unit, Property, Integration, E2E, and Load tests

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Complete Test Suite Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$totalStart = Get-Date

# Step 1: Run fast tests (no infrastructure needed)
Write-Host "[1/2] Running Unit and Property Tests..." -ForegroundColor Cyan
Write-Host "  (No infrastructure required - fast!)" -ForegroundColor Yellow
Write-Host ""

Push-Location packages/backend

npm test -- --run --testPathIgnorePatterns="e2e|load|final-integration"

$unitTestsExitCode = $LASTEXITCODE

Pop-Location

Write-Host ""

if ($unitTestsExitCode -eq 0) {
    Write-Host "Unit and Property Tests: PASSED" -ForegroundColor Green
} else {
    Write-Host "Unit and Property Tests: FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "Fix unit tests before running E2E tests" -ForegroundColor Yellow
    exit $unitTestsExitCode
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 2: Run E2E tests (requires infrastructure)
Write-Host "[2/2] Running E2E and Load Tests..." -ForegroundColor Cyan
Write-Host "  (Requires infrastructure - slower)" -ForegroundColor Yellow
Write-Host ""

& .\scripts\run-e2e-tests.ps1

$e2eTestsExitCode = $LASTEXITCODE

Write-Host ""

# Summary
$totalEnd = Get-Date
$duration = $totalEnd - $totalStart

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test Suite Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($unitTestsExitCode -eq 0) {
    Write-Host "Unit & Property Tests: PASSED" -ForegroundColor Green
} else {
    Write-Host "Unit & Property Tests: FAILED" -ForegroundColor Red
}

if ($e2eTestsExitCode -eq 0) {
    Write-Host "E2E & Load Tests:      PASSED" -ForegroundColor Green
} else {
    Write-Host "E2E & Load Tests:      FAILED" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Total Duration: $($duration.TotalSeconds) seconds" -ForegroundColor Cyan
Write-Host ""

if ($unitTestsExitCode -eq 0 -and $e2eTestsExitCode -eq 0) {
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
    exit 0
} elseif ($unitTestsExitCode -eq 0) {
    Write-Host "Core tests passed. E2E tests need attention." -ForegroundColor Yellow
    exit $e2eTestsExitCode
} else {
    Write-Host "Critical tests failed. Fix unit tests first." -ForegroundColor Red
    exit $unitTestsExitCode
}
