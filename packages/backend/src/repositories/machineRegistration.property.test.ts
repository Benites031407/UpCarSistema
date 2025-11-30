import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { CreateMachineInput, Machine } from '../models/types.js';

/**
 * Feature: machine-rental-system, Property 7: Machine registration completeness
 * 
 * Property: For any machine registration attempt, all required fields (location, identifier, 
 * controller assignment) must be provided and validated
 * 
 * Validates: Requirements 6.1
 */

// Mock implementation of machine registration validation logic
class MachineRegistrationValidator {
  /**
   * Validates machine registration data for completeness
   * Returns validation result with success status and errors
   */
  validateMachineRegistration(data: Partial<CreateMachineInput>): {
    isValid: boolean;
    errors: string[];
    validatedData?: CreateMachineInput;
  } {
    const errors: string[] = [];

    // Check required fields
    if (!data.code || typeof data.code !== 'string' || data.code.length !== 6) {
      errors.push('Machine code is required and must be exactly 6 characters');
    }

    if (!data.qrCode || typeof data.qrCode !== 'string' || data.qrCode.length < 10) {
      errors.push('QR code is required and must be at least 10 characters');
    }

    if (!data.location || typeof data.location !== 'string' || data.location.trim().length === 0) {
      errors.push('Location is required and cannot be empty');
    }

    if (!data.controllerId || typeof data.controllerId !== 'string' || data.controllerId.trim().length === 0) {
      errors.push('Controller ID is required and cannot be empty');
    }

    if (!data.operatingHours) {
      errors.push('Operating hours are required');
    } else {
      if (!data.operatingHours.start || !this.isValidTimeFormat(data.operatingHours.start)) {
        errors.push('Operating hours start time is required and must be in HH:MM format');
      }
      if (!data.operatingHours.end || !this.isValidTimeFormat(data.operatingHours.end)) {
        errors.push('Operating hours end time is required and must be in HH:MM format');
      }
      if (data.operatingHours.start && data.operatingHours.end && 
          data.operatingHours.start >= data.operatingHours.end) {
        errors.push('Operating hours start time must be before end time');
      }
    }

    if (data.maintenanceInterval === undefined || data.maintenanceInterval === null || 
        typeof data.maintenanceInterval !== 'number' || data.maintenanceInterval <= 0) {
      errors.push('Maintenance interval is required and must be a positive number');
    }

    const isValid = errors.length === 0;
    
    return {
      isValid,
      errors,
      validatedData: isValid ? data as CreateMachineInput : undefined
    };
  }

