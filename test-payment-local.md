# Local Payment Testing Guide

## Quick Start

### 1. Start the Application

**Terminal 1 - Backend:**
```bash
cd packages/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd packages/frontend
npm run dev
```

Wait for both to start, then open: http://localhost:3000

---

## Test Scenarios

### Scenario 1: PIX Payment (Should Work)

**Purpose**: Verify PIX payments still work after changes

**Steps**:
1. Go to http://localhost:3000/add-credit
2. Enter amount: **R$ 10**
3. Select payment method: **PIX**
4. Click **"Pagar com PIX"**

**Expected Result**:
- ✅ QR code modal appears
- ✅ PIX code can be copied
- ✅ No errors in console

**Backend Logs to Check**:
```
Creating PIX payment: { amount: 10, ... }
PIX payment created successfully: { paymentId: '...', status: 'pending' }
```

---

### Scenario 2: Credit Card Payment - Success

**Purpose**: Test credit card payment with approved card

**Steps**:
1. Go to http://localhost:3000/add-credit
2. Enter amount: **R$ 10**
3. Select payment method: **Cartão de Crédito**
4. Click **"Pagar com Cartão de Crédito"**
5. Fill in card details:
   - **Card Number**: `5031 4332 1540 6351`
   - **Name**: `APRO`
   - **Expiry**: `11/25`
   - **CVV**: `123`
   - **Installments**: `1x`
6. Click **"Pagar"**

**Expected Result**:
- ✅ "Pagamento aprovado!" message appears
- ✅ Balance increases by R$ 10
- ✅ Modal closes after 3 seconds
- ✅ No errors in console

**Backend Logs to Check**:
```
Creating credit card payment: { amount: 10, ... }
Fetching payment method info from token...
Payment method detected: master
Payment data prepared: { payment_method_id: 'master', ... }
Credit card payment created: { paymentId: '...', status: 'approved' }
```

**Frontend Console Logs**:
```
Creating card token with MercadoPago SDK...
Card token created successfully: [token-id]
Credit card payment response: { success: true, ... }
```

---

### Scenario 3: Credit Card Payment - Declined

**Purpose**: Test error handling for declined cards

**Steps**:
1. Go to http://localhost:3000/add-credit
2. Enter amount: **R$ 10**
3. Select payment method: **Cartão de Crédito**
4. Click **"Pagar com Cartão de Crédito"**
5. Fill in card details:
   - **Card Number**: `5031 4332 1540 6351`
   - **Name**: `FUND` (insufficient funds)
   - **Expiry**: `11/25`
   - **CVV**: `123`
6. Click **"Pagar"**

**Expected Result**:
- ✅ Error message appears: "Pagamento recusado: ..."
- ✅ Balance does NOT increase
- ✅ User can try again

---

### Scenario 4: Credit Card Payment - Invalid Card

**Purpose**: Test validation and error handling

**Steps**:
1. Go to http://localhost:3000/add-credit
2. Enter amount: **R$ 10**
3. Select payment method: **Cartão de Crédito**
4. Click **"Pagar com Cartão de Crédito"**
5. Fill in INVALID card details:
   - **Card Number**: `1234 5678 9012 3456`
   - **Name**: `TEST USER`
   - **Expiry**: `11/25`
   - **CVV**: `123`
6. Click **"Pagar"**

**Expected Result**:
- ✅ Error message appears
- ✅ Clear explanation of what's wrong
- ✅ User can correct and retry

---

## MercadoPago Test Cards

### Approved Cards
| Card Number | Name | Result |
|-------------|------|--------|
| 5031 4332 1540 6351 | APRO | ✅ Approved |

### Declined Cards
| Card Number | Name | Result | Reason |
|-------------|------|--------|--------|
| 5031 4332 1540 6351 | FUND | ❌ Declined | Insufficient funds |
| 5031 4332 1540 6351 | SECU | ❌ Declined | Invalid CVV |
| 5031 4332 1540 6351 | EXPI | ❌ Declined | Expired card |
| 5031 4332 1540 6351 | FORM | ❌ Declined | Invalid form |

