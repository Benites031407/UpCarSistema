# 🔌 Offline Machine Handling - UpCar System

## Overview

The UpCar system automatically detects when Raspberry Pi controllers go offline and prevents users from accessing those machines.

---

## How It Works

### 1. **Heartbeat System**

Each Raspberry Pi controller sends a heartbeat signal every 30 seconds (configurable) via MQTT:

```typescript
// IoT Controller sends heartbeat
{
  controllerId: "pi-controller-01",
  machineId: "uuid-of-machine",
  status: "online",
  temperature: 25.5,
  timestamp: "2025-12-04T23:45:00Z"
}
```

### 2. **Offline Detection**

The backend monitors heartbeats and marks machines as offline if:
- No heartbeat received for **90 seconds** (3x heartbeat interval)
- Connection to MQTT broker is lost
- Raspberry Pi is powered off

**Code Location:** `packages/backend/src/services/machineService.ts`

```typescript
// Check if machine is offline
if (machine.status === 'offline') {
  return {
    available: false,
    reason: 'Machine is offline',
    machine
  };
}
```

### 3. **User Experience**

When a user tries to access an offline machine:

#### ❌ **Machine Unavailable Screen**
- **Red icon** with "offline" symbol
- **Clear message**: "Este aspirador está desligado ou sem conexão"
- **Explanation box**: Details about why the machine is offline
- **Action button**: "Voltar ao Início" to find another machine

#### ✅ **Online Machine**
- Green "Disponível" badge
- Full activation interface
- Payment options enabled

---

## Automatic Recovery

When the Raspberry Pi comes back online:

1. **Power restored** → Raspberry Pi boots
2. **Service starts** → `upcar-controller.service` launches automatically
3. **MQTT connects** → Controller connects to broker
4. **Heartbeat sent** → Backend receives heartbeat
5. **Status updated** → Machine marked as `online`
6. **Available again** → Users can access the machine

**Recovery time:** ~30-60 seconds after power restoration

---

## Status Flow Diagram

```
┌─────────────┐
│   Online    │ ← Normal operation, heartbeats every 30s
└──────┬──────┘
       │
       │ No heartbeat for 90s
       ↓
┌─────────────┐
│   Offline   │ ← Users cannot access
└──────┬──────┘
       │
       │ Heartbeat received
       ↓
┌─────────────┐
│   Online    │ ← Available again
└─────────────┘
```

---

## Configuration

### Backend Settings

**File:** `packages/backend/src/services/machineService.ts`

```typescript
const offlineThreshold = 90 * 1000; // 90 seconds (3x heartbeat interval)
```

**File:** `packages/backend/src/services/scheduler.ts`

```typescript
// Checks for offline machines every 30 seconds
setInterval(checkOfflineMachines, 30 * 1000);
```

### IoT Controller Settings

**File:** `packages/iot-controller/.env`

```bash
# Heartbeat interval (milliseconds)
HEARTBEAT_INTERVAL=30000  # 30 seconds
```

---

## Testing Offline Detection

### Test 1: Unplug Raspberry Pi

1. Unplug the Raspberry Pi power
2. Wait 90 seconds
3. Check admin dashboard → Machine should show "offline"
4. Try to access machine as user → Should see "Aspirador Indisponível"

### Test 2: Network Disconnection

1. Disconnect Raspberry Pi from network
2. Wait 90 seconds
3. Machine should be marked offline
4. Reconnect network → Machine should come back online

### Test 3: Service Stop

```bash
# On Raspberry Pi
sudo systemctl stop upcar-controller

# Wait 90 seconds, check dashboard
# Machine should be offline

# Restart service
sudo systemctl start upcar-controller

# Machine should come back online
```

---

## Admin Dashboard

Admins can see machine status in real-time:

- **Green dot** 🟢 = Online
- **Red dot** 🔴 = Offline
- **Yellow dot** 🟡 = Maintenance
- **Blue dot** 🔵 = In Use

**Location:** Admin Dashboard → Monitoring Tab

---

## Troubleshooting

### Machine Stuck Offline

**Check:**
1. Is Raspberry Pi powered on?
2. Is network connected? (`ping google.com`)
3. Is service running? (`sudo systemctl status upcar-controller`)
4. Is MQTT broker accessible? (`ping 192.168.15.90`)
5. Check logs: `sudo journalctl -u upcar-controller -n 50`

### False Offline Detection

If machines are incorrectly marked offline:

1. **Check heartbeat interval** - May be too long
2. **Check network latency** - High latency can cause missed heartbeats
3. **Increase offline threshold** - Adjust `OFFLINE_THRESHOLD_MS`

---

## Security Benefits

✅ **Prevents activation of unavailable machines**
✅ **Protects users from failed transactions**
✅ **Automatic recovery without manual intervention**
✅ **Real-time status monitoring**
✅ **Clear user communication**

---

## Related Files

- **Backend Service:** `packages/backend/src/services/machineService.ts`
- **Frontend Page:** `packages/frontend/src/pages/MachineActivationPage.tsx`
- **IoT Controller:** `packages/iot-controller/src/index.ts`
- **MQTT Handler:** `packages/backend/src/mqtt/mqttHandler.ts`

---

## Summary

✅ **Automatic offline detection** - No manual intervention needed
✅ **User-friendly messages** - Clear explanation of why machine is unavailable
✅ **Automatic recovery** - Machines come back online when Raspberry Pi restarts
✅ **Real-time monitoring** - Admin dashboard shows current status
✅ **Prevents failed activations** - Users can't start offline machines

**Your system is production-ready for handling offline machines!** 🎉
