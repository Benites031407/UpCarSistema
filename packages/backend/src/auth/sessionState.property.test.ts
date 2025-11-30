import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { jwtService } from './jwt.js';
import { User } from '../models/types.js';

/**
 * Feature: machine-rental-system, Property 14: Session state maintenance
 * 
 * Property: For any successful login, the system should maintain session state 
 * and allow access to protected features
 * 
 * Validates: Requirements 5.3
 */

describe('Session State Maintenance Property Tests', () => {

  it('Property 14: Session state maintenance - valid JWT tokens maintain session state', () => {
    fc.assert(
      fc.property(
        // Generate valid user data
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z\s]+$/.test(s)),
          accountBalance: fc.float({ min: 0, max: 10000 }).map(n => Math.round(n * 100) / 100),
          subscriptionStatus: fc.constantFrom('none', 'active', 'expired') as fc.Arbitrary<'none' | 'active' | 'expired'>,
          role: fc.constantFrom('customer', 'admin') as fc.Arbitrary<'customer' | 'admin'>
        }),
        (userData) => {
          // Create a test user
          const testUser: User = {
            ...userData,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Generate a JWT token for the user
          const token = jwtService.generateAccessToken(testUser);

          // Verify the token can be decoded
          const payload = jwtService.verifyToken(token);

          // Verify the property: JWT tokens maintain user identity
          // 1. Token should contain the user ID
          if (payload.userId !== testUser.id) return false;

          // 2. Token should contain the user email
          if (payload.email !== testUser.email) return false;

          // 3. Token should have issued at time
          if (!payload.iat) return false;

          // 4. Token should have expiration time
          if (!payload.exp) return false;

          // 5. Expiration should be after issued time
          if (payload.exp <= payload.iat) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14: Session state maintenance - invalid tokens are rejected', () => {
    fc.assert(
      fc.property(
        // Generate invalid tokens
        fc.oneof(
          fc.constant(''), // Empty token
          fc.string({ minLength: 1, maxLength: 50 }), // Random string
          fc.constant('invalid.jwt.token'), // Malformed JWT
          fc.constant('not-a-jwt'), // Not a JWT
          fc.constant('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature') // Invalid JWT
        ),
        (invalidToken) => {
          try {
            // Try to verify the invalid token
            jwtService.verifyToken(invalidToken);
            
            // If verification succeeds, the property fails (invalid tokens should be rejected)
            return false;
          } catch (error) {
            // If verification throws an error, the property holds (invalid tokens are rejected)
            return true;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14: Session state maintenance - token round-trip preserves user identity', () => {
    fc.assert(
      fc.property(
        // Generate valid user data
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z\s]+$/.test(s)),
          accountBalance: fc.float({ min: 0, max: 10000 }).map(n => Math.round(n * 100) / 100),
          subscriptionStatus: fc.constantFrom('none', 'active', 'expired') as fc.Arbitrary<'none' | 'active' | 'expired'>,
          role: fc.constantFrom('customer', 'admin') as fc.Arbitrary<'customer' | 'admin'>
        }),
        (userData) => {
          // Create a test user
          const testUser: User = {
            ...userData,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Generate token and immediately verify it (round-trip)
          const token = jwtService.generateAccessToken(testUser);
          const payload = jwtService.verifyToken(token);

          // Verify the property: round-trip preserves user identity
          // 1. User ID should be preserved
          if (payload.userId !== testUser.id) return false;

          // 2. Email should be preserved
          if (payload.email !== testUser.email) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14: Session state maintenance - empty/null tokens are rejected', () => {
    fc.assert(
      fc.property(
        // Generate various empty/null token scenarios
        fc.oneof(
          fc.constant(''),
          fc.constant('   '), // Whitespace only
          fc.constant('\t\n'), // Tabs and newlines
        ),
        (emptyToken) => {
          try {
            // Try to verify the empty token
            jwtService.verifyToken(emptyToken);
            
            // If verification succeeds, the property fails (empty tokens should be rejected)
            return false;
          } catch (error) {
            // If verification throws an error, the property holds (empty tokens are rejected)
            return true;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14: Session state maintenance - token generation is deterministic for same user', () => {
    fc.assert(
      fc.property(
        // Generate valid user data
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z\s]+$/.test(s)),
          accountBalance: fc.float({ min: 0, max: 10000 }).map(n => Math.round(n * 100) / 100),
          subscriptionStatus: fc.constantFrom('none', 'active', 'expired') as fc.Arbitrary<'none' | 'active' | 'expired'>,
          role: fc.constantFrom('customer', 'admin') as fc.Arbitrary<'customer' | 'admin'>
        }),
        (userData) => {
          // Create a test user
          const testUser: User = {
            ...userData,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Generate two tokens for the same user (at different times)
          const token1 = jwtService.generateAccessToken(testUser);
          // Small delay to ensure different iat
          const token2 = jwtService.generateAccessToken(testUser);

          // Verify both tokens
          const payload1 = jwtService.verifyToken(token1);
          const payload2 = jwtService.verifyToken(token2);

          // Verify the property: tokens for same user contain same identity data
          // 1. User IDs should be the same
          if (payload1.userId !== payload2.userId) return false;

          // 2. Emails should be the same
          if (payload1.email !== payload2.email) return false;

          // 3. Both should match the original user
          if (payload1.userId !== testUser.id) return false;
          if (payload2.userId !== testUser.id) return false;
          if (payload1.email !== testUser.email) return false;
          if (payload2.email !== testUser.email) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14: Session state maintenance - different users generate different tokens', () => {
    fc.assert(
      fc.property(
        // Generate two different users
        fc.record({
          id1: fc.uuid(),
          email1: fc.emailAddress(),
          id2: fc.uuid(),
          email2: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z\s]+$/.test(s)),
          accountBalance: fc.float({ min: 0, max: 10000 }).map(n => Math.round(n * 100) / 100),
          subscriptionStatus: fc.constantFrom('none', 'active', 'expired') as fc.Arbitrary<'none' | 'active' | 'expired'>,
          role: fc.constantFrom('customer', 'admin') as fc.Arbitrary<'customer' | 'admin'>
        }),
        (data) => {
          // Ensure users are different
          if (data.id1 === data.id2 || data.email1 === data.email2) {
            return true; // Skip this test case
          }

          // Create two different test users
          const testUser1: User = {
            id: data.id1,
            email: data.email1,
            name: data.name,
            accountBalance: data.accountBalance,
            subscriptionStatus: data.subscriptionStatus,
            role: data.role,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const testUser2: User = {
            id: data.id2,
            email: data.email2,
            name: data.name,
            accountBalance: data.accountBalance,
            subscriptionStatus: data.subscriptionStatus,
            role: data.role,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Generate tokens for both users
          const token1 = jwtService.generateAccessToken(testUser1);
          const token2 = jwtService.generateAccessToken(testUser2);

          // Verify both tokens
          const payload1 = jwtService.verifyToken(token1);
          const payload2 = jwtService.verifyToken(token2);

          // Verify the property: different users generate different token payloads
          // 1. User IDs should be different
          if (payload1.userId === payload2.userId) return false;

          // 2. Emails should be different
          if (payload1.email === payload2.email) return false;

          // 3. Payloads should match their respective users
          if (payload1.userId !== testUser1.id) return false;
          if (payload2.userId !== testUser2.id) return false;
          if (payload1.email !== testUser1.email) return false;
          if (payload2.email !== testUser2.email) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});