### Pending Cards
| Card Number | Name | Result |
|-------------|------|--------|
| 5031 4332 1540 6351 | OTHE | ⏳ Pending |
| 5031 4332 1540 6351 | CONT | ⏳ Requires authorization |

**Note**: Use any future expiration date and any 3-digit CVV

---

## Debugging

### Check Backend Logs

**Look for these patterns**:

**Success**:
```
Creating credit card payment: { amount: 10, ... }
Fetching payment method info from token...
Payment method detected: master
Payment data prepared: { payment_method_id: 'master', ... }
Credit card payment created: { paymentId: '123456', status: 'approved' }
```

**Error**:
```
Mercado Pago credit card API error: {
  status: 400,
  mpMessage: "...",
  cause: [...],
  fullError: "..."
}
```

### Check Frontend Console

**Look for**:
- MercadoPago SDK loaded
- Token creation logs
- Payment response
- Any error messages

### Common Issues

#### Issue: "SDK de pagamento não carregado"
**Cause**: MercadoPago SDK script not loaded
**Solution**: Check that `index.html` has the SDK script tag

#### Issue: "Chave pública do MercadoPago não configurada"
**Cause**: `VITE_MERCADO_PAGO_PUBLIC_KEY` not set
**Solution**: Check `.env` file has the public key

#### Issue: "Payment gateway not configured"
**Cause**: Backend access token not set
**Solution**: Check `packages/backend/.env` has `PIX_ACCESS_TOKEN`

#### Issue: 400 error from MercadoPago
**Cause**: Various (see backend logs for details)
**Solution**: Check `fullError` in backend logs for specific cause

---

## Monitoring Commands

### Watch Backend Logs
```bash
# In packages/backend directory
npm run dev

# Or if using Docker
docker compose -f docker-compose.dev.yml logs -f backend
```

### Watch Frontend Logs
```bash
# In packages/frontend directory
npm run dev
```

### Check Database
```bash
# Connect to PostgreSQL
psql -U postgres -d upcar_aspiradores

# Check recent transactions
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;

# Check user balance
SELECT id, email, account_balance FROM users WHERE email = 'your-test-email@example.com';
```

---

## Success Criteria

Before deploying to production, verify:

- ✅ PIX payments work
- ✅ Credit card payments with APRO card work
- ✅ Declined cards show proper error messages
- ✅ Balance updates correctly after payment
- ✅ No console errors
- ✅ Backend logs show detailed information
- ✅ Payment confirmation appears automatically
- ✅ WebSocket notifications work

---

## Next Steps After Testing

1. **If all tests pass**:
   - Run `./deploy-payment-fixes.sh` (Linux/Mac)
   - Or `.\deploy-payment-fixes.ps1` (Windows)
   - Test in production with real card

2. **If tests fail**:
   - Check backend logs for detailed error
   - Check `fullError` field in logs
   - Review MercadoPago error codes
   - Fix issue and test again

3. **If specific error occurs**:
   - Document the error
   - Check MercadoPago documentation
   - Update code accordingly
   - Test again

---

## Support Resources

- **MercadoPago API Docs**: https://www.mercadopago.com.br/developers/pt/reference
- **Error Codes**: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/response-handling/collection-results
- **Test Cards**: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/testing

---

## Rollback

If you need to revert changes:

```bash
# Restore original files
git checkout HEAD~1 packages/backend/src/services/paymentService.ts
git checkout HEAD~1 packages/frontend/src/components/CreditCardForm.tsx
git checkout HEAD~1 packages/backend/.env
git checkout HEAD~1 packages/frontend/.env

# Restart services
# Backend: Ctrl+C and npm run dev
# Frontend: Ctrl+C and npm run dev
```
