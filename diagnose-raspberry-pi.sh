#!/bin/bash

echo "=========================================="
echo "UpCar Raspberry Pi Diagnostics"
echo "=========================================="
echo ""

echo "1. Checking service status..."
sudo systemctl status upcar-controller --no-pager | head -20
echo ""

echo "2. Checking if process is running..."
ps aux | grep "node.*dist/index.js" | grep -v grep
echo ""

echo "3. Checking network connectivity..."
ping -c 3 192.168.15.90
echo ""

echo "4. Checking MQTT broker connectivity..."
timeout 5 mosquitto_sub -h 192.168.15.90 -p 1884 -t "test" -C 1 2>&1 || echo "MQTT connection failed"
echo ""

echo "5. Checking last 20 log lines..."
sudo journalctl -u upcar-controller -n 20 --no-pager
echo ""

echo "6. Checking .env configuration..."
if [ -f ~/UpCarSistema/packages/iot-controller/.env ]; then
    echo "MACHINE_ID=$(grep MACHINE_ID ~/UpCarSistema/packages/iot-controller/.env)"
    echo "MQTT_BROKER_URL=$(grep MQTT_BROKER_URL ~/UpCarSistema/packages/iot-controller/.env)"
    echo "RELAY_PIN=$(grep RELAY_PIN ~/UpCarSistema/packages/iot-controller/.env)"
else
    echo "❌ .env file not found!"
fi
echo ""

echo "7. Checking GPIO daemon..."
sudo systemctl status pigpiod --no-pager | head -10
echo ""

echo "=========================================="
echo "Diagnostics Complete"
echo "=========================================="
