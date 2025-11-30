import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import { WebSocketService } from './websocketService.js';
import { Machine, UsageSession, Notification } from '../models/types.js';

describe('WebSocketService', () => {
  let webSocketService: WebSocketService;
  let httpServer: ReturnType<typeof createServer>;

  beforeEach(() => {
    webSocketService = new WebSocketService();
    httpServer = createServer();
  });

  afterEach(() => {
    webSocketService.shutdown();
    httpServer.close();
  });

  it('should initialize correctly', () => {
    expect(webSocketService.isInitialized()).toBe(false);
    
    webSocketService.initialize(httpServer);
    
    expect(webSocketService.isInitialized()).toBe(true);
  });

  it('should track connected clients count', () => {
    webSocketService.initialize(httpServer);
    
    expect(webSocketService.getConnectedClientsCount()).toBe(0);
  });

  it('should shutdown correctly', () => {
    webSocketService.initialize(httpServer);
    expect(webSocketService.isInitialized()).toBe(true);
    
    webSocketService.shutdown();
    expect(webSocketService.isInitialized()).toBe(false);
  });

  it('should handle machine updates without errors', () => {
    webSocketService.initialize(httpServer);
    
    const mockMachine: Machine = {
      id: 'test-machine-1',
      code: 'M001',
      qrCode: 'qr-code-data',
      location: 'Test Location',
      controllerId: 'controller-1',
      status: 'online',
      operatingHours: { start: '08:00', end: '18:00' },
      maintenanceInterval: 100,
      currentOperatingHours: 50,
      temperature: 25,
      lastHeartbeat: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Should not throw error even with no connected clients
    expect(() => {
      webSocketService.broadcastMachineUpdate(mockMachine);
    }).not.toThrow();
  });

  it('should handle session updates without errors', () => {
    webSocketService.initialize(httpServer);
    
    const mockSession: UsageSession = {
      id: 'test-session-1',
      userId: 'user-1',
      machineId: 'machine-1',
      duration: 15,
      cost: 15,
      paymentMethod: 'balance',
      status: 'active',
      startTime: new Date(),
      createdAt: new Date()
    };

    // Should not throw error even with no connected clients
    expect(() => {
      webSocketService.broadcastSessionUpdate(mockSession);
    }).not.toThrow();
  });

  it('should handle notification broadcasts without errors', () => {
    webSocketService.initialize(httpServer);
    
    const mockNotification: Notification = {
      id: 'notification-1',
      type: 'maintenance_required',
      machineId: 'machine-1',
      message: 'Test maintenance notification',
      whatsappStatus: 'pending',
      createdAt: new Date()
    };

    // Should not throw error even with no connected clients
    expect(() => {
      webSocketService.broadcastNotification(mockNotification);
    }).not.toThrow();
  });

  it('should handle system alerts without errors', () => {
    webSocketService.initialize(httpServer);
    
    const mockAlert = {
      type: 'error' as const,
      message: 'Test system error',
      details: { source: 'test' }
    };

    // Should not throw error even with no connected clients
    expect(() => {
      webSocketService.broadcastSystemAlert(mockAlert);
    }).not.toThrow();
  });
});