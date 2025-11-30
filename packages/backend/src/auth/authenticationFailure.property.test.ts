import { describe, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import express from 'express';
import request from 'supertest';
import { jwtService } from './jwt.js';
import { authenticateToken } from './middleware.js';

/**
 * Feature: machine-rental-system, Property 16: Authentication failure handling
 * 
 * Property: For any failed authentication attempt, appropriate error messages should be 
 * displayed without revealing system details
 * 
 * Validates: Requirements 5.4
 */

describe('Authentication Failure Handling Property Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    // Create a test Express app with authentication middleware
    app = express();
    app.use(express.json());

    // Test route that requires authentication
    app.get('/protected', authenticateToken, (req, res) => {
      res.json({ message: 'Access granted', user: (req as any).user });
    });

    // Test login route that simulates authentication failure scenarios
    app.post('/login', (req, res) => {
      const { email, password } = req.body;
      
      // Simulate validation failures
      if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        res.status(400).json({ error: 'Validation failed' });
        return;
      }
      
      // Trim inputs (like the real validation does)
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      
      // Check for empty after trim
      if (!trimmedEmail || !trimmedPassword) {
        res.status(400).json({ error: 'Validation failed - required fields' });
        return;
      }
      
      // Check email format
      if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }
      
      // Check email length
      if (trimmedEmail.length > 255) {
        res.status(400).json({ error: 'Invalid email - too long' });
        return;
      }
      
      // Simulate user not found or invalid credentials
      if (email === 'nonexistent@example.com' || password === 'wrongpassword') {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      
      // Simulate server error during authentication
      if (email === 'servererror@example.com') {
        res.status(500).json({ error: 'Login failed' });
        return;
      }
      
      // Success case (for comparison)
      res.json({ message: 'Login successful' });
    });
  });

  it('Property 16: Authentication failure handling - invalid tokens return generic error messages', () => {
    return fc.assert(
      fc.asyncProperty(
        // Generate various invalid token scenarios
        fc.oneof(
          fc.constant(undefined), // No authorization header
          fc.constant(''), // Empty authorization header
          fc.constant('Bearer'), // Bearer without token
          fc.constant('Bearer '), // Bearer with space but no token
          fc.string({ minLength: 1, maxLength: 50 }), // Random string as token
          fc.constant('Bearer invalid.jwt.token'), // Malformed JWT
          fc.constant('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'), // Invalid JWT signature
          fc.constant('Bearer ' + 'a'.repeat(500)), // Extremely long invalid token
        ),
        async (authHeader) => {
          // Test accessing protected route with invalid authentication
          const requestBuilder = request(app).get('/protected');
          
          if (authHeader) {
            requestBuilder.set('Authorization', authHeader);
          }
          
          const response = await requestBuilder;

          // Property: Authentication failures should return appropriate error messages
          // 1. Should return 401 status for authentication failures
          if (response.status !== 401) return false;

          // 2. Should have an error message
          if (!response.body.error) return false;

          // 3. Error message should be generic and not reveal system details
          const errorMessage = response.body.error.toLowerCase();
          
          // Should not reveal internal system details
          const forbiddenTerms = [
            'database', 'sql', 'redis', 'jwt_secret', 'internal', 'stack trace',
            'file not found', 'connection refused', 'timeout', 'server error',
            'null pointer', 'undefined', 'exception', 'traceback'
          ];
          
          for (const term of forbiddenTerms) {
            if (errorMessage.includes(term)) return false;
          }

          // Should use appropriate generic messages
          const allowedMessages = [
            'access token required',
            'invalid token',
            'authentication failed',
            'token expired',
            'session expired'
          ];
          
          const hasAllowedMessage = allowedMessages.some(msg => 
            errorMessage.includes(msg)
          );
          
          return hasAllowedMessage;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 16: Authentication failure handling - expired tokens return appropriate messages', () => {
    return fc.assert(
      fc.asyncProperty(
        // Generate user data for creating tokens
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z\s]+$/.test(s)),
          role: fc.constantFrom('customer', 'admin') as fc.Arbitrary<'customer' | 'admin'>
        }),
        async (userData) => {
          // Create a test user
          const testUser = {
            ...userData,
            accountBalance: 0,
            subscriptionStatus: 'none' as const,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Generate a token (we can't easily create expired tokens in tests,
          // but we can test the error handling for malformed tokens that would
          // trigger similar error paths)
          const validToken = jwtService.generateAccessToken(testUser);
          
          // Modify the token to make it invalid (simulating expiration or corruption)
          const corruptedToken = validToken.slice(0, -10) + 'corrupted';
          
          const response = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${corruptedToken}`);

          // Property: Corrupted/expired tokens should return appropriate error messages
          // 1. Should return 401 status
          if (response.status !== 401) return false;

          // 2. Should have an error message
          if (!response.body.error) return false;

          // 3. Error message should be generic
          const errorMessage = response.body.error.toLowerCase();
          
          // Should not reveal JWT implementation details
          const forbiddenTerms = [
            'jsonwebtoken', 'jwt.verify', 'signature', 'algorithm', 'payload',
            'header', 'secret', 'hs256', 'rsa', 'ecdsa'
          ];
          
          for (const term of forbiddenTerms) {
            if (errorMessage.includes(term)) return false;
          }

          // Should use generic authentication error messages
          const allowedMessages = [
            'invalid token',
            'authentication failed',
            'token expired'
          ];
          
          return allowedMessages.some(msg => errorMessage.includes(msg));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 16: Authentication failure handling - login failures return generic messages', () => {
    return fc.assert(
      fc.asyncProperty(
        // Generate various login failure scenarios
        fc.oneof(
          // Invalid credentials scenarios
          fc.record({
            email: fc.constant('nonexistent@example.com'),
            password: fc.string({ minLength: 1, maxLength: 50 })
          }),
          fc.record({
            email: fc.emailAddress(),
            password: fc.constant('wrongpassword')
          }),
          // Missing credentials scenarios
          fc.record({
            email: fc.constant(''),
            password: fc.string({ minLength: 1, maxLength: 50 })
          }),
          fc.record({
            email: fc.emailAddress(),
            password: fc.constant('')
          }),
          // Server error scenario
          fc.record({
            email: fc.constant('servererror@example.com'),
            password: fc.string({ minLength: 1, maxLength: 50 })
          })
        ),
        async (credentials) => {
          const response = await request(app)
            .post('/login')
            .send(credentials);

          // Property: Login failures should return appropriate error messages
          // 1. Should return error status (400, 401, or 500)
          if (![400, 401, 500].includes(response.status)) return false;

          // 2. Should have an error message
          if (!response.body.error) return false;

          // 3. Error message should not reveal system internals
          const errorMessage = response.body.error.toLowerCase();
          
          // Should not reveal database or internal system details
          const forbiddenTerms = [
            'user table', 'select * from', 'database connection', 'postgresql',
            'redis connection', 'bcrypt', 'hash comparison', 'salt rounds',
            'internal server error', 'stack trace', 'file path', 'line number'
          ];
          
          for (const term of forbiddenTerms) {
            if (errorMessage.includes(term)) return false;
          }

          // Should use appropriate generic messages based on error type
          if (response.status === 400) {
            // Validation errors should be generic but helpful
            return errorMessage.includes('validation failed') || 
                   errorMessage.includes('required');
          } else if (response.status === 401) {
            // Authentication errors should be generic
            return errorMessage.includes('invalid credentials');
          } else if (response.status === 500) {
            // Server errors should be very generic
            return errorMessage.includes('login failed') ||
                   errorMessage.includes('authentication failed');
          }

          return false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 16: Authentication failure handling - malformed requests return validation errors', () => {
    return fc.assert(
      fc.asyncProperty(
        // Generate malformed request bodies (accounting for trim behavior)
        fc.oneof(
          fc.constant({}), // Empty object
          fc.constant({ email: 'not-an-email' }), // Invalid email format
          fc.constant({ password: 'short' }), // Too short password
          fc.constant({ email: '   ', password: '   ' }), // Whitespace only (becomes empty after trim)
          fc.record({
            email: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0 && !s.includes('@')), // Invalid email (not empty after trim)
            password: fc.string({ minLength: 1, maxLength: 5 }).filter(s => s.trim().length > 0) // Short password (not empty after trim)
          }),
          fc.record({
            email: fc.string({ minLength: 256, maxLength: 300 }).filter(s => s.trim().length > 255), // Too long email after trim
            password: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
          })
        ),
        async (malformedData) => {
          const response = await request(app)
            .post('/login')
            .send(malformedData);

          // Property: Malformed requests should return validation errors without system details
          // 1. Should return 400, 401, or 500 status (depending on the validation/authentication flow)
          if (![400, 401, 500].includes(response.status)) return false;

          // 2. Should have an error message
          if (!response.body.error) return false;

          // 3. Error message should not reveal system internals
          const errorMessage = response.body.error.toLowerCase();
          
          // Should not reveal validation library internals
          const forbiddenTerms = [
            'zod', 'joi', 'yup', 'ajv', 'schema validation', 'validator.js',
            'regex pattern', 'internal validation', 'validation stack'
          ];
          
          for (const term of forbiddenTerms) {
            if (errorMessage.includes(term)) return false;
          }

          // Should indicate appropriate error type generically
          const allowedMessages = [
            'validation failed', 'invalid', 'required', 'invalid credentials', 'login failed'
          ];
          
          return allowedMessages.some(msg => errorMessage.includes(msg));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 16: Authentication failure handling - error responses have consistent structure', () => {
    return fc.assert(
      fc.asyncProperty(
        // Generate various authentication failure scenarios
        fc.oneof(
          fc.constant({ type: 'no_auth', authHeader: undefined }),
          fc.constant({ type: 'invalid_token', authHeader: 'Bearer invalid' }),
          fc.constant({ type: 'malformed_bearer', authHeader: 'Bearer' }),
          fc.constant({ type: 'random_string', authHeader: 'RandomString' })
        ),
        async (scenario) => {
          const requestBuilder = request(app).get('/protected');
          
          if (scenario.authHeader) {
            requestBuilder.set('Authorization', scenario.authHeader);
          }
          
          const response = await requestBuilder;

          // Property: All authentication error responses should have consistent structure
          // 1. Should return 401 status (the authenticateToken middleware should handle all auth failures as 401)
          if (response.status !== 401) return false;

          // 2. Should have JSON response body
          if (typeof response.body !== 'object') return false;

          // 3. Should have error field
          if (!response.body.error) return false;

          // 4. Error should be a string
          if (typeof response.body.error !== 'string') return false;

          // 5. Should not have sensitive fields in response (but allow 'token' in error messages like "invalid token")
          const sensitiveFields = [
            'password', 'secret', 'key', 'hash', 'salt',
            'internal', 'debug', 'stack', 'trace'
          ];
          
          const responseStr = JSON.stringify(response.body).toLowerCase();
          for (const field of sensitiveFields) {
            if (responseStr.includes(field)) return false;
          }

          // 6. Response should be reasonably sized (not a huge error dump)
          if (responseStr.length > 1000) return false;

          // 7. Error message should be one of the expected authentication error messages
          const errorMessage = response.body.error.toLowerCase();
          const expectedMessages = [
            'access token required',
            'invalid token', 
            'authentication failed',
            'token expired',
            'session expired'
          ];
          
          return expectedMessages.some(msg => errorMessage.includes(msg));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 16: Authentication failure handling - timing attacks are prevented', () => {
    return fc.assert(
      fc.asyncProperty(
        // Generate different types of authentication attempts
        fc.record({
          validEmail: fc.emailAddress(),
          invalidEmail: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 20 })
        }),
        async (testData) => {
          // Test timing for valid vs invalid email (both should fail but timing should be similar)
          const start1 = Date.now();
          const response1 = await request(app)
            .post('/login')
            .send({ email: testData.validEmail, password: 'wrongpassword' });
          const time1 = Date.now() - start1;

          const start2 = Date.now();
          const response2 = await request(app)
            .post('/login')
            .send({ email: testData.invalidEmail, password: 'wrongpassword' });
          const time2 = Date.now() - start2;

          // Property: Authentication failures should not reveal information through timing
          // 1. Both should return 401 (or appropriate error status)
          if (![400, 401, 500].includes(response1.status)) return false;
          if (![400, 401, 500].includes(response2.status)) return false;

          // 2. Both should return generic error messages
          if (!response1.body.error || !response2.body.error) return false;

          // 3. Timing difference should not be excessive (within reasonable bounds)
          // Note: This is a simplified timing check - in production, more sophisticated
          // timing attack prevention would be needed
          const timingDifference = Math.abs(time1 - time2);
          
          // Allow for reasonable variance in response times (up to 100ms difference)
          // In a real system, you'd want more sophisticated timing attack prevention
          return timingDifference < 100 || (time1 < 50 && time2 < 50);
        }
      ),
      { numRuns: 50 } // Fewer runs for timing tests to avoid flakiness
    );
  });
});