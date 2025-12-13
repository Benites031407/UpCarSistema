# ⚠️ Maintenance Override Feature

## Overview

The **Maintenance Override** feature allows admins to temporarily bypass maintenance requirements, enabling machines to operate even when they've exceeded their maintenance interval. The usage counter continues tracking actual hours with a visible warning.

---

## Key Concepts

### Two Options for Maintenance Management

**1. Maintenance Override (Temporary Bypass)**
- ✅ Machine continues operating
- ✅ Usage counter keeps counting
- ⚠️ Warning displayed to admins
- 🔄 Can be disabled anytime
- 📝 Requires reason/justification

**2. Maintenance Reset (Full Reset)**
- ✅ Resets counter to zero
- ✅ Clears any active override
- ✅ Records maintenance date
- 🔄 Machine back to normal operation
- 📝 Should be done after actual maintenance

---

## When to Use Each Option

### Use Maintenance Override When:

✅ **Maintenance is scheduled soon**
- "Manutenção programada para amanhã"
- Machine needed for a few more hours

✅ **Emergency situations**
- "Cliente importante precisa usar agora"
- Temporary high demand

✅ **Waiting for parts**
- "Aguardando peças de reposição"
- Machine still functional

✅ **Testing after repair**
- "Testando após reparo parcial"
- Monitoring performance

### Use Maintenance Reset When:

✅ **Maintenance completed**
- Filters cleaned/replaced
- Full service performed
- Machine inspected

✅ **Ready for new cycle**
- All maintenance tasks done
- Machine in optimal condition
- Starting fresh tracking

---

## How It Works

### Automatic Maintenance Mode

When a machine reaches its maintenance interval:

```
Current Hours: 100h
Maintenance Interval: 100h
Status: Automatically set to "maintenance"
Available: NO
```

### With Override Active

```
Current Hours: 105h (still counting!)
Maintenance Interval: 100h
Override: ACTIVE ⚠️
Status: "online"
Available: YES (with warning)
```

### After Reset

```
Current Hours: 0h (reset)
Maintenance Interval: 100h
Override: INACTIVE
Status: "online"
Available: YES
```

---

## Admin Interface

### Machine Registry Table

**Normal Operation:**
```
Code    | Status  | Hours        | Actions
--------|---------|--------------|--------
000001  | Online  | 85.5h / 100h | [Info] [Edit] [QR] [Delete]
```

**Exceeds Limit (No Override):**
```
Code    | Status      | Hours         | Actions
--------|-------------|---------------|--------
000001  | Maintenance | 105.2h / 100h | [Info] [Edit] [QR] [⚠️] [🔄] [Delete]
```

**Exceeds Limit (With Override):**
```
Code    | Status  | Hours                    | Actions
--------|---------|--------------------------|--------
000001  | Online  | 105.2h / 100h ⚠️ Override | [Info] [Edit] [QR] [⚠️] [🔄] [Delete]
```

### Action Buttons

**⚠️ Warning Icon (Yellow/Purple)**
- **Yellow**: Override is ACTIVE - Click to disable
- **Purple**: Override is INACTIVE - Click to enable
- Only visible when hours >= maintenance interval

**🔄 Reset Icon (Indigo)**
- Resets maintenance counter to zero
- Clears any active override
- Only visible when hours >= maintenance interval

---

## User Flow

### Scenario 1: Enable Override

1. **Machine reaches 100h limit**
   - Status automatically changes to "maintenance"
   - Machine becomes unavailable

2. **Admin clicks ⚠️ (purple) button**
   - Prompt appears: "Ativar override de manutenção?"
   - Admin enters reason: "Manutenção programada para amanhã"

3. **Override activated**
   - Status changes to "online"
   - Machine becomes available
   - Warning badge appears: "⚠️ Override"
   - Usage continues counting: 100h → 101h → 102h...

