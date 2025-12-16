import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PaymentService } from './paymentService.js';
import { PostgresTransactionRepository } from '../repositories/transaction.js';
import { PostgresUserRepository } from '../repositories/user.js';
import { User, Transaction } from '../models/types.js';

// Mock the repositories
vi.mock('../repositories/transaction.js');
vi.mock('../repositories/user.js');
vi.mock('axios');

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let mockTransactionRepository: vi.Mocked<PostgresTransactionRepository>;
  let mockUserRepository: vi.Mocked<PostgresUserRepository>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    accountBalance: 50.00,
    subscriptionStatus: 'none',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockTransaction: Transaction = {
    id: 'transaction-123',
    userId: 'user-123',
    type: 'usage_payment',
    amount: 10.00,
    paymentMethod: 'admin_credit',
    status: 'completed',
    createdAt: new Date()
  };

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

  describe('analyzePaymentOptions', () => {
    it('should return correct payment options when user has sufficient balance', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await paymentService.analyzePaymentOptions('user-123', 30.00);

      expect(result).toEqual({
        userId: 'user-123',
        amount: 30.00,
        canUseBalance: true,
        balanceAmount: 30.00,
        pixAmount: 0,
        requiresPIX: false
      });
    });

    it('should return correct payment options when user has insufficient balance', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await paymentService.analyzePaymentOptions('user-123', 70.00);

      expect(result).toEqual({
        userId: 'user-123',
        amount: 70.00,
        canUseBalance: false,
        balanceAmount: 50.00,
        pixAmount: 20.00,
        requiresPIX: true
      });
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(paymentService.analyzePaymentOptions('user-123', 30.00))
        .rejects.toThrow('User not found');
    });
  });

  describe('calculateShortfall', () => {
    it('should calculate correct shortfall when balance is insufficient', () => {
      const shortfall = paymentService.calculateShortfall(30.00, 50.00);
      expect(shortfall).toBe(20.00);
    });

    it('should return zero when balance is sufficient', () => {
      const shortfall = paymentService.calculateShortfall(50.00, 30.00);
      expect(shortfall).toBe(0);
    });

    it('should return zero when balance equals required amount', () => {
      const shortfall = paymentService.calculateShortfall(50.00, 50.00);
      expect(shortfall).toBe(0);
    });
  });

  describe('canSubscribe', () => {
    it('should return true when user has no subscription', async () => {
      mockUserRepository.findById.mockResolvedValue({
        ...mockUser,
        subscriptionStatus: 'none'
      });

      const result = await paymentService.canSubscribe('user-123');
      expect(result).toBe(true);
    });

    it('should return true when subscription has expired', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

      mockUserRepository.findById.mockResolvedValue({
        ...mockUser,
        subscriptionStatus: 'active',
        subscriptionExpiry: expiredDate
      });

      const result = await paymentService.canSubscribe('user-123');
      expect(result).toBe(true);
    });

    it('should return false when subscription is active and not expired', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

      mockUserRepository.findById.mockResolvedValue({
        ...mockUser,
        subscriptionStatus: 'active',
        subscriptionExpiry: futureDate
      });

      const result = await paymentService.canSubscribe('user-123');
      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await paymentService.canSubscribe('user-123');
      expect(result).toBe(false);
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history with default parameters', async () => {
      const mockTransactions = [mockTransaction];
      mockTransactionRepository.findByUserId.mockResolvedValue(mockTransactions);

      const result = await paymentService.getTransactionHistory('user-123');

      expect(mockTransactionRepository.findByUserId).toHaveBeenCalledWith('user-123', { limit: 50, offset: 0 });
      expect(result).toEqual(mockTransactions);
    });

    it('should return transaction history with custom parameters', async () => {
      const mockTransactions = [mockTransaction];
      mockTransactionRepository.findByUserId.mockResolvedValue(mockTransactions);

      const result = await paymentService.getTransactionHistory('user-123', 10, 5);

      expect(mockTransactionRepository.findByUserId).toHaveBeenCalledWith('user-123', { limit: 10, offset: 5 });
      expect(result).toEqual(mockTransactions);
    });
  });
});