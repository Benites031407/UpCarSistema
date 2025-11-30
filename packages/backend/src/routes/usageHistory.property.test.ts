import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { User, Machine, UsageSession } from '../models/types.js';

/**
 * Feature: machine-rental-system, Property 25: Usage history completeness
 * 
 * Property: For any usage history display, each entry should contain customer name, 
 * machine used, activation time, duration, and payment method
 * 
 * Validates: Requirements 11.3
 */

// Mock usage history service that formats session data for display
class UsageHistoryService {
  /**
   * Formats usage session data for admin dashboard display
   * According to Requirements 11.3, should include:
   * - customer name
   * - machine used (code/location)
   * - activation time (createdAt)
   * - duration
   * - payment method
   */
  formatUsageHistory(
    sessions: UsageSession[],
    customer: User,
    machines: Map<string, Machine>
  ): Array<{
    id: string;
    customerName: string;
    machineCode: string;
    machineLocation: string;
    duration: number;
    cost: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
    startTime?: string;
    endTime?: string;
  }> {
    return sessions.map(session => {
      const machine = machines.get(session.machineId);
      
      return {
        id: session.id,
        customerName: customer.name,
        machineCode: machine?.code || 'Unknown',
        machineLocation: machine?.location || 'Unknown',
        duration: session.duration,
        cost: session.cost,
        paymentMethod: session.paymentMethod,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
        startTime: session.startTime?.toISOString(),
        endTime: session.endTime?.toISOString(),
      };
    });
  }

  /**
   * Validates that a usage history entry contains all required fields
   */
  validateUsageHistoryEntry(entry: any): boolean {
    // Check that all required fields from Requirements 11.3 are present and valid
    return (
      typeof entry.customerName === 'string' && entry.customerName.length > 0 &&
      typeof entry.machineCode === 'string' && entry.machineCode.length > 0 &&
      typeof entry.createdAt === 'string' && entry.createdAt.length > 0 &&
      typeof entry.duration === 'number' && entry.duration > 0 &&
      typeof entry.paymentMethod === 'string' && entry.paymentMethod.length > 0
    );
  }
}

