# Payment Fixes Deployment Script (PowerShell)
# This script deploys the payment system fixes to production

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Payment Fixes Deployment Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SERVER_USER = "ubuntu"
$SERVER_IP = "56.125.203.232"
$SSH_KEY = "~/.ssh/upcar-key.pem"
$REMOTE_DIR = "/opt/upcar"

Write-Host "Step 1: Uploading modified files to server..." -ForegroundColor Yellow
Write-Host ""

# Upload backend payment service
Write-Host "Uploading paymentService.ts..."
try {
    scp -i $SSH_KEY packages/backend/src/services/paymentService.ts `
        "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/packages/backend/src/services/paymentService.ts"
    Write-Host "✓ Backend payment service uploaded" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to upload backend payment service" -ForegroundColor Red
    exit 1
}

# Upload frontend credit card form
Write-Host "Uploading CreditCardForm.tsx..."
try {
    scp -i $SSH_KEY packages/frontend/src/components/CreditCardForm.tsx `
        "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/packages/frontend/src/components/CreditCardForm.tsx"
    Write-Host "✓ Frontend credit card form uploaded" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to upload frontend credit card form" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Connecting to server and rebuilding services..." -ForegroundColor Yellow
Write-Host ""

# SSH to server and rebuild
$sshCommands = @"
set -e

echo 'Navigating to project directory...'
cd /opt/upcar

echo ''
echo 'Stopping services...'
docker compose -f docker-compose.prod.yml down

echo ''
echo 'Rebuilding backend...'
docker compose -f docker-compose.prod.yml build backend

echo ''
echo 'Rebuilding frontend...'
docker compose -f docker-compose.prod.yml build frontend

echo ''
echo 'Starting services...'
docker compose -f docker-compose.prod.yml up -d

echo ''
echo 'Waiting for services to start...'
sleep 10

echo ''
echo 'Checking service status...'
docker compose -f docker-compose.prod.yml ps

echo ''
echo 'Checking backend logs (last 20 lines)...'
docker compose -f docker-compose.prod.yml logs backend --tail=20
"@

try {
    ssh -i $SSH_KEY "${SERVER_USER}@${SERVER_IP}" $sshCommands
    
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "✓ Deployment completed successfully!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Test PIX payment: https://upaspiradores.com.br/add-credit"
    Write-Host "2. Test credit card payment with test card"
    Write-Host "3. Monitor logs: ssh -i $SSH_KEY ${SERVER_USER}@${SERVER_IP} 'cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml logs -f backend'"
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host "✗ Deployment failed!" -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check the error messages above and try again."
    exit 1
}
