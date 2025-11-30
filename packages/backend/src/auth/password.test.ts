import { describe, it, expect, beforeEach } from 'vitest';
import { PasswordService } from './password.js';

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  it('should hash password', async () => {
    const password = 'testPassword123';
    const hash = await passwordService.hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should verify correct password', async () => {
    const password = 'testPassword123';
    const hash = await passwordService.hashPassword(password);
    const isValid = await passwordService.verifyPassword(password, hash);
    
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'testPassword123';
    const wrongPassword = 'wrongPassword456';
    const hash = await passwordService.hashPassword(password);
    const isValid = await passwordService.verifyPassword(wrongPassword, hash);
    
    expect(isValid).toBe(false);
  });

  it('should reject empty password', async () => {
    expect(passwordService.hashPassword('')).rejects.toThrow('Password must be at least 6 characters long');
  });

  it('should reject short password', async () => {
    expect(passwordService.hashPassword('12345')).rejects.toThrow('Password must be at least 6 characters long');
  });

  it('should validate strong password', () => {
    const result = passwordService.validatePasswordStrength('testPassword123');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject password without letters', () => {
    const result = passwordService.validatePasswordStrength('123456789');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one letter');
  });

  it('should reject password without numbers', () => {
    const result = passwordService.validatePasswordStrength('testPassword');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one number');
  });

  it('should reject too short password', () => {
    const result = passwordService.validatePasswordStrength('test1');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be at least 6 characters long');
  });

  it('should reject too long password', () => {
    const longPassword = 'a'.repeat(129) + '1';
    const result = passwordService.validatePasswordStrength(longPassword);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be less than 128 characters');
  });
});