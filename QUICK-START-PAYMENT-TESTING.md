# Quick Start - Payment Testing

## 🚀 Start Testing in 3 Steps

### Step 1: Start the Application (2 terminals)

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

Wait for "Server running" and "Local: http://localhost:3000"

---

### Step 2: Test Credit Card Payment

1. Open: **http://localhost:3000/add-credit**
2. Amount: **R$ 10**
3. Method: **Cartão de Crédito**
4. Card details:
   - Number: **5031 4332 1540 6351**
   - Name: **APRO**
   - Expiry: **11/25**
   - CVV: **123**
5. Click **"Pagar"**

---

### Step 3: Check Results

**✅ Success** = You see:
- "Pagamento aprovado!" message
- Balance increases by R$ 10
- Backend logs show: `Payment method detected: master`

**❌ Error** = You see:
- Error message in UI
- Backend logs show: `Mercado Pago credit card API error: { ... }`
- **Look for `mpMessage` and `cause` in logs** - this tells us what to fix

---

## 📊 What to Look For in Logs

### Success Pattern:
```
Creating credit card payment: { amount: 10, ... }
Fetching payment method info from token...
Payment method detected: master
Payment data prepared: { payment_method_id: 'master', ... }
Credit card payment created: { paymentId: '...', status: 'approved' }
```

### Error Pattern:
```
Mercado Pago credit card API error: {
  mpMessage: "...",  ← READ THIS
  cause: [...],      ← AND THIS
  fullError: "..."   ← FULL DETAILS HERE
}
```

---

## 🔧 Common Fixes

### Error: "invalid payment_method_id"
**Already fixed** - shouldn't happen

### Error: "payer.identification is required"
**Need to collect CPF** - future improvement

### Error: "invalid token"
**Check frontend console** - tokenization might have failed

### Error: "card_number is invalid"
**Use correct test card** - 5031 4332 1540 6351

---

## 🚀 Deploy to Production

**When local testing works:**

```bash
# Windows
.\deploy-payment-fixes.ps1

# Linux/Mac
chmod +x deploy-payment-fixes.sh
./deploy-payment-fixes.sh
```

Then test at: **https://upaspiradores.com.br/add-credit**

---

## 📚 Full Documentation

- **PAYMENT-WORK-SUMMARY.md** - Complete overview
- **test-payment-local.md** - Detailed testing guide
- **PAYMENT-FIXES-APPLIED.md** - Technical details

---

## ⚡ Quick Commands

**Start backend:**
```bash
cd packages/backend && npm run dev
```

**Start frontend:**
```bash
cd packages/frontend && npm run dev
```

**Deploy to production:**
```bash
.\deploy-payment-fixes.ps1
```

**Check production logs:**
```bash
ssh -i ~/.ssh/upcar-key.pem ubuntu@56.125.203.232 "cd /opt/upcar && docker compose -f docker-compose.prod.yml logs -f backend"
```

---

## ✅ Success Criteria

Before deploying:
- [ ] Credit card payment with APRO works
- [ ] Balance updates correctly
- [ ] No errors in console
- [ ] Backend logs show payment method detected

---

**That's it! Start testing and let me know what you see in the logs.**
