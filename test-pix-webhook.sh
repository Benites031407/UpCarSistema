#!/bin/bash

echo "=== TESTING PIX WEBHOOK ==="
echo ""

echo "1. Test webhook endpoint:"
curl -s https://upaspiradores.com.br/webhooks/mercadopago/test | jq
echo ""

echo "2. Check recent webhook calls in logs:"
docker compose -f /opt/upcar/docker-compose.prod.yml logs backend --tail=100 | grep -i "webhook\|mercado" | tail -20
echo ""

echo "3. Check recent transactions:"
docker compose -f /opt/upcar/docker-compose.prod.yml exec postgres \
  psql -U postgres -d upcar_aspiradores -c "SELECT id, user_id, type, amount, status, payment_id, created_at FROM transactions ORDER BY created_at DESC LIMIT 5;"
echo ""

echo "=== NEXT STEPS ==="
echo "1. Configure webhook in Mercado Pago:"
echo "   URL: https://upaspiradores.com.br/webhooks/mercadopago"
echo "   Events: Payments"
echo ""
echo "2. Make a test PIX payment and check logs"
