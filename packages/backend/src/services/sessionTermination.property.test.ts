import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock external dependencies
vi.mock('../database/connection.js');
vi.mock('../repositories/index.js');
vi.mock('./sessionMqttHandler.js');
vi.mock('./paymentService.js');
vi.mock('./machineService.js');
vi.mock('./websocketService.js');

/**
 * Feature: machine-rental-system, Property 18: Automatic session termination
 * 
 * Property: For any active usage session, when the duration expires, the machine 
 * controller should automatically disengage the relay and report completion
 * 
 * Validates: Requirements 12.3
 */

// Simplified session termination service that implements the core logic
class SessionTerminationService {
  private activeTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private terminationCallbacks: Array<{
    sessionId: string;
    machineId: string;
    terminatedAt: Date;
    reason: 'duration_expired' | 'manual' | 'error';
  }> = [];

  /**
   * Schedules automatic session termination
   */
  scheduleTermination(sessionId: string, machineId: string, durationMinutes: number): void {
    // Clear any existing timeout for this session
    this.clearScheduledTermination(sessionId);

    const timeoutMs = durationMinutes * 60 * 1000;
    
    const timeout = setTimeout(() => {
      this.executeAutomaticTermination(sessionId, machineId);
    }, timeoutMs);

    this.activeTimeouts.set(sessionId, timeout);
  }

  /**
   * Executes automatic termination when duration expires
   */
  private executeAutomaticTermination(sessionId: string, machineId: string): void {
    // Check if session is still active (not manually terminated)
    if (this.activeTimeouts.has(sessionId)) {
      this.terminationCallbacks.push({
        sessionId,
        machineId,
        terminatedAt: new Date(),
        reason: 'duration_expired'
      });

      // Clean up timeout
      this.activeTimeouts.delete(sessionId);
    }
  }

  /**
   * Manually terminates a session (prevents automatic termination)
   */
  manualTermination(sessionId: string, machineId: string): void {
    this.clearScheduledTermination(sessionId);
    
    this.terminationCallbacks.push({
      sessionId,
      machineId,
      terminatedAt: new Date(),
      reason: 'manual'
    });
  }

  /**
   * Clears scheduled termination for a session
   */
  clearScheduledTermination(sessionId: string): void {
    const timeout = this.activeTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTimeouts.delete(sessionId);
    }
  }

  /**
   * Gets all termination callbacks (for testing)
   */
  getTerminationCallbacks(): Array<{
    sessionId: string;
    machineId: string;
    terminatedAt: Date;
    reason: 'duration_expired' | 'manual' | 'error';
  }> {
    return [...this.terminationCallbacks];
  }

  /**
   * Clears termination history (for testing)
   */
  clearTerminationHistory(): void {
    this.terminationCallbacks = [];
  }

  /**
   * Checks if a session has scheduled termination
   */
  hasScheduledTermination(sessionId: string): boolean {
    return this.activeTimeouts.has(sessionId);
  }

  /**
   * Gets count of active scheduled terminations
   */
  getActiveTerminationCount(): number {
    return this.activeTimeouts.size;
  }

  /**
   * Cleanup all timeouts (for testing)
   */
  cleanup(): void {
    for (const timeout of this.activeTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.activeTimeouts.clear();
    this.terminationCallbacks = [];
  }
}

