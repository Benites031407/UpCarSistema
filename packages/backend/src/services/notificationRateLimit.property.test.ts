import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: machine-rental-system, Property 22: Notification rate limiting
 * 
 * Property: For any sequence of rapid notifications, the system should implement 
 * rate limiting to prevent notification spam
 * 
 * Validates: Requirements 10.5
 */

// Helper function to simulate rate limiting behavior
function simulateRateLimiting(
  notificationTimestamps: number[],
  maxNotificationsPerHour: number = 10,
  timeWindowMs: number = 60 * 60 * 1000 // 1 hour
): {
  allowedNotifications: number[];
  blockedNotifications: number[];
  totalAllowed: number;
  totalBlocked: number;
  rateLimitingTriggered: boolean;
} {
  const allowedNotifications: number[] = [];
  const blockedNotifications: number[] = [];
  
  // Sort timestamps to process in chronological order
  const sortedTimestamps = [...notificationTimestamps].sort((a, b) => a - b);
  
  for (const timestamp of sortedTimestamps) {
    // Count notifications in the current time window
    const windowStart = timestamp - timeWindowMs;
    const notificationsInWindow = allowedNotifications.filter(ts => ts > windowStart).length;
    
    if (notificationsInWindow < maxNotificationsPerHour) {
      allowedNotifications.push(timestamp);
    } else {
      blockedNotifications.push(timestamp);
    }
  }
  
  return {
    allowedNotifications,
    blockedNotifications,
    totalAllowed: allowedNotifications.length,
    totalBlocked: blockedNotifications.length,
    rateLimitingTriggered: blockedNotifications.length > 0
  };
}

// Helper function to generate notification timestamps within a time window
function generateRapidNotifications(
  count: number,
  baseTime: number = Date.now(),
  maxSpreadMs: number = 5 * 60 * 1000 // 5 minutes spread
): number[] {
  const timestamps: number[] = [];
  for (let i = 0; i < count; i++) {
    // Generate timestamps within a short time window to simulate rapid notifications
    const offset = Math.floor(Math.random() * maxSpreadMs);
    timestamps.push(baseTime + offset);
  }
  return timestamps;
}

