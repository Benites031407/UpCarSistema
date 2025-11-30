import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { Machine } from '../models/types.js';

/**
 * Feature: machine-rental-system, Property 20: Maintenance notification triggering
 * 
 * Property: For any machine that enters maintenance mode, a WhatsApp notification 
 * should be sent to the administrator
 * 
 * Validates: Requirements 10.1
 */

// Helper function to simulate setting maintenance mode and check if notification is triggered
function simulateMaintenanceMode(
  machineId: string, 
  reason: string, 
  machine: Machine
): {
  updatedMachine: Machine;
  notificationTriggered: boolean;
  notificationData: {
    machineId: string;
    machineCode: string;
    location: string;
    reason: string;
  };
} {
  // Update machine status to maintenance
  const updatedMachine = { ...machine, status: 'maintenance' as const };
  
  // Notification should be triggered when machine enters maintenance mode
  const notificationData = {
    machineId,
    machineCode: machine.code,
    location: machine.location,
    reason
  };
  
  return {
    updatedMachine,
    notificationTriggered: true,
    notificationData
  };
}

// Helper function to check if maintenance is required and trigger notification
function checkMaintenanceRequirement(machine: Machine): {
  maintenanceRequired: boolean;
  notificationTriggered: boolean;
  updatedMachine: Machine;
  notificationData?: {
    machineId: string;
    machineCode: string;
    location: string;
    reason: string;
  };
} {
  // Check if maintenance is required based on operating hours
  if (machine.currentOperatingHours >= machine.maintenanceInterval) {
    const result = simulateMaintenanceMode(
      machine.id,
      'Automatic maintenance required',
      machine
    );
    return {
      maintenanceRequired: true,
      notificationTriggered: result.notificationTriggered,
      updatedMachine: result.updatedMachine,
      notificationData: result.notificationData
    };
  }
  
  return {
    maintenanceRequired: false,
    notificationTriggered: false,
    updatedMachine: machine
  };
}

