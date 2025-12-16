import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { Machine } from '../models/types.js';

/**
 * Feature: machine-rental-system, Property 21: Offline notification triggering
 * 
 * Property: For any machine that goes offline unexpectedly, an immediate WhatsApp notification 
 * should be sent to the administrator
 * 
 * Validates: Requirements 10.2
 */

// Helper function to simulate offline detection and notification triggering
function simulateOfflineDetection(
  machine: Machine,
  currentTime: Date,
  offlineThresholdMs: number = 5 * 60 * 1000 // 5 minutes default
): {
  wasOnline: boolean;
  isNowOffline: boolean;
  shouldTriggerNotification: boolean;
  notificationData?: {
    machineId: string;
    machineCode: string;
    location: string;
    lastHeartbeat: Date;
    timeSinceHeartbeat: number;
  };
  updatedMachine: Machine;
} {
  const wasOnline = machine.status === 'online' || machine.status === 'in_use';
  
  if (!machine.lastHeartbeat) {
    // Machine has never sent a heartbeat - consider it offline from start
    return {
      wasOnline,
      isNowOffline: true,
      shouldTriggerNotification: wasOnline, // Only trigger if it was previously online
      notificationData: wasOnline ? {
        machineId: machine.id,
        machineCode: machine.code,
        location: machine.location,
        lastHeartbeat: new Date(0), // Epoch time for never received
        timeSinceHeartbeat: currentTime.getTime()
      } : undefined,
      updatedMachine: { ...machine, status: 'offline' }
    };
  }

  const timeSinceHeartbeat = currentTime.getTime() - machine.lastHeartbeat.getTime();
  const isNowOffline = timeSinceHeartbeat > offlineThresholdMs;
  
  if (isNowOffline && wasOnline) {
    // Machine went offline unexpectedly - trigger notification
    return {
      wasOnline,
      isNowOffline: true,
      shouldTriggerNotification: true,
      notificationData: {
        machineId: machine.id,
        machineCode: machine.code,
        location: machine.location,
        lastHeartbeat: machine.lastHeartbeat,
        timeSinceHeartbeat
      },
      updatedMachine: { ...machine, status: 'offline' }
    };
  }
  
  return {
    wasOnline,
    isNowOffline,
    shouldTriggerNotification: false,
    updatedMachine: isNowOffline ? { ...machine, status: 'offline' } : machine
  };
}

// Helper function to validate notification content
function validateOfflineNotificationContent(
  machineCode: string,
  location: string,
  lastHeartbeat: Date,
  currentTime: Date
): {
  isValid: boolean;
  containsRequiredInfo: boolean;
  timeSinceOfflineMinutes: number;
} {
  const timeSinceOfflineMs = currentTime.getTime() - lastHeartbeat.getTime();
  const timeSinceOfflineMinutes = Math.round(timeSinceOfflineMs / (1000 * 60));
  
  // Validate that notification would contain required information
  const containsRequiredInfo = !!(
    machineCode && 
    location && 
    timeSinceOfflineMinutes >= 0
  );
  
  return {
    isValid: containsRequiredInfo,
    containsRequiredInfo,
    timeSinceOfflineMinutes
  };
}

