# ⏱️ Session Payment & Machine Hour Tracking

## Overview

The system implements a **"pay upfront, no refunds"** policy while accurately tracking actual machine usage for maintenance purposes.

**Key Principles:**
1. ✅ User pays for selected duration immediately when creating session
2. ✅ Balance is deducted instantly (no waiting)
3. ❌ No refunds if user stops early (user's choice to stop)
4. ✅ Machine operating hours track ACTUAL usage (not paid duration)

---

## How It Works

### Payment Flow

```
1. User selects duration: 15 minutes
2. Session created → Balance deducted: 15 credits (IMMEDIATELY)
3. User activates machine
4. User stops after: 5 minutes
5. Session terminated → No refund (user paid for 15 min)
6. Machine hours updated: +5 minutes (actual usage)
```

### Timeline

```
19:00:00 - User creates session (15 min)
           Balance: 100 → 85 credits (instant deduction)
           
19:00:05 - Machine activated
           Status: active
           
19:05:00 - User stops machine (5 min used)
           Balance: 85 credits (no change - no refund)
           Machine hours: +5 minutes (actual usage)
           Status: completed
```

---

## Why No Refunds?

### Business Rationale

1. **User Choice**
   - User selects duration before activating
   - Stopping early is user's decision
   - Machine was reserved for that time

2. **Upfront Payment**
   - Payment processed immediately
   - Machine reserved for user
   - Other users couldn't use it

3. **Simplicity**
   - Clear pricing model
   - No complex refund calculations
   - Easier to understand

4. **Fairness**
   - User knows cost upfront
   - Can choose shorter duration if unsure
   - Machine availability guaranteed

### User Benefits

- ✅ Instant activation (no payment delays)
- ✅ Clear pricing (know cost upfront)
- ✅ Flexible duration selection (1-30 minutes)
- ✅ Can stop anytime (just no refund)

---

## Machine Hour Tracking

### Accurate Maintenance Tracking

Even though users pay for planned duration, machine hours track **actual usage**:

```typescript
// Calculate actual time used
const actualMinutesUsed = Math.ceil((endTime - startTime) / (1000 * 60));

// Add ACTUAL usage to machine hours (not planned duration)
await machineService.incrementOperatingHours(machineId, actualMinutesUsed);
```

### Why Track Actual Usage?

1. **Accurate Maintenance**
   - Maintenance based on real wear
   - Not inflated by unused time
   - Better machine longevity

2. **Fair Tracking**
   - Machine hours = actual operation
   - Maintenance intervals more accurate
   - Better cost analysis

3. **Business Intelligence**
   - See real usage patterns
   - Identify underutilized machines
   - Optimize pricing

---

## Examples

### Example 1: Full Usage

```
User selects: 15 minutes
Balance before: R$ 100,00
Balance after creation: R$ 85,00 (instant)

Session runs: 15 minutes (full duration)
User stops: After 15 minutes

Final balance: R$ 85,00 (no change)
Machine hours: +15 minutes
Cost: R$ 15,00
```

### Example 2: Early Stop

```
User selects: 15 minutes
Balance before: R$ 100,00
Balance after creation: R$ 85,00 (instant)

Session runs: 5 minutes
User stops: After 5 minutes (early)

Final balance: R$ 85,00 (no refund)
Machine hours: +5 minutes (actual usage)
Cost: R$ 15,00 (paid for 15, used 5)
```

### Example 3: Very Short Usage

```
User selects: 30 minutes
Balance before: R$ 100,00
Balance after creation: R$ 70,00 (instant)

Session runs: 2 minutes
User stops: After 2 minutes

Final balance: R$ 70,00 (no refund)
Machine hours: +2 minutes (actual usage)
Cost: R$ 30,00 (paid for 30, used 2)
Note: User should have selected shorter duration
```

---

## Technical Implementation

### Session Creation (Immediate Payment)

```typescript
// File: usageSessionService.ts - createSession()

// 1. Validate request
const validation = await this.validateActivationRequest(request);

// 2. Create session
const session = await this.usageSessionRepo.create(sessionData, client);

// 3. Process payment IMMEDIATELY
if (request.paymentMethod === 'balance') {
  // Deduct balance right now
  await this.paymentService.processBalancePayment(
    request.userId,
    cost,
    `Machine usage - ${request.duration} minutes`
  );
}

// User's balance is updated instantly
```

### Session Termination (No Refund)

```typescript
// File: usageSessionService.ts - terminateSession()

// 1. Calculate actual usage
const actualMinutesUsed = Math.ceil((endTime - startTime) / (1000 * 60));
const plannedMinutes = session.duration;

logger.info(`Planned: ${plannedMinutes}min, Actual: ${actualMinutesUsed}min (No refund)`);

// 2. NO REFUND - user paid upfront

// 3. Track actual machine usage
await this.machineService.incrementOperatingHours(machineId, actualMinutesUsed);

logger.info(`Actual usage: ${actualMinutesUsed}min of ${plannedMinutes}min paid`);
```

---

## User Interface

### Session Creation

```
┌─────────────────────────────────┐
│ Selecione a Duração             │
│                                 │
│ ○ 5 minutos  - R$ 5,00         │
│ ● 15 minutos - R$ 15,00        │
│ ○ 30 minutos - R$ 30,00        │
│                                 │
│ Saldo atual: R$ 100,00         │
│ Novo saldo: R$ 85,00           │
│                                 │
│ [Ativar Aspirador]             │
└─────────────────────────────────┘
```

### During Session

```
┌─────────────────────────────────┐
│ Aspirador em Uso                │
│                                 │
│ Tempo restante: 10:00           │
│ Pago por: 15 minutos            │
│                                 │
│ [Parar Aspirador]               │
│                                 │
│ Nota: Sem reembolso se parar    │
│ antes do tempo                  │
└─────────────────────────────────┘
```

### After Early Stop

```
┌─────────────────────────────────┐
│ Sessão Encerrada                │
│                                 │
│ Tempo pago: 15 minutos          │
│ Tempo usado: 5 minutos          │
│ Custo: R$ 15,00                 │
│                                 │
│ Saldo: R$ 85,00                 │
│ (Sem reembolso)                 │
│                                 │
│ [Voltar]                        │
└─────────────────────────────────┘
```

---

## Payment Methods

### Balance Payment

```
Payment: Immediate deduction from account balance
Refund: None
Machine hours: Actual usage tracked
```

### PIX Payment

```
Payment: External PIX payment (immediate)
Refund: None (external payment is final)
Machine hours: Actual usage tracked
```

### Subscription

```
Payment: No charge (included in subscription)
Refund: Not applicable
Machine hours: Actual usage tracked
Daily limit: One session per day
```

---

## Database Records

### Session Record

```sql
SELECT 
  id,
  duration as planned_minutes,
  EXTRACT(EPOCH FROM (end_time - start_time)) / 60 as actual_minutes,
  cost,
  payment_method,
  status
FROM usage_sessions
WHERE id = 'session-id';
```

**Example:**
```
id     | planned_minutes | actual_minutes | cost  | payment_method | status
-------|-----------------|----------------|-------|----------------|----------
abc123 | 15              | 5.2            | 15.00 | balance        | completed
```

**Note:** User paid for 15 minutes but only used 5.2 minutes. No refund given.

### Machine Hours

```sql
SELECT 
  code,
  current_operating_minutes / 60.0 as operating_hours,
  maintenance_interval
FROM machines
WHERE code = '000001';
```

**Example:**
```
code   | operating_hours | maintenance_interval
-------|-----------------|---------------------
000001 | 85.5            | 100
```

**Note:** Operating hours reflect actual usage, not paid time.

---

## Logging

### Session Creation

```
[INFO] Session abc123 created for user xyz789
[INFO] Balance payment processed: 15 credits deducted
[INFO] User balance: 100.00 → 85.00
```

### Session Termination

```
[INFO] Session abc123 - Planned: 15min, Actual: 5min (No refund - user paid for 15min)
[INFO] Session abc123 terminated for machine 000001 - Actual usage: 5min of 15min paid
[INFO] Machine 000001 operating hours: 80.5h → 80.58h (+5min actual usage)
```

---

## Benefits

### For Users

✅ **Instant activation** - No payment delays  
✅ **Clear pricing** - Know cost upfront  
✅ **Flexible selection** - Choose duration that fits  
✅ **Can stop anytime** - Not forced to use full time  

### For Business

✅ **Upfront payment** - No payment delays or disputes  
✅ **Simple model** - Easy to understand and explain  
✅ **Accurate tracking** - Real machine usage data  
✅ **Fair pricing** - User pays for reservation time  

### For Maintenance

✅ **Accurate hours** - Based on actual operation  
✅ **Better scheduling** - Real wear and tear data  
✅ **Cost optimization** - Maintenance when actually needed  
✅ **Longer machine life** - Proper maintenance intervals  

---

## User Education

### Clear Communication

**On Duration Selection:**
```
⚠️ Importante:
- Pagamento é feito antecipadamente
- Sem reembolso se parar antes do tempo
- Escolha a duração adequada para seu uso
```

**On Stop Confirmation:**
```
Tem certeza que deseja parar?

Tempo pago: 15 minutos
Tempo usado: 5 minutos
Tempo restante: 10 minutos

⚠️ Não haverá reembolso dos 10 minutos não utilizados

[Cancelar] [Confirmar Parada]
```

---

## Comparison

### Old System (If It Had Refunds)

```
Complexity: High (refund calculations)
Balance updates: Multiple times
User confusion: "Why different amounts?"
Support tickets: Refund disputes
Machine hours: Inflated (paid time)
```

### Current System (No Refunds)

```
Complexity: Low (simple payment)
Balance updates: Once (at creation)
User confusion: Minimal (clear upfront)
Support tickets: Rare (clear policy)
Machine hours: Accurate (actual usage)
```

---

## Summary

✅ **Pay upfront** - Balance deducted when session created  
❌ **No refunds** - Stopping early is user's choice  
✅ **Instant payment** - No delays or waiting  
✅ **Accurate tracking** - Machine hours = actual usage  
✅ **Clear policy** - Simple and transparent  
✅ **Fair system** - User knows cost before activating  

The no-refund policy keeps the system simple while accurate machine hour tracking ensures proper maintenance scheduling based on real usage.
