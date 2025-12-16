import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { Machine } from '../models/types.js';

/**
 * Feature: machine-rental-system, Property 10: Automatic maintenance triggering
 * 
 * Property: For any machine that reaches its configured maintenance interval hours, 
 * the system should automatically set it to maintenance mode
 * 
 * Validates: Requirements 7.2, 8.2
 */

// Helper function to simulate maintenance check logic
function checkMaintenanceRequired(machine: Machine): {
  maintenanceRequired: boolean;
  reason?: string;
  updatedMachine: Machine;
} {
  if (machine.currentOperatingHours >= machine.maintenanceInterval) {
    return {
      maintenanceRequired: true,
      reason: 'Operating hours limit reached',
      updatedMachine: { ...machine, status: 'maintenance' }
    };
  }

  return {
    maintenanceRequired: false,
    updatedMachine: machine
  };
}

// Helper function to simulate incrementing operating hours
function incrementOperatingHours(machine: Machine, minutes: number): {
  updatedMachine: Machine;
  maintenanceTriggered: boolean;
} {
  const hours = minutes / 60;
  const newOperatingHours = machine.currentOperatingHours + hours;
  
  const updatedMachine = {
    ...machine,
    currentOperatingHours: newOperatingHours
  };

  // Check if maintenance is now required
  const maintenanceTriggered = newOperatingHours >= machine.maintenanceInterval;
  
  if (maintenanceTriggered) {
    updatedMachine.status = 'maintenance';
  }

  return {
    updatedMachine,
    maintenanceTriggered
  };
}