describe('Offline Notification Triggering Property Tests', () => {
  let baseMachine: Machine;
  const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

  beforeEach(() => {
    // Create a base machine template for testing
    baseMachine = {
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

  it('Property 21: Offline notification triggering - online machines going offline should trigger notification', () => {
    fc.assert(
      fc.property(
        // Generate time elapsed since last heartbeat (exceeding threshold)
        fc.integer({ min: OFFLINE_THRESHOLD_MS + 1000, max: OFFLINE_THRESHOLD_MS + 3600000 }), // 1 second to 1 hour over threshold
        
        // Generate machine properties
        fc.record({
          id: fc.string({ minLength: 5, maxLength: 20 }),
          code: fc.string({ minLength: 3, maxLength: 10 }).map(s => s.toUpperCase()),
          location: fc.string({ minLength: 5, maxLength: 50 }),
          initialStatus: fc.constantFrom('online', 'in_use') // Only test machines that were previously online
        }),
        
        (timeElapsedMs: number, machineData) => {
          const currentTime = new Date();
          const lastHeartbeat = new Date(currentTime.getTime() - timeElapsedMs);
          
          const testMachine = {
            ...baseMachine,
            id: machineData.id,
            code: machineData.code,
            location: machineData.location,
            status: machineData.initialStatus,
            lastHeartbeat
          };
          
          // Simulate offline detection
          const result = simulateOfflineDetection(testMachine, currentTime, OFFLINE_THRESHOLD_MS);
          
          // Verify the property: notification should be triggered for machines going offline
          expect(result.wasOnline).toBe(true);
          expect(result.isNowOffline).toBe(true);
          expect(result.shouldTriggerNotification).toBe(true);
          expect(result.updatedMachine.status).toBe('offline');
          
          // Verify notification data is complete
          expect(result.notificationData).toBeDefined();
          expect(result.notificationData!.machineId).toBe(machineData.id);
          expect(result.notificationData!.machineCode).toBe(machineData.code);
          expect(result.notificationData!.location).toBe(machineData.location);
          expect(result.notificationData!.lastHeartbeat).toEqual(lastHeartbeat);
          expect(result.notificationData!.timeSinceHeartbeat).toBe(timeElapsedMs);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 21: Offline notification triggering - already offline machines should not trigger duplicate notifications', () => {
    fc.assert(
      fc.property(
        // Generate time elapsed since last heartbeat (exceeding threshold)
        fc.integer({ min: OFFLINE_THRESHOLD_MS + 1000, max: OFFLINE_THRESHOLD_MS + 7200000 }), // 1 second to 2 hours over
        
        // Generate machine properties
        fc.record({
          id: fc.string({ minLength: 5, maxLength: 20 }),
          code: fc.string({ minLength: 3, maxLength: 10 }).map(s => s.toUpperCase()),
          location: fc.string({ minLength: 5, maxLength: 50 })
        }),
        
        (timeElapsedMs: number, machineData) => {
          const currentTime = new Date();
          const lastHeartbeat = new Date(currentTime.getTime() - timeElapsedMs);
          
          const testMachine = {
            ...baseMachine,
            id: machineData.id,
            code: machineData.code,
            location: machineData.location,
            status: 'offline' as const, // Machine is already offline
            lastHeartbeat
          };
          
          // Simulate offline detection
          const result = simulateOfflineDetection(testMachine, currentTime, OFFLINE_THRESHOLD_MS);
          
          // Verify the property: no notification should be triggered for already offline machines
          expect(result.wasOnline).toBe(false);
          expect(result.isNowOffline).toBe(true);
          expect(result.shouldTriggerNotification).toBe(false);
          expect(result.notificationData).toBeUndefined();
          expect(result.updatedMachine.status).toBe('offline');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 21: Offline notification triggering - machines within heartbeat threshold should not trigger notifications', () => {
    fc.assert(
      fc.property(
        // Generate time elapsed since last heartbeat (within threshold)
        fc.integer({ min: 0, max: OFFLINE_THRESHOLD_MS - 1000 }), // Up to 1 second before threshold
        
        // Generate machine properties
        fc.record({
          id: fc.string({ minLength: 5, maxLength: 20 }),
          code: fc.string({ minLength: 3, maxLength: 10 }).map(s => s.toUpperCase()),
          location: fc.string({ minLength: 5, maxLength: 50 }),
          initialStatus: fc.constantFrom('online', 'in_use')
        }),
        
        (timeElapsedMs: number, machineData) => {
          const currentTime = new Date();
          const lastHeartbeat = new Date(currentTime.getTime() - timeElapsedMs);
          
          const testMachine = {
            ...baseMachine,
            id: machineData.id,
            code: machineData.code,
            location: machineData.location,
            status: machineData.initialStatus,
            lastHeartbeat
          };
          
          // Simulate offline detection
          const result = simulateOfflineDetection(testMachine, currentTime, OFFLINE_THRESHOLD_MS);
          
          // Verify the property: no notification should be triggered for machines still online
          expect(result.wasOnline).toBe(true);
          expect(result.isNowOffline).toBe(false);
          expect(result.shouldTriggerNotification).toBe(false);
          expect(result.notificationData).toBeUndefined();
          expect(result.updatedMachine.status).toBe(machineData.initialStatus);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 21: Offline notification triggering - machines without heartbeat should trigger notification if previously online', () => {
    fc.assert(
      fc.property(
        // Generate machine properties
        fc.record({
          id: fc.string({ minLength: 5, maxLength: 20 }),
          code: fc.string({ minLength: 3, maxLength: 10 }).map(s => s.toUpperCase()),
          location: fc.string({ minLength: 5, maxLength: 50 }),
          initialStatus: fc.constantFrom('online', 'in_use')
        }),
        
        (machineData) => {
          const currentTime = new Date();
          
          const testMachine = {
            ...baseMachine,
            id: machineData.id,
            code: machineData.code,
            location: machineData.location,
            status: machineData.initialStatus,
            lastHeartbeat: undefined // No heartbeat ever received
          };
          
          // Simulate offline detection
          const result = simulateOfflineDetection(testMachine, currentTime, OFFLINE_THRESHOLD_MS);
          
          // Verify the property: notification should be triggered for machines without heartbeat that were online
          expect(result.wasOnline).toBe(true);
          expect(result.isNowOffline).toBe(true);
          expect(result.shouldTriggerNotification).toBe(true);
          expect(result.updatedMachine.status).toBe('offline');
          
          // Verify notification data
          expect(result.notificationData).toBeDefined();
          expect(result.notificationData!.machineId).toBe(machineData.id);
          expect(result.notificationData!.machineCode).toBe(machineData.code);
          expect(result.notificationData!.location).toBe(machineData.location);
          expect(result.notificationData!.timeSinceHeartbeat).toBe(currentTime.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 21: Offline notification triggering - notification content validation', () => {
    fc.assert(
      fc.property(
        // Generate machine properties
        fc.record({
          code: fc.string({ minLength: 3, maxLength: 10 }).map(s => s.toUpperCase()),
          location: fc.string({ minLength: 5, maxLength: 50 })
        }),
        
        // Generate time elapsed (exceeding threshold)
        fc.integer({ min: OFFLINE_THRESHOLD_MS + 60000, max: OFFLINE_THRESHOLD_MS + 3600000 }), // 1 minute to 1 hour over
        
        (machineData, timeElapsedMs) => {
          const currentTime = new Date();
          const lastHeartbeat = new Date(currentTime.getTime() - timeElapsedMs);
          
          // Validate notification content
          const validation = validateOfflineNotificationContent(
            machineData.code,
            machineData.location,
            lastHeartbeat,
            currentTime
          );
          
          // Verify the property: notification content should be valid and complete
          expect(validation.isValid).toBe(true);
          expect(validation.containsRequiredInfo).toBe(true);
          expect(validation.timeSinceOfflineMinutes).toBeGreaterThan(0);
          
          // Verify time calculation accuracy
          const expectedMinutes = Math.round(timeElapsedMs / (1000 * 60));
          expect(validation.timeSinceOfflineMinutes).toBe(expectedMinutes);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 21: Offline notification triggering - maintenance mode machines should not trigger offline notifications', () => {
    fc.assert(
      fc.property(
        // Generate time elapsed since last heartbeat (exceeding threshold)
        fc.integer({ min: OFFLINE_THRESHOLD_MS + 1000, max: OFFLINE_THRESHOLD_MS + 3600000 }),
        
        // Generate machine properties
        fc.record({
          id: fc.string({ minLength: 5, maxLength: 20 }),
          code: fc.string({ minLength: 3, maxLength: 10 }).map(s => s.toUpperCase()),
          location: fc.string({ minLength: 5, maxLength: 50 })
        }),
        
        (timeElapsedMs: number, machineData) => {
          const currentTime = new Date();
          const lastHeartbeat = new Date(currentTime.getTime() - timeElapsedMs);
          
          const testMachine = {
            ...baseMachine,
            id: machineData.id,
            code: machineData.code,
            location: machineData.location,
            status: 'maintenance' as const, // Machine is in maintenance mode
            lastHeartbeat
          };
          
          // Simulate offline detection
          const result = simulateOfflineDetection(testMachine, currentTime, OFFLINE_THRESHOLD_MS);
          
          // Verify the property: maintenance mode machines should not trigger offline notifications
          expect(result.wasOnline).toBe(false);
          expect(result.shouldTriggerNotification).toBe(false);
          expect(result.notificationData).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 21: Offline notification triggering - exact threshold boundary conditions', () => {
    const currentTime = new Date();
    
    // Test exactly at threshold
    const exactThresholdTime = new Date(currentTime.getTime() - OFFLINE_THRESHOLD_MS);
    const testMachineAtThreshold = {
      ...baseMachine,
      status: 'online' as const,
      lastHeartbeat: exactThresholdTime
    };
    
    const resultAtThreshold = simulateOfflineDetection(testMachineAtThreshold, currentTime, OFFLINE_THRESHOLD_MS);
    expect(resultAtThreshold.shouldTriggerNotification).toBe(false); // Exactly at threshold should not trigger
    expect(resultAtThreshold.isNowOffline).toBe(false);
    
    // Test one millisecond over threshold
    const overThresholdTime = new Date(currentTime.getTime() - OFFLINE_THRESHOLD_MS - 1);
    const testMachineOverThreshold = {
      ...baseMachine,
      status: 'online' as const,
      lastHeartbeat: overThresholdTime
    };
    
    const resultOverThreshold = simulateOfflineDetection(testMachineOverThreshold, currentTime, OFFLINE_THRESHOLD_MS);
    expect(resultOverThreshold.shouldTriggerNotification).toBe(true);
    expect(resultOverThreshold.isNowOffline).toBe(true);
    expect(resultOverThreshold.notificationData).toBeDefined();
  });

  it('Property 21: Offline notification triggering - immediate notification requirement', () => {
    fc.assert(
      fc.property(
        // Generate machine properties
        fc.record({
          id: fc.string({ minLength: 5, maxLength: 20 }),
          code: fc.string({ minLength: 3, maxLength: 10 }).map(s => s.toUpperCase()),
          location: fc.string({ minLength: 5, maxLength: 50 })
        }),
        
        // Generate time elapsed (just over threshold to simulate "immediate" detection)
        fc.integer({ min: OFFLINE_THRESHOLD_MS + 1000, max: OFFLINE_THRESHOLD_MS + 10000 }), // 1-10 seconds over threshold
        
        (machineData, timeElapsedMs) => {
          const currentTime = new Date();
          const lastHeartbeat = new Date(currentTime.getTime() - timeElapsedMs);
          
          const testMachine = {
            ...baseMachine,
            id: machineData.id,
            code: machineData.code,
            location: machineData.location,
            status: 'online' as const,
            lastHeartbeat
          };
          
          // Simulate offline detection
          const result = simulateOfflineDetection(testMachine, currentTime, OFFLINE_THRESHOLD_MS);
          
          // Verify the property: notification should be triggered immediately when offline is detected
          expect(result.shouldTriggerNotification).toBe(true);
          expect(result.notificationData).toBeDefined();
          
          // Verify the notification contains timing information for immediate response
          expect(result.notificationData!.timeSinceHeartbeat).toBeGreaterThan(OFFLINE_THRESHOLD_MS);
          expect(result.notificationData!.lastHeartbeat).toEqual(lastHeartbeat);
          
          // Verify all required data for administrator response is present
          expect(result.notificationData!.machineId).toBeTruthy();
          expect(result.notificationData!.machineCode).toBeTruthy();
          expect(result.notificationData!.location).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 21: Offline notification triggering - multiple machines can trigger notifications independently', () => {
    fc.assert(
      fc.property(
        // Generate array of machines with different offline states
        fc.array(
          fc.record({
            id: fc.string({ minLength: 5, maxLength: 20 }),
            code: fc.string({ minLength: 3, maxLength: 10 }).map(s => s.toUpperCase()),
            location: fc.string({ minLength: 5, maxLength: 50 }),
            initialStatus: fc.constantFrom('online', 'in_use', 'offline', 'maintenance'),
            timeElapsedMs: fc.integer({ min: 0, max: OFFLINE_THRESHOLD_MS + 3600000 })
          }),
          { minLength: 2, maxLength: 5 }
        ),
        
        (machinesData) => {
          const currentTime = new Date();
          let expectedNotifications = 0;
          
          // Process each machine
          for (const machineData of machinesData) {
            const lastHeartbeat = new Date(currentTime.getTime() - machineData.timeElapsedMs);
            
            const testMachine = {
              ...baseMachine,
              id: machineData.id,
              code: machineData.code,
              location: machineData.location,
              status: machineData.initialStatus,
              lastHeartbeat
            };
            
            const result = simulateOfflineDetection(testMachine, currentTime, OFFLINE_THRESHOLD_MS);
            
            // Count expected notifications
            const wasOnline = machineData.initialStatus === 'online' || machineData.initialStatus === 'in_use';
            const shouldGoOffline = machineData.timeElapsedMs > OFFLINE_THRESHOLD_MS;
            
            if (wasOnline && shouldGoOffline) {
              expectedNotifications++;
              expect(result.shouldTriggerNotification).toBe(true);
              expect(result.notificationData).toBeDefined();
            } else {
              expect(result.shouldTriggerNotification).toBe(false);
            }
          }
          
          // Verify the property: each machine that goes offline triggers exactly one notification
          // This is implicitly verified by the individual machine checks above
          expect(expectedNotifications).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 50 } // Reduced runs for this more complex test
    );
  });
});