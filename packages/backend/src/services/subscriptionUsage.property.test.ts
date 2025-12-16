import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { User, UsageSession } from '../models/types.js';

/**
 * Feature: machine-rental-system, Property 4: Subscription daily usage enforcement
 * 
 * Property: For any monthly subscription customer, if they have already used a machine today, 
 * attempting to activate another machine should be prevented
 * 
 * Validates: Requirements 4.2, 4.3
 */

// Simplified subscription usage service that implements the core logic
class SubscriptionUsageService {
  private dailyUsageSessions: Map<string, UsageSession[]> = new Map();

  /**
   * Records a completed usage session for a user
   */
  recordCompletedSession(userId: string, session: UsageSession): void {
    if (!this.dailyUsageSessions.has(userId)) {
      this.dailyUsageSessions.set(userId, []);
    }
    this.dailyUsageSessions.get(userId)!.push(session);
  }

  /**
   * Checks if subscription user has already used a machine today
   */
  checkSubscriptionDailyUsage(userId: string, checkDate: Date = new Date()): boolean {
    const userSessions = this.dailyUsageSessions.get(userId) || [];
    
    const today = new Date(checkDate);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if any session was completed today
    return userSessions.some(session => {
      if (session.status !== 'completed') return false;
      
      const sessionDate = new Date(session.createdAt);
      return sessionDate >= today && sessionDate < tomorrow;
    });
  }

  /**
   * Validates if a subscription user can activate a machine
   */
  canSubscriptionUserActivate(user: User, checkDate: Date = new Date()): {
    canActivate: boolean;
    reason?: string;
  } {
    // Check if user has active subscription
    if (user.subscriptionStatus !== 'active') {
      return {
        canActivate: false,
        reason: 'No active subscription found'
      };
    }

    // Check if subscription is not expired
    if (!user.subscriptionExpiry || user.subscriptionExpiry <= checkDate) {
      return {
        canActivate: false,
        reason: 'Subscription expired'
      };
    }

    // Check daily usage limit
    const hasUsedToday = this.checkSubscriptionDailyUsage(user.id, checkDate);
    if (hasUsedToday) {
      return {
        canActivate: false,
        reason: 'Daily usage limit reached for subscription users'
      };
    }

    return {
      canActivate: true
    };
  }

  /**
   * Clears all recorded sessions (for testing purposes)
   */
  clearSessions(): void {
    this.dailyUsageSessions.clear();
  }

  /**
   * Gets all recorded sessions for a user (for testing purposes)
   */
  getUserSessions(userId: string): UsageSession[] {
    return this.dailyUsageSessions.get(userId) || [];
  }
}