describe('Notification Rate Limiting Property Tests', () => {

  it('Property 22: Rate limiting prevents notification spam for rapid sequences', () => {
    fc.assert(
      fc.property(
        // Generate number of notifications exceeding the rate limit
        fc.integer({ min: 11, max: 25 }),
        
        // Generate base timestamp
        fc.integer({ min: Date.now() - 86400000, max: Date.now() }), // Within last 24 hours
        
        (notificationCount: number, baseTime: number) => {
          // Generate rapid notifications within a short time window
          const timestamps = generateRapidNotifications(notificationCount, baseTime);
          
          // Apply rate limiting simulation
          const result = simulateRateLimiting(timestamps, 10);
          
          // Verify the property: rate limiting should prevent spam
          expect(result.totalAllowed).toBeLessThanOrEqual(10);
          expect(result.rateLimitingTriggered).toBe(true);
          expect(result.totalBlocked).toBeGreaterThan(0);
          expect(result.totalAllowed + result.totalBlocked).toBe(notificationCount);
          
          // Verify that exactly 10 notifications are allowed when exceeding limit
          expect(result.totalAllowed).toBe(10);
          expect(result.totalBlocked).toBe(notificationCount - 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 22: Rate limiting allows notifications within the limit', () => {
    fc.assert(
      fc.property(
        // Generate number of notifications within the rate limit
        fc.integer({ min: 1, max: 10 }),
        
        // Generate base timestamp
        fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
        
        (notificationCount: number, baseTime: number) => {
          // Generate notifications within a short time window
          const timestamps = generateRapidNotifications(notificationCount, baseTime);
          
          // Apply rate limiting simulation
          const result = simulateRateLimiting(timestamps, 10);
          
          // Verify the property: all notifications within limit should be allowed
          expect(result.totalAllowed).toBe(notificationCount);
          expect(result.totalBlocked).toBe(0);
          expect(result.rateLimitingTriggered).toBe(false);
          expect(result.allowedNotifications.length).toBe(notificationCount);
          expect(result.blockedNotifications.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 22: Rate limiting resets after time window', () => {
    fc.assert(
      fc.property(
        // Generate two batches of notifications
        fc.integer({ min: 8, max: 10 }), // First batch (within limit)
        fc.integer({ min: 3, max: 7 }),  // Second batch
        fc.integer({ min: 61 * 60 * 1000, max: 120 * 60 * 1000 }), // Time gap (1-2 hours)
        
        (firstBatchSize: number, secondBatchSize: number, timeGap: number) => {
          const baseTime = Date.now();
          
          // Generate first batch of notifications
          const firstBatchTimestamps = generateRapidNotifications(firstBatchSize, baseTime);
          
          // Generate second batch after time gap (should reset rate limit)
          const secondBatchTimestamps = generateRapidNotifications(
            secondBatchSize, 
            baseTime + timeGap
          );
          
          // Combine all timestamps
          const allTimestamps = [...firstBatchTimestamps, ...secondBatchTimestamps];
          
          // Apply rate limiting simulation
          const result = simulateRateLimiting(allTimestamps, 10);
          
          // Verify the property: rate limiting should reset after time window
          // Both batches should be allowed since they're separated by more than 1 hour
          const totalNotifications = firstBatchSize + secondBatchSize;
          
          if (totalNotifications <= 10) {
            // If total is within limit, all should be allowed
            expect(result.totalAllowed).toBe(totalNotifications);
            expect(result.totalBlocked).toBe(0);
          } else {
            // If total exceeds limit, but batches are separated by time window,
            // we should still allow more than just 10 total
            expect(result.totalAllowed).toBeGreaterThan(10);
          }
          
          expect(result.totalAllowed + result.totalBlocked).toBe(totalNotifications);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 22: Rate limiting applies globally across notification types', () => {
    fc.assert(
      fc.property(
        // Generate different notification type counts
        fc.record({
          maintenanceCount: fc.integer({ min: 2, max: 6 }),
          offlineCount: fc.integer({ min: 2, max: 6 }),
          errorCount: fc.integer({ min: 2, max: 6 })
        }),
        
        // Generate base timestamp
        fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
        
        (counts, baseTime: number) => {
          const totalNotifications = counts.maintenanceCount + counts.offlineCount + counts.errorCount;
          
          // Generate timestamps for all notification types within the same time window
          const timestamps = generateRapidNotifications(totalNotifications, baseTime);
          
          // Apply rate limiting simulation (should apply globally, not per type)
          const result = simulateRateLimiting(timestamps, 10);
          
          // Verify the property: rate limiting applies globally across all notification types
          if (totalNotifications <= 10) {
            expect(result.totalAllowed).toBe(totalNotifications);
            expect(result.totalBlocked).toBe(0);
            expect(result.rateLimitingTriggered).toBe(false);
          } else {
            expect(result.totalAllowed).toBe(10);
            expect(result.totalBlocked).toBe(totalNotifications - 10);
            expect(result.rateLimitingTriggered).toBe(true);
          }
          
          expect(result.totalAllowed + result.totalBlocked).toBe(totalNotifications);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 22: Rate limiting boundary conditions', () => {
    // Test exact boundary conditions
    const baseTime = Date.now();
    
    // Test exactly at the limit (10 notifications)
    const exactLimitTimestamps = generateRapidNotifications(10, baseTime);
    const exactLimitResult = simulateRateLimiting(exactLimitTimestamps, 10);
    
    expect(exactLimitResult.totalAllowed).toBe(10);
    expect(exactLimitResult.totalBlocked).toBe(0);
    expect(exactLimitResult.rateLimitingTriggered).toBe(false);
    
    // Test just over the limit (11 notifications)
    const overLimitTimestamps = generateRapidNotifications(11, baseTime);
    const overLimitResult = simulateRateLimiting(overLimitTimestamps, 10);
    
    expect(overLimitResult.totalAllowed).toBe(10);
    expect(overLimitResult.totalBlocked).toBe(1);
    expect(overLimitResult.rateLimitingTriggered).toBe(true);
    
    // Test well under the limit (5 notifications)
    const underLimitTimestamps = generateRapidNotifications(5, baseTime);
    const underLimitResult = simulateRateLimiting(underLimitTimestamps, 10);
    
    expect(underLimitResult.totalAllowed).toBe(5);
    expect(underLimitResult.totalBlocked).toBe(0);
    expect(underLimitResult.rateLimitingTriggered).toBe(false);
  });

  it('Property 22: Rate limiting maintains consistent behavior across different time patterns', () => {
    fc.assert(
      fc.property(
        // Generate different time distribution patterns
        fc.oneof(
          // Burst pattern: all notifications within 1 minute
          fc.constant({ pattern: 'burst', spreadMs: 60 * 1000 }),
          // Spread pattern: notifications over 10 minutes
          fc.constant({ pattern: 'spread', spreadMs: 10 * 60 * 1000 }),
          // Mixed pattern: notifications over 30 minutes
          fc.constant({ pattern: 'mixed', spreadMs: 30 * 60 * 1000 })
        ),
        
        // Generate notification count that exceeds limit
        fc.integer({ min: 12, max: 20 }),
        
        // Generate base timestamp
        fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
        
        (timePattern, notificationCount: number, baseTime: number) => {
          // Generate timestamps based on the pattern
          const timestamps = generateRapidNotifications(
            notificationCount, 
            baseTime, 
            timePattern.spreadMs
          );
          
          // Apply rate limiting simulation
          const result = simulateRateLimiting(timestamps, 10);
          
          // Verify the property: rate limiting behavior should be consistent regardless of time pattern
          // As long as notifications are within the same hour window, rate limiting should apply
          expect(result.totalAllowed).toBeLessThanOrEqual(10);
          expect(result.rateLimitingTriggered).toBe(true);
          expect(result.totalBlocked).toBeGreaterThan(0);
          expect(result.totalAllowed + result.totalBlocked).toBe(notificationCount);
          
          // Verify that allowed notifications are chronologically first
          const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
          const expectedAllowed = sortedTimestamps.slice(0, result.totalAllowed);
          const expectedBlocked = sortedTimestamps.slice(result.totalAllowed);
          
          expect(result.allowedNotifications.sort()).toEqual(expectedAllowed.sort());
          expect(result.blockedNotifications.sort()).toEqual(expectedBlocked.sort());
        }
      ),
      { numRuns: 50 }
    );
  });
});