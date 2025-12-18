# Deploy Payment Fixes to Production

## Quick Deploy

Run this command to deploy all payment fixes to production:

```powershell
.\deploy-payment-fixes.ps1
```

Or manually:

```bash
# Upload files
scp -i ~/.ssh/upcar-key.pem packages/backend/src/services/paymentService.ts ubuntu@56.125.203.232:/opt/upcar/packages/backend/src/services/paymentService.ts

scp -i ~/.ssh/upcar-key.pem packages/frontend/src/components/CreditCardForm.tsx ubuntu@56.125.203.232:/opt/upcar/packages/frontend/src/components/CreditCardForm.tsx

scp -i ~/.ssh/upcar-key.pem packages/frontend/src/contexts/WebSocketContext.tsx ubuntu@56.125.203.232:/opt/upcar/packages/frontend/src/contexts/WebSocketContext.tsx

# SSH and rebuild
ssh -i ~/.ssh/upcar-key.pem ubuntu@56.125.203.232
cd /opt/upcar
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build backend frontend
docker compose -f docker-compose.prod.yml up -d
```

## What We Fixed

1. ✅ **Improved error logging** - See detailed MercadoPago errors
2. ✅ **Payment method detection** - Automatically detect card brand (visa, master)
3. ✅ **WebSocket fix** - Notifications now work properly
4. ✅ **Statement descriptor** - Shows "UPCAR ASPIRADORES" on statements

## Test on Production

After deployment, test at: **https://upaspiradores.com.br/add-credit**

### Test Credit Card:
- Amount: R$ 10
- Card: 5031 4332 1540 6351
- Name: APRO
- Expiry: 11/25
- CVV: 123

### Test PIX:
- Amount: R$ 1
- Pay with your bank app
- Should receive notification automatically

## Why We Can't Test Locally

**MercadoPago requires HTTPS for production credentials**. Localhost (HTTP) is blocked for security.

Options:
- ✅ Test on production (HTTPS) - Recommended
- ❌ Test locally with production credentials - Blocked by MercadoPago
- ⚠️ Test locally with test credentials - Would need to switch keys

## Summary

The fixes are ready. Deploy to production and test there where HTTPS is available.
