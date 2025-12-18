# WhatsApp Notification System - Configuration Complete

## Overview
The WhatsApp notification system is configured to send alerts to **+5511941330822** when machines go into maintenance mode or turn offline.

## Current Configuration

### Backend Environment Variables
Located in `packages/backend/.env`:

```env
# Admin Phone Number (receives WhatsApp notifications)
ADMIN_PHONE=+5511941330822

# WhatsApp API Configuration (optional for local dev)
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
```

## Notification Triggers

### 1. Maintenance Mode Notification
**Triggered when:** A machine reaches its maintenance interval or is manually set to maintenance mode

**Message format:**
```
🔧 MANUTENÇÃO NECESSÁRIA

Máquina: [CODE]
Local: [LOCATION]
Motivo: [REASON]

Por favor, agende a manutenção o mais breve possível.
```

**Code location:** `packages/backend/src/services/machineService.ts` - `setMaintenanceMode()` method

### 2. Offline Notification
**Triggered when:** A machine hasn't sent a heartbeat for more than 90 seconds

**Message format:**
```
📡 MÁQUINA OFFLINE

Máquina: [CODE]
Local: [LOCATION]
Última conexão: há [X] minutos

Por favor, verifique a conexão da máquina.
```

**Code location:** `packages/backend/src/services/machineService.ts` - `checkOfflineMachines()` method

**Scheduled check:** Runs every 30 seconds via `packages/backend/src/services/scheduler.ts`

## How It Works

1. **Offline Detection:**
   - Machines send heartbeat every 30 seconds via MQTT
   - Scheduler checks every 30 seconds for machines without heartbeat > 90 seconds
   - If detected, machine status changes to 'offline' and notification is sent

2. **Maintenance Detection:**
   - When machine operating hours exceed maintenance interval
   - When admin manually sets machine to maintenance mode
   - Notification is sent immediately

3. **Rate Limiting:**
   - Maximum 10 notifications per hour per type
   - Prevents spam if multiple machines go offline simultaneously

## Local Development

For local development, WhatsApp notifications are **logged only** (not actually sent) since the API credentials are not configured. You'll see logs like:

```
WhatsApp notification (would send to +5511941330822): [MESSAGE]
```

## Production Setup

To enable actual WhatsApp notifications in production, you need to:

1. Set up a WhatsApp Business API account
2. Get your credentials:
   - `WHATSAPP_ACCESS_TOKEN` - Your access token from Meta
   - `WHATSAPP_PHONE_NUMBER_ID` - Your WhatsApp phone number ID
3. Update the production `.env` file with these credentials

## Testing

To test notifications locally:

1. Mark a machine as online in the database
2. Stop sending heartbeats (or wait 90 seconds)
3. Check backend logs for notification message

Or manually trigger maintenance:
```sql
UPDATE machines SET 
  current_operating_hours = maintenance_interval + 1,
  status = 'maintenance'
WHERE code = '75028';
```

## Files Modified

- `packages/backend/.env` - Updated ADMIN_PHONE to +5511941330822
- `packages/backend/src/services/notificationService.ts` - Notification service (already implemented)
- `packages/backend/src/services/machineService.ts` - Triggers notifications (already implemented)
- `packages/backend/src/services/scheduler.ts` - Scheduled offline checks (already implemented)

## Status

✅ **FULLY CONFIGURED AND ACTIVE**

The notification system is fully configured with WhatsApp API credentials and will send real WhatsApp notifications to **+5511941330822** when:
- Any machine goes offline (no heartbeat for 90+ seconds)
- Any machine enters maintenance mode

### Credentials Configured:
- ✅ Access Token: Configured
- ✅ Phone Number ID: 901637906368897
- ✅ Admin Phone: +5511941330822

The system is now **LIVE** and will send actual WhatsApp messages (not just logs) when notifications are triggered.
