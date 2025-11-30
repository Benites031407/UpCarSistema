import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { PaymentService } from './paymentService.js';
import { PostgresTransactionRepository } from '../repositories/transaction.js';
import { PostgresUserRepository } from '../repositories/user.js';
import { User } from '../models/types.js';

// Helper function to generate valid BRL amounts (2 decimal places max)
const validBRLAmount = () => fc.integer({ min: 1, max: 100000 }).map(cents => parseFloat((cents / 100).toFixed(2)));

/**
 * Feature: machine-rental-system, Property 11: Payment option availability
 * 
 * Property: For any customer with account balance greater than or equal to the cost, 
 * both balance payment and PIX payment options should be offered
 * 
 * Validates: Requirements 2.3
 */

// Mock the repositories
vi.mock('../repositories/transaction.js');
vi.mock('../repositories/user.js');
vi.mock('axios');

describe('Payment Options Property Tests', () => {
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

  it('Property 11: Payment option availability - sufficient balance offers both options', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user balance that is greater than or equal to the cost
        fc.record({
          balance: validBRLAmount(),
          cost: validBRLAmount()
        }).filter(({ balance, cost }) => balance >= cost),
        async ({ balance, cost }) => {
          // Create mock user with sufficient balance
          const mockUser: User = {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
            accountBalance: balance,
            subscriptionStatus: 'none',
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          mockUserRepository.findById.mockResolvedValue(mockUser);

          // Analyze payment options
          const result = await paymentService.analyzePaymentOptions('test-user-id', cost);

          // Verify that both payment options are available
          expect(result.canUseBalance).toBe(true);
          expect(result.balanceAmount).toBe(cost);
          expect(result.pixAmount).toBe(0);
          expect(result.requiresPIX).toBe(false);

          // Verify that the user can pay the full amount with balance
          expect(result.balanceAmount).toBeGreaterThanOrEqual(cost);
          
          // Verify that no PIX payment is required when balance is sufficient
          expect(result.pixAmount).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11: Payment option availability - insufficient balance requires PIX', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate user balance that is less than the cost
        fc.record({
          balance: fc.integer({ min: 0, max: 99900 }).map(cents => parseFloat((cents / 100).toFixed(2))),
          cost: validBRLAmount()
        }).filter(({ balance, cost }) => balance < cost),
        async ({ balance, cost }) => {
          // Create mock user with insufficient balance
          const mockUser: User = {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
            accountBalance: balance,
            subscriptionStatus: 'none',
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          mockUserRepository.findById.mockResolvedValue(mockUser);

          // Analyze payment options
          const result = await paymentService.analyzePaymentOptions('test-user-id', cost);

          // Verify that balance alone is not sufficient
          expect(result.canUseBalance).toBe(false);
          expect(result.requiresPIX).toBe(true);

          // Verify that balance amount is correctly calculated (user's available balance)
          expect(result.balanceAmount).toBe(Math.max(0, balance));
          
          // Verify that PIX amount covers the shortfall
          expect(result.pixAmount).toBe(cost - Math.max(0, balance));
          
          // Verify that total payment equals the cost (with floating point tolerance)
          expect(result.balanceAmount + result.pixAmount).toBeCloseTo(cost, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11: Payment option availability - zero balance requires full PIX payment', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate cost with zero balance
        validBRLAmount(),
        async (cost) => {
          // Create mock user with zero balance
          const mockUser: User = {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
            accountBalance: 0,
            subscriptionStatus: 'none',
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          mockUserRepository.findById.mockResolvedValue(mockUser);

          // Analyze payment options
          const result = await paymentService.analyzePaymentOptions('test-user-id', cost);

          // Verify that balance cannot be used
          expect(result.canUseBalance).toBe(false);
          expect(result.balanceAmount).toBe(0);
          
          // Verify that full amount requires PIX
          expect(result.pixAmount).toBe(cost);
          expect(result.requiresPIX).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11: Payment option availability - exact balance match', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate cost where balance exactly matches
        validBRLAmount(),
        async (amount) => {
          // Create mock user with exact balance
          const mockUser: User = {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
            accountBalance: amount,
            subscriptionStatus: 'none',
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          mockUserRepository.findById.mockResolvedValue(mockUser);

          // Analyze payment options
          const result = await paymentService.analyzePaymentOptions('test-user-id', amount);

          // Verify that balance can cover the full amount
          expect(result.canUseBalance).toBe(true);
          expect(result.balanceAmount).toBe(amount);
          expect(result.pixAmount).toBe(0);
          expect(result.requiresPIX).toBe(false);
          
          // Verify mathematical consistency
          expect(result.balanceAmount + result.pixAmount).toBeCloseTo(amount, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11: Payment option availability - mathematical consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate any valid balance and cost combination
        fc.record({
          balance: fc.integer({ min: 0, max: 100000 }).map(cents => parseFloat((cents / 100).toFixed(2))),
          cost: validBRLAmount()
        }),
        async ({ balance, cost }) => {
          // Create mock user
          const mockUser: User = {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
            accountBalance: balance,
            subscriptionStatus: 'none',
            role: 'customer',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          mockUserRepository.findById.mockResolvedValue(mockUser);

          // Analyze payment options
          const result = await paymentService.analyzePaymentOptions('test-user-id', cost);

          // Verify mathematical consistency: balanceAmount + pixAmount = total cost
          expect(result.balanceAmount + result.pixAmount).toBeCloseTo(cost, 2);
          
          // Verify that balanceAmount never exceeds user's actual balance
          expect(result.balanceAmount).toBeLessThanOrEqual(balance);
          
          // Verify that balanceAmount never exceeds the required cost
          expect(result.balanceAmount).toBeLessThanOrEqual(cost);
          
          // Verify that balanceAmount is non-negative
          expect(result.balanceAmount).toBeGreaterThanOrEqual(0);
          
          // Verify that pixAmount is non-negative
          expect(result.pixAmount).toBeGreaterThanOrEqual(0);
          
          // Verify logical consistency of canUseBalance flag
          if (balance >= cost) {
            expect(result.canUseBalance).toBe(true);
            expect(result.requiresPIX).toBe(false);
          } else {
            expect(result.canUseBalance).toBe(false);
            expect(result.requiresPIX).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});