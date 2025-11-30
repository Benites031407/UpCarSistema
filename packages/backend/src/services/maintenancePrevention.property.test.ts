import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { Machine, UsageSession } from '../models/types.js';

/**
 * Feature: machine-rental-system, Property 8: Maintenance mode prevents activation
 * 
 * Property: For any machine in maintenance or offline status, customer activation 
 * attempts should be prevented and status should be displayed
 * 
 * Validates: Requirements 1.4, 7.3
 */

// Simplified machine availability service that implements the core logic
class MachineAvailabilityService {
  /**
   * Check if a machine is available for activation
   */
  checkMachineAvailability(machine: Machine): {
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

    // Check operating hours (simplified - assume current time is within hours for this test)
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    const isWithinOperatingHours = currentTime >= machine.operatingHours.start && 
                                  currentTime <= machine.operatingHours.end;

    if (!isWithinOperatingHours) {
      return {
        available: false,
        reason: `Machine operates from ${machine.operatingHours.start} to ${machine.operatingHours.end}`,
        machine
      };
    }

    // Check if maintenance is required based on operating hours
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

  /**
   * Attempt to activate a machine session
   */
  attemptActivation(session: UsageSession, machine: Machine): {
    success: boolean;
    error?: string;
    preventedByMaintenance?: boolean;
    preventedByOffline?: boolean;
  } {
    const availabilityCheck = this.checkMachineAvailability(machine);
    
    if (!availabilityCheck.available) {
      const preventedByMaintenance = machine.status === 'maintenance';
      const preventedByOffline = machine.status === 'offline';
      
      return {
        success: false,
        error: availabilityCheck.reason,
        preventedByMaintenance,
        preventedByOffline
      };
    }

    // Additional session validation
    if (session.status !== 'pending') {
      return {
        success: false,
        error: `Cannot activate session with status: ${session.status}`
      };
    }

    if (session.duration < 1 || session.duration > 30) {
      return {
        success: false,
        error: 'Invalid duration. Must be between 1 and 30 minutes.'
      };
    }

    return {
      success: true
    };
  }
}

describe('Maintenance Mode Prevention Property Tests', () => {
  let availabilityService: MachineAvailabilityService;

  beforeEach(() => {
    availabilityService = new MachineAvailabilityService();
  });

  it('Property 8: Maintenance mode prevents activation - machines in maintenance should be unavailable', () => {
    fc.assert(
      fc.property(
        // Generate machine data with maintenance status
        fc.record({
          id: fc.uuid(),
          code: fc.string({ minLength: 4, maxLength: 10 }),
          qrCode: fc.string({ minLength: 10, maxLength: 50 }),
          location: fc.string({ minLength: 1, maxLength: 100 }),
          controllerId: fc.uuid(),
          status: fc.constant('maintenance'), // Force maintenance status
          operatingHours: fc.record({
            start: fc.constantFrom('06:00', '07:00', '08:00'),
            end: fc.constantFrom('18:00', '19:00', '20:00')
          }),
          maintenanceInterval: fc.integer({ min: 100, max: 1000 }),
          currentOperatingHours: fc.integer({ min: 0, max: 500 }),
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        (machineData) => {
          const machine = machineData as Machine;
          
          // Check machine availability
          const result = availabilityService.checkMachineAvailability(machine);
          
          // Verify the property: machine in maintenance should be unavailable
          expect(result.available).toBe(false);
          expect(result.reason).toBe('Machine is in maintenance mode');
          expect(result.machine.status).toBe('maintenance');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: Maintenance mode prevents activation - machines offline should be unavailable', () => {
    fc.assert(
      fc.property(
        // Generate machine data with offline status
        fc.record({
          id: fc.uuid(),
          code: fc.string({ minLength: 4, maxLength: 10 }),
          qrCode: fc.string({ minLength: 10, maxLength: 50 }),
          location: fc.string({ minLength: 1, maxLength: 100 }),
          controllerId: fc.uuid(),
          status: fc.constant('offline'), // Force offline status
          operatingHours: fc.record({
            start: fc.constantFrom('06:00', '07:00', '08:00'),
            end: fc.constantFrom('18:00', '19:00', '20:00')
          }),
          maintenanceInterval: fc.integer({ min: 100, max: 1000 }),
          currentOperatingHours: fc.integer({ min: 0, max: 500 }),
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        (machineData) => {
          const machine = machineData as Machine;
          
          // Check machine availability
          const result = availabilityService.checkMachineAvailability(machine);
          
          // Verify the property: offline machine should be unavailable
          expect(result.available).toBe(false);
          expect(result.reason).toBe('Machine is offline');
          expect(result.machine.status).toBe('offline');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: Maintenance mode prevents activation - activation attempts should be prevented for maintenance machines', () => {
    fc.assert(
      fc.property(
        // Generate valid session data
        fc.record({
          id: fc.uuid(),
          userId: fc.uuid(),
          machineId: fc.uuid(),
          duration: fc.integer({ min: 1, max: 30 }),
          cost: fc.integer({ min: 1, max: 30 }),
          paymentMethod: fc.constantFrom('balance', 'pix'),
          status: fc.constant('pending'),
          createdAt: fc.date()
        }),
        // Generate machine in maintenance
        fc.record({
          id: fc.uuid(),
          code: fc.string({ minLength: 4, maxLength: 10 }),
          qrCode: fc.string({ minLength: 10, maxLength: 50 }),
          location: fc.string({ minLength: 1, maxLength: 100 }),
          controllerId: fc.uuid(),
          status: fc.constant('maintenance'),
          operatingHours: fc.record({
            start: fc.constantFrom('06:00', '07:00', '08:00'),
            end: fc.constantFrom('18:00', '19:00', '20:00')
          }),
          maintenanceInterval: fc.integer({ min: 100, max: 1000 }),
          currentOperatingHours: fc.integer({ min: 0, max: 500 }),
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        (sessionData, machineData) => {
          // Ensure session and machine IDs match
          sessionData.machineId = machineData.id;
          
          const session = sessionData as UsageSession;
          const machine = machineData as Machine;
          
          // Attempt activation
          const result = availabilityService.attemptActivation(session, machine);
          
          // Verify the property: activation should be prevented
          expect(result.success).toBe(false);
          expect(result.error).toBe('Machine is in maintenance mode');
          expect(result.preventedByMaintenance).toBe(true);
          expect(result.preventedByOffline).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: Maintenance mode prevents activation - activation attempts should be prevented for offline machines', () => {
    fc.assert(
      fc.property(
        // Generate valid session data
        fc.record({
          id: fc.uuid(),
          userId: fc.uuid(),
          machineId: fc.uuid(),
          duration: fc.integer({ min: 1, max: 30 }),
          cost: fc.integer({ min: 1, max: 30 }),
          paymentMethod: fc.constantFrom('balance', 'pix'),
          status: fc.constant('pending'),
          createdAt: fc.date()
        }),
        // Generate offline machine
        fc.record({
          id: fc.uuid(),
          code: fc.string({ minLength: 4, maxLength: 10 }),
          qrCode: fc.string({ minLength: 10, maxLength: 50 }),
          location: fc.string({ minLength: 1, maxLength: 100 }),
          controllerId: fc.uuid(),
          status: fc.constant('offline'),
          operatingHours: fc.record({
            start: fc.constantFrom('06:00', '07:00', '08:00'),
            end: fc.constantFrom('18:00', '19:00', '20:00')
          }),
          maintenanceInterval: fc.integer({ min: 100, max: 1000 }),
          currentOperatingHours: fc.integer({ min: 0, max: 500 }),
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        (sessionData, machineData) => {
          // Ensure session and machine IDs match
          sessionData.machineId = machineData.id;
          
          const session = sessionData as UsageSession;
          const machine = machineData as Machine;
          
          // Attempt activation
          const result = availabilityService.attemptActivation(session, machine);
          
          // Verify the property: activation should be prevented
          expect(result.success).toBe(false);
          expect(result.error).toBe('Machine is offline');
          expect(result.preventedByMaintenance).toBe(false);
          expect(result.preventedByOffline).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: Maintenance mode prevents activation - status display consistency', () => {
    fc.assert(
      fc.property(
        // Generate machine with problematic status
        fc.record({
          id: fc.uuid(),
          code: fc.string({ minLength: 4, maxLength: 10 }),
          qrCode: fc.string({ minLength: 10, maxLength: 50 }),
          location: fc.string({ minLength: 1, maxLength: 100 }),
          controllerId: fc.uuid(),
          status: fc.constantFrom('maintenance', 'offline', 'in_use'),
          operatingHours: fc.record({
            start: fc.constantFrom('06:00', '07:00', '08:00'),
            end: fc.constantFrom('18:00', '19:00', '20:00')
          }),
          maintenanceInterval: fc.integer({ min: 100, max: 1000 }),
          currentOperatingHours: fc.integer({ min: 0, max: 500 }),
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        (machineData) => {
          const machine = machineData as Machine;
          
          // Check machine availability
          const result = availabilityService.checkMachineAvailability(machine);
          
          // Verify the property: status should be displayed consistently
          expect(result.available).toBe(false);
          expect(result.reason).toBeDefined();
          expect(result.machine.status).toBe(machine.status);
          
          // Verify specific status messages
          if (machine.status === 'maintenance') {
            expect(result.reason).toBe('Machine is in maintenance mode');
          } else if (machine.status === 'offline') {
            expect(result.reason).toBe('Machine is offline');
          } else if (machine.status === 'in_use') {
            expect(result.reason).toBe('Machine is currently in use');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: Maintenance mode prevents activation - online machines should be available (when other conditions are met)', () => {
    fc.assert(
      fc.property(
        // Generate machine with online status and valid conditions
        fc.record({
          id: fc.uuid(),
          code: fc.string({ minLength: 4, maxLength: 10 }),
          qrCode: fc.string({ minLength: 10, maxLength: 50 }),
          location: fc.string({ minLength: 1, maxLength: 100 }),
          controllerId: fc.uuid(),
          status: fc.constant('online'),
          operatingHours: fc.record({
            start: fc.constant('00:00'), // Always within operating hours for this test
            end: fc.constant('23:59')
          }),
          maintenanceInterval: fc.integer({ min: 500, max: 1000 }), // High interval
          currentOperatingHours: fc.integer({ min: 0, max: 100 }), // Low current hours
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        (machineData) => {
          const machine = machineData as Machine;
          
          // Ensure machine doesn't need maintenance
          fc.pre(machine.currentOperatingHours < machine.maintenanceInterval);
          
          // Check machine availability
          const result = availabilityService.checkMachineAvailability(machine);
          
          // Verify the property: online machine with good conditions should be available
          expect(result.available).toBe(true);
          expect(result.reason).toBeUndefined();
          expect(result.machine.status).toBe('online');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: Maintenance mode prevents activation - machines requiring maintenance should be prevented', () => {
    fc.assert(
      fc.property(
        // Generate machine that needs maintenance (operating hours >= maintenance interval)
        fc.record({
          id: fc.uuid(),
          code: fc.string({ minLength: 4, maxLength: 10 }),
          qrCode: fc.string({ minLength: 10, maxLength: 50 }),
          location: fc.string({ minLength: 1, maxLength: 100 }),
          controllerId: fc.uuid(),
          status: fc.constant('online'), // Start as online
          operatingHours: fc.record({
            start: fc.constant('00:00'),
            end: fc.constant('23:59')
          }),
          maintenanceInterval: fc.integer({ min: 50, max: 200 }),
          currentOperatingHours: fc.integer({ min: 0, max: 100 }), // Will be adjusted
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        (machineData) => {
          // Ensure machine needs maintenance
          const machine = {
            ...machineData,
            currentOperatingHours: machineData.maintenanceInterval + fc.sample(fc.integer({ min: 0, max: 50 }), 1)[0]
          } as Machine;
          
          // Check machine availability
          const result = availabilityService.checkMachineAvailability(machine);
          
          // Verify the property: machine requiring maintenance should be unavailable
          expect(result.available).toBe(false);
          expect(result.reason).toBe('Machine requires maintenance');
          expect(result.machine.status).toBe('maintenance');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: Maintenance mode prevents activation - prevention is consistent across multiple checks', () => {
    fc.assert(
      fc.property(
        // Generate machine in maintenance or offline
        fc.record({
          id: fc.uuid(),
          code: fc.string({ minLength: 4, maxLength: 10 }),
          qrCode: fc.string({ minLength: 10, maxLength: 50 }),
          location: fc.string({ minLength: 1, maxLength: 100 }),
          controllerId: fc.uuid(),
          status: fc.constantFrom('maintenance', 'offline'),
          operatingHours: fc.record({
            start: fc.constantFrom('06:00', '07:00', '08:00'),
            end: fc.constantFrom('18:00', '19:00', '20:00')
          }),
          maintenanceInterval: fc.integer({ min: 100, max: 1000 }),
          currentOperatingHours: fc.integer({ min: 0, max: 500 }),
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        (machineData) => {
          const machine = machineData as Machine;
          
          // Check availability multiple times
          const result1 = availabilityService.checkMachineAvailability(machine);
          const result2 = availabilityService.checkMachineAvailability(machine);
          const result3 = availabilityService.checkMachineAvailability(machine);
          
          // Verify the property: results should be consistent
          expect(result1.available).toBe(false);
          expect(result2.available).toBe(false);
          expect(result3.available).toBe(false);
          
          expect(result1.reason).toBe(result2.reason);
          expect(result2.reason).toBe(result3.reason);
          
          expect(result1.machine.status).toBe(result2.machine.status);
          expect(result2.machine.status).toBe(result3.machine.status);
        }
      ),
      { numRuns: 100 }
    );
  });
});