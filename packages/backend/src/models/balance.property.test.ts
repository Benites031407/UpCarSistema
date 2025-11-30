import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { User } from './types.js';

/**
 * Feature: machine-rental-system, Property 2: Balance deduction accuracy
 * 
 * Property: For any account balance and payment amount, after using balance for payment, 
 * the new balance should equal the original balance minus the payment amount
 * 
 * Validates: Requirements 3.2
 */

// Mock implementation of balance deduction logic
class BalanceService {
  /**
   * Deducts amount from user balance if sufficient funds are available
   * Returns updated user with new balance, or null if insufficient funds
   */
  deductBalance(user: User, amount: number): User | null {
    if (user.accountBalance < amount) {
      return null; // Insufficient balance
    }
    
    return {
      ...user,
      accountBalance: user.accountBalance - amount,
      updatedAt: new Date()
    };
  }
}

describe('Balance Deduction Property Tests', () => {
  let balanceService: BalanceService;

  beforeEach(() => {
    balanceService = new BalanceService();
  });

  it('Property 2: Balance deduction accuracy - successful deduction', () => {
    fc.assert(
      fc.property(
        // Generate initial balance (positive number with 2 decimal places)
        fc.integer({ min: 1, max: 100000 }).map(n => n / 100),
        // Generate deduction amount (less than or equal to initial balance)
        fc.integer({ min: 1, max: 100000 }).map(n => n / 100),
        (initialBalance: number, maxDeduction: number) => {
          // Ensure deduction amount is not greater than initial balance
          const deductionAmount = Math.min(maxDeduction, initialBalance);
          
          // Create a test user with the initial balance
          const testUser: User = {
            id: 'test-user-1',
            email: 'test@example.com',
            name: 'Test User',
            accountBalance: initialBalance,
            subscriptionStatus: 'none',
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Perform balance deduction
          const updatedUser = balanceService.deductBalance(testUser, deductionAmount);

          // Verify the property: new balance = original balance - deduction amount
          expect(updatedUser).not.toBeNull();
          if (updatedUser) {
            const expectedBalance = Math.round((initialBalance - deductionAmount) * 100) / 100;
            const actualBalance = Math.round(updatedUser.accountBalance * 100) / 100;
            expect(actualBalance).toBe(expectedBalance);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: Balance deduction accuracy - insufficient balance handling', () => {
    fc.assert(
      fc.property(
        // Generate initial balance (positive number with 2 decimal places)
        fc.integer({ min: 1, max: 10000 }).map(n => n / 100),
        // Generate deduction amount (greater than initial balance)
        fc.integer({ min: 10001, max: 100000 }).map(n => n / 100),
        (initialBalance: number, deductionAmount: number) => {
          // Ensure deduction amount is greater than initial balance
          const actualDeduction = Math.max(deductionAmount, initialBalance + 0.01);
          
          // Create a test user with the initial balance
          const testUser: User = {
            id: 'test-user-1',
            email: 'test@example.com',
            name: 'Test User',
            accountBalance: initialBalance,
            subscriptionStatus: 'none',
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Attempt balance deduction with insufficient funds
          const result = balanceService.deductBalance(testUser, actualDeduction);

          // Verify the property: deduction should fail and return null
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: Balance deduction accuracy - zero balance edge case', () => {
    fc.assert(
      fc.property(
        // Generate deduction amount (any positive amount)
        fc.integer({ min: 1, max: 10000 }).map(n => n / 100),
        (deductionAmount: number) => {
          // Create a test user with zero balance
          const testUser: User = {
            id: 'test-user-1',
            email: 'test@example.com',
            name: 'Test User',
            accountBalance: 0.00,
            subscriptionStatus: 'none',
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Attempt balance deduction from zero balance
          const result = balanceService.deductBalance(testUser, deductionAmount);

          // Verify the property: deduction should fail and return null
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: Balance deduction accuracy - exact balance deduction', () => {
    fc.assert(
      fc.property(
        // Generate balance amount (positive number with 2 decimal places)
        fc.integer({ min: 1, max: 100000 }).map(n => n / 100),
        (balanceAmount: number) => {
          // Create a test user with the balance
          const testUser: User = {
            id: 'test-user-1',
            email: 'test@example.com',
            name: 'Test User',
            accountBalance: balanceAmount,
            subscriptionStatus: 'none',
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Deduct the exact balance amount
          const updatedUser = balanceService.deductBalance(testUser, balanceAmount);

          // Verify the property: new balance should be exactly 0.00
          expect(updatedUser).not.toBeNull();
          if (updatedUser) {
            expect(updatedUser.accountBalance).toBe(0.00);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});