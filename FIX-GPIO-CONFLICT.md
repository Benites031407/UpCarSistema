# 🔧 Fix GPIO/pigpio Conflict on Raspberry Pi

## Problem

When starting the IoT controller, you see this error:
```
initInitialise: Can't lock /var/run/pigpio.pid
```

The relay doesn't work even though the service is running.

## Root Cause

The system `pigpiod` service and the npm `pigpio` package are both trying to control GPIO at the same time. They conflict because:
- The system service starts automatically and locks the GPIO daemon
- The npm package (used by your code) tries to start its own daemon
- Only one can run at a time

## Solution

Disable the system pigpiod service and let the npm package manage GPIO:

```bash
# Stop the system pigpiod service
sudo systemctl stop pigpiod

# Disable it from starting on boot
sudo systemctl disable pigpiod

# Verify it's disabled
sudo systemctl status pigpiod
# Should show: "disabled" and "inactive (dead)"
```

## Update Your Service Configuration

Make sure your systemd service file does NOT depend on pigpiod:

```bash
sudo nano /etc/systemd/system/upcar-controller.service
```

It should look like this (NO pigpiod.service references):

```ini
[Unit]
Description=UpCar IoT Controller
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/pedrobpf/UpCarSistema/packages/iot-controller
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## Restart Your Controller

```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Restart your controller
sudo systemctl restart upcar-controller

# Check status (should be running without errors)
sudo systemctl status upcar-controller

# Watch logs in real-time
sudo journalctl -u upcar-controller -f
```

## Verify It's Working

You should see in the logs:
```
Relay controller initialized on GPIO pins 18 and 23
Connected to MQTT broker
```

And NO errors about "Can't lock /var/run/pigpio.pid"

## Why This Works

- The npm `pigpio` package includes its own pigpio daemon
- When your Node.js app runs as root, it automatically starts and manages the daemon
- This is the recommended approach for Node.js GPIO applications
- The system pigpiod service is only needed for other languages (Python, C, etc.)

## Test the Relay

From the admin dashboard:
1. Go to Monitoring tab
2. Find your machine (should show as "online")
3. Click to activate for 1 minute
4. You should hear the relay click
5. Check logs: `sudo journalctl -u upcar-controller -f`

## Still Not Working?

Check these:

```bash
# 1. Verify pigpiod is really stopped
sudo systemctl status pigpiod
# Should show: inactive (dead)

# 2. Check if any pigpio process is running
ps aux | grep pigpio
# Should only show your grep command

# 3. Kill any stray pigpio processes
sudo killall pigpiod

# 4. Restart everything
sudo systemctl restart upcar-controller
```

## Summary

✅ **DO**: Let npm pigpio package manage GPIO (runs as root)  
❌ **DON'T**: Run system pigpiod service alongside npm package  
✅ **DO**: Run your service as root for GPIO access  
❌ **DON'T**: Try to use both system service and npm package together
