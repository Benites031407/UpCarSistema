#!/bin/bash

# MercadoPago Webhook Setup Script
# This script configures the webhook URL in your MercadoPago account

# Your MercadoPago Access Token
ACCESS_TOKEN="APP_USR-8520764521265905-121318-44a1befb70f238036772901e8d9c8f87-486340107"

# Your webhook URL
WEBHOOK_URL="https://upaspiradores.com.br/webhooks/mercadopago"

echo "Setting up MercadoPago webhook..."
echo "Webhook URL: $WEBHOOK_URL"

# Create or update webhook
curl -X POST \
  "https://api.mercadopago.com/v1/webhooks" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "'"$WEBHOOK_URL"'",
    "events": [
      {
        "topic": "payment"
      }
    ]
  }'

echo ""
echo "Webhook configuration complete!"
echo ""
echo "To verify, check your MercadoPago dashboard:"
echo "https://www.mercadopago.com.br/developers/panel/app"
