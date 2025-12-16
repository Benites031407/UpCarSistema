import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { RelayController } from './relay.js';

/**
 * Feature: machine-rental-system, Property 17: Relay control duration accuracy
 * 
 * Property: For any machine activation command with specified duration, the relay 
 * should remain engaged for exactly that duration
 * 
 * Validates: Requirements 12.2
 */

describe('Relay Control Duration Property Tests', () => {
  let mockGpio: any;

  beforeEach(() => {
    // Clear all mocks and timers before each test
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();

    // Mock the GPIO interface to avoid hardware dependencies
    mockGpio = {
      digitalWrite: vi.fn(),
      digitalRead: vi.fn().mockReturnValue(0)
    };

    // Mock pigpio module
    vi.doMock('pigpio', () => ({
      Gpio: vi.fn().mockImplementation(() => mockGpio)
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('Property 17: Relay control duration accuracy - valid duration range', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid duration values in milliseconds (1 second to 30 minutes)
        fc.integer({ min: 1000, max: 1800000 }), // 1 second to 30 minutes in ms
        async (durationMs: number) => {
          // Create a fresh relay controller for each test
          const relayController = new RelayController();
          
          // Use fake timers to control time progression
          vi.useFakeTimers();
          
          try {
            // Activate relay for the specified duration
            relayController.activate(durationMs);
            
            // Verify relay is activated immediately
            expect(relayController.isActive()).toBe(true);
            expect(mockGpio.digitalWrite).toHaveBeenCalledWith(1);
            
            // Fast-forward time to just before the duration expires
            vi.advanceTimersByTime(durationMs - 100);
            
            // Relay should still be active
            expect(relayController.isActive()).toBe(true);
            
            // Fast-forward time to exactly when duration expires
            vi.advanceTimersByTime(100);
            
            // Relay should now be deactivated automatically
            expect(relayController.isActive()).toBe(false);
            expect(mockGpio.digitalWrite).toHaveBeenCalledWith(0);
            
            // Verify the timing accuracy
            const status = relayController.getStatus();
            expect(status.isActive).toBe(false);
          } finally {
            // Clean up
            relayController.cleanup();
            vi.useRealTimers();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 17: Relay control duration accuracy - timing precision', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate durations in minutes (1-30) and convert to milliseconds
        fc.integer({ min: 1, max: 30 }),
        async (durationMinutes: number) => {
          const relayController = new RelayController();
          vi.useFakeTimers();
          
          try {
            const durationMs = durationMinutes * 60 * 1000;
            
            // Activate relay
            relayController.activate(durationMs);
            
            // Verify initial state
            expect(relayController.isActive()).toBe(true);
            const initialStatus = relayController.getStatus();
            expect(initialStatus.activationStartTime).toBeInstanceOf(Date);
            
            // Test at various time points during activation
            const checkPoints = [0.25, 0.5, 0.75]; // 25%, 50%, 75% of duration
            
            let totalAdvanced = 0;
            for (const fraction of checkPoints) {
              const targetTime = Math.floor(durationMs * fraction);
              const timeToAdvance = targetTime - totalAdvanced;
              
              if (timeToAdvance > 0) {
                vi.advanceTimersByTime(timeToAdvance);
                totalAdvanced += timeToAdvance;
                
                // Should still be active at these intermediate points
                expect(relayController.isActive()).toBe(true);
              }
            }
            
            // Advance to exact completion time
            const remainingTime = durationMs - totalAdvanced;
            if (remainingTime > 0) {
              vi.advanceTimersByTime(remainingTime);
            }
            
            // Should be deactivated exactly at completion
            expect(relayController.isActive()).toBe(false);
          } finally {
            relayController.cleanup();
            vi.useRealTimers();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 17: Relay control duration accuracy - early deactivation handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate duration and early stop time
        fc.integer({ min: 5000, max: 1800000 }), // 5 seconds to 30 minutes
        fc.integer({ min: 1000, max: 4000 }), // Early stop between 1-4 seconds
        async (fullDurationMs: number, earlyStopMs: number) => {
          const relayController = new RelayController();
          vi.useFakeTimers();
          
          try {
            // Activate relay for full duration
            relayController.activate(fullDurationMs);
            expect(relayController.isActive()).toBe(true);
            
            // Store initial call count
            const initialCallCount = mockGpio.digitalWrite.mock.calls.length;
            
            // Manually deactivate early
            vi.advanceTimersByTime(earlyStopMs);
            relayController.deactivate();
            
            // Should be deactivated immediately
            expect(relayController.isActive()).toBe(false);
            expect(mockGpio.digitalWrite).toHaveBeenCalledWith(0);
            
            // Store call count after manual deactivation
            const afterDeactivationCallCount = mockGpio.digitalWrite.mock.calls.length;
            
            // Advance to when original duration would have expired
            vi.advanceTimersByTime(fullDurationMs - earlyStopMs);
            
            // Should remain deactivated (no double deactivation)
            expect(relayController.isActive()).toBe(false);
            
            // Verify no additional GPIO calls were made
            expect(mockGpio.digitalWrite.mock.calls.length).toBe(afterDeactivationCallCount);
          } finally {
            relayController.cleanup();
            vi.useRealTimers();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 17: Relay control duration accuracy - status reporting consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2000, max: 10000 }), // 2-10 seconds for faster tests
        async (durationMs: number) => {
          const relayController = new RelayController();
          vi.useFakeTimers();
          
          try {
            // Activate relay
            relayController.activate(durationMs);
            
            // Check status at multiple points during activation
            const statusChecks = [0.1, 0.3, 0.7, 0.9]; // Various fractions of duration
            let totalAdvanced = 0;
            
            for (const fraction of statusChecks) {
              const targetTime = Math.floor(durationMs * fraction);
              const timeToAdvance = targetTime - totalAdvanced;
              
              if (timeToAdvance > 0) {
                vi.advanceTimersByTime(timeToAdvance);
                totalAdvanced += timeToAdvance;
                
                const status = relayController.getStatus();
                
                // Should be active before duration expires
                expect(status.isActive).toBe(true);
                expect(status.activationStartTime).toBeInstanceOf(Date);
                expect(status.activeDurationMs).toBeGreaterThanOrEqual(targetTime - 100); // Allow small tolerance
                expect(status.activeDurationMs).toBeLessThanOrEqual(targetTime + 100);
              }
            }
            
            // Advance to completion
            vi.advanceTimersByTime(durationMs);
            
            const finalStatus = relayController.getStatus();
            expect(finalStatus.isActive).toBe(false);
            expect(finalStatus.activationStartTime).toBeNull();
            expect(finalStatus.activeDurationMs).toBe(0);
          } finally {
            relayController.cleanup();
            vi.useRealTimers();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 17: Relay control duration accuracy - invalid duration rejection', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate invalid durations
        fc.oneof(
          fc.integer({ max: 0 }), // Zero or negative
          fc.integer({ min: 1800001 }), // Greater than 30 minutes
          fc.float({ min: -1000, max: 0 }).filter(n => n <= 0) // Negative floats
        ),
        async (invalidDuration: number) => {
          const relayController = new RelayController();
          
          try {
            // Should reject invalid durations
            expect(() => {
              relayController.activate(invalidDuration);
            }).toThrow('Invalid activation duration');
            
            // Relay should remain inactive
            expect(relayController.isActive()).toBe(false);
            
            // GPIO should not be called for this specific controller instance
            // Note: We can't check mockGpio.digitalWrite because it's shared across tests
          } finally {
            relayController.cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 17: Relay control duration accuracy - concurrent activation prevention', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1000, max: 10000 }), // First duration
        fc.integer({ min: 1000, max: 10000 }), // Second duration
        async (duration1: number, duration2: number) => {
          const relayController = new RelayController();
          vi.useFakeTimers();
          
          try {
            // Start first activation
            relayController.activate(duration1);
            expect(relayController.isActive()).toBe(true);
            
            // Attempt second activation while first is active
            expect(() => {
              relayController.activate(duration2);
            }).toThrow('Relay is already active');
            
            // First activation should continue unaffected
            expect(relayController.isActive()).toBe(true);
            
            // Advance time to complete first activation
            vi.advanceTimersByTime(duration1);
            expect(relayController.isActive()).toBe(false);
            
            // Now second activation should be possible
            expect(() => {
              relayController.activate(duration2);
            }).not.toThrow();
            
            expect(relayController.isActive()).toBe(true);
          } finally {
            relayController.cleanup();
            vi.useRealTimers();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 17: Relay control duration accuracy - emergency stop behavior', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5000, max: 30000 }), // 5-30 seconds
        fc.integer({ min: 1000, max: 4000 }), // Emergency stop time
        async (durationMs: number, emergencyTime: number) => {
          const relayController = new RelayController();
          vi.useFakeTimers();
          
          try {
            // Start activation
            relayController.activate(durationMs);
            expect(relayController.isActive()).toBe(true);
            
            // Store call count before emergency stop
            const callCountBeforeStop = mockGpio.digitalWrite.mock.calls.length;
            
            // Advance to emergency stop time
            vi.advanceTimersByTime(emergencyTime);
            
            // Trigger emergency stop
            relayController.emergencyStop();
            
            // Should be immediately deactivated
            expect(relayController.isActive()).toBe(false);
            expect(mockGpio.digitalWrite).toHaveBeenCalledWith(0);
            
            // Store call count after emergency stop
            const callCountAfterStop = mockGpio.digitalWrite.mock.calls.length;
            
            // Advance to when original duration would have completed
            vi.advanceTimersByTime(durationMs - emergencyTime);
            
            // Should remain deactivated
            expect(relayController.isActive()).toBe(false);
            
            // No additional GPIO calls should have been made
            expect(mockGpio.digitalWrite.mock.calls.length).toBe(callCountAfterStop);
          } finally {
            relayController.cleanup();
            vi.useRealTimers();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});