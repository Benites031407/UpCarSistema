# IoT Controller

The IoT Controller is a Node.js application designed to run on Raspberry Pi devices to control machines remotely via MQTT communication.

## Features

- **MQTT Communication**: Connects to MQTT broker for real-time command and status communication
- **Relay Control**: Controls SRD-05VDC-SL-C relay module via GPIO for machine activation
- **Temperature Monitoring**: Monitors temperature using DHT22 sensor with safety mechanisms
- **Heartbeat Reporting**: Regular status updates and health monitoring
- **Safety Mechanisms**: Automatic shutdown on temperature alerts and error conditions
- **Simulation Mode**: Runs without hardware for development and testing

## Hardware Requirements

- Raspberry Pi 3B or newer
- SRD-05VDC-SL-C relay module
- DHT22 temperature/humidity sensor
- GPIO connections as configured

## Installation

1. Install Node.js on Raspberry Pi:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. Install dependencies:
```bash
npm install
```

3. For GPIO access on Raspberry Pi:
```bash
sudo apt-get install pigpio
sudo systemctl enable pigpiod
sudo systemctl start pigpiod
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key configuration options:

- `CONTROLLER_ID`: Unique identifier for this controller
- `MACHINE_ID`: Machine this controller manages
- `MQTT_BROKER_URL`: MQTT broker connection string
- `RELAY_PIN`: GPIO pin for relay control (default: 18)
- `MIN_SAFE_TEMP`/`MAX_SAFE_TEMP`: Temperature safety limits
- `CRITICAL_TEMP`: Emergency shutdown temperature

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Testing
```bash
npm test
npm run type-check
```

## MQTT Topics

### Subscribed Topics
- `machines/{machineId}/commands/activate` - Machine activation commands
- `machines/{machineId}/commands/deactivate` - Machine deactivation commands
- `machines/{machineId}/commands/status` - Status request commands
- `machines/broadcast/commands/status` - Broadcast status requests

### Published Topics
- `machines/{machineId}/status` - Machine status updates
- `machines/{machineId}/heartbeat` - Regular heartbeat messages
- `machines/{machineId}/alerts` - Temperature and safety alerts
- `machines/{machineId}/errors` - Error notifications

## Message Formats

### Activation Command
```json
{
  "sessionId": "session-123",
  "duration": 15
}
```

### Status Response
```json
{
  "controllerId": "controller-001",
  "machineId": "machine-001",
  "status": "active",
  "temperature": 25.5,
  "humidity": 60.2,
  "sessionId": "session-123",
  "timestamp": "2025-11-24T15:30:00.000Z"
}
```

## Safety Features

- **Temperature Monitoring**: Continuous temperature checking with configurable limits
- **Emergency Stop**: Immediate shutdown on critical temperature conditions
- **Activation Validation**: Duration and safety checks before activation
- **Automatic Timeout**: Machines automatically deactivate after specified duration
- **Error Recovery**: Graceful handling of hardware and communication failures

## GPIO Pin Configuration

Default GPIO pin assignments:
- Pin 18: Relay control (configurable via `RELAY_PIN`)

Ensure proper electrical isolation and safety measures when connecting to mains voltage equipment.

## Troubleshooting

### Common Issues

1. **Permission Denied (GPIO)**
   - Run with sudo or add user to gpio group
   - Ensure pigpiod service is running

2. **MQTT Connection Failed**
   - Check broker URL and credentials
   - Verify network connectivity
   - Check firewall settings

3. **Temperature Sensor Not Working**
   - Verify sensor wiring
   - Check GPIO pin configuration
   - Application will fall back to simulation mode

### Logs

Logs are written to:
- `logs/combined.log` - All log messages
- `logs/error.log` - Error messages only
- Console output in development mode

## Development

The controller supports simulation mode for development without hardware:
- Relay operations are logged but don't control actual GPIO
- Temperature readings are simulated with realistic values
- All MQTT communication works normally

This allows full development and testing on any system without Raspberry Pi hardware.