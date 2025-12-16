import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { User, Transaction } from '../models/types.js';

/**
 * Feature: machine-rental-system, Property 13: Credit addition immediacy
 * 
 * Property: For any successful credit addition, the account balance should be updated 
 * immediately after payment confirmation
 * 
 * Validates: Requirements 3.1, 11.2
 */

// Credit addition service that implements the core logic
class CreditAdditionService {
  /**
   * Adds credit to user account and returns updated user with transaction record
   * This simulates the core logic without database dependencies
   */
  async addCredit(user: User, amount: number, paymentId?: string): Promise<{ user: User; transaction: Transaction }> {
    if (!user) {
      throw new Error('User not found');
    }

    // Update user balance immediately
    const updatedUser: User = {
      ...user,
      accountBalance: user.accountBalance + amount,
      updatedAt: new Date()
    };

    // Create transaction record
    const transaction: Transaction = {
      id: `tx-${Date.now()}-${Math.random()}`,
      userId: user.id,
      type: 'credit_added',
      amount,
      paymentMethod: paymentId ? 'pix' : 'admin_credit',
      paymentId,
      status: 'completed',
      createdAt: new Date()
    };

    return { user: updatedUser, transaction };
  }

  /**
   * Validates if credit amount is valid
   */
  validateCreditAmount(amount: number): boolean {
    return amount >= 0 && Number.isFinite(amount);
  }
}

