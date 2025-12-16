import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { PaymentService } from './paymentService.js';
import { PostgresTransactionRepository } from '../repositories/transaction.js';
import { PostgresUserRepository } from '../repositories/user.js';

// Helper function to generate valid BRL amounts (2 decimal places max)
const validBRLAmount = () => fc.integer({ min: 1, max: 100000 }).map(cents => parseFloat((cents / 100).toFixed(2)));

/**
 * Feature: machine-rental-system, Property 12: Shortfall calculation accuracy
 * 
 * Property: For any customer with insufficient account balance, the displayed shortfall amount 
 * should equal the cost minus the current balance
 * 
 * Validates: Requirements 2.4, 3.4
 */

// Mock the repositories
vi.mock('../repositories/transaction.js');
vi.mock('../repositories/user.js');
vi.mock('axios');

describe('Shortfall Calculation Property Tests', () => {
  let paymentService: PaymentService;
  let mockTransactionRepository: vi.Mocked<PostgresTransactionRepository>;
  let mockUserRepository: vi.Mocked<PostgresUserRepository>;

  beforeEach(() => {
    mockTransactionRepository = {
      create: vi.fn(),
      findByPaymentId: vi.fn(),
      updateStatus: vi.fn(),
      findByUserId: vi.fn(),
    } as any;

    mockUserRepository = {
      findById: vi.fn(),
      deductBalance: vi.fn(),
      updateBalance: vi.fn(),
      update: vi.fn(),
    } as any;

    paymentService = new PaymentService(mockTransactionRepository, mockUserRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Property 12: Shortfall calculation accuracy - insufficient balance scenarios', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate scenarios where balance is less than required amount
        fc.record({
          userBalance: fc.integer({ min: 0, max: 99900 }).map(cents => parseFloat((cents / 100).toFixed(2))),
          requiredAmount: validBRLAmount()
        }).filter(({ userBalance, requiredAmount }) => userBalance < requiredAmount),
        async ({ userBalance, requiredAmount }) => {
          // Calculate shortfall using the service method
          const shortfall = paymentService.calculateShortfall(userBalance, requiredAmount);
          
          // Verify that shortfall equals required amount minus user balance
          const expectedShortfall = requiredAmount - userBalance;
          expect(shortfall).toBeCloseTo(expectedShortfall, 2);
          
          // Verify that shortfall is always positive when balance is insufficient
          expect(shortfall).toBeGreaterThan(0);
          
          // Verify that shortfall + balance equals required amount
          expect(shortfall + userBalance).toBeCloseTo(requiredAmount, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 12: Shortfall calculation accuracy - sufficient balance scenarios', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate scenarios where balance is greater than or equal to required amount
        fc.record({
          userBalance: validBRLAmount(),
          requiredAmount: validBRLAmount()
        }).filter(({ userBalance, requiredAmount }) => userBalance >= requiredAmount),
        async ({ userBalance, requiredAmount }) => {
          // Calculate shortfall using the service method
          const shortfall = paymentService.calculateShortfall(userBalance, requiredAmount);
          
          // Verify that shortfall is zero when balance is sufficient
          expect(shortfall).toBe(0);
          
          // Verify that no additional payment is needed
          expect(shortfall).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 12: Shortfall calculation accuracy - zero balance scenarios', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate scenarios with zero balance
        validBRLAmount(),
        async (requiredAmount) => {
          const userBalance = 0;
          
          // Calculate shortfall using the service method
          const shortfall = paymentService.calculateShortfall(userBalance, requiredAmount);
          
          // Verify that shortfall equals the full required amount when balance is zero
          expect(shortfall).toBeCloseTo(requiredAmount, 2);
          
          // Verify that shortfall is positive for any positive required amount
          expect(shortfall).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 12: Shortfall calculation accuracy - exact balance match scenarios', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate scenarios where balance exactly matches required amount
        validBRLAmount(),
        async (amount) => {
          const userBalance = amount;
          const requiredAmount = amount;
          
          // Calculate shortfall using the service method
          const shortfall = paymentService.calculateShortfall(userBalance, requiredAmount);
          
          // Verify that shortfall is zero when balance exactly matches required amount
          expect(shortfall).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 12: Shortfall calculation accuracy - mathematical consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate any valid balance and required amount combination
        fc.record({
          userBalance: fc.integer({ min: 0, max: 100000 }).map(cents => parseFloat((cents / 100).toFixed(2))),
          requiredAmount: validBRLAmount()
        }),
        async ({ userBalance, requiredAmount }) => {
          // Calculate shortfall using the service method
          const shortfall = paymentService.calculateShortfall(userBalance, requiredAmount);
          
          // Verify that shortfall is always non-negative
          expect(shortfall).toBeGreaterThanOrEqual(0);
          
          // Verify mathematical relationship: shortfall = max(0, requiredAmount - userBalance)
          const expectedShortfall = Math.max(0, requiredAmount - userBalance);
          expect(shortfall).toBeCloseTo(expectedShortfall, 2);
          
          // Verify that if balance is sufficient, shortfall is zero
          if (userBalance >= requiredAmount) {
            expect(shortfall).toBe(0);
          } else {
            // If balance is insufficient, shortfall should be positive
            expect(shortfall).toBeGreaterThan(0);
            // And should equal the difference
            expect(shortfall).toBeCloseTo(requiredAmount - userBalance, 2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 12: Shortfall calculation accuracy - edge cases with small amounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate small amounts to test precision
        fc.record({
          userBalance: fc.integer({ min: 0, max: 100 }).map(cents => parseFloat((cents / 100).toFixed(2))),
          requiredAmount: fc.integer({ min: 1, max: 200 }).map(cents => parseFloat((cents / 100).toFixed(2)))
        }),
        async ({ userBalance, requiredAmount }) => {
          // Calculate shortfall using the service method
          const shortfall = paymentService.calculateShortfall(userBalance, requiredAmount);
          
          // Verify precision is maintained for small amounts
          expect(shortfall).toBeCloseTo(Math.max(0, requiredAmount - userBalance), 2);
          
          // Verify that the calculation handles floating point precision correctly
          if (userBalance < requiredAmount) {
            const expectedShortfall = parseFloat((requiredAmount - userBalance).toFixed(2));
            expect(shortfall).toBeCloseTo(expectedShortfall, 2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});