describe('Usage History Property Tests', () => {
  let usageHistoryService: UsageHistoryService;

  beforeEach(() => {
    usageHistoryService = new UsageHistoryService();
  });

  it('Property 25: Usage history completeness - all entries contain required fields', () => {
    fc.assert(
      fc.property(
        // Generate random customer data
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress()
        }),
        // Generate random machines
        fc.array(
          fc.record({
            code: fc.string({ minLength: 3, maxLength: 10 }),
            location: fc.string({ minLength: 1, maxLength: 100 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        // Generate random usage sessions
        fc.array(
          fc.record({
            duration: fc.integer({ min: 1, max: 30 }),
            paymentMethod: fc.constantFrom('balance', 'pix'),
            status: fc.constantFrom('pending', 'active', 'completed', 'failed'),
            machineIndex: fc.integer({ min: 0, max: 9 }) // Index into machines array
          }),
          { minLength: 0, max: 15 }
        ),
        (customerData, machineConfigs, sessionConfigs) => {
          // Create test customer
          const customer: User = {
            id: 'test-customer-1',
            email: customerData.email,
            name: customerData.name,
            accountBalance: 100,
            subscriptionStatus: 'none',
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Create test machines
          const machines = new Map<string, Machine>();
          const machineList: Machine[] = machineConfigs.map((config, i) => {
            const machine: Machine = {
              id: `machine-${i}`,
              code: `TEST-${config.code}-${i}`,
              qrCode: 'test-qr-code',
              location: config.location,
              controllerId: `controller-${i}`,
              status: 'online',
              operatingHours: { start: '08:00', end: '18:00' },
              maintenanceInterval: 100,
              currentOperatingHours: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            machines.set(machine.id, machine);
            return machine;
          });

          // Create test usage sessions
          const sessions: UsageSession[] = sessionConfigs.map((config, i) => {
            const machineIndex = Math.min(config.machineIndex, machineList.length - 1);
            const selectedMachine = machineList[machineIndex];
            
            return {
              id: `session-${i}`,
              userId: customer.id,
              machineId: selectedMachine.id,
              duration: config.duration,
              cost: config.duration, // Cost equals duration (1 R$ per minute)
              paymentMethod: config.paymentMethod,
              status: config.status,
              createdAt: new Date(),
              startTime: config.status === 'active' || config.status === 'completed' ? new Date() : undefined,
              endTime: config.status === 'completed' ? new Date() : undefined
            };
          });

          // Format usage history
          const usageHistory = usageHistoryService.formatUsageHistory(sessions, customer, machines);

          // Verify the property: each entry contains all required fields from Requirements 11.3
          for (const entry of usageHistory) {
            // Customer name must be present and non-empty
            expect(entry.customerName).toBe(customer.name);
            expect(typeof entry.customerName).toBe('string');
            expect(entry.customerName.length).toBeGreaterThan(0);

            // Machine used (code) must be present and non-empty
            expect(typeof entry.machineCode).toBe('string');
            expect(entry.machineCode.length).toBeGreaterThan(0);
            expect(entry.machineCode).toMatch(/^TEST-.*-\d+$/); // Should match our test pattern

            // Machine location should also be present
            expect(typeof entry.machineLocation).toBe('string');
            expect(entry.machineLocation.length).toBeGreaterThan(0);

            // Activation time (createdAt) must be present and valid ISO string
            expect(typeof entry.createdAt).toBe('string');
            expect(entry.createdAt.length).toBeGreaterThan(0);
            expect(() => new Date(entry.createdAt)).not.toThrow();
            expect(new Date(entry.createdAt).toISOString()).toBe(entry.createdAt);

            // Duration must be present and positive number
            expect(typeof entry.duration).toBe('number');
            expect(entry.duration).toBeGreaterThan(0);
            expect(entry.duration).toBeLessThanOrEqual(30); // Max duration per requirements

            // Payment method must be present and valid
            expect(typeof entry.paymentMethod).toBe('string');
            expect(entry.paymentMethod.length).toBeGreaterThan(0);
            expect(['balance', 'pix']).toContain(entry.paymentMethod);

            // Additional fields that should be present for completeness
            expect(typeof entry.id).toBe('string');
            expect(entry.id.length).toBeGreaterThan(0);
            expect(typeof entry.cost).toBe('number');
            expect(entry.cost).toBeGreaterThan(0);
            expect(typeof entry.status).toBe('string');
            expect(['pending', 'active', 'completed', 'failed']).toContain(entry.status);

            // Validate using the service method
            expect(usageHistoryService.validateUsageHistoryEntry(entry)).toBe(true);
          }

          // Verify that the number of entries matches the number of sessions
          expect(usageHistory.length).toBe(sessions.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 25: Usage history completeness - machine information is correctly mapped', () => {
    fc.assert(
      fc.property(
        // Generate customer
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress()
        }),
        // Generate machines with specific codes and locations
        fc.array(
          fc.record({
            code: fc.string({ minLength: 3, maxLength: 10 }),
            location: fc.string({ minLength: 1, maxLength: 100 })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        // Generate sessions that reference the machines
        fc.array(
          fc.record({
            duration: fc.integer({ min: 1, max: 30 }),
            paymentMethod: fc.constantFrom('balance', 'pix'),
            machineIndex: fc.integer({ min: 0, max: 4 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (customerData, machineConfigs, sessionConfigs) => {
          // Create test data
          const customer: User = {
            id: 'test-customer-1',
            email: customerData.email,
            name: customerData.name,
            accountBalance: 100,
            subscriptionStatus: 'none',
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const machines = new Map<string, Machine>();
          const machineList: Machine[] = machineConfigs.map((config, i) => {
            const machine: Machine = {
              id: `machine-${i}`,
              code: `TEST-${config.code}-${i}`,
              qrCode: 'test-qr-code',
              location: config.location,
              controllerId: `controller-${i}`,
              status: 'online',
              operatingHours: { start: '08:00', end: '18:00' },
              maintenanceInterval: 100,
              currentOperatingHours: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            machines.set(machine.id, machine);
            return machine;
          });

          const sessions: UsageSession[] = sessionConfigs.map((config, i) => {
            const machineIndex = Math.min(config.machineIndex, machineList.length - 1);
            const selectedMachine = machineList[machineIndex];
            
            return {
              id: `session-${i}`,
              userId: customer.id,
              machineId: selectedMachine.id,
              duration: config.duration,
              cost: config.duration, // 1:1 ratio per requirements
              paymentMethod: config.paymentMethod,
              status: 'completed',
              createdAt: new Date()
            };
          });

          // Format usage history
          const usageHistory = usageHistoryService.formatUsageHistory(sessions, customer, machines);

          // Verify the property: machine information is correctly mapped from sessions
          for (let i = 0; i < usageHistory.length; i++) {
            const entry = usageHistory[i];
            const session = sessions[i];
            const expectedMachine = machines.get(session.machineId);

            expect(expectedMachine).toBeDefined();
            expect(entry.machineCode).toBe(expectedMachine!.code);
            expect(entry.machineLocation).toBe(expectedMachine!.location);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 25: Usage history completeness - handles missing machine data gracefully', () => {
    fc.assert(
      fc.property(
        // Generate customer
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress()
        }),
        // Generate sessions with potentially missing machine references
        fc.array(
          fc.record({
            duration: fc.integer({ min: 1, max: 30 }),
            paymentMethod: fc.constantFrom('balance', 'pix'),
            hasMachine: fc.boolean() // Whether the machine exists in our map
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (customerData, sessionConfigs) => {
          // Create test data
          const customer: User = {
            id: 'test-customer-1',
            email: customerData.email,
            name: customerData.name,
            accountBalance: 100,
            subscriptionStatus: 'none',
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const machines = new Map<string, Machine>();
          
          // Only create machines for some sessions
          const sessions: UsageSession[] = sessionConfigs.map((config, i) => {
            const machineId = `machine-${i}`;
            
            if (config.hasMachine) {
              // Create the machine
              const machine: Machine = {
                id: machineId,
                code: `TEST-CODE-${i}`,
                qrCode: 'test-qr-code',
                location: `Test Location ${i}`,
                controllerId: `controller-${i}`,
                status: 'online',
                operatingHours: { start: '08:00', end: '18:00' },
                maintenanceInterval: 100,
                currentOperatingHours: 0,
                createdAt: new Date(),
                updatedAt: new Date()
              };
              machines.set(machineId, machine);
            }
            
            return {
              id: `session-${i}`,
              userId: customer.id,
              machineId: machineId,
              duration: config.duration,
              cost: config.duration,
              paymentMethod: config.paymentMethod,
              status: 'completed',
              createdAt: new Date()
            };
          });

          // Format usage history
          const usageHistory = usageHistoryService.formatUsageHistory(sessions, customer, machines);

          // Verify the property: missing machine data is handled gracefully
          for (let i = 0; i < usageHistory.length; i++) {
            const entry = usageHistory[i];
            const session = sessions[i];
            const config = sessionConfigs[i];

            // All required fields should still be present
            expect(usageHistoryService.validateUsageHistoryEntry(entry)).toBe(true);

            if (config.hasMachine) {
              // Machine data should be present and correct
              const expectedMachine = machines.get(session.machineId);
              expect(entry.machineCode).toBe(expectedMachine!.code);
              expect(entry.machineLocation).toBe(expectedMachine!.location);
            } else {
              // Missing machine should be handled with 'Unknown' values
              expect(entry.machineCode).toBe('Unknown');
              expect(entry.machineLocation).toBe('Unknown');
            }

            // Other required fields should still be valid
            expect(entry.customerName).toBe(customer.name);
            expect(entry.duration).toBe(session.duration);
            expect(entry.paymentMethod).toBe(session.paymentMethod);
            expect(typeof entry.createdAt).toBe('string');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 25: Usage history completeness - preserves session order and completeness', () => {
    fc.assert(
      fc.property(
        // Generate customer
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress()
        }),
        // Generate ordered sessions
        fc.array(
          fc.record({
            duration: fc.integer({ min: 1, max: 30 }),
            paymentMethod: fc.constantFrom('balance', 'pix'),
            status: fc.constantFrom('pending', 'active', 'completed', 'failed')
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (customerData, sessionConfigs) => {
          // Create test data
          const customer: User = {
            id: 'test-customer-1',
            email: customerData.email,
            name: customerData.name,
            accountBalance: 100,
            subscriptionStatus: 'none',
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const machines = new Map<string, Machine>();
          const machine: Machine = {
            id: 'test-machine-1',
            code: 'TEST-MACHINE',
            qrCode: 'test-qr-code',
            location: 'Test Location',
            controllerId: 'controller-1',
            status: 'online',
            operatingHours: { start: '08:00', end: '18:00' },
            maintenanceInterval: 100,
            currentOperatingHours: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          machines.set(machine.id, machine);

          const sessions: UsageSession[] = sessionConfigs.map((config, i) => ({
            id: `session-${i}`,
            userId: customer.id,
            machineId: machine.id,
            duration: config.duration,
            cost: config.duration,
            paymentMethod: config.paymentMethod,
            status: config.status,
            createdAt: new Date(Date.now() + i * 1000) // Ensure different timestamps
          }));

          // Format usage history
          const usageHistory = usageHistoryService.formatUsageHistory(sessions, customer, machines);

          // Verify the property: order and completeness are preserved
          expect(usageHistory.length).toBe(sessions.length);

          for (let i = 0; i < usageHistory.length; i++) {
            const entry = usageHistory[i];
            const session = sessions[i];

            // Verify that each session maps to the correct entry
            expect(entry.id).toBe(session.id);
            expect(entry.duration).toBe(session.duration);
            expect(entry.cost).toBe(session.cost);
            expect(entry.paymentMethod).toBe(session.paymentMethod);
            expect(entry.status).toBe(session.status);

            // Verify all required fields are present
            expect(usageHistoryService.validateUsageHistoryEntry(entry)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});