# Payment System - Issues and Fixes

## Current Status

### Production Credentials (Configured)
- **Access Token**: `APP_USR-8520764521265905-121318-44a1befb70f238036772901e8d9c8f87-486340107`
- **Public Key**: `APP_USR-85d938b2-8d2e-42e9-8928-3573422b829c`
- **Environment**: Production (both keys start with `APP_USR-`)

### Known Issues

#### 1. Credit Card Payment - 400 Error from MercadoPago
**Status**: ❌ Not Working
**Error**: Backend receives 400 error from MercadoPago API
**Root Cause**: Unknown - need better error logging to see MercadoPago's actual error message

**Possible Causes**:
- Invalid card token format
- Missing required fields (CPF/CNPJ, address, etc.)
- Wrong payment_method_id (using "credit_card" instead of card brand like "visa", "master")
- Test vs Production key mismatch (UNLIKELY - both are production keys)

#### 2. Frontend Code Not Deployed
**Status**: ⚠️ Partially Fixed
**Issue**: CreditCardForm.tsx uses old API `mp.fields.createCardToken()` instead of `mp.createCardToken()`
**Impact**: Card tokenization might fail in production

#### 3. Insufficient Error Logging
**Status**: ❌ Problem
**Issue**: Backend catches errors but doesn't log MercadoPago's detailed error response
**Impact**: Can't debug what's wrong with credit card payments

#### 4. PIX Payments
**Status**: ✅ Working
**Note**: PIX payments work correctly, only credit card has issues

## Fixes to Implement

### Fix 1: Improve Error Logging in Backend

**File**: `packages/backend/src/services/paymentService.ts`

**Change**: Add more detailed logging in the credit card payment error handler

```typescript
} catch (axiosError: any) {
  this.logger.error('Mercado Pago credit card API error:', {
    status: axiosError.response?.status,
    statusText: axiosError.response?.statusText,
    data: axiosError.response?.data,
    message: axiosError.message,
    // Add these new fields:
    cause: axiosError.response?.data?.cause,
    details: JSON.stringify(axiosError.response?.data, null, 2)
  });
  
  // Throw a more descriptive error
  const mpError = axiosError.response?.data;
  if (mpError?.message) {
    throw new Error(`MercadoPago: ${mpError.message}`);
  }
  throw axiosError;
}
```

### Fix 2: Add Missing Required Fields

**File**: `packages/backend/src/services/paymentService.ts`

**Issue**: MercadoPago might require additional fields for credit card payments

**Add to payment data**:
```typescript
const paymentData: any = {
  transaction_amount: request.amount,
  token: request.token,
  description: request.description.trim(),
  installments: request.installments || 1,
  payment_method_id: 'credit_card', // This might need to be the actual card brand
  payer: {
    email: request.payerEmail,
    // Add these if available:
    identification: {
      type: 'CPF',
      number: '00000000000' // Should collect from user
    }
  },
  // Add statement descriptor
  statement_descriptor: 'UPCAR ASPIRADORES'
};
```

### Fix 3: Get Payment Method from Token

**File**: `packages/backend/src/services/paymentService.ts`

**Issue**: Using generic "credit_card" instead of actual card brand

**Solution**: Get card info from token first, then use the correct payment_method_id

```typescript
// Before creating payment, get card info from token
const cardInfoResponse = await axios.get(
  `${this.mercadoPagoBaseUrl}/v1/payment_methods/card_token/${request.token}`,
  {
    headers: {
      'Authorization': `Bearer ${this.mercadoPagoAccessToken}`
    }
  }
);

const paymentMethodId = cardInfoResponse.data.payment_method_id; // e.g., "visa", "master"

const paymentData: any = {
  transaction_amount: request.amount,
  token: request.token,
  description: request.description.trim(),
  installments: request.installments || 1,
  payment_method_id: paymentMethodId, // Use actual card brand
  // ... rest of fields
};
```

### Fix 4: Update Frontend Card Tokenization

**File**: `packages/frontend/src/components/CreditCardForm.tsx`

**Current** (line 104):
```typescript
const cardToken = await mp.fields.createCardToken({
```

**Change to**:
```typescript
const cardToken = await mp.createCardToken({
```

### Fix 5: Add CPF Collection (Optional but Recommended)

**File**: `packages/frontend/src/components/CreditCardForm.tsx`

**Add CPF field**:
```typescript
const [cpf, setCpf] = useState('');

// In the form:
<div>
  <label className="block text-sm font-semibold text-gray-700 mb-2">
    CPF
  </label>
  <input
    type="text"
    value={cpf}
    onChange={(e) => setCpf(e.target.value.replace(/\D/g, '').substring(0, 11))}
    placeholder="000.000.000-00"
    className="..."
    required
  />
</div>

// In createCardToken:
const cardToken = await mp.createCardToken({
  cardNumber: cleanCardNumber,
  cardholderName: cardholderName.toUpperCase(),
  cardExpirationMonth: month,
  cardExpirationYear: `20${year}`,
  securityCode: securityCode,
  identificationType: 'CPF',
  identificationNumber: cpf // Use actual CPF
});
```

## Testing Plan

### Step 1: Test with Better Logging
1. Apply Fix 1 (improved error logging)
2. Deploy to local environment
3. Try credit card payment
4. Check logs for detailed MercadoPago error

### Step 2: Fix Based on Error Message
Once we see the actual error from MercadoPago, we'll know which fix to apply:
- If "invalid payment_method_id" → Apply Fix 3
- If "missing payer identification" → Apply Fix 5
- If "invalid token" → Check frontend tokenization (Fix 4)

### Step 3: Deploy All Fixes
1. Apply all fixes locally
2. Test thoroughly
3. Deploy to production

## Quick Test Commands

### Start Local Environment
```bash
# Terminal 1 - Backend
cd packages/backend
npm run dev

# Terminal 2 - Frontend
cd packages/frontend
npm run dev
```

### Test Credit Card Payment
1. Go to http://localhost:3000/add-credit
2. Enter amount: R$ 10
3. Select "Cartão de Crédito"
4. Use test card:
   - Number: 5031 4332 1540 6351
   - Name: APRO
   - Expiry: 11/25
   - CVV: 123
5. Check backend console for errors

### Check Logs
```bash
# Backend logs
docker compose -f docker-compose.prod.yml logs -f backend | grep -i "mercado\|payment\|error"
```

## Priority Order

1. **HIGH**: Fix 1 - Improve error logging (do this first to see what's wrong)
2. **HIGH**: Fix 4 - Update frontend tokenization API call
3. **MEDIUM**: Fix 3 - Use correct payment_method_id
4. **MEDIUM**: Fix 2 - Add missing required fields
5. **LOW**: Fix 5 - Add CPF collection (nice to have)

## Notes

- PIX payments are working fine, so the basic infrastructure is correct
- Both keys are production keys (APP_USR-), so no test/prod mismatch
- CSP is already fixed (allows mercadolibre.com)
- Environment variables are configured correctly

The main issue is we can't see what MercadoPago is actually complaining about. Fix 1 will reveal the root cause.
