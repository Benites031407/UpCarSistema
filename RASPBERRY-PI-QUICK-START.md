# 🚀 Raspberry Pi Quick Start - 5 Minutes Setup

## Before You Start
- [ ] Raspberry Pi with Raspberry Pi OS installed
- [ ] Connected to same network as your server (192.168.15.x)
- [ ] Relay module ready to connect

---

## ⚡ Quick Setup Commands

### 1. Install Node.js & Dependencies (2 min)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Install GPIO support
sudo apt-get install -y pigpio
sudo systemctl enable pigpiod && sudo systemctl start pigpiod
```

### 2. Deploy Code (1 min)
```bash
# Clone repository
cd ~
git clone https://github.com/YOUR_USERNAME/UpCarAspiradores.git
cd UpCarAspiradores/packages/iot-controller

# Install dependencies
npm install
```

### 3. Configure (1 min)
```bash
# Create config file
cp .env.example .env
nano .env
```

**Minimal configuration:**
```bash
CONTROLLER_ID=pi-controller-01
MACHINE_ID=GET_THIS_FROM_DATABASE
MQTT_BROKER_URL=mqtt://192.168.15.90:1884
RELAY_PIN=18
```

**Get Machine ID:**
On your main computer:
```bash
psql -h localhost -p 5432 -U postgres -d machine_rental -c "SELECT id, code FROM machines;"
```

### 4. Build & Test (1 min)
```bash
# Build
npm run build

# Test run
sudo npm start
```

You should see: `✓ Connected to MQTT broker`

---

## 🔌 Hardware Connections

**Relay Module:**
```
Pi Pin 2 (5V)     → Relay VCC
Pi Pin 6 (GND)    → Relay GND  
Pi Pin 12 (GPIO18)→ Relay IN
```

---

## 🔄 Auto-Start Setup

```bash
# Create service
sudo tee /etc/systemd/system/upcar-controller.service > /dev/null <<EOF
[Unit]
Description=UpCar IoT Controller
After=network.target pigpiod.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/UpCarAspiradores/packages/iot-controller
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable upcar-controller
sudo systemctl start upcar-controller

# Check status
sudo systemctl status upcar-controller
```

---

## ✅ Verification

1. **Check service:** `sudo systemctl status upcar-controller`
2. **View logs:** `sudo journalctl -u upcar-controller -f`
3. **Test from admin:** Go to http://192.168.15.90:3000/admin
4. **Activate machine:** Should hear relay click!

---

## 🐛 Quick Fixes

**Service won't start:**
```bash
sudo systemctl restart pigpiod
sudo systemctl restart upcar-controller
```

**MQTT connection failed:**
```bash
# Test connection
ping 192.168.15.90
```

**Permission denied:**
```bash
sudo usermod -a -G gpio pi
sudo reboot
```

---

## 📝 Useful Commands

```bash
# View logs
sudo journalctl -u upcar-controller -f

# Restart service
sudo systemctl restart upcar-controller

# Stop service
sudo systemctl stop upcar-controller

# Update code
cd ~/UpCarAspiradores && git pull
cd packages/iot-controller && npm install && npm run build
sudo systemctl restart upcar-controller
```

---

**Done! 🎉** Your Raspberry Pi is now controlling the vacuum machine!

For detailed setup, see: **RASPBERRY-PI-SETUP.md**
