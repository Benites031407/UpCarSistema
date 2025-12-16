import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { UsageSessionService } from './usageSessionService.js';

/**
 * Feature: machine-rental-system, Property 1: Cost calculation consistency
 * 
 * Property: For any usage duration between 1 and 30 minutes, the calculated cost 
 * should always equal the duration in minutes (1 R$ per minute)
 * 
 * Validates: Requirements 2.2
 */

describe('Cost Calculation Property Tests', () => {
  let usageSessionService: UsageSessionService;

  beforeEach(() => {
    usageSessionService = new UsageSessionService();
  });

  it('Property 1: Cost calculation consistency - valid duration range', () => {
    fc.assert(
      fc.property(
        // Generate valid duration values (1-30 minutes inclusive)
        fc.integer({ min: 1, max: 30 }),
        (duration: number) => {
          // Calculate cost using the service
          const calculatedCost = usageSessionService.calculateCost(duration);

          // Verify the property: cost should equal duration (1 R$ per minute)
          expect(calculatedCost).toBe(duration);
          
          // Additional verification: cost should be a positive number
          expect(calculatedCost).toBeGreaterThan(0);
          
          // Additional verification: cost should be an integer (since duration is integer)
          expect(Number.isInteger(calculatedCost)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: Cost calculation consistency - invalid duration handling', () => {
    fc.assert(
      fc.property(
        // Generate invalid duration values (outside 1-30 range)
        fc.oneof(
          fc.integer({ max: 0 }), // Zero or negative values
          fc.integer({ min: 31 }), // Values greater than 30
          fc.float({ min: Math.fround(0.1), max: Math.fround(30.9) }).filter(n => !Number.isInteger(n)) // Non-integer values
        ),
        (invalidDuration: number) => {
          // Verify that invalid durations throw an error
          expect(() => {
            usageSessionService.calculateCost(invalidDuration);
          }).toThrow('Invalid duration. Must be between 1 and 30 minutes.');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: Cost calculation consistency - boundary values', () => {
    // Test minimum boundary (1 minute)
    const minCost = usageSessionService.calculateCost(1);
    expect(minCost).toBe(1);

    // Test maximum boundary (30 minutes)
    const maxCost = usageSessionService.calculateCost(30);
    expect(maxCost).toBe(30);
  });

  it('Property 1: Cost calculation consistency - mathematical relationship', () => {
    fc.assert(
      fc.property(
        // Generate two valid durations
        fc.integer({ min: 1, max: 15 }),
        fc.integer({ min: 1, max: 15 }),
        (duration1: number, duration2: number) => {
          const cost1 = usageSessionService.calculateCost(duration1);
          const cost2 = usageSessionService.calculateCost(duration2);
          
          // Verify linear relationship: if duration1 > duration2, then cost1 > cost2
          if (duration1 > duration2) {
            expect(cost1).toBeGreaterThan(cost2);
          } else if (duration1 < duration2) {
            expect(cost1).toBeLessThan(cost2);
          } else {
            expect(cost1).toBe(cost2);
          }
          
          // Verify additive property: cost(a) + cost(b) = cost(a + b) when a + b <= 30
          if (duration1 + duration2 <= 30) {
            const combinedCost = usageSessionService.calculateCost(duration1 + duration2);
            expect(combinedCost).toBe(cost1 + cost2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});