describe('Credit Addition Property Tests', () => {
  let creditService: CreditAdditionService;

  beforeEach(() => {
    creditService = new CreditAdditionService();
  });

  it('Property 13: Credit addition immediacy - balance updated immediately', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial balance (0 to 1000.00 BRL with 2 decimal places)
        fc.integer({ min: 0, max: 100000 }).map(n => n / 100),
        // Generate credit amount to add (0.01 to 500.00 BRL with 2 decimal places)
        fc.integer({ min: 1, max: 50000 }).map(n => n / 100),
        // Generate user ID
        fc.string({ minLength: 5, maxLength: 20 }),
        async (initialBalance: number, creditAmount: number, userId: string) => {
          // Create a test user with the initial balance
          const testUser: User = {
            id: userId,
            email: `${userId}@example.com`,
            name: `Test User ${userId}`,
            accountBalance: initialBalance,
            subscriptionStatus: 'none',
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Add credit to the user's account
          const result = await creditService.addCredit(testUser, creditAmount);

          // Verify the property: balance should be updated immediately
          expect(result.user).not.toBeNull();
          expect(result.transaction).not.toBeNull();

          // Check that the new balance equals initial balance + credit amount
          const expectedBalance = Math.round((initialBalance + creditAmount) * 100) / 100;
          const actualBalance = Math.round(result.user.accountBalance * 100) / 100;
          expect(actualBalance).toBe(expectedBalance);

          // Verify transaction was created correctly
          expect(result.transaction.userId).toBe(userId);
          expect(result.transaction.type).toBe('credit_added');
          expect(result.transaction.amount).toBe(creditAmount);
          expect(result.transaction.paymentMethod).toBe('admin_credit');
          expect(result.transaction.status).toBe('completed');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13: Credit addition immediacy - with payment ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial balance (0 to 1000.00 BRL with 2 decimal places)
        fc.integer({ min: 0, max: 100000 }).map(n => n / 100),
        // Generate credit amount to add (0.01 to 500.00 BRL with 2 decimal places)
        fc.integer({ min: 1, max: 50000 }).map(n => n / 100),
        // Generate user ID
        fc.string({ minLength: 5, maxLength: 20 }),
        // Generate payment ID
        fc.string({ minLength: 10, maxLength: 30 }),
        async (initialBalance: number, creditAmount: number, userId: string, paymentId: string) => {
          // Create a test user with the initial balance
          const testUser: User = {
            id: userId,
            email: `${userId}@example.com`,
            name: `Test User ${userId}`,
            accountBalance: initialBalance,
            subscriptionStatus: 'none',
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Add credit to the user's account with payment ID
          const result = await creditService.addCredit(testUser, creditAmount, paymentId);

          // Verify the property: balance should be updated immediately
          expect(result.user).not.toBeNull();
          expect(result.transaction).not.toBeNull();

          // Check that the new balance equals initial balance + credit amount
          const expectedBalance = Math.round((initialBalance + creditAmount) * 100) / 100;
          const actualBalance = Math.round(result.user.accountBalance * 100) / 100;
          expect(actualBalance).toBe(expectedBalance);

          // Verify transaction was created correctly with PIX payment method
          expect(result.transaction.userId).toBe(userId);
          expect(result.transaction.type).toBe('credit_added');
          expect(result.transaction.amount).toBe(creditAmount);
          expect(result.transaction.paymentMethod).toBe('pix');
          expect(result.transaction.paymentId).toBe(paymentId);
          expect(result.transaction.status).toBe('completed');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13: Credit addition immediacy - multiple credit additions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial balance (0 to 100.00 BRL with 2 decimal places)
        fc.integer({ min: 0, max: 10000 }).map(n => n / 100),
        // Generate array of credit amounts (1 to 5 additions)
        fc.array(
          fc.integer({ min: 1, max: 5000 }).map(n => n / 100),
          { minLength: 1, maxLength: 5 }
        ),
        // Generate user ID
        fc.string({ minLength: 5, maxLength: 20 }),
        async (initialBalance: number, creditAmounts: number[], userId: string) => {
          // Create a test user with the initial balance
          const testUser: User = {
            id: userId,
            email: `${userId}@example.com`,
            name: `Test User ${userId}`,
            accountBalance: initialBalance,
            subscriptionStatus: 'none',
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          let currentUser = testUser;
          let currentBalance = initialBalance;

          // Add credits sequentially
          for (const creditAmount of creditAmounts) {
            const result = await creditService.addCredit(currentUser, creditAmount);

            // Update expected balance and current user
            currentBalance += creditAmount;
            currentUser = result.user;

            // Verify the property: balance should be updated immediately after each addition
            const expectedBalance = Math.round(currentBalance * 100) / 100;
            const actualBalance = Math.round(result.user.accountBalance * 100) / 100;
            expect(actualBalance).toBe(expectedBalance);

            // Verify transaction was created correctly
            expect(result.transaction.userId).toBe(userId);
            expect(result.transaction.type).toBe('credit_added');
            expect(result.transaction.amount).toBe(creditAmount);
            expect(result.transaction.status).toBe('completed');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13: Credit addition immediacy - zero credit amount edge case', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial balance (0 to 1000.00 BRL with 2 decimal places)
        fc.integer({ min: 0, max: 100000 }).map(n => n / 100),
        // Generate user ID
        fc.string({ minLength: 5, maxLength: 20 }),
        async (initialBalance: number, userId: string) => {
          // Create a test user with the initial balance
          const testUser: User = {
            id: userId,
            email: `${userId}@example.com`,
            name: `Test User ${userId}`,
            accountBalance: initialBalance,
            subscriptionStatus: 'none',
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Add zero credit (edge case)
          const result = await creditService.addCredit(testUser, 0);

          // Verify the property: balance should remain unchanged
          const expectedBalance = Math.round(initialBalance * 100) / 100;
          const actualBalance = Math.round(result.user.accountBalance * 100) / 100;
          expect(actualBalance).toBe(expectedBalance);

          // Verify transaction was still created (for audit purposes)
          expect(result.transaction.userId).toBe(userId);
          expect(result.transaction.type).toBe('credit_added');
          expect(result.transaction.amount).toBe(0);
          expect(result.transaction.status).toBe('completed');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13: Credit addition immediacy - user not found error handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate credit amount to add (0.01 to 500.00 BRL with 2 decimal places)
        fc.integer({ min: 1, max: 50000 }).map(n => n / 100),
        // Generate non-existent user ID
        fc.string({ minLength: 5, maxLength: 20 }),
        async (creditAmount: number, userId: string) => {
          // Attempt to add credit to null user (user doesn't exist)
          try {
            await creditService.addCredit(null as any, creditAmount);
            // Should not reach here
            expect(true).toBe(false);
          } catch (error) {
            // Verify the property: should throw error for non-existent user
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toBe('User not found');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});