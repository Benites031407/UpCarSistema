# 💓 Heartbeat Validation for Machine Status

## Overview

Admins can no longer set a machine to "online" status unless the system is actively receiving heartbeats from the Raspberry Pi. This prevents confusion and ensures status accuracy.

---

## The Problem (Before)

**Scenario:**
```
1. Raspberry Pi is unplugged/powered off
2. Machine status: offline
3. Admin manually sets status to "online"
4. Status shows "online" for 90 seconds
5. System auto-detects no heartbeat
6. Status reverts to "offline"
```

**Issues:**
- ❌ Temporary inconsistency (shows online when actually offline)
- ❌ Confusing for admins
- ❌ Users might try to activate unavailable machine
- ❌ Wastes time troubleshooting

---

## The Solution (After)

**Scenario:**
```
1. Raspberry Pi is unplugged/powered off
2. Machine status: offline
3. Admin tries to set status to "online"
4. ❌ BLOCKED with clear error message
5. Status remains "offline" (accurate)
```

**Benefits:**
- ✅ Status always reflects reality
- ✅ Clear error messages guide admin
- ✅ No temporary inconsistencies
- ✅ Faster troubleshooting

---

## How It Works

### Heartbeat Check

When admin tries to change status to "online":

```typescript
// 1. Check if machine has ever sent a heartbeat
if (!machine.lastHeartbeat) {
  return ERROR: "Machine has never sent a heartbeat"
}

// 2. Check if heartbeat is recent (within 90 seconds)
const timeSinceHeartbeat = now - machine.lastHeartbeat;
if (timeSinceHeartbeat > 90 seconds) {
  return ERROR: "No heartbeat in X seconds"
}

// 3. Allow status change
return SUCCESS: "Status changed to online"
```

### Validation Rules

| Condition | Result | Message |
|-----------|--------|---------|
| No heartbeat ever | ❌ Blocked | "Machine has never sent a heartbeat" |
| Heartbeat > 90s ago | ❌ Blocked | "No heartbeat in X seconds" |
| Heartbeat < 90s ago | ✅ Allowed | Status changed successfully |

---

## Error Messages

### Never Received Heartbeat

**Backend Response:**
```json
{
  "error": "Cannot set machine to online",
  "reason": "Machine has never sent a heartbeat. Ensure the Raspberry Pi is connected and running.",
  "suggestion": "Check if the IoT controller is running on the Raspberry Pi"
}
```

**User Sees:**
```
Cannot set machine to online

Machine has never sent a heartbeat. Ensure the Raspberry Pi is connected and running.

Check if the IoT controller is running on the Raspberry Pi
```

### Heartbeat Too Old

**Backend Response:**
```json
{
  "error": "Cannot set machine to online",
  "reason": "Machine has not sent a heartbeat in 125 seconds. The Raspberry Pi may be disconnected or powered off.",
  "lastHeartbeat": "2024-12-12T19:42:00Z",
  "suggestion": "Ensure the Raspberry Pi is powered on and connected to the network"
}
```

**User Sees:**
```
Cannot set machine to online

Machine has not sent a heartbeat in 125 seconds. The Raspberry Pi may be disconnected or powered off.

Ensure the Raspberry Pi is powered on and connected to the network
```

---

## Visual Indicators

### Connection Status Indicator

**In Admin Dashboard:**
```
Status: [Offline ▼]  🔴  (90s since heartbeat)
Status: [Online ▼]   🟢  (5s since heartbeat)
```

**Indicator Colors:**
- 🟢 Green: Heartbeat within 90 seconds (connected)
- 🔴 Red: No heartbeat or > 90 seconds (disconnected)

**Hover Tooltip:**
```
"Último heartbeat: 5s atrás"
"Último heartbeat: 125s atrás"
```

---

## Admin Workflow

### Scenario 1: Machine Offline, Want to Set Online

**Step 1: Check Status**
```
Machine: 000001
Status: Offline
Connection: 🔴 (125s since heartbeat)
```

**Step 2: Try to Change Status**
```
Admin selects: "Online"
System blocks: ❌
Error shown: "No heartbeat in 125 seconds"
```

