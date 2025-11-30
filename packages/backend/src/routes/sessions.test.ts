import { describe, it, expect } from 'vitest';
import { UsageSessionService } from '../services/usageSessionService.js';

describe('UsageSessionService Basic Functionality', () => {
  const service = new UsageSessionService();

  describe('validateDuration', () => {
    it('should accept valid durations between 1 and 30 minutes', () => {
      expect(service.validateDuration(1)).toBe(true);
      expect(service.validateDuration(15)).toBe(true);
      expect(service.validateDuration(30)).toBe(true);
    });

    it('should reject invalid durations', () => {
      expect(service.validateDuration(0)).toBe(false);
      expect(service.validateDuration(31)).toBe(false);
      expect(service.validateDuration(-1)).toBe(false);
      expect(service.validateDuration(1.5)).toBe(false);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost as 1 R$ per minute', () => {
      expect(service.calculateCost(1)).toBe(1);
      expect(service.calculateCost(15)).toBe(15);
      expect(service.calculateCost(30)).toBe(30);
    });

    it('should throw error for invalid durations', () => {
      expect(() => service.calculateCost(0)).toThrow('Invalid duration');
      expect(() => service.calculateCost(31)).toThrow('Invalid duration');
    });
  });
});