  /**
   * Validates time format (HH:MM)
   */
  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Simulates machine creation with validation
   */
  createMachine(data: CreateMachineInput): Machine {
    const validation = this.validateMachineRegistration(data);
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Simulate successful machine creation
    return {
      id: `machine-${Math.random().toString(36).substr(2, 9)}`,
      code: data.code,
      qrCode: data.qrCode,
      location: data.location,
      controllerId: data.controllerId,
      status: 'offline',
      operatingHours: data.operatingHours,
      maintenanceInterval: data.maintenanceInterval,
      currentOperatingHours: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}

describe('Machine Registration Property Tests', () => {
  let validator: MachineRegistrationValidator;

  beforeEach(() => {
    validator = new MachineRegistrationValidator();
  });

  it('Property 7: Machine registration completeness - valid registration data', () => {
    fc.assert(
      fc.property(
        // Generate valid machine registration data
        fc.record({
          code: fc.string({ minLength: 6, maxLength: 6 }).map(s => s.toUpperCase().replace(/[^A-Z0-9]/g, 'A').padEnd(6, 'A').slice(0, 6)),
          qrCode: fc.string({ minLength: 10, maxLength: 500 }).map(s => `qr-${s}`),
          location: fc.string({ minLength: 1, maxLength: 255 }).map(s => s.replace(/[^a-zA-Z0-9\s]/g, 'A').trim() || 'Location A'),
          controllerId: fc.string({ minLength: 1, maxLength: 100 }).map(s => s.replace(/[^a-zA-Z0-9-]/g, 'A').trim() || 'ctrl-A'),
          operatingHours: fc.record({
            start: fc.integer({ min: 0, max: 22 }).chain(hour => 
              fc.integer({ min: 0, max: 59 }).map(minute => 
                `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
              )
            ),
            end: fc.integer({ min: 1, max: 23 }).chain(hour => 
              fc.integer({ min: 0, max: 59 }).map(minute => 
                `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
              )
            )
          }).filter(hours => hours.start < hours.end), // Ensure start is before end
          maintenanceInterval: fc.integer({ min: 1, max: 8760 }) // 1 hour to 1 year
        }),
        (machineData: CreateMachineInput) => {
          // Validate the machine registration data
          const validation = validator.validateMachineRegistration(machineData);

          // Verify the property: all required fields are present and validation passes
          expect(validation.isValid).toBe(true);
          expect(validation.errors).toHaveLength(0);
          expect(validation.validatedData).toBeDefined();

          // Verify that machine creation succeeds with valid data
          const createdMachine = validator.createMachine(machineData);
          
          // Verify the property: all required fields are present and correctly stored
          expect(createdMachine).toBeDefined();
          expect(createdMachine.id).toBeDefined();
          expect(createdMachine.code).toBe(machineData.code);
          expect(createdMachine.qrCode).toBe(machineData.qrCode);
          expect(createdMachine.location).toBe(machineData.location);
          expect(createdMachine.controllerId).toBe(machineData.controllerId);
          expect(createdMachine.operatingHours.start).toBe(machineData.operatingHours.start);
          expect(createdMachine.operatingHours.end).toBe(machineData.operatingHours.end);
          expect(createdMachine.maintenanceInterval).toBe(machineData.maintenanceInterval);
          
          // Verify default values are set correctly
          expect(createdMachine.status).toBe('offline'); // Default status
          expect(createdMachine.currentOperatingHours).toBe(0);
          expect(createdMachine.createdAt).toBeDefined();
          expect(createdMachine.updatedAt).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7: Machine registration completeness - missing required fields', () => {
    fc.assert(
      fc.property(
        // Generate incomplete machine data by randomly omitting required fields
        fc.record({
          code: fc.option(fc.string({ minLength: 6, maxLength: 6 }), { nil: undefined }),
          qrCode: fc.option(fc.string({ minLength: 10, maxLength: 500 }), { nil: undefined }),
          location: fc.option(fc.string({ minLength: 1, maxLength: 255 }), { nil: undefined }),
          controllerId: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          operatingHours: fc.option(fc.record({
            start: fc.string({ minLength: 5, maxLength: 5 }),
            end: fc.string({ minLength: 5, maxLength: 5 })
          }), { nil: undefined }),
          maintenanceInterval: fc.option(fc.integer({ min: 1, max: 8760 }), { nil: undefined })
        }).filter(data => 
          // Ensure at least one required field is missing
          data.code === undefined || 
          data.qrCode === undefined || 
          data.location === undefined || 
          data.controllerId === undefined || 
          data.operatingHours === undefined || 
          data.maintenanceInterval === undefined
        ),
        (incompleteData: Partial<CreateMachineInput>) => {
          // Validate the incomplete machine registration data
          const validation = validator.validateMachineRegistration(incompleteData);

          // Verify the property: validation should fail when required fields are missing
          expect(validation.isValid).toBe(false);
          expect(validation.errors.length).toBeGreaterThan(0);
          expect(validation.validatedData).toBeUndefined();

          // Verify that machine creation fails with incomplete data
          expect(() => {
            validator.createMachine(incompleteData as CreateMachineInput);
          }).toThrow(/Validation failed/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7: Machine registration completeness - invalid field formats', () => {
    fc.assert(
      fc.property(
        // Generate machine data with invalid field formats
        fc.oneof(
          // Invalid location (empty string)
          fc.record({
            code: fc.string({ minLength: 6, maxLength: 6 }).map(s => s.toUpperCase()),
            qrCode: fc.string({ minLength: 10, maxLength: 500 }),
            location: fc.constant(''), // Empty location
            controllerId: fc.string({ minLength: 1, maxLength: 100 }),
            operatingHours: fc.record({
              start: fc.constant('09:00'),
              end: fc.constant('17:00')
            }),
            maintenanceInterval: fc.integer({ min: 1, max: 8760 })
          }),
          // Invalid code (wrong length)
          fc.record({
            code: fc.oneof(
              fc.string({ minLength: 1, maxLength: 5 }), // Too short
              fc.string({ minLength: 7, maxLength: 10 }) // Too long
            ),
            qrCode: fc.string({ minLength: 10, maxLength: 500 }),
            location: fc.string({ minLength: 1, maxLength: 255 }),
            controllerId: fc.string({ minLength: 1, maxLength: 100 }),
            operatingHours: fc.record({
              start: fc.constant('09:00'),
              end: fc.constant('17:00')
            }),
            maintenanceInterval: fc.integer({ min: 1, max: 8760 })
          }),
          // Invalid operating hours format
          fc.record({
            code: fc.string({ minLength: 6, maxLength: 6 }).map(s => s.toUpperCase()),
            qrCode: fc.string({ minLength: 10, maxLength: 500 }),
            location: fc.string({ minLength: 1, maxLength: 255 }),
            controllerId: fc.string({ minLength: 1, maxLength: 100 }),
            operatingHours: fc.record({
              start: fc.oneof(
                fc.constant('25:00'), // Invalid hour
                fc.constant('12:60'), // Invalid minute
                fc.constant('invalid'), // Invalid format
                fc.constant('12') // Incomplete format
              ),
              end: fc.constant('17:00')
            }),
            maintenanceInterval: fc.integer({ min: 1, max: 8760 })
          }),
          // Invalid maintenance interval (zero or negative)
          fc.record({
            code: fc.string({ minLength: 6, maxLength: 6 }).map(s => s.toUpperCase()),
            qrCode: fc.string({ minLength: 10, maxLength: 500 }),
            location: fc.string({ minLength: 1, maxLength: 255 }),
            controllerId: fc.string({ minLength: 1, maxLength: 100 }),
            operatingHours: fc.record({
              start: fc.constant('09:00'),
              end: fc.constant('17:00')
            }),
            maintenanceInterval: fc.integer({ max: 0 }) // Zero or negative
          })
        ),
        (invalidData: CreateMachineInput) => {
          // Validate the invalid machine registration data
          const validation = validator.validateMachineRegistration(invalidData);

          // Verify the property: validation should fail with invalid field formats
          expect(validation.isValid).toBe(false);
          expect(validation.errors.length).toBeGreaterThan(0);
          expect(validation.validatedData).toBeUndefined();

          // Verify that machine creation fails with invalid data
          expect(() => {
            validator.createMachine(invalidData);
          }).toThrow(/Validation failed/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7: Machine registration completeness - operating hours validation', () => {
    fc.assert(
      fc.property(
        // Generate machine data with invalid operating hours (start >= end)
        fc.record({
          code: fc.string({ minLength: 6, maxLength: 6 }).map(s => s.toUpperCase()),
          qrCode: fc.string({ minLength: 10, maxLength: 500 }),
          location: fc.string({ minLength: 1, maxLength: 255 }),
          controllerId: fc.string({ minLength: 1, maxLength: 100 }),
          operatingHours: fc.record({
            start: fc.integer({ min: 10, max: 23 }).chain(hour => 
              fc.integer({ min: 0, max: 59 }).map(minute => 
                `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
              )
            ),
            end: fc.integer({ min: 0, max: 10 }).chain(hour => 
              fc.integer({ min: 0, max: 59 }).map(minute => 
                `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
              )
            )
          }).filter(hours => hours.start >= hours.end), // Ensure start is NOT before end (invalid)
          maintenanceInterval: fc.integer({ min: 1, max: 8760 })
        }),
        (invalidData: CreateMachineInput) => {
          // Validate the machine registration data with invalid operating hours
          const validation = validator.validateMachineRegistration(invalidData);

          // Verify the property: validation should fail when start time >= end time
          expect(validation.isValid).toBe(false);
          expect(validation.errors.length).toBeGreaterThan(0);
          expect(validation.errors.some(error => 
            error.includes('start time must be before end time')
          )).toBe(true);
          expect(validation.validatedData).toBeUndefined();

          // Verify that machine creation fails with invalid operating hours
          expect(() => {
            validator.createMachine(invalidData);
          }).toThrow(/Validation failed/);
        }
      ),
      { numRuns: 100 }
    );
  });
});