#!/bin/bash

# Payment Fixes Deployment Script
# This script deploys the payment system fixes to production

set -e  # Exit on error

echo "========================================="
echo "Payment Fixes Deployment Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_USER="ubuntu"
SERVER_IP="56.125.203.232"
SSH_KEY="~/.ssh/upcar-key.pem"
REMOTE_DIR="/opt/upcar"

echo -e "${YELLOW}Step 1: Uploading modified files to server...${NC}"
echo ""

# Upload backend payment service
echo "Uploading paymentService.ts..."
scp -i $SSH_KEY packages/backend/src/services/paymentService.ts \
    $SERVER_USER@$SERVER_IP:$REMOTE_DIR/packages/backend/src/services/paymentService.ts

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend payment service uploaded${NC}"
else
    echo -e "${RED}✗ Failed to upload backend payment service${NC}"
    exit 1
fi

# Upload frontend credit card form
echo "Uploading CreditCardForm.tsx..."
scp -i $SSH_KEY packages/frontend/src/components/CreditCardForm.tsx \
    $SERVER_USER@$SERVER_IP:$REMOTE_DIR/packages/frontend/src/components/CreditCardForm.tsx

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend credit card form uploaded${NC}"
else
    echo -e "${RED}✗ Failed to upload frontend credit card form${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Connecting to server and rebuilding services...${NC}"
echo ""

# SSH to server and rebuild
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP << 'ENDSSH'
    set -e
    
    echo "Navigating to project directory..."
    cd /opt/upcar
    
    echo ""
    echo "Stopping services..."
    docker compose -f docker-compose.prod.yml down
    
    echo ""
    echo "Rebuilding backend..."
    docker compose -f docker-compose.prod.yml build backend
    
    echo ""
    echo "Rebuilding frontend..."
    docker compose -f docker-compose.prod.yml build frontend
    
    echo ""
    echo "Starting services..."
    docker compose -f docker-compose.prod.yml up -d
    
    echo ""
    echo "Waiting for services to start..."
    sleep 10
    
    echo ""
    echo "Checking service status..."
    docker compose -f docker-compose.prod.yml ps
    
    echo ""
    echo "Checking backend logs (last 20 lines)..."
    docker compose -f docker-compose.prod.yml logs backend --tail=20
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Test PIX payment: https://upaspiradores.com.br/add-credit"
    echo "2. Test credit card payment with test card"
    echo "3. Monitor logs: ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP 'cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml logs -f backend'"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}✗ Deployment failed!${NC}"
    echo -e "${RED}=========================================${NC}"
    echo ""
    echo "Check the error messages above and try again."
    exit 1
fi