**Step 3: Troubleshoot**
```
Admin checks:
- Is Raspberry Pi powered on? ❌
- Is network cable connected? ❌
- Is IoT controller running? ❌
```

**Step 4: Fix Issue**
```
Admin actions:
1. Powers on Raspberry Pi
2. Waits for boot (~30 seconds)
3. IoT controller starts automatically
4. Heartbeat sent to server
```

**Step 5: Retry Status Change**
```
Machine: 000001
Status: Offline
Connection: 🟢 (3s since heartbeat)

Admin selects: "Online"
System allows: ✅
Status changed: Online
```

### Scenario 2: Machine Already Receiving Heartbeats

**Current State:**
```
Machine: 000034
Status: Maintenance
Connection: 🟢 (8s since heartbeat)
```

**Admin Action:**
```
Admin selects: "Online"
System allows: ✅ (heartbeat is recent)
Status changed: Online
```

**Result:**
```
Machine: 000034
Status: Online
Connection: 🟢 (8s since heartbeat)
```

---

## Technical Implementation

### Backend Validation

**File:** `packages/backend/src/routes/admin.ts`

```typescript
// Validate status change to "online"
if (updateData.status === 'online') {
  const now = new Date();
  const heartbeatThreshold = 90 * 1000; // 90 seconds
  
  // Check if machine has ever sent heartbeat
  if (!machine.lastHeartbeat) {
    return res.status(400).json({ 
      error: 'Cannot set machine to online',
      reason: 'Machine has never sent a heartbeat. Ensure the Raspberry Pi is connected and running.',
      suggestion: 'Check if the IoT controller is running on the Raspberry Pi'
    });
  }

  // Check if heartbeat is recent
  const timeSinceHeartbeat = now.getTime() - machine.lastHeartbeat.getTime();
  
  if (timeSinceHeartbeat > heartbeatThreshold) {
    const secondsSinceHeartbeat = Math.round(timeSinceHeartbeat / 1000);
    return res.status(400).json({ 
      error: 'Cannot set machine to online',
      reason: `Machine has not sent a heartbeat in ${secondsSinceHeartbeat} seconds. The Raspberry Pi may be disconnected or powered off.`,
      lastHeartbeat: machine.lastHeartbeat.toISOString(),
      suggestion: 'Ensure the Raspberry Pi is powered on and connected to the network'
    });
  }

  logger.info(`Machine ${machine.code} status change to online approved - heartbeat ${Math.round(timeSinceHeartbeat / 1000)}s ago`);
}
```

### Frontend Error Handling

**File:** `packages/frontend/src/components/admin/MachineRegistryComponent.tsx`

```typescript
const updateMachineStatusMutation = useMutation({
  mutationFn: async ({ id, status }) => {
    const response = await api.put(`/admin/machines/${id}`, { status });
    return response.data;
  },
  onError: (error: any) => {
    const errorData = error.response?.data;
    if (errorData?.error && errorData?.reason) {
      // Show detailed error with reason and suggestion
      alert(`${errorData.error}\n\n${errorData.reason}\n\n${errorData.suggestion || ''}`);
    } else {
      alert(error.response?.data?.error || 'Falha ao atualizar status da máquina');
    }
  },
});
```

### Connection Indicator

```tsx
{(() => {
  if (!machine.lastHeartbeat) return null;
  
  const now = new Date();
  const lastHeartbeat = new Date(machine.lastHeartbeat);
  const secondsSince = Math.floor((now.getTime() - lastHeartbeat.getTime()) / 1000);
  const isConnected = secondsSince < 90;
  
  return (
    <span 
      className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}
      title={`Último heartbeat: ${secondsSince}s atrás`}
    >
      {isConnected ? '🟢' : '🔴'}
    </span>
  );
})()}
```

---

## Other Status Changes (Not Affected)

### Allowed Without Heartbeat

These status changes work regardless of heartbeat:

```
✅ online → offline (manual shutdown)
✅ online → maintenance (scheduled maintenance)
✅ offline → maintenance (maintenance while offline)
✅ maintenance → offline (keep offline after maintenance)
```

**Rationale:**
- Setting to "offline" or "maintenance" doesn't require connectivity
- These are administrative decisions, not system state
- No risk of showing incorrect availability

---

