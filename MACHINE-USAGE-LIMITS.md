# 🔧 Machine Usage Limits & Maintenance System

## Overview

The system tracks total machine usage time and automatically triggers maintenance when limits are reached. This ensures machines are properly maintained and prevents excessive wear.

---

## How It Works

### 1. Usage Tracking

Every time a machine is used:
- The session duration (in minutes) is recorded
- After the session ends, the machine's `current_operating_minutes` is incremented
- This counter accumulates over the machine's lifetime

**Example:**
```
Machine starts with: 0 minutes
User 1 uses for 15 minutes → Total: 15 minutes (0.25 hours)
User 2 uses for 30 minutes → Total: 45 minutes (0.75 hours)
User 3 uses for 20 minutes → Total: 65 minutes (1.08 hours)
... continues accumulating ...
```

### 2. Maintenance Interval

Each machine has a `maintenance_interval` setting (in hours):
- Default: **100 hours** of total usage
- Configurable per machine
- Stored in the database

**Current Operating Hours vs Maintenance Interval:**
```
current_operating_minutes / 60 = current_operating_hours
If current_operating_hours >= maintenance_interval → Maintenance Required
```

### 3. Automatic Maintenance Mode

When a machine reaches its maintenance interval:

**During Activation Check:**
```typescript
// In machineService.checkMachineAvailability()
if (machine.currentOperatingHours >= machine.maintenanceInterval) {
  // Automatically set to maintenance mode
  await this.setMaintenanceMode(machineId, 'Automatic maintenance required');
  
  return {
    available: false,
    reason: 'Machine requires maintenance',
    machine: { ...machine, status: 'maintenance' }
  };
}
```

**After Session Completion:**
```typescript
// In machineService.incrementOperatingHours()
if (machine.currentOperatingHours >= machine.maintenanceInterval) {
  await this.setMaintenanceMode(machineId, 'Operating hours limit reached');
}
```

---

## What Happens When Limit is Reached

### Automatic Actions

1. **Machine Status Changes to "maintenance"**
   - Status: `online` → `maintenance`
   - Machine becomes unavailable for new sessions

2. **Notification Sent**
   - Admin receives maintenance notification
   - Includes machine code, location, and reason
   - Notification stored in database

3. **Real-time Updates**
   - WebSocket broadcast to all connected clients
   - Admin dashboard updates immediately
   - Machine shows as "Em Manutenção" in UI

4. **User Impact**
   - Users cannot activate the machine
   - Machine appears as unavailable in the app
   - Error message: "Machine requires maintenance"

### Admin Dashboard Display

In the admin panel, you'll see:
```
Machine: WASH001
Status: 🔧 Em Manutenção
Total Usage: 100.5h / 100h
Hours Until Maintenance: 0h
Last Cleaning: 2 days ago
```

---

## Resetting Maintenance

### When to Reset

After performing maintenance:
- ✅ Machine has been serviced
- ✅ Filters cleaned/replaced
- ✅ Physical inspection completed
- ✅ Machine tested and working properly

### How to Reset (Admin Only)

**Via Admin Dashboard:**
1. Go to **Monitoring** tab
2. Find the machine in maintenance
3. Click on the machine card
4. Click **"Reset Maintenance"** button
5. Confirm the action

**What Happens:**
```typescript
// Backend: machineService.resetMaintenance()
{
  currentOperatingHours: 0,      // Reset to zero
  status: 'online'                // Back to online
}
```

**Via API:**
```bash
PATCH /api/machines/:id/maintenance-reset
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "machine": {
    "id": "uuid",
    "code": "WASH001",
    "status": "online",
    "currentOperatingHours": 0,
    "maintenanceInterval": 100
  }
}
```

---

## Configuration

### Setting Maintenance Interval

**Default Value:** 100 hours

**Per Machine Configuration:**
```sql
-- Update maintenance interval for a specific machine
UPDATE machines 
SET maintenance_interval = 150 
WHERE code = 'WASH001';
```

**Recommended Intervals:**
- Light usage machines: 150-200 hours
- Medium usage machines: 100-150 hours
- Heavy usage machines: 50-100 hours

### Checking Current Usage

**SQL Query:**
```sql
SELECT 
  code,
  location,
  current_operating_minutes / 60.0 as current_hours,
  maintenance_interval,
  maintenance_interval - (current_operating_minutes / 60.0) as hours_remaining,
  status
FROM machines
ORDER BY hours_remaining ASC;
```

**Example Output:**
```
code     | location  | current_hours | maintenance_interval | hours_remaining | status
---------|-----------|---------------|---------------------|-----------------|------------
WASH001  | Floor 1   | 98.5          | 100                 | 1.5             | online
WASH002  | Floor 2   | 105.2         | 100                 | -5.2            | maintenance
WASH003  | Floor 3   | 45.0          | 100                 | 55.0            | online
```

