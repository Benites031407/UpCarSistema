import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateMachineCode } from './validation';

/**
 * **Feature: machine-rental-system, Property 5: Invalid machine code handling**
 * **Validates: Requirements 1.3**
 * 
 * Property-based test for invalid machine code handling.
 * Tests that any string that is not a valid machine code returns an error message 
 * and maintains current state.
 */

describe('Machine Code Validation Property Tests', () => {
  it('Property 5: Invalid machine code handling - should return error for any invalid machine code', () => {
    fc.assert(
      fc.property(
        // Generate strings that are NOT valid machine codes (even after uppercase conversion)
        fc.oneof(
          // Empty or whitespace strings
          fc.constantFrom('', '   ', '\t', '\n'),
          // Too short strings (1-5 characters)
          fc.string({ minLength: 1, maxLength: 5 }).filter(s => s.trim().length < 6),
          // Too long strings (7+ characters)
          fc.string({ minLength: 7, maxLength: 20 }),
          // 6 characters but with special characters that remain invalid after uppercase
          fc.array(fc.oneof(
            fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '=', '+', '[', ']', '{', '}', '|', '\\', ':', ';', '"', "'", '<', '>', ',', '.', '?', '/', '~', '`', ' '),
            fc.string({ minLength: 1, maxLength: 1 }).filter(c => !/[A-Za-z0-9]/.test(c))
          ), { minLength: 1, maxLength: 6 }).map(arr => arr.join('').padEnd(6, 'A')),
          // Strings with internal spaces or tabs
          fc.string({ minLength: 6, maxLength: 6 }).filter(s => s.includes(' ') || s.includes('\t'))
        ),
        (invalidCode) => {
          const result = validateMachineCode(invalidCode);
          
          // For any invalid machine code, the system should:
          // 1. Return isValid: false
          expect(result.isValid).toBe(false);
          
          // 2. Provide an error message
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');
          expect(result.error!.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5 (Complement): Valid machine codes should not return errors', () => {
    fc.assert(
      fc.property(
        // Generate valid machine codes (6 alphanumeric uppercase characters, excluding O and I)
        fc.string({ minLength: 6, maxLength: 6 }).filter(s => /^[A-HJ-NP-Z0-9]{6}$/.test(s)),
        (validCode) => {
          const result = validateMachineCode(validCode);
          
          // For any valid machine code, the system should:
          // 1. Return isValid: true
          expect(result.isValid).toBe(true);
          
          // 2. Not provide an error message
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5 (Edge Cases): Boundary conditions for machine code validation', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Exactly 5 characters (too short)
          fc.string({ minLength: 5, maxLength: 5 }),
          // Exactly 7 characters (too long)  
          fc.string({ minLength: 7, maxLength: 7 }),
          // 6 characters with at least one special character
          fc.tuple(
            fc.string({ minLength: 0, maxLength: 5 }),
            fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '=', '+', '[', ']', '{', '}', '|', '\\', ':', ';', '"', "'", '<', '>', ',', '.', '?', '/', '~', '`', ' '),
            fc.string({ minLength: 0, maxLength: 5 })
          ).map(([prefix, special, suffix]) => {
            const combined = prefix + special + suffix;
            return combined.length >= 6 ? combined.substring(0, 6) : combined.padEnd(6, 'A');
          })
        ),
        (invalidCode) => {
          // Skip if this accidentally generates a valid code
          fc.pre(!/^[A-Z0-9a-z]{6}$/.test(invalidCode.trim()));
          
          const result = validateMachineCode(invalidCode);
          
          // All these edge cases should be invalid
          expect(result.isValid).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});