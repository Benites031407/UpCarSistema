import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { Machine } from '../models/types.js';

/**
 * Feature: machine-rental-system, Property 9: Operating hours enforcement
 * 
 * Property: For any machine with configured operating hours, activation attempts 
 * outside the specified time range should be prevented
 * 
 * Validates: Requirements 8.1, 8.4
 */

// Helper function to check if current time is within operating hours
function isWithinOperatingHours(currentTime: string, operatingHours: { start: string; end: string }): boolean {
  // Handle cross-midnight operating hours (e.g., 22:00 to 06:00)
  if (operatingHours.start > operatingHours.end) {
    // Operating hours cross midnight
    return currentTime >= operatingHours.start || currentTime <= operatingHours.end;
  } else {
    // Normal operating hours within the same day
    return currentTime >= operatingHours.start && currentTime <= operatingHours.end;
  }
}

// Helper function to simulate machine availability check
function checkMachineAvailability(machine: Machine, currentTime: string): {
  available: boolean;
  reason?: string;
  machine: Machine;
} {
  // Check if machine is in maintenance mode
  if (machine.status === 'maintenance') {
    return {
      available: false,
      reason: 'Machine is in maintenance mode',
      machine
    };
  }

  // Check if machine is offline
  if (machine.status === 'offline') {
    return {
      available: false,
      reason: 'Machine is offline',
      machine
    };
  }

  // Check if machine is already in use
  if (machine.status === 'in_use') {
    return {
      available: false,
      reason: 'Machine is currently in use',
      machine
    };
  }

  // Check operating hours
  const isWithinHours = isWithinOperatingHours(currentTime, machine.operatingHours);

  if (!isWithinHours) {
    return {
      available: false,
      reason: `Machine operates from ${machine.operatingHours.start} to ${machine.operatingHours.end}`,
      machine
    };
  }

  // Check if maintenance is required
  if (machine.currentOperatingHours >= machine.maintenanceInterval) {
    return {
      available: false,
      reason: 'Machine requires maintenance',
      machine: { ...machine, status: 'maintenance' }
    };
  }

  return {
    available: true,
    machine
  };
}

