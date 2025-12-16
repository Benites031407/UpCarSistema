import { describe, it, expect, beforeEach } from 'vitest';
import { JWTService } from './jwt.js';
import { User } from '../models/types.js';

describe('JWTService', () => {
  let jwtService: JWTService;
  let mockUser: User;

  beforeEach(() => {
    jwtService = new JWTService();
    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      accountBalance: 0,
      subscriptionStatus: 'none',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  it('should generate access token', () => {
    const token = jwtService.generateAccessToken(mockUser);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should generate refresh token', () => {
    const token = jwtService.generateRefreshToken(mockUser);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should verify valid token', () => {
    const token = jwtService.generateAccessToken(mockUser);
    const payload = jwtService.verifyToken(token);
    
    expect(payload.userId).toBe(mockUser.id);
    expect(payload.email).toBe(mockUser.email);
    expect(payload.iat).toBeDefined();
    expect(payload.exp).toBeDefined();
  });

  it('should throw error for invalid token', () => {
    expect(() => {
      jwtService.verifyToken('invalid-token');
    }).toThrow('Invalid token');
  });

  it('should decode token without verification', () => {
    const token = jwtService.generateAccessToken(mockUser);
    const payload = jwtService.decodeToken(token);
    
    expect(payload).toBeDefined();
    expect(payload!.userId).toBe(mockUser.id);
    expect(payload!.email).toBe(mockUser.email);
  });

  it('should return null for invalid token decode', () => {
    const payload = jwtService.decodeToken('invalid-token');
    expect(payload).toBeNull();
  });
});