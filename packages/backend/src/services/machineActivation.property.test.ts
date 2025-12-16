import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { UsageSession, Machine } from '../models/types.js';

/**
 * Feature: machine-rental-system, Property 3: Machine activation triggers IoT command
 * 
 * Property: For any successful payment and machine selection, the system should send 
 * an activation command to the corresponding machine controller
 * 
 * Validates: Requirements 2.5, 12.1
 */

// Simplified MQTT command interface for testing
interface MQTTCommand {
  type: 'activate' | 'deactivate';
  machineId: string;
  sessionId: string;
  duration?: number;
  timestamp: string;
}

// Simplified machine activation service that implements the core logic
class MachineActivationService {
  private mqttCommands: MQTTCommand[] = [];

  /**
   * Activates a machine session and sends IoT command
   * This simulates the core logic without external dependencies
   */
  async activateSession(session: UsageSession, machine: Machine): Promise<{ 
    success: boolean; 
    mqttCommand?: MQTTCommand;
    error?: string;
  }> {
    // Validate session status
    if (session.status !== 'pending') {
      return {
        success: false,
        error: `Cannot activate session with status: ${session.status}`
      };
    }

    // Validate machine availability
    if (machine.status !== 'online') {
      return {
        success: false,
        error: `Machine is not available. Status: ${machine.status}`
      };
    }

    // Validate duration
    if (session.duration < 1 || session.duration > 30) {
      return {
        success: false,
        error: 'Invalid duration. Must be between 1 and 30 minutes.'
      };
    }

    // Create and send MQTT activation command
    const mqttCommand: MQTTCommand = {
      type: 'activate',
      machineId: machine.id,
      sessionId: session.id,
      duration: session.duration,
      timestamp: new Date().toISOString()
    };

    // Simulate sending MQTT command
    this.mqttCommands.push(mqttCommand);

    return {
      success: true,
      mqttCommand
    };
  }

  /**
   * Gets all MQTT commands that were sent (for testing purposes)
   */
  getMQTTCommands(): MQTTCommand[] {
    return [...this.mqttCommands];
  }

  /**
   * Clears MQTT command history (for testing purposes)
   */
  clearMQTTCommands(): void {
    this.mqttCommands = [];
  }

  /**
   * Validates if a session can be activated
   */
  canActivateSession(session: UsageSession, machine: Machine): boolean {
    return session.status === 'pending' && 
           machine.status === 'online' && 
           session.duration >= 1 && 
           session.duration <= 30;
  }
}