4. **Users can activate machine**
   - Machine works normally
   - Counter keeps incrementing
   - Admin sees warning in dashboard

### Scenario 2: Disable Override

1. **Override is active**
   - Machine operating with warning
   - Hours: 105h / 100h ⚠️ Override

2. **Admin clicks ⚠️ (yellow) button**
   - Confirm: "Desativar override de manutenção?"

3. **Override deactivated**
   - Status changes to "maintenance"
   - Machine becomes unavailable
   - Counter remains at current value (105h)

### Scenario 3: Reset Maintenance

1. **Maintenance completed**
   - Filters cleaned
   - Machine serviced
   - Ready for operation

2. **Admin clicks 🔄 button**
   - Confirm: "Resetar contador de manutenção?"
   - Shows: "105.2h → 0h"

3. **Maintenance reset**
   - Counter: 0h / 100h
   - Override: Cleared
   - Status: "online"
   - Last Maintenance Date: Updated

---

## API Endpoints

### Toggle Maintenance Override

```bash
PATCH /api/admin/machines/:id/maintenance-override
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "override": true,
  "reason": "Manutenção programada para amanhã"
}
```

**Response:**
```json
{
  "success": true,
  "machine": {
    "id": "uuid",
    "code": "000001",
    "maintenanceOverride": true,
    "maintenanceOverrideReason": "Manutenção programada para amanhã",
    "maintenanceOverrideAt": "2024-12-12T19:00:00Z",
    "maintenanceOverrideBy": "admin@upcar.com",
    "status": "online"
  },
  "message": "Maintenance override enabled - machine can operate with warning"
}
```

### Reset Maintenance

```bash
PATCH /api/admin/machines/:id/reset-maintenance
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "machine": {
    "id": "uuid",
    "code": "000001",
    "currentOperatingHours": 0,
    "maintenanceOverride": false,
    "status": "online",
    "lastMaintenanceDate": "2024-12-12T19:00:00Z"
  },
  "message": "Maintenance counter reset and override cleared"
}
```

---

## Database Schema

### New Fields

```sql
ALTER TABLE machines 
ADD COLUMN maintenance_override BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN maintenance_override_reason TEXT,
ADD COLUMN maintenance_override_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN maintenance_override_by VARCHAR(255);
```

### Example Data

```sql
SELECT 
  code,
  current_operating_minutes / 60.0 as hours,
  maintenance_interval,
  maintenance_override,
  maintenance_override_reason,
  status
FROM machines;
```

**Result:**
```
code   | hours | interval | override | reason                          | status
-------|-------|----------|----------|---------------------------------|--------
000001 | 105.2 | 100      | true     | Manutenção programada para amanhã | online
000034 | 85.5  | 100      | false    | null                            | online
```

---

## Business Logic

### Availability Check

```typescript
// In machineService.checkMachineAvailability()

if (machine.currentOperatingHours >= machine.maintenanceInterval) {
  // Check if override is active
  if (machine.maintenanceOverride) {
    return {
      available: true,
      machine,
      maintenanceWarning: true,
      reason: 'Machine requires maintenance but override is active'
    };
  }
  
  // No override - set to maintenance mode
  await this.setMaintenanceMode(machineId, 'Automatic maintenance required');
  return {
    available: false,
    reason: 'Machine requires maintenance',
    machine: { ...machine, status: 'maintenance' }
  };
}
```

### Override Activation

```typescript
// When enabling override
const updateData = {
  maintenanceOverride: true,
  maintenanceOverrideAt: new Date(),
  maintenanceOverrideBy: adminEmail,
  maintenanceOverrideReason: reason,
  status: 'online' // If currently in maintenance
};
```

### Maintenance Reset

```typescript
// When resetting maintenance
const updateData = {
  currentOperatingHours: 0,
  maintenanceOverride: false,
  maintenanceOverrideReason: null,
  maintenanceOverrideAt: null,
  maintenanceOverrideBy: null,
  status: 'online',
  lastMaintenanceDate: new Date()
};
```