---

## Monitoring & Alerts

### Real-time Monitoring

The system continuously monitors machine usage:

**Scheduler Service:**
```typescript
// Runs every 30 seconds
- Check for offline machines
- Update machine statuses
- Trigger maintenance mode if needed
```

**Notification Service:**
```typescript
// Sends alerts for:
- Machine entering maintenance mode
- Machine going offline
- Critical issues
```

### Admin Dashboard Indicators

**Color Coding:**
- 🟢 Green: > 20 hours remaining
- 🟡 Yellow: 5-20 hours remaining
- 🔴 Red: < 5 hours remaining
- 🔧 Orange: In maintenance

**Proactive Alerts:**
```
⚠️ WASH001 approaching maintenance limit
Current: 95h / 100h
Remaining: 5h
```

---

## Database Schema

### Machines Table

```sql
CREATE TABLE machines (
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  location VARCHAR(255) NOT NULL,
  
  -- Maintenance tracking
  maintenance_interval INTEGER NOT NULL DEFAULT 100,  -- hours
  current_operating_minutes INTEGER DEFAULT 0,        -- stored as minutes
  
  -- Status
  status VARCHAR(20) DEFAULT 'offline',
  
  -- Constraints
  CONSTRAINT machines_maintenance_interval_check 
    CHECK (maintenance_interval > 0),
  CONSTRAINT machines_operating_hours_check 
    CHECK (current_operating_minutes >= 0)
);
```

### Usage Sessions Table

```sql
CREATE TABLE usage_sessions (
  id UUID PRIMARY KEY,
  machine_id UUID REFERENCES machines(id),
  user_id UUID REFERENCES users(id),
  
  -- Duration tracking
  duration_minutes INTEGER NOT NULL,
  
  -- Timestamps
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  
  status VARCHAR(20) DEFAULT 'active'
);
```

---

## User Experience

### Before Maintenance Limit

**User sees:**
```
✅ WASH001 - Floor 1
Status: Available
Price: R$ 1.00/min
[Activate Machine]
```

### At Maintenance Limit

**User sees:**
```
🔧 WASH001 - Floor 1
Status: Maintenance Required
This machine is temporarily unavailable
[View Other Machines]
```

**Error message if trying to activate:**
```json
{
  "error": "Machine requires maintenance",
  "available": false,
  "reason": "Machine requires maintenance"
}
```

### After Maintenance Reset

**User sees:**
```
✅ WASH001 - Floor 1
Status: Available
Recently serviced ✨
[Activate Machine]
```

---

## Best Practices

### For Admins

1. **Monitor Regularly**
   - Check dashboard daily
   - Review machines approaching limits
   - Plan maintenance schedules

2. **Proactive Maintenance**
   - Service machines before they hit limits
   - Keep spare parts available
   - Document maintenance activities

3. **Track Patterns**
   - Identify high-usage machines
   - Adjust intervals based on actual wear
   - Plan for peak usage times

4. **Quick Response**
   - Reset maintenance promptly after service
   - Test machines before bringing back online
   - Update users about availability

### For System Operators

1. **Set Appropriate Intervals**
   - Based on manufacturer recommendations
   - Adjusted for usage patterns
   - Consider environmental factors

2. **Keep Records**
   - Log all maintenance activities
   - Track part replacements
   - Monitor failure patterns

3. **User Communication**
   - Notify users of scheduled maintenance
   - Provide alternative machines
   - Update status in real-time

---

## Troubleshooting

### Machine Stuck in Maintenance

**Check:**
```sql
SELECT id, code, status, current_operating_minutes, maintenance_interval
FROM machines
WHERE status = 'maintenance';
```

**Fix:**
```bash
# Via API
PATCH /api/machines/:id/maintenance-reset

# Or SQL
UPDATE machines 
SET status = 'online', current_operating_minutes = 0 
WHERE id = 'machine-uuid';
```

### Usage Not Incrementing

**Check session completion:**
```sql
SELECT * FROM usage_sessions 
WHERE machine_id = 'machine-uuid' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Verify increment logic:**
```typescript
// Should be called after session ends
await machineService.incrementOperatingHours(machineId, durationMinutes);
```

### Incorrect Hours Display

**Issue:** Hours showing with too many decimals

**Fix:** Already implemented - displays with 2 decimal places
```typescript
currentOperatingHours: (row.current_operating_minutes / 60).toFixed(2)
```

---

## Summary

✅ **Automatic tracking** - Usage accumulates automatically  
✅ **Automatic maintenance mode** - Triggers when limit reached  
✅ **Admin notifications** - Alerts sent immediately  
✅ **Easy reset** - One-click maintenance reset  
✅ **Real-time updates** - WebSocket broadcasts to all clients  
✅ **User-friendly** - Clear status messages and availability  

The system ensures machines are properly maintained while minimizing downtime and providing a smooth user experience.
