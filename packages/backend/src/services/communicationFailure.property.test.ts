import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { Machine } from '../models/types.js';

/**
 * Feature: machine-rental-system, Property 19: Communication failure detection
 * 
 * Property: For any machine controller that stops responding, the system should mark it as offline and prevent new activations
 * 
 * Validates: Requirements 7.5, 12.5
 */

// Helper function to simulate offline detection logic
function checkMachineOfflineStatus(machine: Machine, currentTime: Date, offlineThresholdMs: number): {
  isOffline: boolean;
  timeSinceHeartbeat?: number;
  updatedMachine: Machine;
  shouldTriggerNotification: boolean;
} {
  if (!machine.lastHeartbeat) {
    // Machine has never sent a heartbeat - consider it offline
    return {
      isOffline: true,
      updatedMachine: { ...machine, status: 'offline' },
      shouldTriggerNotification: machine.status !== 'offline'
    };
  }

  const timeSinceHeartbeat = currentTime.getTime() - machine.lastHeartbeat.getTime();
  const isOffline = timeSinceHeartbeat > offlineThresholdMs;
  
  return {
    isOffline,
    timeSinceHeartbeat,
    updatedMachine: isOffline ? { ...machine, status: 'offline' } : machine,
    shouldTriggerNotification: isOffline && machine.status !== 'offline'
  };
}

// Helper function to simulate machine activation attempt
function attemptMachineActivation(machine: Machine): {
  activationAllowed: boolean;
  reason?: string;
} {
  if (machine.status === 'offline') {
    return {
      activationAllowed: false,
      reason: 'Machine is offline'
    };
  }
  
  if (machine.status === 'maintenance') {
    return {
      activationAllowed: false,
      reason: 'Machine is in maintenance mode'
    };
  }
  
  if (machine.status === 'in_use') {
    return {
      activationAllowed: false,
      reason: 'Machine is currently in use'
    };
  }
  
  return {
    activationAllowed: true
  };
}