---

## Safety Features

### Audit Trail

Every override action is logged:
```
- Who activated/deactivated
- When it was done
- Reason provided
- Current machine hours
```

### Visual Warnings

**Admin Dashboard:**
- ⚠️ Yellow badge: "Override"
- Red text for exceeded hours
- Hover shows reason

**Logs:**
```
[WARN] Machine 000001 exceeds maintenance interval but override is active
[INFO] Maintenance override enabled for machine 000001 by admin@upcar.com
```

### Automatic Tracking

- Usage counter NEVER stops
- Real hours always visible
- Override doesn't hide the problem
- Admin always aware of actual usage

---

## Best Practices

### For Admins

1. **Always provide a reason**
   - Clear justification
   - Expected resolution time
   - Who authorized it

2. **Monitor actively**
   - Check override machines daily
   - Don't leave override active indefinitely
   - Schedule actual maintenance ASAP

3. **Document maintenance**
   - What was done
   - Parts replaced
   - Next maintenance due

4. **Reset after maintenance**
   - Don't just disable override
   - Use reset button after actual service
   - Starts fresh tracking cycle

### For Operations

1. **Use override sparingly**
   - Emergency situations only
   - Short-term solution
   - Not a permanent fix

2. **Track override duration**
   - How long was it active?
   - How many extra hours accumulated?
   - Impact on machine condition

3. **Plan maintenance windows**
   - Schedule during low-demand periods
   - Communicate with users
   - Have backup machines available

---

## Reporting

### Machines with Active Override

```sql
SELECT 
  code,
  location,
  current_operating_minutes / 60.0 as current_hours,
  maintenance_interval,
  maintenance_override_reason,
  maintenance_override_at,
  maintenance_override_by
FROM machines
WHERE maintenance_override = TRUE
ORDER BY current_operating_minutes DESC;
```

### Override History

Track in application logs:
```
2024-12-12 19:00:00 - Override enabled for 000001 by admin@upcar.com
2024-12-12 19:00:00 - Reason: Manutenção programada para amanhã
2024-12-13 10:00:00 - Override disabled for 000001 by admin@upcar.com
2024-12-13 10:05:00 - Maintenance reset for 000001 by admin@upcar.com
```

---

## Troubleshooting

### Override Not Working

**Problem:** Machine still shows as maintenance after enabling override

**Check:**
1. Refresh the page
2. Verify override is true in database
3. Check machine status is "online"
4. Review backend logs for errors

**Solution:**
```sql
-- Verify override status
SELECT code, maintenance_override, status FROM machines WHERE code = '000001';

-- Manually fix if needed
UPDATE machines 
SET maintenance_override = TRUE, status = 'online' 
WHERE code = '000001';
```

### Counter Not Resetting

**Problem:** Hours still show old value after reset

**Check:**
1. Verify reset was successful
2. Check current_operating_minutes in database
3. Refresh admin dashboard

**Solution:**
```sql
-- Verify reset
SELECT code, current_operating_minutes FROM machines WHERE code = '000001';

-- Should be 0 after reset
```

### Override Disabled Automatically

**Problem:** Override turns off by itself

**Cause:** This shouldn't happen - override persists until manually disabled

**Check:**
- Database constraints
- Application logs
- Recent admin actions

---

## Summary

✅ **Two options** - Override (temporary) or Reset (after maintenance)  
✅ **Keeps counting** - Real usage always tracked  
✅ **Visual warnings** - Clear indicators for admins  
✅ **Audit trail** - Who, when, why recorded  
✅ **Safety first** - Override doesn't hide problems  
✅ **Flexible** - Enable/disable anytime  
✅ **Professional** - Proper maintenance management  

The maintenance override feature provides flexibility for emergency situations while maintaining accurate usage tracking and clear visibility of machine condition.