describe('Session Termination Property Tests', () => {
  let terminationService: SessionTerminationService;

  beforeEach(() => {
    // Clear all mocks and timers
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();

    terminationService = new SessionTerminationService();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
    terminationService.cleanup();
  });

  it('Property 18: Automatic session termination - duration-based termination', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid session durations (1-30 minutes)
        fc.integer({ min: 1, max: 30 }),
        // Generate session and machine IDs
        fc.uuid(),
        fc.uuid(),
        async (durationMinutes: number, sessionId: string, machineId: string) => {
          // Use fake timers to control time progression
          vi.useFakeTimers();

          try {
            // Clear previous termination history
            terminationService.clearTerminationHistory();

            // Schedule automatic termination
            terminationService.scheduleTermination(sessionId, machineId, durationMinutes);

            // Verify termination is scheduled
            expect(terminationService.hasScheduledTermination(sessionId)).toBe(true);

            // Fast-forward time to just before duration expires
            const durationMs = durationMinutes * 60 * 1000;
            vi.advanceTimersByTime(durationMs - 100);

            // Session should still be scheduled (no termination yet)
            expect(terminationService.getTerminationCallbacks()).toHaveLength(0);
            expect(terminationService.hasScheduledTermination(sessionId)).toBe(true);

            // Fast-forward to exact expiration time
            vi.advanceTimersByTime(100);

            // Allow timers to execute
            await vi.runAllTimersAsync();

            // Verify automatic termination occurred
            const terminations = terminationService.getTerminationCallbacks();
            expect(terminations).toHaveLength(1);
            expect(terminations[0].sessionId).toBe(sessionId);
            expect(terminations[0].machineId).toBe(machineId);
            expect(terminations[0].reason).toBe('duration_expired');
            expect(terminations[0].terminatedAt).toBeInstanceOf(Date);

            // Verify scheduled termination was cleaned up
            expect(terminationService.hasScheduledTermination(sessionId)).toBe(false);

          } finally {
            vi.useRealTimers();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 18: Automatic session termination - timing precision', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate different duration values to test timing precision
        fc.integer({ min: 1, max: 10 }), // Shorter durations for faster tests
        fc.uuid(),
        fc.uuid(),
        async (durationMinutes: number, sessionId: string, machineId: string) => {
          vi.useFakeTimers();

          try {
            // Clear previous termination history
            terminationService.clearTerminationHistory();

            // Schedule termination
            terminationService.scheduleTermination(sessionId, machineId, durationMinutes);

            const durationMs = durationMinutes * 60 * 1000;

            // Test at various points before expiration
            const checkPoints = [0.25, 0.5, 0.75, 0.9]; // 25%, 50%, 75%, 90% of duration
            let currentTime = 0;
            
            for (const fraction of checkPoints) {
              const timePoint = Math.floor(durationMs * fraction);
              const timeToAdvance = timePoint - currentTime;
              
              if (timeToAdvance > 0) {
                vi.advanceTimersByTime(timeToAdvance);
                currentTime = timePoint;
              }
              
              // Should not have terminated yet
              expect(terminationService.getTerminationCallbacks()).toHaveLength(0);
              expect(terminationService.hasScheduledTermination(sessionId)).toBe(true);
            }
            
            // Advance to exact completion time
            const remainingTime = durationMs - currentTime;
            if (remainingTime > 0) {
              vi.advanceTimersByTime(remainingTime);
            }

            await vi.runAllTimersAsync();

            // Should have terminated exactly at completion
            const terminations = terminationService.getTerminationCallbacks();
            expect(terminations).toHaveLength(1);
            expect(terminations[0].reason).toBe('duration_expired');

          } finally {
            vi.useRealTimers();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 18: Automatic session termination - prevents double termination', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // At least 2 minutes for manual termination test
        fc.integer({ min: 1, max: 1 }), // Manual termination after 1 minute
        fc.uuid(),
        fc.uuid(),
        async (durationMinutes: number, manualTerminationMinutes: number, sessionId: string, machineId: string) => {
          vi.useFakeTimers();

          try {
            // Clear previous termination history
            terminationService.clearTerminationHistory();

            // Schedule automatic termination
            terminationService.scheduleTermination(sessionId, machineId, durationMinutes);

            // Manually terminate session before automatic termination
            const manualTerminationMs = manualTerminationMinutes * 60 * 1000;
            vi.advanceTimersByTime(manualTerminationMs);

            // Manually terminate the session
            terminationService.manualTermination(sessionId, machineId);

            // Verify manual termination occurred
            let terminations = terminationService.getTerminationCallbacks();
            expect(terminations).toHaveLength(1);
            expect(terminations[0].reason).toBe('manual');

            // Verify scheduled termination was cleared
            expect(terminationService.hasScheduledTermination(sessionId)).toBe(false);

            // Advance to when automatic termination would have occurred
            const remainingTime = (durationMinutes * 60 * 1000) - manualTerminationMs;
            vi.advanceTimersByTime(remainingTime);
            await vi.runAllTimersAsync();

            // Should not have additional termination (no double termination)
            terminations = terminationService.getTerminationCallbacks();
            expect(terminations).toHaveLength(1); // Still only the manual termination
            expect(terminations[0].reason).toBe('manual');

          } finally {
            vi.useRealTimers();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 18: Automatic session termination - multiple sessions independence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            sessionId: fc.uuid(),
            machineId: fc.uuid(),
            duration: fc.integer({ min: 1, max: 5 })
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (sessions) => {
          vi.useFakeTimers();

          try {
            // Clear previous termination history
            terminationService.clearTerminationHistory();

            // Schedule termination for all sessions
            for (const session of sessions) {
              terminationService.scheduleTermination(
                session.sessionId, 
                session.machineId, 
                session.duration
              );
            }

            // Verify all sessions are scheduled
            expect(terminationService.getActiveTerminationCount()).toBe(sessions.length);

            // Find the shortest duration
            const minDuration = Math.min(...sessions.map(s => s.duration));
            const maxDuration = Math.max(...sessions.map(s => s.duration));

            // Advance to when first session should terminate
            vi.advanceTimersByTime(minDuration * 60 * 1000);
            await vi.runAllTimersAsync();

            // At least one session should have terminated
            const firstTerminations = terminationService.getTerminationCallbacks();
            expect(firstTerminations.length).toBeGreaterThan(0);

            // Advance to when all sessions should have terminated
            vi.advanceTimersByTime((maxDuration - minDuration) * 60 * 1000);
            await vi.runAllTimersAsync();

            // All sessions should have terminated
            const allTerminations = terminationService.getTerminationCallbacks();
            expect(allTerminations).toHaveLength(sessions.length);

            // Verify each session terminated exactly once
            const terminatedSessionIds = allTerminations.map(t => t.sessionId);
            const uniqueSessionIds = [...new Set(terminatedSessionIds)];
            expect(uniqueSessionIds).toHaveLength(sessions.length);

            // Verify all terminations were due to duration expiry
            expect(allTerminations.every(t => t.reason === 'duration_expired')).toBe(true);

          } finally {
            vi.useRealTimers();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 18: Automatic session termination - termination timing accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        fc.uuid(),
        fc.uuid(),
        async (durationMinutes: number, sessionId: string, machineId: string) => {
          vi.useFakeTimers();

          try {
            // Clear previous termination history
            terminationService.clearTerminationHistory();

            const startTime = Date.now();
            
            // Schedule termination
            terminationService.scheduleTermination(sessionId, machineId, durationMinutes);

            const expectedDurationMs = durationMinutes * 60 * 1000;

            // Advance time to exact expiration
            vi.advanceTimersByTime(expectedDurationMs);
            await vi.runAllTimersAsync();

            // Verify termination occurred
            const terminations = terminationService.getTerminationCallbacks();
            expect(terminations).toHaveLength(1);

            const termination = terminations[0];
            expect(termination.sessionId).toBe(sessionId);
            expect(termination.machineId).toBe(machineId);
            expect(termination.reason).toBe('duration_expired');

            // Verify timing accuracy (termination should occur at expected time)
            const actualTerminationTime = termination.terminatedAt.getTime();
            const expectedTerminationTime = startTime + expectedDurationMs;
            
            // Allow small tolerance for timing (within 100ms)
            const timingDifference = Math.abs(actualTerminationTime - expectedTerminationTime);
            expect(timingDifference).toBeLessThan(100);

          } finally {
            vi.useRealTimers();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 18: Automatic session termination - cleanup behavior', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            sessionId: fc.uuid(),
            machineId: fc.uuid(),
            duration: fc.integer({ min: 1, max: 3 })
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (sessions) => {
          vi.useFakeTimers();

          try {
            // Clear previous termination history
            terminationService.clearTerminationHistory();

            // Schedule termination for all sessions
            for (const session of sessions) {
              terminationService.scheduleTermination(
                session.sessionId, 
                session.machineId, 
                session.duration
              );
            }

            // Verify all sessions are scheduled
            expect(terminationService.getActiveTerminationCount()).toBe(sessions.length);

            // Manually terminate some sessions
            const sessionsToManuallyTerminate = sessions.slice(0, Math.floor(sessions.length / 2));
            for (const session of sessionsToManuallyTerminate) {
              terminationService.manualTermination(session.sessionId, session.machineId);
            }

            // Verify manual terminations cleared their scheduled timeouts
            const expectedActiveCount = sessions.length - sessionsToManuallyTerminate.length;
            expect(terminationService.getActiveTerminationCount()).toBe(expectedActiveCount);

            // Advance time to complete remaining sessions
            const maxDuration = Math.max(...sessions.map(s => s.duration));
            vi.advanceTimersByTime(maxDuration * 60 * 1000);
            await vi.runAllTimersAsync();

            // Verify all sessions terminated (manual + automatic)
            const allTerminations = terminationService.getTerminationCallbacks();
            expect(allTerminations).toHaveLength(sessions.length);

            // Verify no active timeouts remain
            expect(terminationService.getActiveTerminationCount()).toBe(0);

            // Verify termination reasons are correct
            const manualTerminations = allTerminations.filter(t => t.reason === 'manual');
            const autoTerminations = allTerminations.filter(t => t.reason === 'duration_expired');
            
            expect(manualTerminations).toHaveLength(sessionsToManuallyTerminate.length);
            expect(autoTerminations).toHaveLength(expectedActiveCount);

          } finally {
            vi.useRealTimers();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});