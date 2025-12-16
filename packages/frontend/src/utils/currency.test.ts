import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatCurrency, parseCurrency } from './currency';

describe('Currency Utils', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers correctly', () => {
      expect(formatCurrency(10)).toBe('R$\u00A010,00');
      expect(formatCurrency(1.5)).toBe('R$\u00A01,50');
      expect(formatCurrency(100.99)).toBe('R$\u00A0100,99');
    });

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('R$\u00A00,00');
    });

    it('should handle decimal places correctly', () => {
      expect(formatCurrency(1.234)).toBe('R$\u00A01,23');
      expect(formatCurrency(1.999)).toBe('R$\u00A02,00');
    });

    /**
     * Feature: machine-rental-system, Property 23: Currency formatting consistency
     * For any valid monetary amount, formatting should produce consistent Brazilian Real format
     * Validates: Requirements 3.3
     */
    it('should consistently format all valid monetary amounts', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 10000, noNaN: true }),
          (amount) => {
            const formatted = formatCurrency(amount);
            
            // Should always start with "R$" followed by non-breaking space
            expect(formatted).toMatch(/^R\$\u00A0/);
            
            // Should contain proper decimal separator (comma)
            expect(formatted).toMatch(/,\d{2}$/);
            
            // Should not contain invalid characters (allowing non-breaking space)
            expect(formatted).not.toMatch(/[^R$\u00A0\d,.]/);
            
            // Should be parseable back to a number
            const parsed = parseCurrency(formatted);
            expect(parsed).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('parseCurrency', () => {
    it('should parse formatted currency strings', () => {
      expect(parseCurrency('R$ 10,00')).toBe(10);
      expect(parseCurrency('R$ 1,50')).toBe(1.5);
      expect(parseCurrency('R$ 100,99')).toBe(100.99);
    });

    it('should handle malformed input gracefully', () => {
      expect(parseCurrency('')).toBe(0);
      expect(parseCurrency('invalid')).toBe(0);
      expect(parseCurrency('R$ abc')).toBe(0);
    });

    it('should parse numbers without currency symbols', () => {
      expect(parseCurrency('10,50')).toBe(10.5);
      expect(parseCurrency('100')).toBe(100);
    });
  });
});