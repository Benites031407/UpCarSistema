import { describe, it, expect } from 'vitest';
import { 
  AppError, 
  ValidationError, 
  AuthenticationError, 
  PaymentError,
  CircuitBreaker
} from './errorHandler.js';
import { retry } from '../utils/retry.js';

describe('Error Handler', () => {
  describe('AppError', () => {
    it('should create error with correct properties', () => {
      const error = new AppError('Test error', 400, true, 'TEST_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBe('TEST_ERROR');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        return 'success';
      };

      const result = await retry(operation);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(attempts).toBe(1);
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await retry(operation, { maxAttempts: 3, initialDelay: 10 });
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(3);
      expect(attempts).toBe(3);
    });
  });

  describe('CircuitBreaker', () => {
    it('should allow operations when closed', async () => {
      const breaker = new CircuitBreaker('test', 2, 1000, 100);
      
      const result = await breaker.execute(async () => 'success');
      expect(result).toBe('success');
      expect(breaker.getState()).toBe('closed');
    });
  });
});