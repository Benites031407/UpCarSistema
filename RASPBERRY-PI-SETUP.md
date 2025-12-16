# 🍓 Raspberry Pi Setup Guide - UpCar Aspiradores

Complete step-by-step guide to configure your Raspberry Pi to control vacuum machines.

## 📦 What You'll Need

### Hardware
- ✅ Raspberry Pi 3B or newer (with power supply)
- ✅ MicroSD card (16GB minimum, 32GB recommended)
- ✅ SRD-05VDC-SL-C relay module (5V)
- ✅ DHT22 temperature/humidity sensor (optional but recommended)
- ✅ Jumper wires (female-to-female)
- ✅ Keyboard, mouse, and monitor (for initial setup)
- ✅ Ethernet cable or WiFi connection

### Software
- Raspberry Pi OS (Lite or Desktop)
- Node.js 18+
- Your project code

---

## 🚀 Step 1: Prepare the Raspberry Pi

### 1.1 Install Raspberry Pi OS

1. Download **Raspberry Pi Imager**: https://www.raspberrypi.com/software/
2. Insert your microSD card into your computer
3. Open Raspberry Pi Imager
4. Click **"Choose OS"** → **Raspberry Pi OS (64-bit)** (Lite if you don't need desktop)
5. Click **"Choose Storage"** → Select your microSD card
6. Click **⚙️ Settings** (gear icon):
   - ✅ Enable SSH
   - ✅ Set username: `pi` and password: `raspberry` (or your choice)
   - ✅ Configure WiFi (SSID and password)
   - ✅ Set hostname: `upcar-controller-01` (or your choice)
7. Click **"Write"** and wait for completion

### 1.2 Boot the Raspberry Pi

1. Insert the microSD card into your Raspberry Pi
2. Connect power, keyboard, mouse, and monitor
3. Wait for boot (first boot takes longer)
4. Login with your credentials

---

## 🔌 Step 2: Hardware Connections

### 2.1 GPIO Pin Layout (Raspberry Pi)

```
     3.3V  (1) (2)  5V
    GPIO2  (3) (4)  5V
    GPIO3  (5) (6)  GND
    GPIO4  (7) (8)  GPIO14
      GND  (9) (10) GPIO15
   GPIO17 (11) (12) GPIO18  ← RELAY CONTROL (Default)
   GPIO27 (13) (14) GND
   GPIO22 (15) (16) GPIO23
     3.3V (17) (18) GPIO24
   GPIO10 (19) (20) GND
    GPIO9 (21) (22) GPIO25
   GPIO11 (23) (24) GPIO8
      GND (25) (26) GPIO7
```

### 2.2 Connect the Relay Module

**SRD-05VDC-SL-C Relay Connections:**

```
Raspberry Pi          →    Relay Module
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pin 2 (5V)           →    VCC
Pin 6 (GND)          →    GND
Pin 12 (GPIO18)      →    IN (Signal)
```

**Relay to Vacuum Machine:**
```
Relay Module         →    Vacuum Machine
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COM (Common)         →    Live Wire (from wall)
NO (Normally Open)   →    Live Wire (to vacuum)
```

⚠️ **SAFETY WARNING**: 
- Only connect mains voltage if you're qualified
- Use proper electrical isolation
- Consider using an electrician for mains connections

### 2.3 Connect DHT22 Sensor (Optional)

```
Raspberry Pi          →    DHT22 Sensor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pin 1 (3.3V)         →    VCC (+)
Pin 9 (GND)          →    GND (-)
Pin 11 (GPIO17)      →    DATA (Signal)
```

---

## 💻 Step 3: Software Installation

### 3.1 Update System

```bash
sudo apt update
sudo apt upgrade -y
```

### 3.2 Install Node.js 18

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify installation:
```bash
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

### 3.3 Install GPIO Dependencies

```bash
# Install pigpio library (but don't enable the system service)
sudo apt-get install -y pigpio python3-pigpio

# IMPORTANT: Disable the system pigpiod service
# The npm pigpio package will manage its own daemon
sudo systemctl stop pigpiod
sudo systemctl disable pigpiod
```

**Why disable pigpiod service?**
- The npm `pigpio` package starts its own pigpio daemon internally
- Having both the system service and npm daemon causes conflicts
- You'll see "Can't lock /var/run/pigpio.pid" errors if both try to run
- The npm package handles everything automatically when running as root

### 3.4 Install Git

```bash
sudo apt-get install -y git
```

---

## 📥 Step 4: Deploy Your Code

### 4.1 Clone Your Repository

```bash
cd ~
git clone https://github.com/Benites031407/UpCarSistema.git
cd UpCarSistema
```

### 4.2 Install Dependencies

```bash
cd packages/iot-controller
npm install
```

### 4.3 Configure Environment

```bash
cp .env.example .env
nano .env
```

**Edit the .env file with your settings:**

```bash
# Controller Configuration
CONTROLLER_ID=Raspberry-pi-XX
MACHINE_ID=your-machine-uuid-here

# MQTT Configuration
MQTT_BROKER_URL=mqtt://192.168.15.90:1884
MQTT_USERNAME=
MQTT_PASSWORD=

# GPIO Configuration
RELAY_PIN=18
DHT_PIN=17

# Temperature Safety Limits (Celsius)
MIN_SAFE_TEMP=10
MAX_SAFE_TEMP=45
CRITICAL_TEMP=50

# Heartbeat Configuration
HEARTBEAT_INTERVAL=30000

# Logging
LOG_LEVEL=info
```

**Important**: Replace `MACHINE_ID` with an actual machine UUID from your database!

### 4.4 Get Machine ID from Database

On your main computer, run:
```bash
psql -h localhost -p 5432 -U postgres -d upcar_aspiradores -c "SELECT id, code, location FROM machines;"
```

Copy the UUID of the machine you want to control.

---

## 🧪 Step 5: Test the Controller

### 5.1 Build the Code

```bash
npm run build
```

### 5.2 Test Run

```bash
sudo npm start
```

You should see:
```
info: IoT Controller starting...
info: Controller ID: pi-controller-01
info: Machine ID: your-machine-uuid
info: Connected to MQTT broker
info: Relay initialized on GPIO 18
info: Temperature sensor initialized
info: Controller ready and listening for commands
```

### 5.3 Test from Admin Dashboard

1. Open your admin dashboard: http://192.168.15.90:3000/admin
2. Go to **Monitoring** tab
3. You should see your machine online
4. Try activating it for 1 minute

---

## 🔄 Step 6: Auto-Start on Boot

### 6.1 Create Systemd Service

```bash
sudo nano /etc/systemd/system/upcar-controller.service
```

**Paste this content:**

```ini
[Unit]
Description=UpCar IoT Controller
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/upcar/UpCarSistema/packages/iot-controller
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**⚠️ IMPORTANT**: 
- Replace `YOUR_USERNAME_HERE` with your actual username (e.g., `pedrobpf`)
- The service runs as `root` to access GPIO pins
- The service does NOT depend on pigpiod.service - the npm package manages GPIO internally
- Logs are stored in systemd journal (view with `sudo journalctl -u upcar-controller -f`)

### 6.2 Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable upcar-controller
sudo systemctl start upcar-controller
```

### 6.3 Check Service Status

```bash
sudo systemctl status upcar-controller
```

### 6.4 View Logs

```bash
# Real-time logs
sudo journalctl -u upcar-controller -f

# Last 50 lines
sudo journalctl -u upcar-controller -n 50

# Logs since today
sudo journalctl -u upcar-controller --since today

# Follow logs with timestamps
sudo journalctl -u upcar-controller -f --output=short-iso
```

---

Reboot:
```bash
sudo reboot
```

---

## 🧪 Testing Checklist

- [ ] Raspberry Pi boots successfully
- [ ] Network connection works (ping google.com)
- [ ] Node.js installed (node --version)
- [ ] GPIO service running (sudo systemctl status pigpiod)
- [ ] Code deployed and built
- [ ] Environment configured (.env file)
- [ ] Controller starts without errors
- [ ] MQTT connection established
- [ ] Machine appears online in admin dashboard
- [ ] Relay clicks when activating (you should hear it)
- [ ] Temperature readings appear (if sensor connected)
- [ ] Auto-start service enabled
- [ ] Logs are being written

---

## 🐛 Troubleshooting

### Controller Won't Start

```bash
# Check logs
sudo journalctl -u upcar-controller -n 50

# Check if pigpiod is running
sudo systemctl status pigpiod

# Restart pigpiod
sudo systemctl restart pigpiod

# Try running manually
cd ~/UpCarAspiradores/packages/iot-controller
sudo npm start
```

### MQTT Connection Failed

```bash
# Test MQTT connection
sudo apt-get install -y mosquitto-clients
mosquitto_sub -h 192.168.15.90 -p 1884 -t "test" -v

# Check if broker is accessible
ping 192.168.15.90
```

### GPIO Permission Denied or "Can't lock /var/run/pigpio.pid"

This happens when the system pigpiod service conflicts with the npm pigpio package:

```bash
# Stop and disable the system pigpiod service
sudo systemctl stop pigpiod
sudo systemctl disable pigpiod

# Restart your controller service
sudo systemctl restart upcar-controller

# Check status
sudo systemctl status upcar-controller
```

The npm `pigpio` package manages its own daemon when running as root, so the system service is not needed.

### Temperature Sensor Not Working

The controller will work without the sensor - it will use simulated values. Check:
```bash
# Verify wiring
# Check logs for sensor errors
tail -f ~/UpCarAspiradores/packages/iot-controller/logs/error.log
```

---

## 📱 Remote Access

### SSH Access

From your computer:
```bash
ssh pi@192.168.15.100
```

### Update Code Remotely

```bash
ssh pi@192.168.15.100
cd ~/UpCarAspiradores
git pull
cd packages/iot-controller
npm install
npm run build
sudo systemctl restart upcar-controller
```

---

## 🎯 Next Steps

1. **Test thoroughly** - Activate/deactivate multiple times
2. **Monitor temperature** - Ensure safety limits work
3. **Check logs regularly** - Look for any errors
4. **Set up multiple controllers** - Repeat for each machine
5. **Configure alerts** - Set up notifications for errors

---

## 📞 Support

If you encounter issues:
1. Check the logs first
2. Verify all connections
3. Test MQTT connectivity
4. Review the troubleshooting section
5. Check the main project documentation

---

**🎉 Congratulations!** Your Raspberry Pi is now controlling your vacuum machine remotely!