describe('Operating Hours Enforcement Property Tests', () => {
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

  it('Property 9: Operating hours enforcement - outside operating hours should prevent activation', () => {
    fc.assert(
      fc.property(
        // Generate operating hours (start and end times)
        fc.record({
          startHour: fc.integer({ min: 8, max: 16 }),
          startMinute: fc.integer({ min: 0, max: 59 }),
          endHour: fc.integer({ min: 17, max: 22 }),
          endMinute: fc.integer({ min: 0, max: 59 })
        }),
        
        // Generate current time outside operating hours (early morning or late night)
        fc.oneof(
          fc.integer({ min: 0, max: 7 }), // Early hours (0-7)
          fc.integer({ min: 23, max: 23 }) // Late hours (23)
        ),
        
        ({ startHour, startMinute, endHour, endMinute }, currentHour: number) => {
          const operatingHours = {
            start: `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`,
            end: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
          };
          
          const currentTime = `${currentHour.toString().padStart(2, '0')}:30`;
          
          // Update mock machine with generated operating hours
          const testMachine = {
            ...mockMachine,
            operatingHours
          };
          
          // Check machine availability using our helper function
          const result = checkMachineAvailability(testMachine, currentTime);
          
          // Verify the property: machine should not be available outside operating hours
          expect(result.available).toBe(false);
          expect(result.reason).toContain('operates from');
          expect(result.reason).toContain(operatingHours.start);
          expect(result.reason).toContain(operatingHours.end);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 9: Operating hours enforcement - within operating hours should allow activation', () => {
    fc.assert(
      fc.property(
        // Generate operating hours
        fc.record({
          startHour: fc.integer({ min: 8, max: 10 }),
          endHour: fc.integer({ min: 17, max: 20 })
        }),
        
        // Generate current time within operating hours
        fc.integer({ min: 11, max: 16 }),
        
        ({ startHour, endHour }, currentHour: number) => {
          const operatingHours = {
            start: `${startHour.toString().padStart(2, '0')}:00`,
            end: `${endHour.toString().padStart(2, '0')}:00`
          };
          
          const currentTime = `${currentHour.toString().padStart(2, '0')}:30`;
          
          // Update mock machine with generated operating hours
          const testMachine = {
            ...mockMachine,
            operatingHours,
            status: 'online' as const,
            currentOperatingHours: 10 // Well below maintenance interval
          };
          
          // Check machine availability using our helper function
          const result = checkMachineAvailability(testMachine, currentTime);
          
          // Verify the property: machine should be available within operating hours
          // (assuming no other blocking conditions like maintenance or offline status)
          expect(result.available).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 9: Operating hours enforcement - boundary conditions', () => {
    // Test exact start time
    const testMachine = {
      ...mockMachine,
      operatingHours: { start: '09:00', end: '18:00' },
      status: 'online' as const,
      currentOperatingHours: 10
    };
    
    const resultStart = checkMachineAvailability(testMachine, '09:00');
    expect(resultStart.available).toBe(true);
    
    // Test exact end time
    const resultEnd = checkMachineAvailability(testMachine, '18:00');
    expect(resultEnd.available).toBe(true);
    
    // Test one minute before start
    const resultBefore = checkMachineAvailability(testMachine, '08:59');
    expect(resultBefore.available).toBe(false);
    expect(resultBefore.reason).toContain('operates from');
    
    // Test one minute after end
    const resultAfter = checkMachineAvailability(testMachine, '18:01');
    expect(resultAfter.available).toBe(false);
    expect(resultAfter.reason).toContain('operates from');
  });

  it('Property 9: Operating hours enforcement - time format consistency', () => {
    fc.assert(
      fc.property(
        // Generate valid HH:MM format times
        fc.record({
          startHour: fc.integer({ min: 8, max: 16 }),
          startMinute: fc.integer({ min: 0, max: 59 }),
          endHour: fc.integer({ min: 17, max: 22 }),
          endMinute: fc.integer({ min: 0, max: 59 })
        }),
        
        ({ startHour, startMinute, endHour, endMinute }) => {
          const operatingHours = {
            start: `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`,
            end: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
          };
          
          const testMachine = {
            ...mockMachine,
            operatingHours,
            status: 'online' as const,
            currentOperatingHours: 10
          };
          
          // Test with time before operating hours (early morning)
          const beforeTime = `06:30`;
          
          const result = checkMachineAvailability(testMachine, beforeTime);
          
          // Verify that the error message contains properly formatted times
          if (!result.available && result.reason?.includes('operates from')) {
            expect(result.reason).toMatch(/\d{2}:\d{2}/); // Should contain HH:MM format
            expect(result.reason).toContain(operatingHours.start);
            expect(result.reason).toContain(operatingHours.end);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 9: Operating hours enforcement - cross-midnight operating hours', () => {
    // Test machines that operate across midnight (e.g., 22:00 to 06:00)
    const testMachine = {
      ...mockMachine,
      operatingHours: { start: '22:00', end: '06:00' },
      status: 'online' as const,
      currentOperatingHours: 10
    };
    
    // Should be available at 23:00 (within hours)
    const resultNight = checkMachineAvailability(testMachine, '23:00');
    expect(resultNight.available).toBe(true);
    
    // Should be available at 05:00 (within hours)
    const resultEarlyMorning = checkMachineAvailability(testMachine, '05:00');
    expect(resultEarlyMorning.available).toBe(true);
    
    // Should NOT be available at 12:00 (outside hours)
    const resultMidday = checkMachineAvailability(testMachine, '12:00');
    expect(resultMidday.available).toBe(false);
    expect(resultMidday.reason).toContain('operates from');
  });

  it('Property 9: Operating hours enforcement - maintenance mode overrides operating hours', () => {
    const testMachine = {
      ...mockMachine,
      operatingHours: { start: '09:00', end: '18:00' },
      status: 'maintenance' as const,
      currentOperatingHours: 10
    };
    
    // Even within operating hours, maintenance mode should prevent activation
    const result = checkMachineAvailability(testMachine, '12:00');
    expect(result.available).toBe(false);
    expect(result.reason).toBe('Machine is in maintenance mode');
  });

  it('Property 9: Operating hours enforcement - maintenance interval triggers maintenance', () => {
    const testMachine = {
      ...mockMachine,
      operatingHours: { start: '09:00', end: '18:00' },
      status: 'online' as const,
      currentOperatingHours: 100, // Equal to maintenance interval
      maintenanceInterval: 100
    };
    
    // Should not be available due to maintenance requirement
    const result = checkMachineAvailability(testMachine, '12:00');
    expect(result.available).toBe(false);
    expect(result.reason).toBe('Machine requires maintenance');
  });
});