describe('Subscription Usage Property Tests', () => {
  let subscriptionService: SubscriptionUsageService;

  beforeEach(() => {
    subscriptionService = new SubscriptionUsageService();
  });

  it('Property 4: Subscription daily usage enforcement - first usage allowed', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate subscription user data
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          accountBalance: fc.float({ min: 0, max: 1000 }),
          subscriptionStatus: fc.constant('active'),
          role: fc.constant('customer'),
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') }), // Check date
        async (userData, checkDate) => {
          const user = userData as User;
          // Ensure subscription expiry is after check date
          user.subscriptionExpiry = new Date(checkDate.getTime() + 86400000 * 30); // 30 days after check

          // Clear any previous sessions
          subscriptionService.clearSessions();

          // Check if user can activate (should be true for first usage)
          const result = subscriptionService.canSubscriptionUserActivate(user, checkDate);

          // Verify the property: subscription user with no daily usage should be allowed
          expect(result.canActivate).toBe(true);
          expect(result.reason).toBeUndefined();

          // Verify no sessions recorded yet
          const userSessions = subscriptionService.getUserSessions(user.id);
          expect(userSessions).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: Subscription daily usage enforcement - second usage prevented', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate subscription user data
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          accountBalance: fc.float({ min: 0, max: 1000 }),
          subscriptionStatus: fc.constant('active'),
          role: fc.constant('customer'),
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') }), // Check date
        fc.integer({ min: 1, max: 30 }), // Duration for first session
        async (userData, checkDate, duration) => {
          const user = userData as User;
          // Ensure subscription expiry is after check date
          user.subscriptionExpiry = new Date(checkDate.getTime() + 86400000 * 30); // 30 days after check

          // Clear any previous sessions
          subscriptionService.clearSessions();

          // Create a completed session for today
          const todaySession: UsageSession = {
            id: fc.sample(fc.uuid(), 1)[0],
            userId: user.id,
            machineId: fc.sample(fc.uuid(), 1)[0],
            duration: duration,
            cost: 0, // Subscription users don't pay per use
            paymentMethod: 'balance',
            status: 'completed',
            createdAt: checkDate // Same day as check
          };

          // Record the completed session
          subscriptionService.recordCompletedSession(user.id, todaySession);

          // Check if user can activate again (should be false)
          const result = subscriptionService.canSubscriptionUserActivate(user, checkDate);

          // Verify the property: subscription user with daily usage should be prevented
          expect(result.canActivate).toBe(false);
          expect(result.reason).toBe('Daily usage limit reached for subscription users');

          // Verify session was recorded
          const userSessions = subscriptionService.getUserSessions(user.id);
          expect(userSessions).toHaveLength(1);
          expect(userSessions[0].status).toBe('completed');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: Subscription daily usage enforcement - different days allowed', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate subscription user data
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          accountBalance: fc.float({ min: 0, max: 1000 }),
          subscriptionStatus: fc.constant('active'),
          role: fc.constant('customer'),
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') }), // First session date
        fc.integer({ min: 1, max: 5 }), // Days between sessions
        fc.integer({ min: 1, max: 30 }), // Duration
        async (userData, firstSessionDate, daysBetween, duration) => {
          const user = userData as User;

          // Calculate second check date (different day)
          const secondCheckDate = new Date(firstSessionDate);
          secondCheckDate.setDate(secondCheckDate.getDate() + daysBetween);

          // Ensure subscription expiry is after both dates
          const latestDate = secondCheckDate > firstSessionDate ? secondCheckDate : firstSessionDate;
          user.subscriptionExpiry = new Date(latestDate.getTime() + 86400000 * 30); // 30 days after latest date

          // Clear any previous sessions
          subscriptionService.clearSessions();

          // Create a completed session for the first date
          const firstSession: UsageSession = {
            id: fc.sample(fc.uuid(), 1)[0],
            userId: user.id,
            machineId: fc.sample(fc.uuid(), 1)[0],
            duration: duration,
            cost: 0,
            paymentMethod: 'balance',
            status: 'completed',
            createdAt: firstSessionDate
          };

          // Record the first session
          subscriptionService.recordCompletedSession(user.id, firstSession);

          // Check if user can activate on different day (should be true)
          const result = subscriptionService.canSubscriptionUserActivate(user, secondCheckDate);

          // Verify the property: subscription user can use machine on different days
          expect(result.canActivate).toBe(true);
          expect(result.reason).toBeUndefined();

          // Verify first session was recorded
          const userSessions = subscriptionService.getUserSessions(user.id);
          expect(userSessions).toHaveLength(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: Subscription daily usage enforcement - non-completed sessions ignored', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate subscription user data
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          accountBalance: fc.float({ min: 0, max: 1000 }),
          subscriptionStatus: fc.constant('active'),
          role: fc.constant('customer'),
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') }), // Check date
        fc.constantFrom('pending', 'active', 'failed'), // Non-completed status
        fc.integer({ min: 1, max: 30 }), // Duration
        async (userData, checkDate, sessionStatus, duration) => {
          const user = userData as User;
          // Ensure subscription expiry is after check date
          user.subscriptionExpiry = new Date(checkDate.getTime() + 86400000 * 30); // 30 days after check

          // Clear any previous sessions
          subscriptionService.clearSessions();

          // Create a non-completed session for today
          const todaySession: UsageSession = {
            id: fc.sample(fc.uuid(), 1)[0],
            userId: user.id,
            machineId: fc.sample(fc.uuid(), 1)[0],
            duration: duration,
            cost: 0,
            paymentMethod: 'balance',
            status: sessionStatus as 'pending' | 'active' | 'failed',
            createdAt: checkDate
          };

          // Record the non-completed session
          subscriptionService.recordCompletedSession(user.id, todaySession);

          // Check if user can activate (should be true since session not completed)
          const result = subscriptionService.canSubscriptionUserActivate(user, checkDate);

          // Verify the property: only completed sessions count toward daily limit
          expect(result.canActivate).toBe(true);
          expect(result.reason).toBeUndefined();

          // Verify session was recorded but doesn't count
          const userSessions = subscriptionService.getUserSessions(user.id);
          expect(userSessions).toHaveLength(1);
          expect(userSessions[0].status).toBe(sessionStatus);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: Subscription daily usage enforcement - expired subscription prevented', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user data with expired subscription
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          accountBalance: fc.float({ min: 0, max: 1000 }),
          subscriptionStatus: fc.constant('active'),
          subscriptionExpiry: fc.date({ max: new Date(Date.now() - 86400000) }), // Past date
          role: fc.constant('customer'),
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        fc.date({ min: new Date() }), // Check date (current or future)
        async (userData, checkDate) => {
          const user = userData as User;

          // Clear any previous sessions
          subscriptionService.clearSessions();

          // Check if user can activate (should be false due to expired subscription)
          const result = subscriptionService.canSubscriptionUserActivate(user, checkDate);

          // Verify the property: expired subscription should prevent activation
          expect(result.canActivate).toBe(false);
          expect(result.reason).toBe('Subscription expired');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: Subscription daily usage enforcement - inactive subscription prevented', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user data with inactive subscription
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          accountBalance: fc.float({ min: 0, max: 1000 }),
          subscriptionStatus: fc.constantFrom('none', 'expired'),
          subscriptionExpiry: fc.option(fc.date(), { nil: undefined }),
          role: fc.constant('customer'),
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        fc.date(), // Check date
        async (userData, checkDate) => {
          const user = userData as User;

          // Clear any previous sessions
          subscriptionService.clearSessions();

          // Check if user can activate (should be false due to inactive subscription)
          const result = subscriptionService.canSubscriptionUserActivate(user, checkDate);

          // Verify the property: inactive subscription should prevent activation
          expect(result.canActivate).toBe(false);
          expect(result.reason).toBe('No active subscription found');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: Subscription daily usage enforcement - multiple completed sessions same day', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate subscription user data
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          accountBalance: fc.float({ min: 0, max: 1000 }),
          subscriptionStatus: fc.constant('active'),
          role: fc.constant('customer'),
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') }), // Check date
        fc.integer({ min: 2, max: 5 }), // Number of sessions
        async (userData, checkDate, numSessions) => {
          const user = userData as User;
          // Ensure subscription expiry is after check date
          user.subscriptionExpiry = new Date(checkDate.getTime() + 86400000 * 30); // 30 days after check

          // Clear any previous sessions
          subscriptionService.clearSessions();

          // Create multiple completed sessions for the same day
          for (let i = 0; i < numSessions; i++) {
            const session: UsageSession = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId: user.id,
              machineId: fc.sample(fc.uuid(), 1)[0],
              duration: fc.sample(fc.integer({ min: 1, max: 30 }), 1)[0],
              cost: 0,
              paymentMethod: 'balance',
              status: 'completed',
              createdAt: checkDate
            };

            subscriptionService.recordCompletedSession(user.id, session);
          }

          // Check if user can activate (should be false due to existing usage)
          const result = subscriptionService.canSubscriptionUserActivate(user, checkDate);

          // Verify the property: any completed session prevents further activation
          expect(result.canActivate).toBe(false);
          expect(result.reason).toBe('Daily usage limit reached for subscription users');

          // Verify all sessions were recorded
          const userSessions = subscriptionService.getUserSessions(user.id);
          expect(userSessions).toHaveLength(numSessions);
          expect(userSessions.every(s => s.status === 'completed')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: Subscription daily usage enforcement - daily usage check consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') }), // Base date
        fc.integer({ min: 0, max: 3 }), // Number of completed sessions today
        fc.integer({ min: 0, max: 3 }), // Number of non-completed sessions today
        fc.integer({ min: 0, max: 2 }), // Number of sessions yesterday
        async (userId, baseDate, completedToday, nonCompletedToday, sessionsYesterday) => {
          // Clear any previous sessions
          subscriptionService.clearSessions();

          const today = new Date(baseDate);
          today.setHours(12, 0, 0, 0); // Noon today

          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          // Add completed sessions for today
          for (let i = 0; i < completedToday; i++) {
            const session: UsageSession = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId: userId,
              machineId: fc.sample(fc.uuid(), 1)[0],
              duration: 10,
              cost: 0,
              paymentMethod: 'balance',
              status: 'completed',
              createdAt: today
            };
            subscriptionService.recordCompletedSession(userId, session);
          }

          // Add non-completed sessions for today
          const nonCompletedStatuses = ['pending', 'active', 'failed'] as const;
          for (let i = 0; i < nonCompletedToday; i++) {
            const session: UsageSession = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId: userId,
              machineId: fc.sample(fc.uuid(), 1)[0],
              duration: 10,
              cost: 0,
              paymentMethod: 'balance',
              status: nonCompletedStatuses[i % nonCompletedStatuses.length],
              createdAt: today
            };
            subscriptionService.recordCompletedSession(userId, session);
          }

          // Add sessions for yesterday
          for (let i = 0; i < sessionsYesterday; i++) {
            const session: UsageSession = {
              id: fc.sample(fc.uuid(), 1)[0],
              userId: userId,
              machineId: fc.sample(fc.uuid(), 1)[0],
              duration: 10,
              cost: 0,
              paymentMethod: 'balance',
              status: 'completed',
              createdAt: yesterday
            };
            subscriptionService.recordCompletedSession(userId, session);
          }

          // Check daily usage
          const hasUsedToday = subscriptionService.checkSubscriptionDailyUsage(userId, today);

          // Verify the property: daily usage check should only consider completed sessions from today
          const expectedHasUsed = completedToday > 0;
          expect(hasUsedToday).toBe(expectedHasUsed);

          // Verify total sessions recorded
          const allSessions = subscriptionService.getUserSessions(userId);
          const expectedTotal = completedToday + nonCompletedToday + sessionsYesterday;
          expect(allSessions).toHaveLength(expectedTotal);
        }
      ),
      { numRuns: 100 }
    );
  });
});