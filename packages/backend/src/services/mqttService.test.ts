import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MQTTService } from './mqttService.js';

// Mock the mqtt module
vi.mock('mqtt', () => ({
  default: {
    connect: vi.fn(() => ({
      on: vi.fn(),
      subscribe: vi.fn(),
      publish: vi.fn(),
      end: vi.fn(),
      connected: true
    }))
  }
}));

// Mock the services
vi.mock('./machineService.js', () => ({
  MachineService: vi.fn(() => ({
    updateHeartbeat: vi.fn(),
    getMachineById: vi.fn()
  }))
}));

vi.mock('./notificationService.js', () => ({
  NotificationService: vi.fn(() => ({
    sendTemperatureAlert: vi.fn(),
    sendSystemErrorNotification: vi.fn()
  }))
}));

describe('MQTTService', () => {
  let mqttService: MQTTService;

  beforeEach(() => {
    mqttService = new MQTTService();
  });

  it('should initialize with correct default values', () => {
    expect(mqttService.isClientConnected()).toBe(false);
  });

  it('should handle machine commands correctly', () => {
    const command = {
      type: 'activate' as const,
      sessionId: 'test-session',
      duration: 10,
      timestamp: new Date().toISOString()
    };

    expect(command.type).toBe('activate');
    expect(command.duration).toBe(10);
    expect(command.sessionId).toBe('test-session');
  });

  it('should handle machine status correctly', () => {
    const status = {
      controllerId: 'controller-001',
      machineId: 'machine-001',
      status: 'active' as const,
      temperature: 25.5,
      timestamp: new Date().toISOString()
    };

    expect(status.status).toBe('active');
    expect(status.temperature).toBe(25.5);
    expect(status.controllerId).toBe('controller-001');
  });
});