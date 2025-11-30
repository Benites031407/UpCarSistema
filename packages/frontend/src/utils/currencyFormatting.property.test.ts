import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatCurrency } from './currency';

/**
 * **Feature: machine-rental-system, Property 23: Currency formatting consistency**
 * **Validates: Requirements 3.3**
 * 
 * Property-based test for currency formatting consistency.
 * Tests that any account balance amount is displayed in proper Brazilian Real currency format.
 */

describe('Currency Formatting Property Tests', () => {
  it('Property 23: Currency formatting consistency - should format any amount in Brazilian Real format', () => {
    fc.assert(
      fc.property(
        // Generate various numeric amounts that could be account balances
        fc.oneof(
          // Positive amounts (typical account balances) - use Math.fround for 32-bit float
          fc.float({ min: Math.fround(0.01), max: Math.fround(9999.99), noNaN: true }),
          // Zero balance
          fc.constant(0),
          // Small amounts (cents)
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.99), noNaN: true }),
          // Large amounts
          fc.float({ min: Math.fround(1000), max: Math.fround(99999), noNaN: true }),
          // Integer amounts
          fc.integer({ min: 1, max: 99999 })
        ),
        (amount) => {
          const formatted = formatCurrency(amount);
          
          // Property: All formatted currency should follow Brazilian Real format
          
          // 1. Should start with "R$" (Brazilian Real symbol)
          expect(formatted).toMatch(/^R\$/);
          
          // 2. Should have exactly 2 decimal places after the comma
          expect(formatted).toMatch(/,\d{2}$/);
          
          // 3. Should be a non-empty string
          expect(formatted.length).toBeGreaterThan(0);
          
          // 4. Should match the expected Intl.NumberFormat output
          const expectedFormat = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(amount);
          
          expect(formatted).toBe(expectedFormat);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 23 (Specific Cases): Currency formatting for common account balance scenarios', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Common account balance amounts
          fc.constantFrom(0, 0.01, 0.99, 1.00, 5.50, 10.00, 25.50, 50.00, 100.00, 250.75, 500.00, 1000.00),
          // Random amounts with 2 decimal places (like real currency)
          fc.tuple(fc.integer({ min: 0, max: 99999 }), fc.integer({ min: 0, max: 99 }))
            .map(([reais, centavos]) => reais + centavos / 100)
        ),
        (amount) => {
          const formatted = formatCurrency(amount);
          
          // Specific validation for Brazilian Real format
          // Expected format: "R$ X.XXX,XX" or "R$ XXX,XX" depending on amount
          
          // Should match Brazilian currency pattern
          const brazilianPattern = /^R\$\s*(\d{1,3}(?:\.\d{3})*),\d{2}$/;
          expect(formatted).toMatch(brazilianPattern);
          
          // For zero, should follow the same format as other amounts
          // (removed specific check as it's covered by the general validation)
          
          // For amounts >= 1000, should have thousands separator (period)
          if (amount >= 1000) {
            expect(formatted).toContain('.');
          }
          
          // Should always have comma as decimal separator
          expect(formatted).toContain(',');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 23 (Edge Cases): Currency formatting edge cases and boundary values', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Very small amounts
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.09), noNaN: true }),
          // Boundary around thousands
          fc.float({ min: Math.fround(999.90), max: Math.fround(1000.10), noNaN: true }),
          // Large amounts
          fc.float({ min: Math.fround(9999.90), max: Math.fround(10000.10), noNaN: true }),
          // Exact integer amounts
          fc.integer({ min: 1, max: 1000 }).map(n => n * 1.0)
        ),
        (amount) => {
          const formatted = formatCurrency(amount);
          
          // Edge case validations
          
          // 1. Should handle small amounts correctly
          if (amount < 1) {
            expect(formatted).toMatch(/^R\$\s*0,\d{2}$/);
          }
          
          // 2. Should handle thousands separator correctly
          if (amount >= 1000) {
            // Should have at least one period as thousands separator
            const periodCount = (formatted.match(/\./g) || []).length;
            expect(periodCount).toBeGreaterThanOrEqual(1);
          }
          
          // 3. Should handle integer amounts with proper decimal places
          if (Number.isInteger(amount)) {
            expect(formatted).toMatch(/,00$/);
          }
          
          // 4. Should be consistent with Intl.NumberFormat behavior
          const expectedFormat = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(amount);
          
          expect(formatted).toBe(expectedFormat);
        }
      ),
      { numRuns: 100 }
    );
  });
});