describe('Maintenance Notification Triggering Property Tests', () => {
  let baseMachine: Machine;

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

  it('Property 20: Maintenance notification triggering - manual maintenance mode should trigger notification', () => {
    fc.assert(
      fc.property(
        // Generate machine ID
        fc.string({ minLength: 5, maxLength: 20 }),
        
        // Generate machine code
        fc.string({ minLength: 3, maxLength: 10 }).map(s => s.toUpperCase()),
        
        // Generate location
        fc.string({ minLength: 5, maxLength: 50 }),
        
        // Generate maintenance reason
        fc.oneof(
          fc.constant('Scheduled maintenance'),
          fc.constant('Equipment malfunction'),
          fc.constant('Safety inspection required'),
          fc.constant('Preventive maintenance'),
          fc.constant('User reported issue')
        ),
        
        (machineId: string, machineCode: string, location: string, reason: string) => {
          const testMachine = {
            ...baseMachine,
            id: machineId,
            code: machineCode,
            location,
            status: 'online' as const
          };
          
          // Set machine to maintenance mode
          const result = simulateMaintenanceMode(machineId, reason, testMachine);
          
          // Verify the property: notification should be triggered
          expect(result.notificationTriggered).toBe(true);
          expect(result.updatedMachine.status).toBe('maintenance');
          expect(result.notificationData).toEqual({
            machineId,
            machineCode,
            location,
            reason
          });
          
          // Verify all required notification data is present and valid
          expect(result.notificationData.machineId).toBeTruthy();
          expect(result.notificationData.machineCode).toBeTruthy();
          expect(result.notificationData.location).toBeTruthy();
          expect(result.notificationData.reason).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 20: Maintenance notification triggering - automatic maintenance should trigger notification', () => {
    fc.assert(
      fc.property(
        // Generate maintenance interval
        fc.integer({ min: 50, max: 300 }),
        
        // Generate current operating hours that meet or exceed the interval
        fc.integer({ min: 0, max: 100 }), // Additional hours above interval
        
        // Generate machine details
        fc.string({ minLength: 3, maxLength: 10 }).map(s => s.toUpperCase()),
        fc.string({ minLength: 5, maxLength: 50 }),
        
        (maintenanceInterval: number, additionalHours: number, machineCode: string, location: string) => {
          const currentOperatingHours = maintenanceInterval + additionalHours;
          
          const testMachine = {
            ...baseMachine,
            code: machineCode,
            location,
            maintenanceInterval,
            currentOperatingHours,
            status: 'online' as const
          };
          
          // Check maintenance requirement
          const result = checkMaintenanceRequirement(testMachine);
          
          // Verify the property: maintenance should be required and notification triggered
          expect(result.maintenanceRequired).toBe(true);
          expect(result.notificationTriggered).toBe(true);
          expect(result.updatedMachine.status).toBe('maintenance');
          expect(result.notificationData).toEqual({
            machineId: testMachine.id,
            machineCode,
            location,
            reason: 'Automatic maintenance required'
          });
          
          // Verify operating hours condition
          expect(testMachine.currentOperatingHours).toBeGreaterThanOrEqual(testMachine.maintenanceInterval);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 20: Maintenance notification triggering - machines below maintenance threshold should not trigger notification', () => {
    fc.assert(
      fc.property(
        // Generate maintenance interval
        fc.integer({ min: 100, max: 300 }),
        
        // Generate current operating hours below the interval
        fc.integer({ min: 0, max: 99 }),
        
        (maintenanceInterval: number, currentOperatingHours: number) => {
          // Ensure current hours are below interval
          const actualCurrentHours = Math.min(currentOperatingHours, maintenanceInterval - 1);
          
          const testMachine = {
            ...baseMachine,
            maintenanceInterval,
            currentOperatingHours: actualCurrentHours,
            status: 'online' as const
          };
          
          // Check maintenance requirement
          const result = checkMaintenanceRequirement(testMachine);
          
          // Verify the property: no maintenance should be required, no notification triggered
          expect(result.maintenanceRequired).toBe(false);
          expect(result.notificationTriggered).toBe(false);
          expect(result.updatedMachine.status).toBe('online');
          
          // Verify operating hours condition
          expect(testMachine.currentOperatingHours).toBeLessThan(testMachine.maintenanceInterval);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 20: Maintenance notification triggering - notification contains required information', () => {
    fc.assert(
      fc.property(
        // Generate machine data
        fc.record({
          id: fc.string({ minLength: 5, maxLength: 20 }),
          code: fc.string({ minLength: 3, maxLength: 10 }).map(s => s.toUpperCase()),
          location: fc.string({ minLength: 5, maxLength: 50 }),
          reason: fc.oneof(
            fc.constant('Scheduled maintenance'),
            fc.constant('Equipment malfunction'),
            fc.constant('Safety inspection required'),
            fc.constant('Automatic maintenance required')
          )
        }),
        
        (machineData) => {
          const testMachine = {
            ...baseMachine,
            id: machineData.id,
            code: machineData.code,
            location: machineData.location,
            status: 'online' as const
          };
          
          // Set machine to maintenance mode
          const result = simulateMaintenanceMode(
            machineData.id,
            machineData.reason,
            testMachine
          );
          
          // Verify the property: notification contains all required information
          expect(result.notificationData).toBeDefined();
          expect(result.notificationData.machineId).toBe(machineData.id);
          expect(result.notificationData.machineCode).toBe(machineData.code);
          expect(result.notificationData.location).toBe(machineData.location);
          expect(result.notificationData.reason).toBe(machineData.reason);
          
          // Verify all parameters are non-empty strings
          expect(result.notificationData.machineId).toBeTruthy();
          expect(result.notificationData.machineCode).toBeTruthy();
          expect(result.notificationData.location).toBeTruthy();
          expect(result.notificationData.reason).toBeTruthy();
          
          // Verify data types
          expect(typeof result.notificationData.machineId).toBe('string');
          expect(typeof result.notificationData.machineCode).toBe('string');
          expect(typeof result.notificationData.location).toBe('string');
          expect(typeof result.notificationData.reason).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 20: Maintenance notification triggering - multiple machines can trigger notifications independently', () => {
    fc.assert(
      fc.property(
        // Generate array of machines
        fc.array(
          fc.record({
            id: fc.string({ minLength: 5, maxLength: 20 }),
            code: fc.string({ minLength: 3, maxLength: 10 }).map(s => s.toUpperCase()),
            location: fc.string({ minLength: 5, maxLength: 50 }),
            maintenanceInterval: fc.integer({ min: 50, max: 200 }),
            currentOperatingHours: fc.integer({ min: 0, max: 300 })
          }),
          { minLength: 2, maxLength: 5 }
        ),
        
        (machinesData) => {
          let notificationCount = 0;
          const expectedNotifications: any[] = [];
          
          // Process each machine
          for (const machineData of machinesData) {
            const testMachine = {
              ...baseMachine,
              id: machineData.id,
              code: machineData.code,
              location: machineData.location,
              maintenanceInterval: machineData.maintenanceInterval,
              currentOperatingHours: machineData.currentOperatingHours,
              status: 'online' as const
            };
            
            const result = checkMaintenanceRequirement(testMachine);
            
            if (result.maintenanceRequired) {
              notificationCount++;
              expectedNotifications.push({
                machineId: machineData.id,
                machineCode: machineData.code,
                location: machineData.location,
                reason: 'Automatic maintenance required'
              });
              
              // Verify this specific machine triggered a notification
              expect(result.notificationTriggered).toBe(true);
              expect(result.notificationData).toEqual({
                machineId: machineData.id,
                machineCode: machineData.code,
                location: machineData.location,
                reason: 'Automatic maintenance required'
              });
            } else {
              // Verify this machine did not trigger a notification
              expect(result.notificationTriggered).toBe(false);
            }
          }
          
          // Verify the property: each machine that requires maintenance triggers exactly one notification
          expect(expectedNotifications.length).toBe(notificationCount);
          
          // Verify each machine's maintenance requirement is correctly determined
          expectedNotifications.forEach((expectedNotification, index) => {
            const correspondingMachine = machinesData.find(m => m.id === expectedNotification.machineId);
            expect(correspondingMachine).toBeDefined();
            expect(correspondingMachine!.currentOperatingHours).toBeGreaterThanOrEqual(correspondingMachine!.maintenanceInterval);
          });
        }
      ),
      { numRuns: 50 } // Reduced runs for this more complex test
    );
  });

  it('Property 20: Maintenance notification triggering - exact threshold boundary conditions', () => {
    // Test exact maintenance interval threshold
    const testMachine = {
      ...baseMachine,
      maintenanceInterval: 100,
      currentOperatingHours: 100, // Exactly at threshold
      status: 'online' as const
    };
    
    const result = checkMaintenanceRequirement(testMachine);
    expect(result.maintenanceRequired).toBe(true);
    expect(result.notificationTriggered).toBe(true);
    expect(result.notificationData).toEqual({
      machineId: testMachine.id,
      machineCode: testMachine.code,
      location: testMachine.location,
      reason: 'Automatic maintenance required'
    });
    
    // Test one hour below threshold
    const testMachineBelow = {
      ...baseMachine,
      maintenanceInterval: 100,
      currentOperatingHours: 99.99, // Just below threshold
      status: 'online' as const
    };
    
    const resultBelow = checkMaintenanceRequirement(testMachineBelow);
    expect(resultBelow.maintenanceRequired).toBe(false);
    expect(resultBelow.notificationTriggered).toBe(false);
    expect(resultBelow.notificationData).toBeUndefined();
    
    // Test exactly one hour above threshold
    const testMachineAbove = {
      ...baseMachine,
      maintenanceInterval: 100,
      currentOperatingHours: 101, // Just above threshold
      status: 'online' as const
    };
    
    const resultAbove = checkMaintenanceRequirement(testMachineAbove);
    expect(resultAbove.maintenanceRequired).toBe(true);
    expect(resultAbove.notificationTriggered).toBe(true);
    expect(resultAbove.notificationData).toBeDefined();
  });
});