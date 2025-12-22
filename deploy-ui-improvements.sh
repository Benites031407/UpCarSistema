#!/bin/bash

# Deploy UI Improvements
# This script deploys the UI improvements including:
# - Fixed NaN message in credit addition
# - Credit card minimum value validation
# - Improved session expired message
# - New machines list page

echo "========================================="
echo "Deploying UI Improvements"
echo "========================================="

# Pull latest changes
echo ""
echo "1. Pulling latest changes from GitHub..."
git pull origin main

# Rebuild frontend container
echo ""
echo "2. Rebuilding frontend container..."
docker compose -f docker-compose.prod.yml up -d --build frontend

# Wait for frontend to be ready
echo ""
echo "3. Waiting for frontend to be ready..."
sleep 10

# Check frontend logs
echo ""
echo "4. Checking frontend logs..."
docker compose -f docker-compose.prod.yml logs frontend --tail=30

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Test the changes:"
echo "1. Add credit with PIX - verify message shows correctly"
echo "2. Try credit card with < R$ 1,00 - verify error message"
echo "3. Click 'Ver Todos os Aspiradores e Locais' on homepage"
echo "4. Verify machines list page loads with all machines"
echo ""
