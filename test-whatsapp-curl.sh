#!/bin/bash

# Quick WhatsApp API Test using curl
# Update the variables below with your credentials

# ============================================
# CONFIGURATION - Update these values
# ============================================

PHONE_NUMBER_ID="your-phone-number-id-here"
ACCESS_TOKEN="your-access-token-here"
TO_PHONE="5511948580070"
API_URL="https://graph.facebook.com/v18.0"

# ============================================
# Test Script
# ============================================

echo "╔════════════════════════════════════════════╗"
echo "║   WhatsApp API Quick Test (curl)          ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Validate configuration
if [ "$PHONE_NUMBER_ID" = "your-phone-number-id-here" ]; then
    echo "❌ Error: Please update PHONE_NUMBER_ID in this script"
    exit 1
fi

if [ "$ACCESS_TOKEN" = "your-access-token-here" ]; then
    echo "❌ Error: Please update ACCESS_TOKEN in this script"
    exit 1
fi

echo "📱 Sending test message to: $TO_PHONE"
echo ""

# Send test message
response=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_URL/$PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "'"$TO_PHONE"'",
    "type": "text",
    "text": {
      "body": "🧪 Mensagem de teste do UpCar-Aspiradores\n\nSe você recebeu isso, a API do WhatsApp está funcionando!"
    }
  }')

# Extract HTTP status code (last line)
http_code=$(echo "$response" | tail -n1)
# Extract response body (all but last line)
body=$(echo "$response" | sed '$d')

echo "HTTP Status: $http_code"
echo ""

if [ "$http_code" = "200" ]; then
    echo "✅ Success! Message sent."
    echo ""
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    echo ""
    echo "📱 Check your phone for the message!"
else
    echo "❌ Failed to send message"
    echo ""
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    echo ""
    echo "Common issues:"
    echo "  - Invalid access token (expired or incorrect)"
    echo "  - Phone number not in test list"
    echo "  - Invalid phone number format"
fi

echo ""