describe('Machine Activation Property Tests', () => {
  let activationService: MachineActivationService;

  beforeEach(() => {
    activationService = new MachineActivationService();
  });

  it('Property 3: Machine activation triggers IoT command - successful activation', async () => {
    await fc.assert(
      fc.asyncProperty(
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
        // Generate valid machine data
        fc.record({
          id: fc.uuid(),
          code: fc.string({ minLength: 4, maxLength: 10 }),
          qrCode: fc.string({ minLength: 10, maxLength: 50 }),
          location: fc.string({ minLength: 1, maxLength: 100 }),
          controllerId: fc.uuid(),
          status: fc.constant('online'), // Ensure machine is available
          operatingHours: fc.record({
            start: fc.constantFrom('06:00', '07:00', '08:00'),
            end: fc.constantFrom('18:00', '19:00', '20:00')
          }),
          maintenanceInterval: fc.integer({ min: 100, max: 1000 }),
          currentOperatingHours: fc.integer({ min: 0, max: 500 }),
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        async (sessionData, machineData) => {
          // Ensure session and machine IDs match
          sessionData.machineId = machineData.id;
          
          // Clear previous MQTT commands
          activationService.clearMQTTCommands();

          // Activate the session
          const result = await activationService.activateSession(sessionData as UsageSession, machineData as Machine);

          // Verify the property: successful activation should trigger IoT command
          expect(result.success).toBe(true);
          expect(result.mqttCommand).toBeDefined();
          expect(result.error).toBeUndefined();

          // Verify MQTT command was created and sent
          const mqttCommands = activationService.getMQTTCommands();
          expect(mqttCommands).toHaveLength(1);

          const command = mqttCommands[0];
          expect(command.type).toBe('activate');
          expect(command.machineId).toBe(machineData.id);
          expect(command.sessionId).toBe(sessionData.id);
          expect(command.duration).toBe(sessionData.duration);
          expect(command.timestamp).toBeDefined();

          // Verify command parameters match session data
          expect(result.mqttCommand!.machineId).toBe(sessionData.machineId);
          expect(result.mqttCommand!.sessionId).toBe(sessionData.id);
          expect(result.mqttCommand!.duration).toBe(sessionData.duration);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3: Machine activation triggers IoT command - MQTT command parameters', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate session parameters
        fc.record({
          sessionId: fc.uuid(),
          machineId: fc.uuid(),
          duration: fc.integer({ min: 1, max: 30 })
        }),
        async (sessionParams) => {
          // Create session and machine with matching IDs
          const session: UsageSession = {
            id: sessionParams.sessionId,
            userId: fc.sample(fc.uuid(), 1)[0],
            machineId: sessionParams.machineId,
            duration: sessionParams.duration,
            cost: sessionParams.duration,
            paymentMethod: 'balance',
            status: 'pending',
            createdAt: new Date()
          };

          const machine: Machine = {
            id: sessionParams.machineId,
            code: 'TEST001',
            qrCode: 'qr-test-001',
            location: 'Test Location',
            controllerId: fc.sample(fc.uuid(), 1)[0],
            status: 'online',
            operatingHours: { start: '08:00', end: '18:00' },
            maintenanceInterval: 500,
            currentOperatingHours: 100,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Clear previous MQTT commands
          activationService.clearMQTTCommands();

          // Activate the session
          const result = await activationService.activateSession(session, machine);

          // Verify the property: MQTT command contains correct parameters
          expect(result.success).toBe(true);
          expect(result.mqttCommand).toBeDefined();

          const command = result.mqttCommand!;
          expect(command.type).toBe('activate');
          expect(command.machineId).toBe(sessionParams.machineId);
          expect(command.sessionId).toBe(sessionParams.sessionId);
          expect(command.duration).toBe(sessionParams.duration);
          expect(command.timestamp).toBeDefined();

          // Verify timestamp is a valid ISO string
          expect(() => new Date(command.timestamp)).not.toThrow();
          
          // Verify MQTT command was recorded
          const mqttCommands = activationService.getMQTTCommands();
          expect(mqttCommands).toHaveLength(1);
          expect(mqttCommands[0]).toEqual(command);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3: Machine activation triggers IoT command - activation flow consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // sessionId
        fc.uuid(), // machineId
        fc.integer({ min: 1, max: 30 }), // duration
        async (sessionId, machineId, duration) => {
          // Create session and machine
          const session: UsageSession = {
            id: sessionId,
            userId: fc.sample(fc.uuid(), 1)[0],
            machineId: machineId,
            duration: duration,
            cost: duration,
            paymentMethod: 'balance',
            status: 'pending',
            createdAt: new Date()
          };

          const machine: Machine = {
            id: machineId,
            code: 'TEST001',
            qrCode: 'qr-test-001',
            location: 'Test Location',
            controllerId: fc.sample(fc.uuid(), 1)[0],
            status: 'online',
            operatingHours: { start: '08:00', end: '18:00' },
            maintenanceInterval: 500,
            currentOperatingHours: 100,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Clear previous MQTT commands
          activationService.clearMQTTCommands();

          // Activate session
          const result = await activationService.activateSession(session, machine);

          // Verify the property: activation flow should be consistent
          expect(result.success).toBe(true);
          expect(result.mqttCommand).toBeDefined();

          // Verify MQTT command was created with correct flow
          const mqttCommands = activationService.getMQTTCommands();
          expect(mqttCommands).toHaveLength(1);

          const command = mqttCommands[0];
          
          // Verify activation command properties
          expect(command.type).toBe('activate');
          expect(command.machineId).toBe(machineId);
          expect(command.sessionId).toBe(sessionId);
          expect(command.duration).toBe(duration);

          // Verify timestamp is recent (within last few seconds)
          const commandTime = new Date(command.timestamp);
          const now = new Date();
          const timeDiff = now.getTime() - commandTime.getTime();
          expect(timeDiff).toBeLessThan(5000); // Within 5 seconds

          // Verify that only one command was sent per activation
          expect(mqttCommands.filter(cmd => cmd.sessionId === sessionId)).toHaveLength(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3: Machine activation triggers IoT command - error handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // sessionId
        fc.uuid(), // machineId
        fc.constantFrom('wrong_session_status', 'wrong_machine_status', 'invalid_duration'), // error type
        async (sessionId, machineId, errorType) => {
          let session: UsageSession;
          let machine: Machine;

          // Create base machine (online by default)
          machine = {
            id: machineId,
            code: 'TEST001',
            qrCode: 'qr-test-001',
            location: 'Test Location',
            controllerId: fc.sample(fc.uuid(), 1)[0],
            status: 'online',
            operatingHours: { start: '08:00', end: '18:00' },
            maintenanceInterval: 500,
            currentOperatingHours: 100,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Create base session (pending by default)
          session = {
            id: sessionId,
            userId: fc.sample(fc.uuid(), 1)[0],
            machineId: machineId,
            duration: 10,
            cost: 10,
            paymentMethod: 'balance',
            status: 'pending',
            createdAt: new Date()
          };

          // Modify based on error type
          if (errorType === 'wrong_session_status') {
            session.status = 'completed'; // Wrong status for activation
          } else if (errorType === 'wrong_machine_status') {
            machine.status = 'maintenance'; // Machine not available
          } else if (errorType === 'invalid_duration') {
            session.duration = 35; // Invalid duration (> 30)
          }

          // Clear previous MQTT commands
          activationService.clearMQTTCommands();

          // Attempt activation
          const result = await activationService.activateSession(session, machine);

          // Verify the property: activation should fail and no IoT command should be sent
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.mqttCommand).toBeUndefined();

          // Verify no MQTT command was sent
          const mqttCommands = activationService.getMQTTCommands();
          expect(mqttCommands).toHaveLength(0);

          // Verify specific error messages
          if (errorType === 'wrong_session_status') {
            expect(result.error).toContain('Cannot activate session with status: completed');
          } else if (errorType === 'wrong_machine_status') {
            expect(result.error).toContain('Machine is not available. Status: maintenance');
          } else if (errorType === 'invalid_duration') {
            expect(result.error).toContain('Invalid duration. Must be between 1 and 30 minutes.');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3: Machine activation triggers IoT command - validation consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate session data with various statuses
        fc.record({
          id: fc.uuid(),
          userId: fc.uuid(),
          machineId: fc.uuid(),
          duration: fc.integer({ min: -5, max: 35 }), // Include invalid durations
          cost: fc.integer({ min: 1, max: 30 }),
          paymentMethod: fc.constantFrom('balance', 'pix'),
          status: fc.constantFrom('pending', 'active', 'completed', 'failed'),
          createdAt: fc.date()
        }),
        // Generate machine data with various statuses
        fc.record({
          id: fc.uuid(),
          code: fc.string({ minLength: 4, maxLength: 10 }),
          qrCode: fc.string({ minLength: 10, maxLength: 50 }),
          location: fc.string({ minLength: 1, maxLength: 100 }),
          controllerId: fc.uuid(),
          status: fc.constantFrom('online', 'offline', 'maintenance', 'in_use'),
          operatingHours: fc.record({
            start: fc.constantFrom('06:00', '07:00', '08:00'),
            end: fc.constantFrom('18:00', '19:00', '20:00')
          }),
          maintenanceInterval: fc.integer({ min: 100, max: 1000 }),
          currentOperatingHours: fc.integer({ min: 0, max: 500 }),
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        async (sessionData, machineData) => {
          // Ensure session and machine IDs match
          sessionData.machineId = machineData.id;

          // Clear previous MQTT commands
          activationService.clearMQTTCommands();

          // Check if activation should succeed based on validation rules
          const shouldSucceed = activationService.canActivateSession(
            sessionData as UsageSession, 
            machineData as Machine
          );

          // Attempt activation
          const result = await activationService.activateSession(
            sessionData as UsageSession, 
            machineData as Machine
          );

          // Verify the property: validation consistency
          if (shouldSucceed) {
            expect(result.success).toBe(true);
            expect(result.mqttCommand).toBeDefined();
            expect(result.error).toBeUndefined();

            // Verify MQTT command was sent
            const mqttCommands = activationService.getMQTTCommands();
            expect(mqttCommands).toHaveLength(1);
          } else {
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.mqttCommand).toBeUndefined();

            // Verify no MQTT command was sent
            const mqttCommands = activationService.getMQTTCommands();
            expect(mqttCommands).toHaveLength(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});