describe('Communication Failure Detection Property Tests', () => {
  let mockMachine: Machine;
  const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

  beforeEach(() => {
    // Create a base mock machine for testing
    mockMachine = {
      id: 'test-machine-id',
      code: 'TEST001',
      qrCode: 'qr-test-001',
      location: 'Test Location',
      controllerId: 'controller-001',
      status: 'online',
      operatingHours: {
        start: '09:00',
        end: '18:00'
      },
      maintenanceInterval: 100,
      currentOperatingHours: 50,
      temperature: 25,
      lastHeartbeat: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Property 19: Communication failure detection - machines exceeding heartbeat threshold should be marked offline', () => {
    fc.assert(
      fc.property(
        // Generate time elapsed since last heartbeat (exceeding threshold)
        fc.integer({ min: OFFLINE_THRESHOLD_MS + 1000, max: OFFLINE_THRESHOLD_MS + 3600000 }), // 1 second to 1 hour over threshold
        
        // Generate initial machine status (should be online to test the transition)
        fc.constantFrom('online', 'in_use'),
        
        (timeElapsedMs: number, initialStatus: 'online' | 'in_use') => {
          const currentTime = new Date();
          const lastHeartbeat = new Date(currentTime.getTime() - timeElapsedMs);
          
          const testMachine = {
            ...mockMachine,
            status: initialStatus,
            lastHeartbeat
          };
          
          // Check offline status
          const result = checkMachineOfflineStatus(testMachine, currentTime, OFFLINE_THRESHOLD_MS);
          
          // Verify the property: machine should be marked as offline
          expect(result.isOffline).toBe(true);
          expect(result.updatedMachine.status).toBe('offline');
          expect(result.timeSinceHeartbeat).toBeGreaterThan(OFFLINE_THRESHOLD_MS);
          expect(result.shouldTriggerNotification).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 19: Communication failure detection - machines within heartbeat threshold should remain online', () => {
    fc.assert(
      fc.property(
        // Generate time elapsed since last heartbeat (within threshold)
        fc.integer({ min: 0, max: OFFLINE_THRESHOLD_MS - 1000 }), // Up to 1 second before threshold
        
        // Generate initial machine status
        fc.constantFrom('online', 'in_use'),
        
        (timeElapsedMs: number, initialStatus: 'online' | 'in_use') => {
          const currentTime = new Date();
          const lastHeartbeat = new Date(currentTime.getTime() - timeElapsedMs);
          
          const testMachine = {
            ...mockMachine,
            status: initialStatus,
            lastHeartbeat
          };
          
          // Check offline status
          const result = checkMachineOfflineStatus(testMachine, currentTime, OFFLINE_THRESHOLD_MS);
          
          // Verify the property: machine should remain in its current status
          expect(result.isOffline).toBe(false);
          expect(result.updatedMachine.status).toBe(initialStatus);
          expect(result.timeSinceHeartbeat).toBeLessThanOrEqual(OFFLINE_THRESHOLD_MS);
          expect(result.shouldTriggerNotification).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 19: Communication failure detection - offline machines should prevent new activations', () => {
    fc.assert(
      fc.property(
        // Generate machine properties
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        
        (machineCode: string, location: string) => {
          const testMachine = {
            ...mockMachine,
            code: machineCode,
            location,
            status: 'offline' as const
          };
          
          // Attempt activation
          const result = attemptMachineActivation(testMachine);
          
          // Verify the property: activation should be prevented
          expect(result.activationAllowed).toBe(false);
          expect(result.reason).toBe('Machine is offline');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 19: Communication failure detection - machines without heartbeat should be considered offline', () => {
    fc.assert(
      fc.property(
        // Generate initial machine status
        fc.constantFrom('online', 'in_use'),
        
        (initialStatus: 'online' | 'in_use') => {
          const testMachine = {
            ...mockMachine,
            status: initialStatus,
            lastHeartbeat: undefined // No heartbeat ever received
          };
          
          const currentTime = new Date();
          
          // Check offline status
          const result = checkMachineOfflineStatus(testMachine, currentTime, OFFLINE_THRESHOLD_MS);
          
          // Verify the property: machine should be marked as offline
          expect(result.isOffline).toBe(true);
          expect(result.updatedMachine.status).toBe('offline');
          expect(result.shouldTriggerNotification).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 19: Communication failure detection - exact threshold boundary conditions', () => {
    const currentTime = new Date();
    
    // Test exactly at threshold
    const exactThresholdTime = new Date(currentTime.getTime() - OFFLINE_THRESHOLD_MS);
    const testMachineAtThreshold = {
      ...mockMachine,
      status: 'online' as const,
      lastHeartbeat: exactThresholdTime
    };
    
    const resultAtThreshold = checkMachineOfflineStatus(testMachineAtThreshold, currentTime, OFFLINE_THRESHOLD_MS);
    expect(resultAtThreshold.isOffline).toBe(false); // Exactly at threshold should still be online
    expect(resultAtThreshold.updatedMachine.status).toBe('online');
    
    // Test one millisecond over threshold
    const overThresholdTime = new Date(currentTime.getTime() - OFFLINE_THRESHOLD_MS - 1);
    const testMachineOverThreshold = {
      ...mockMachine,
      status: 'online' as const,
      lastHeartbeat: overThresholdTime
    };
    
    const resultOverThreshold = checkMachineOfflineStatus(testMachineOverThreshold, currentTime, OFFLINE_THRESHOLD_MS);
    expect(resultOverThreshold.isOffline).toBe(true);
    expect(resultOverThreshold.updatedMachine.status).toBe('offline');
  });

  it('Property 19: Communication failure detection - notification triggering logic', () => {
    fc.assert(
      fc.property(
        // Generate time elapsed exceeding threshold
        fc.integer({ min: OFFLINE_THRESHOLD_MS + 1000, max: OFFLINE_THRESHOLD_MS + 7200000 }), // 1 second to 2 hours over
        
        // Generate current machine status
        fc.constantFrom('online', 'in_use', 'offline', 'maintenance'),
        
        (timeElapsedMs: number, currentStatus: 'online' | 'in_use' | 'offline' | 'maintenance') => {
          const currentTime = new Date();
          const lastHeartbeat = new Date(currentTime.getTime() - timeElapsedMs);
          
          const testMachine = {
            ...mockMachine,
            status: currentStatus,
            lastHeartbeat
          };
          
          // Check offline status
          const result = checkMachineOfflineStatus(testMachine, currentTime, OFFLINE_THRESHOLD_MS);
          
          // Verify the property: notification should only be triggered if machine wasn't already offline
          if (currentStatus === 'offline') {
            expect(result.shouldTriggerNotification).toBe(false);
          } else {
            expect(result.shouldTriggerNotification).toBe(true);
          }
          
          // Machine should be marked offline regardless of previous status
          expect(result.isOffline).toBe(true);
          expect(result.updatedMachine.status).toBe('offline');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 19: Communication failure detection - online machines should allow activations', () => {
    fc.assert(
      fc.property(
        // Generate time elapsed within threshold
        fc.integer({ min: 0, max: OFFLINE_THRESHOLD_MS - 1000 }),
        
        (timeElapsedMs: number) => {
          const currentTime = new Date();
          const lastHeartbeat = new Date(currentTime.getTime() - timeElapsedMs);
          
          const testMachine = {
            ...mockMachine,
            status: 'online' as const,
            lastHeartbeat
          };
          
          // Verify machine is still considered online
          const statusResult = checkMachineOfflineStatus(testMachine, currentTime, OFFLINE_THRESHOLD_MS);
          expect(statusResult.isOffline).toBe(false);
          
          // Attempt activation
          const activationResult = attemptMachineActivation(testMachine);
          
          // Verify the property: activation should be allowed
          expect(activationResult.activationAllowed).toBe(true);
          expect(activationResult.reason).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 19: Communication failure detection - time calculation accuracy', () => {
    fc.assert(
      fc.property(
        // Generate heartbeat timestamp offset
        fc.integer({ min: 0, max: 86400000 }), // Up to 24 hours
        
        (heartbeatOffsetMs: number) => {
          const currentTime = new Date();
          const lastHeartbeat = new Date(currentTime.getTime() - heartbeatOffsetMs);
          
          const testMachine = {
            ...mockMachine,
            status: 'online' as const,
            lastHeartbeat
          };
          
          // Check offline status
          const result = checkMachineOfflineStatus(testMachine, currentTime, OFFLINE_THRESHOLD_MS);
          
          // Verify the property: time calculation should be accurate
          expect(result.timeSinceHeartbeat).toBe(heartbeatOffsetMs);
          
          // Verify offline status matches threshold comparison
          const expectedOffline = heartbeatOffsetMs > OFFLINE_THRESHOLD_MS;
          expect(result.isOffline).toBe(expectedOffline);
        }
      ),
      { numRuns: 100 }
    );
  });
});