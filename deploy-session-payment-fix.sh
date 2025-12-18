#!/bin/bash

# Deploy Session Payment WebSocket Fix
# This script deploys the fix for session PIX payment WebSocket notifications

echo "========================================="
echo "Deploying Session Payment WebSocket Fix"
echo "========================================="

# Pull latest changes
echo ""
echo "1. Pulling latest changes from GitHub..."
git pull origin main

# Rebuild backend container
echo ""
echo "2. Rebuilding backend container..."
docker compose -f docker-compose.prod.yml up -d --build backend

# Wait for backend to be ready
echo ""
echo "3. Waiting for backend to be ready..."
sleep 10

# Check backend logs
echo ""
echo "4. Checking backend logs..."
docker compose -f docker-compose.prod.yml logs backend --tail=50

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Test the fix by:"
echo "1. Go to MachineActivationPage"
echo "2. Select time and PIX payment"
echo "3. Pay via PIX"
echo "4. WebSocket should automatically confirm and activate session"
echo ""
echo "Check webhook logs with:"
echo "docker compose -f docker-compose.prod.yml logs backend --follow | grep -i 'webhook\\|payment\\|session'"
