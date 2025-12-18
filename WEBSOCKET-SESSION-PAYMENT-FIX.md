# WebSocket Session Payment Fix

## Problem
When users paid for machine sessions with PIX on the MachineActivationPage, the payment was confirmed by MercadoPago webhook but the WebSocket notification never reached the frontend. The screen stayed stuck on "waiting for payment confirmation".

## Root Cause
The webhook handler only looked for **transactions** by `paymentId`, but session PIX payments don't create transactions - they only store the `paymentId` in the **session** record itself.

### Payment Flow Differences:
1. **Credit Addition (AddCreditPage)**: Creates a transaction with `paymentId` ✅
2. **Session Payment (MachineActivationPage)**: Creates a session with `paymentId`, NO transaction ❌

## Solution
Updated the webhook to handle both cases:

### 1. Updated Webhook Handler (`packages/backend/src/routes/webhooks.ts`)
- First tries to find a transaction by `paymentId` (for credit additions)
- If no transaction found, looks for a session by `paymentId` (for session payments)
- Activates the session when payment is confirmed
- Sends WebSocket notification to user

### 2. Added Repository Method (`packages/backend/src/repositories/usageSession.ts`)
- Added `findByPaymentId(paymentId: string)` method to find sessions by payment ID
- Fixed SQL parameter placeholders bug (was missing `$` prefix)
- Added `paymentId` handling to the `update()` method

### 3. Updated Interface (`packages/backend/src/repositories/interfaces.ts`)
- Added `findByPaymentId` method signature to `UsageSessionRepository` interface

## Changes Made

### File: `packages/backend/src/routes/webhooks.ts`
```typescript
// Now handles both transactions and sessions
if (paymentStatus.status === 'approved') {
  // Try transaction first (credit additions)
  let transaction = await transactionRepository.findByPaymentId(paymentId);
  
  if (transaction) {
    // Handle credit addition...
  } else {
    // Check for session payment
    const session = await usageSessionRepo.findByPaymentId(paymentId);
    if (session) {
      // Activate session and notify user
      await usageSessionService.activateSession(session.id);
      webSocketService.sendToUser(session.userId, 'payment-confirmed', {...});
    }
  }
}
```

### File: `packages/backend/src/repositories/usageSession.ts`
```typescript
// New method
async findByPaymentId(paymentId: string): Promise<UsageSession | null> {
  const result = await db.query(
    'SELECT * FROM usage_sessions WHERE payment_id = $1',
    [paymentId]
  );
  return result.rows.length > 0 ? this.mapRowToUsageSession(result.rows[0]) : null;
}

// Fixed update method to handle paymentId
if (data.paymentId !== undefined) {
  fields.push(`payment_id = $${paramCount++}`);
  values.push(data.paymentId);
}
```

## Testing
1. Local testing: Create a session with PIX payment, simulate webhook
2. Production testing: Real PIX payment on MachineActivationPage
3. Verify WebSocket notification is received
4. Verify session is activated automatically

## Deployment Steps
1. Copy changes to server directory
2. Commit and push to GitHub
3. Pull on server
4. Rebuild backend container: `docker compose -f docker-compose.prod.yml up -d --build backend`
5. Test with real PIX payment

## Expected Behavior After Fix
1. User selects time and PIX payment on MachineActivationPage
2. PIX QR code modal opens with "waiting for payment" indicator
3. User pays via PIX
4. MercadoPago webhook confirms payment
5. Backend finds session by paymentId
6. Backend activates session
7. WebSocket sends "payment-confirmed" event to user
8. Frontend receives event, closes modal, shows "Machine activated!"
9. Session starts automatically

## Related Files
- `packages/backend/src/routes/webhooks.ts` - Webhook handler
- `packages/backend/src/repositories/usageSession.ts` - Session repository
- `packages/backend/src/repositories/interfaces.ts` - Repository interfaces
- `packages/frontend/src/pages/MachineActivationPage.tsx` - Frontend (already has WebSocket listeners)
- `packages/frontend/src/pages/AddCreditPage.tsx` - Working reference implementation

## Notes
- PIX payments for credit additions continue to work as before (transaction-based)
- PIX payments for sessions now work correctly (session-based)
- Both flows send the same WebSocket event: `payment-confirmed`
- Frontend already has the correct WebSocket listeners in place