## Troubleshooting Guide

### Error: "Machine has never sent a heartbeat"

**Possible Causes:**
1. Raspberry Pi never powered on
2. IoT controller never started
3. Wrong machine ID in configuration
4. Network connectivity issues

**Solutions:**
```bash
# 1. Check if Raspberry Pi is on
# Look for power LED

# 2. Check if IoT controller is running
ssh pi@raspberry-pi-ip
sudo systemctl status upcar-controller

# 3. Check logs
sudo journalctl -u upcar-controller -f

# 4. Verify configuration
cat ~/UpCarSistema/packages/iot-controller/.env
# Check MACHINE_ID matches database
```

### Error: "No heartbeat in X seconds"

**Possible Causes:**
1. Raspberry Pi powered off
2. Network disconnected
3. IoT controller crashed
4. MQTT broker connection lost

**Solutions:**
```bash
# 1. Check power
# Verify Raspberry Pi is on

# 2. Check network
ping raspberry-pi-ip

# 3. Restart IoT controller
ssh pi@raspberry-pi-ip
sudo systemctl restart upcar-controller

# 4. Check MQTT connection
sudo journalctl -u upcar-controller -n 50
# Look for "Connected to MQTT broker"
```

### Connection Indicator Shows Red

**Check:**
1. Last heartbeat time (hover over indicator)
2. If > 90 seconds, Raspberry Pi likely offline
3. If < 90 seconds but red, refresh page

**Action:**
```
If heartbeat is recent but indicator is red:
1. Refresh browser page
2. Check browser console for errors
3. Verify WebSocket connection
```

---

## Logging

### Successful Status Change

```
[INFO] Machine 000001 status change to online approved - heartbeat 5s ago
[INFO] Machine 000001 status updated: offline → online
```

### Blocked Status Change

```
[WARN] Machine 000001 status change to online blocked - no heartbeat in 125s
[INFO] Admin attempted to set offline machine 000001 to online
```

### Heartbeat Received

```
[INFO] Heartbeat received from machine 000001 (controller: pi-001)
[DEBUG] Machine 000001 last heartbeat: 2024-12-12T19:45:00Z
```

---

## Benefits

### For Admins

✅ **Accurate status** - Status always reflects reality  
✅ **Clear errors** - Know exactly why change was blocked  
✅ **Faster troubleshooting** - Error messages guide to solution  
✅ **Visual feedback** - Connection indicator shows heartbeat status  

### For System

✅ **Data integrity** - No inconsistent states  
✅ **Better monitoring** - Connection status visible  
✅ **Reduced confusion** - Status matches actual state  
✅ **Audit trail** - Logs show blocked attempts  

### For Users

✅ **Accurate availability** - Won't see "available" for offline machines  
✅ **Better experience** - No failed activation attempts  
✅ **Trust** - System status is reliable  

---

## Edge Cases

### Case 1: Heartbeat Arrives During Status Change

```
1. Admin tries to set online (no recent heartbeat)
2. Request blocked
3. Heartbeat arrives 1 second later
4. Admin retries
5. Request succeeds
```

**Handled:** ✅ Each request checks current heartbeat

### Case 2: Heartbeat Stops Right After Status Change

```
1. Heartbeat received (5s ago)
2. Admin sets to online ✅
3. Raspberry Pi crashes immediately
4. Status: online (but actually offline)
5. After 90s: Auto-detected and set to offline
```

**Handled:** ✅ Automatic offline detection still works

### Case 3: Multiple Admins

```
1. Admin A checks status (heartbeat 5s ago)
2. Admin B unplugs Raspberry Pi
3. Admin A tries to set online (heartbeat now 95s ago)
4. Request blocked ✅
```

**Handled:** ✅ Validation happens at request time

---

## Summary

✅ **Validation added** - Can't set online without heartbeat  
✅ **Clear errors** - Detailed messages with suggestions  
✅ **Visual indicator** - 🟢/🔴 shows connection status  
✅ **Better UX** - Admins know exactly what's wrong  
✅ **Data integrity** - Status always accurate  
✅ **Faster troubleshooting** - Error messages guide to solution  

This improvement ensures machine status always reflects reality and helps admins quickly identify and resolve connectivity issues.
