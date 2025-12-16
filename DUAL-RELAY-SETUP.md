# Dual Relay Setup for 2-Motor Vacuum

## Hardware Connections

Connect your 2-channel relay module to the Raspberry Pi:

```
Relay Module → Raspberry Pi
─────────────────────────────
DC+    →  5V (Pin 2 or 4)
DC-    →  GND (Pin 6, 9, 14, 20, 25, 30, 34, or 39)
IN1    →  GPIO 18 (Pin 12) - Controls Motor 1
IN2    →  GPIO 23 (Pin 16) - Controls Motor 2
```

## Software Configuration

### On Raspberry Pi:

1. **Stop the IoT controller** (if running):
   ```bash
   # Press Ctrl+C to stop
   ```

2. **Update the code**:
   ```bash
   cd ~/UpCarSistema/packages/iot-controller
   git pull  # Or copy the updated relay.ts file
   npm run build
   ```

3. **Update `.env` file**:
   ```bash
   nano .env
   ```

   Add this line (if not already there):
   ```
   RELAY_PIN_2=23
   ```

   Your `.env` should have:
   ```
   CONTROLLER_ID=Raspberry-pi-01
   MACHINE_ID=ecfc939e-92e3-4db7-a978-54df4ac2950d
   MQTT_BROKER_URL=mqtt://192.168.15.90:1884
   RELAY_PIN=18
   RELAY_PIN_2=23
   ```

4. **Start the IoT controller**:
   ```bash
   sudo npm start
   ```

   You should see:
   ```
   info: Relay controller initialized on GPIO pins 18 and 23
   ```

## Testing

1. **Start a vacuum session** from the app
2. **Watch the Raspberry Pi logs** - you should see:
   ```
   info: Activating both relays for XXXXms
   info: GPIO pins 18 and 23 set to HIGH
   ```

3. **Both relay channels** will activate simultaneously
4. **Both motors** will turn on at the same time

## Wiring the Motors

Connect each motor to its relay channel:

```
Motor 1:
  Wall Power → Relay 1 COM
  Relay 1 NO → Motor 1

Motor 2:
  Wall Power → Relay 2 COM
  Relay 2 NO → Motor 2
```

Both motors will turn on/off together when you start/stop the vacuum.

## Troubleshooting

**If only GPIO 18 activates:**
- Check that `RELAY_PIN_2=23` is in your `.env` file
- Verify you rebuilt the code: `npm run build`
- Check the wiring to GPIO 23 (Pin 16)

**If neither GPIO activates:**
- Make sure you're running with `sudo npm start`
- Check all power connections (DC+ and DC-)
- Verify the relay module LED lights up

## Safety Notes

⚠️ **IMPORTANT:**
- Both relays will activate/deactivate simultaneously
- Maximum duration is 30 minutes (safety limit)
- Emergency stop will turn off both relays immediately
- Always use proper electrical safety when connecting motors
