import { describe, it, expect } from 'vitest';
import { 
  validateMachineCode, 
  validateOperatingHours, 
  validateBRLAmount,
  commonSchemas 
} from './validation.js';

describe('Validation Utilities', () => {
  describe('validateMachineCode', () => {
    it('should validate correct machine codes', () => {
      const result = validateMachineCode('ABC123');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('ABC123');
    });

    it('should reject invalid machine codes', () => {
      const result = validateMachineCode('abc');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('6 characters');
    });

    it('should sanitize machine codes', () => {
      const result = validateMachineCode('  abc123  ');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('ABC123');
    });
  });

  describe('validateOperatingHours', () => {
    it('should validate correct operating hours', () => {
      const result = validateOperatingHours('09:00', '17:00');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid time formats', () => {
      const result = validateOperatingHours('9:00', '17:00');
      expect(result.isValid).toBe(false);
    });

    it('should reject start time after end time', () => {
      const result = validateOperatingHours('17:00', '09:00');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateBRLAmount', () => {
    it('should validate correct amounts', () => {
      const result = validateBRLAmount(10.50);
      expect(result.isValid).toBe(true);
    });

    it('should reject negative amounts', () => {
      const result = validateBRLAmount(-5);
      expect(result.isValid).toBe(false);
    });

    it('should reject amounts with too many decimal places', () => {
      const result = validateBRLAmount(10.555);
      expect(result.isValid).toBe(false);
    });
  });
});