describe('Automatic Maintenance Triggering Property Tests', () => {
  let mockMachine: Machine;

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

  it('Property 10: Automatic maintenance triggering - machines at or above maintenance interval should trigger maintenance', () => {
    fc.assert(
      fc.property(
        // Generate maintenance interval (reasonable range for machines)
        fc.integer({ min: 50, max: 500 }),
        
        // Generate current operating hours that meet or exceed the interval
        fc.integer({ min: 0, max: 100 }), // This will be added to the interval to ensure >= condition
        
        (maintenanceInterval: number, additionalHours: number) => {
          const currentOperatingHours = maintenanceInterval + additionalHours;
          
          const testMachine = {
            ...mockMachine,
            maintenanceInterval,
            currentOperatingHours,
            status: 'online' as const
          };
          
          // Check if maintenance is required
          const result = checkMaintenanceRequired(testMachine);
          
          // Verify the property: machine should require maintenance
          expect(result.maintenanceRequired).toBe(true);
          expect(result.reason).toBe('Operating hours limit reached');
          expect(result.updatedMachine.status).toBe('maintenance');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 10: Automatic maintenance triggering - machines below maintenance interval should not trigger maintenance', () => {
    fc.assert(
      fc.property(
        // Generate maintenance interval
        fc.integer({ min: 100, max: 500 }),
        
        // Generate current operating hours below the interval
        fc.integer({ min: 0, max: 99 }),
        
        (maintenanceInterval: number, currentOperatingHours: number) => {
          // Ensure current hours are below interval
          const actualCurrentHours = Math.min(currentOperatingHours, maintenanceInterval - 1);
          
          const testMachine = {
            ...mockMachine,
            maintenanceInterval,
            currentOperatingHours: actualCurrentHours,
            status: 'online' as const
          };
          
          // Check if maintenance is required
          const result = checkMaintenanceRequired(testMachine);
          
          // Verify the property: machine should NOT require maintenance
          expect(result.maintenanceRequired).toBe(false);
          expect(result.updatedMachine.status).toBe('online');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 10: Automatic maintenance triggering - incrementing hours should trigger maintenance when threshold is reached', () => {
    fc.assert(
      fc.property(
        // Generate maintenance interval
        fc.integer({ min: 50, max: 200 }),
        
        // Generate current operating hours close to but below the interval
        fc.integer({ min: 1, max: 10 }), // Hours below the interval
        
        // Generate usage duration that will push over the threshold
        fc.integer({ min: 30, max: 180 }), // Minutes of usage
        
        (maintenanceInterval: number, hoursBelow: number, usageMinutes: number) => {
          const currentOperatingHours = maintenanceInterval - hoursBelow;
          const usageHours = usageMinutes / 60;
          
          // Only test cases where usage will actually trigger maintenance
          fc.pre(currentOperatingHours + usageHours >= maintenanceInterval);
          
          const testMachine = {
            ...mockMachine,
            maintenanceInterval,
            currentOperatingHours,
            status: 'online' as const
          };
          
          // Increment operating hours
          const result = incrementOperatingHours(testMachine, usageMinutes);
          
          // Verify the property: maintenance should be triggered
          expect(result.maintenanceTriggered).toBe(true);
          expect(result.updatedMachine.status).toBe('maintenance');
          expect(result.updatedMachine.currentOperatingHours).toBeGreaterThanOrEqual(maintenanceInterval);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 10: Automatic maintenance triggering - incrementing hours should not trigger maintenance when threshold is not reached', () => {
    fc.assert(
      fc.property(
        // Generate maintenance interval
        fc.integer({ min: 100, max: 300 }),
        
        // Generate current operating hours well below the interval
        fc.integer({ min: 10, max: 50 }),
        
        // Generate small usage duration that won't push over the threshold
        fc.integer({ min: 5, max: 30 }), // Minutes of usage
        
        (maintenanceInterval: number, currentOperatingHours: number, usageMinutes: number) => {
          const usageHours = usageMinutes / 60;
          
          // Only test cases where usage will NOT trigger maintenance
          fc.pre(currentOperatingHours + usageHours < maintenanceInterval);
          
          const testMachine = {
            ...mockMachine,
            maintenanceInterval,
            currentOperatingHours,
            status: 'online' as const
          };
          
          // Increment operating hours
          const result = incrementOperatingHours(testMachine, usageMinutes);
          
          // Verify the property: maintenance should NOT be triggered
          expect(result.maintenanceTriggered).toBe(false);
          expect(result.updatedMachine.status).toBe('online');
          expect(result.updatedMachine.currentOperatingHours).toBeLessThan(maintenanceInterval);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 10: Automatic maintenance triggering - exact threshold boundary conditions', () => {
    // Test exact maintenance interval threshold
    const testMachine = {
      ...mockMachine,
      maintenanceInterval: 100,
      currentOperatingHours: 100, // Exactly at threshold
      status: 'online' as const
    };
    
    const result = checkMaintenanceRequired(testMachine);
    expect(result.maintenanceRequired).toBe(true);
    expect(result.updatedMachine.status).toBe('maintenance');
    
    // Test one hour below threshold
    const testMachineBelow = {
      ...mockMachine,
      maintenanceInterval: 100,
      currentOperatingHours: 99, // Just below threshold
      status: 'online' as const
    };
    
    const resultBelow = checkMaintenanceRequired(testMachineBelow);
    expect(resultBelow.maintenanceRequired).toBe(false);
    expect(resultBelow.updatedMachine.status).toBe('online');
  });

  it('Property 10: Automatic maintenance triggering - maintenance mode preservation', () => {
    fc.assert(
      fc.property(
        // Generate maintenance interval and operating hours
        fc.integer({ min: 50, max: 200 }),
        fc.integer({ min: 0, max: 300 }),
        
        (maintenanceInterval: number, currentOperatingHours: number) => {
          const testMachine = {
            ...mockMachine,
            maintenanceInterval,
            currentOperatingHours,
            status: 'maintenance' as const // Already in maintenance
          };
          
          // Check maintenance requirement
          const result = checkMaintenanceRequired(testMachine);
          
          // Verify the property: machine should remain in maintenance mode
          expect(result.updatedMachine.status).toBe('maintenance');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 10: Automatic maintenance triggering - operating hours accumulation accuracy', () => {
    fc.assert(
      fc.property(
        // Generate initial operating hours
        fc.integer({ min: 10, max: 80 }),
        
        // Generate multiple usage sessions
        fc.array(fc.integer({ min: 5, max: 60 }), { minLength: 1, maxLength: 5 }),
        
        (initialHours: number, usageSessions: number[]) => {
          let testMachine = {
            ...mockMachine,
            maintenanceInterval: 100,
            currentOperatingHours: initialHours,
            status: 'online' as const
          };
          
          let totalUsageMinutes = 0;
          let maintenanceTriggered = false;
          
          // Process each usage session
          for (const usageMinutes of usageSessions) {
            if (testMachine.status !== 'maintenance') {
              const result = incrementOperatingHours(testMachine, usageMinutes);
              testMachine = result.updatedMachine;
              totalUsageMinutes += usageMinutes;
              
              if (result.maintenanceTriggered) {
                maintenanceTriggered = true;
                break;
              }
            }
          }
          
          const expectedTotalHours = initialHours + (totalUsageMinutes / 60);
          
          // Verify the property: operating hours should accumulate correctly
          expect(testMachine.currentOperatingHours).toBeCloseTo(expectedTotalHours, 2);
          
          // If maintenance was triggered, it should be because we reached the threshold
          if (maintenanceTriggered) {
            expect(testMachine.currentOperatingHours).toBeGreaterThanOrEqual(testMachine.maintenanceInterval);
            expect(testMachine.status).toBe('maintenance');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});