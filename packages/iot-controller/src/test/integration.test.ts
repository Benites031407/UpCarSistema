import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MQTTClient } from '../mqtt/client.js';
import { RelayController } from '../hardware/relay.js';
import { TemperatureSensor } from '../hardware/temperatureSensor.js';

/**
 * **Feature: machine-rental-system, IoT Controller Integration Tests**
 * 
 * Integration tests for Raspberry Pi IoT controller covering:
 * - MQTT communication with backend services
 * - Hardware control (relay activation/deactivation)
 * - Temperature monitoring and reporting
 * - Error handling and recovery mechanisms
 * - Offline operation and reconnection
 */

// Mock hardware interfaces
const mockPigpio = {
  Gpio: vi.fn().mockImplementation(() => ({
    digitalWrite: vi.fn(),
    digitalRead: vi.fn().mockReturnValue(0),
    pwmWrite: vi.fn(),
    mode: vi.fn(),
    pullUpDown: vi.fn()
  })),
  initialize: vi.fn(),
  terminate: vi.fn()
};

// Mock hardware only (pigpio) - keep MQTT real
vi.mock('pigpio', () => mockPigpio);

describe('IoT Controller Integration Tests', () => {
  let mqttClient: MQTTClient;
  let relayController: RelayController;
  let temperatureSensor: TemperatureSensor;
  
  const controllerId = 'pi-controller-test';
  const testConfig = {
    mqttBroker: 'mqtt://localhost:1884',
    relayPin: 18,
    temperaturePin: 4,
    heartbeatInterval: 30000
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Initialize components
    mqttClient = new MQTTClient(testConfig.mqttBroker, controllerId);
    relayController = new RelayController(testConfig.relayPin);
    temperatureSensor = new TemperatureSensor(testConfig.temperaturePin);
  });

  afterEach(async () => {
    // Clean up connections
    if (mqttClient) {
      await mqttClient.disconnect();
    }
    if (relayController) {
      await relayController.cleanup();
    }
  });

  describe('MQTT Communication Integration', () => {
    it('should establish MQTT connection and subscribe to control topics', async () => {
      await mqttClient.connect();

      expect(mockMqttClient.connect).toHaveBeenCalled();
      expect(mockMqttClient.subscribe).toHaveBeenCalledWith([
        `machines/${controllerId}/activate`,
        `machines/${controllerId}/deactivate`,
        `machines/${controllerId}/status_request`
      ]);
    });

    it('should handle machine activation command from backend', async () => {
      await mqttClient.connect();
      
      const activationCommand = {
        sessionId: 'test-session-1',
        duration: 600, // 10 minutes in seconds
        timestamp: new Date().toISOString()
      };

      // Simulate receiving activation command
      const messageHandler = mockMqttClient.on.mock.calls
        .find(call => call[0] === 'message')?.[1];

      if (messageHandler) {
        messageHandler(
          `machines/${controllerId}/activate`,
          Buffer.from(JSON.stringify(activationCommand))
        );
      }

      // Should activate relay for specified duration
      expect(relayController.activate).toHaveBeenCalledWith(activationCommand.duration);
      
      // Should send acknowledgment
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        `machines/${controllerId}/status`,
        expect.stringContaining('activated')
      );
    });

    it('should handle machine deactivation command', async () => {
      await mqttClient.connect();
      
      const deactivationCommand = {
        sessionId: 'test-session-1',
        reason: 'manual_stop',
        timestamp: new Date().toISOString()
      };

      const messageHandler = mockMqttClient.on.mock.calls
        .find(call => call[0] === 'message')?.[1];

      if (messageHandler) {
        messageHandler(
          `machines/${controllerId}/deactivate`,
          Buffer.from(JSON.stringify(deactivationCommand))
        );
      }

      // Should deactivate relay immediately
      expect(relayController.deactivate).toHaveBeenCalled();
      
      // Should report status
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        `machines/${controllerId}/status`,
        expect.stringContaining('deactivated')
      );
    });

    it('should send periodic heartbeat and status updates', async () => {
      await mqttClient.connect();
      
      // Mock temperature reading
      vi.spyOn(temperatureSensor, 'readTemperature').mockResolvedValue(25.5);
      vi.spyOn(relayController, 'getStatus').mockReturnValue({
        isActive: false,
        activatedAt: null,
        remainingTime: 0
      });

      // Trigger heartbeat
      await mqttClient.sendHeartbeat();

      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        `machines/${controllerId}/heartbeat`,
        expect.stringContaining(JSON.stringify({
          controllerId,
          timestamp: expect.any(String),
          status: 'online',
          temperature: 25.5,
          relayStatus: {
            isActive: false,
            activatedAt: null,
            remainingTime: 0
          }
        }))
      );
    });

    it('should handle MQTT connection loss and reconnection', async () => {
      await mqttClient.connect();

      // Simulate connection loss
      const errorHandler = mockMqttClient.on.mock.calls
        .find(call => call[0] === 'error')?.[1];

      if (errorHandler) {
        errorHandler(new Error('Connection lost'));
      }

      // Should attempt reconnection
      expect(mqttClient.isConnected()).toBe(false);
      
      // Simulate reconnection
      await mqttClient.reconnect();
      expect(mockMqttClient.connect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Hardware Control Integration', () => {
    it('should control relay for exact duration specified', async () => {
      const duration = 300; // 5 minutes
      const mockGpio = mockPigpio.Gpio();

      await relayController.activate(duration);

      // Should turn on relay
      expect(mockGpio.digitalWrite).toHaveBeenCalledWith(1);

      // Should automatically turn off after duration
      await new Promise(resolve => setTimeout(resolve, duration * 1000 + 100));
      expect(mockGpio.digitalWrite).toHaveBeenCalledWith(0);
    });

    it('should handle manual deactivation during active session', async () => {
      const duration = 600; // 10 minutes
      const mockGpio = mockPigpio.Gpio();

      await relayController.activate(duration);
      expect(mockGpio.digitalWrite).toHaveBeenCalledWith(1);

      // Manually deactivate after 2 seconds
      setTimeout(() => relayController.deactivate(), 2000);

      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Should be deactivated before full duration
      expect(mockGpio.digitalWrite).toHaveBeenLastCalledWith(0);
      expect(relayController.getStatus().isActive).toBe(false);
    });

    it('should prevent multiple simultaneous activations', async () => {
      const mockGpio = mockPigpio.Gpio();

      // Start first activation
      await relayController.activate(300);
      expect(mockGpio.digitalWrite).toHaveBeenCalledWith(1);

      // Attempt second activation while first is active
      const secondActivation = relayController.activate(600);
      
      await expect(secondActivation).rejects.toThrow('Relay is already active');
    });

    it('should read temperature from sensor accurately', async () => {
      // Mock temperature sensor reading
      const mockTemperatureValue = 26.8;
      vi.spyOn(temperatureSensor, 'readRawValue').mockResolvedValue(mockTemperatureValue);

      const temperature = await temperatureSensor.readTemperature();
      
      expect(temperature).toBe(mockTemperatureValue);
      expect(temperature).toBeGreaterThan(0);
      expect(temperature).toBeLessThan(100); // Reasonable range
    });

    it('should handle temperature sensor errors gracefully', async () => {
      // Mock sensor error
      vi.spyOn(temperatureSensor, 'readRawValue').mockRejectedValue(new Error('Sensor disconnected'));

      const temperature = await temperatureSensor.readTemperature();
      
      // Should return null or default value on error
      expect(temperature).toBeNull();
    });
  });

  describe('Complete Machine Operation Workflow', () => {
    it('should handle complete activation-to-completion cycle', async () => {
      await mqttClient.connect();
      
      const sessionData = {
        sessionId: 'integration-test-session',
        duration: 60, // 1 minute for faster test
        timestamp: new Date().toISOString()
      };

      // Step 1: Receive activation command
      const messageHandler = mockMqttClient.on.mock.calls
        .find(call => call[0] === 'message')?.[1];

      if (messageHandler) {
        messageHandler(
          `machines/${controllerId}/activate`,
          Buffer.from(JSON.stringify(sessionData))
        );
      }

      // Step 2: Verify relay activation
      const mockGpio = mockPigpio.Gpio();
      expect(mockGpio.digitalWrite).toHaveBeenCalledWith(1);

      // Step 3: Verify status reporting
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        `machines/${controllerId}/status`,
        expect.stringContaining('activated')
      );

      // Step 4: Wait for automatic completion
      await new Promise(resolve => setTimeout(resolve, 65000)); // Wait slightly longer than duration

      // Step 5: Verify automatic deactivation
      expect(mockGpio.digitalWrite).toHaveBeenLastCalledWith(0);
      
      // Step 6: Verify completion notification
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        `machines/${controllerId}/session_complete`,
        expect.stringContaining(sessionData.sessionId)
      );
    });

    it('should handle emergency stop scenario', async () => {
      await mqttClient.connect();
      
      // Start normal operation
      const sessionData = {
        sessionId: 'emergency-test-session',
        duration: 600,
        timestamp: new Date().toISOString()
      };

      const messageHandler = mockMqttClient.on.mock.calls
        .find(call => call[0] === 'message')?.[1];

      if (messageHandler) {
        messageHandler(
          `machines/${controllerId}/activate`,
          Buffer.from(JSON.stringify(sessionData))
        );
      }

      // Simulate emergency stop
      const emergencyStop = {
        sessionId: sessionData.sessionId,
        reason: 'emergency_stop',
        timestamp: new Date().toISOString()
      };

      if (messageHandler) {
        messageHandler(
          `machines/${controllerId}/deactivate`,
          Buffer.from(JSON.stringify(emergencyStop))
        );
      }

      // Should immediately deactivate
      const mockGpio = mockPigpio.Gpio();
      expect(mockGpio.digitalWrite).toHaveBeenLastCalledWith(0);
      
      // Should report emergency stop
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        `machines/${controllerId}/emergency_stop`,
        expect.stringContaining(sessionData.sessionId)
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle GPIO initialization failures', async () => {
      // Mock GPIO initialization failure
      mockPigpio.initialize.mockImplementationOnce(() => {
        throw new Error('GPIO initialization failed');
      });

      const failingController = new RelayController(testConfig.relayPin);
      
      await expect(failingController.initialize()).rejects.toThrow('GPIO initialization failed');
    });

    it('should recover from temporary hardware failures', async () => {
      const mockGpio = mockPigpio.Gpio();
      
      // Mock temporary GPIO failure
      mockGpio.digitalWrite.mockImplementationOnce(() => {
        throw new Error('GPIO write failed');
      });

      // Should retry and eventually succeed
      mockGpio.digitalWrite.mockImplementationOnce(() => {
        // Success on retry
      });

      await expect(relayController.activate(60)).resolves.not.toThrow();
    });

    it('should handle MQTT broker disconnection during operation', async () => {
      await mqttClient.connect();
      
      // Start operation
      await relayController.activate(300);
      
      // Simulate MQTT disconnection
      mockMqttClient.connected = false;
      
      // Should continue hardware operation even without MQTT
      expect(relayController.getStatus().isActive).toBe(true);
      
      // Should attempt to reconnect and report status when connection restored
      mockMqttClient.connected = true;
      await mqttClient.reconnect();
      
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        `machines/${controllerId}/status`,
        expect.stringContaining('reconnected')
      );
    });

    it('should handle malformed MQTT messages gracefully', async () => {
      await mqttClient.connect();
      
      const messageHandler = mockMqttClient.on.mock.calls
        .find(call => call[0] === 'message')?.[1];

      if (messageHandler) {
        // Send malformed JSON
        messageHandler(
          `machines/${controllerId}/activate`,
          Buffer.from('invalid json')
        );
      }

      // Should not crash and should report error
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        `machines/${controllerId}/error`,
        expect.stringContaining('Invalid message format')
      );
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle rapid activation/deactivation cycles', async () => {
      const cycles = 5;
      const mockGpio = mockPigpio.Gpio();

      for (let i = 0; i < cycles; i++) {
        await relayController.activate(1); // 1 second
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for completion
        
        expect(mockGpio.digitalWrite).toHaveBeenCalledWith(1);
        expect(mockGpio.digitalWrite).toHaveBeenCalledWith(0);
      }

      // Should handle all cycles without errors
      expect(mockGpio.digitalWrite).toHaveBeenCalledTimes(cycles * 2);
    });

    it('should maintain accurate timing under load', async () => {
      const startTime = Date.now();
      const duration = 5; // 5 seconds
      
      await relayController.activate(duration);
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, (duration + 1) * 1000));
      
      const actualDuration = Date.now() - startTime;
      const expectedDuration = duration * 1000;
      
      // Should be within 100ms tolerance
      expect(Math.abs(actualDuration - expectedDuration)).toBeLessThan(100);
    });

    it('should handle concurrent temperature readings', async () => {
      const readings = 10;
      vi.spyOn(temperatureSensor, 'readRawValue').mockResolvedValue(25.0);

      const promises = Array.from({ length: readings }, () => 
        temperatureSensor.readTemperature()
      );

      const results = await Promise.all(promises);
      
      // All readings should succeed
      expect(results).toHaveLength(readings);
      results.forEach(temp => {
        expect(temp).toBe(25.0);
      });
    });
  });

  describe('System Integration with Backend', () => {
    it('should maintain session state consistency with backend', async () => {
      await mqttClient.connect();
      
      const sessionData = {
        sessionId: 'consistency-test-session',
        duration: 120,
        timestamp: new Date().toISOString()
      };

      // Receive activation
      const messageHandler = mockMqttClient.on.mock.calls
        .find(call => call[0] === 'message')?.[1];

      if (messageHandler) {
        messageHandler(
          `machines/${controllerId}/activate`,
          Buffer.from(JSON.stringify(sessionData))
        );
      }

      // Should report session start
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        `machines/${controllerId}/session_start`,
        expect.stringContaining(sessionData.sessionId)
      );

      // Should send periodic progress updates
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
      
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        `machines/${controllerId}/session_progress`,
        expect.stringContaining(sessionData.sessionId)
      );
    });

    it('should handle backend service restart gracefully', async () => {
      await mqttClient.connect();
      
      // Start operation
      await relayController.activate(300);
      
      // Simulate backend restart (MQTT broker disconnect/reconnect)
      mockMqttClient.connected = false;
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second outage
      
      mockMqttClient.connected = true;
      await mqttClient.reconnect();
      
      // Should resume reporting status
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        `machines/${controllerId}/status`,
        expect.stringContaining('online')
      );
      
      // Hardware operation should continue uninterrupted
      expect(relayController.getStatus().isActive).toBe(true);
    });
  });
});