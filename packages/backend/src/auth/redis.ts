import { createClient, RedisClientType } from 'redis';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('redis');

export class RedisSessionManager {
  private client: RedisClientType;
  private readonly sessionPrefix = 'session:';
  private readonly refreshTokenPrefix = 'refresh:';
  private readonly userSessionsPrefix = 'user_sessions:';
  private readonly passwordResetPrefix = 'password_reset:';
  private readonly sessionTTL = 3600; // 1 hour in seconds
  private readonly refreshTokenTTL = 604800; // 7 days in seconds

  constructor() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || '6379';
    const redisPassword = process.env.REDIS_PASSWORD;
    
    const redisUrl = process.env.REDIS_URL || 
      (redisPassword 
        ? `redis://:${redisPassword}@${redisHost}:${redisPort}`
        : `redis://${redisHost}:${redisPort}`);
    
    console.log(`[REDIS DEBUG] Initializing Redis client with URL: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`);
    console.log(`[REDIS DEBUG] REDIS_URL env var: ${process.env.REDIS_URL}`);
    
    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis connection failed after 10 retries');
            return new Error('Redis connection failed');
          }
          return Math.min(retries * 50, 1000);
        }
      }
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis client disconnected');
    });
  }

  async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.disconnect();
    }
  }

  async storeSession(sessionId: string, userId: string, data?: Record<string, any>): Promise<void> {
    await this.connect();
    
    const sessionData = {
      userId,
      createdAt: new Date().toISOString(),
      ...data
    };

    await this.client.setEx(
      `${this.sessionPrefix}${sessionId}`,
      this.sessionTTL,
      JSON.stringify(sessionData)
    );
  }

  async getSession(sessionId: string): Promise<string | null> {
    await this.connect();
    
    const sessionData = await this.client.get(`${this.sessionPrefix}${sessionId}`);
    return sessionData;
  }

  async setSession(sessionId: string, data: string, ttlMs?: number): Promise<void> {
    await this.connect();
    
    const ttlSeconds = ttlMs ? Math.floor(ttlMs / 1000) : this.sessionTTL;
    await this.client.setEx(`${this.sessionPrefix}${sessionId}`, ttlSeconds, data);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.connect();
    await this.client.del(`${this.sessionPrefix}${sessionId}`);
  }

  async storeRefreshToken(tokenId: string, userId: string, token: string): Promise<void> {
    await this.connect();
    
    const tokenData = {
      userId,
      token,
      createdAt: new Date().toISOString()
    };

    await this.client.setEx(
      `${this.refreshTokenPrefix}${tokenId}`,
      this.refreshTokenTTL,
      JSON.stringify(tokenData)
    );
  }

  async getRefreshToken(tokenId: string): Promise<{ userId: string; token: string; createdAt: string } | null> {
    await this.connect();
    
    const tokenData = await this.client.get(`${this.refreshTokenPrefix}${tokenId}`);
    
    if (!tokenData) {
      return null;
    }

    try {
      return JSON.parse(tokenData);
    } catch (error) {
      logger.error('Failed to parse refresh token data:', error);
      return null;
    }
  }

  async deleteRefreshToken(tokenId: string): Promise<void> {
    await this.connect();
    await this.client.del(`${this.refreshTokenPrefix}${tokenId}`);
  }

  async extendSession(sessionId: string): Promise<void> {
    await this.connect();
    await this.client.expire(`${this.sessionPrefix}${sessionId}`, this.sessionTTL);
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.connect();
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  // Enhanced session management methods for security

  async addToUserSessions(userSessionsKey: string, sessionId: string): Promise<void> {
    await this.connect();
    await this.client.sAdd(userSessionsKey, sessionId);
    // Set expiration for the user sessions set
    await this.client.expire(userSessionsKey, this.sessionTTL * 24); // 24 hours
  }

  async removeFromUserSessions(userSessionsKey: string, sessionId: string): Promise<void> {
    await this.connect();
    await this.client.sRem(userSessionsKey, sessionId);
  }

  async getActiveSessions(userSessionsKey: string): Promise<string[]> {
    await this.connect();
    return await this.client.sMembers(userSessionsKey);
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    await this.connect();
    const userSessionsKey = `${this.userSessionsPrefix}${userId}`;
    const sessions = await this.getActiveSessions(userSessionsKey);
    
    // Delete all session data
    const pipeline = this.client.multi();
    for (const sessionId of sessions) {
      pipeline.del(`${this.sessionPrefix}${sessionId}`);
    }
    // Delete the user sessions set
    pipeline.del(userSessionsKey);
    
    await pipeline.exec();
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.connect();
    
    try {
      // This is a simplified cleanup - in production, you might want to use Redis SCAN
      // to iterate through keys more efficiently
      const pattern = `${this.sessionPrefix}*`;
      const keys = await this.client.keys(pattern);
      
      let cleanedCount = 0;
      for (const key of keys) {
        const ttl = await this.client.ttl(key);
        if (ttl === -2) { // Key doesn't exist (expired)
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired sessions`);
      }
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
    }
  }

  async getSessionCount(): Promise<number> {
    await this.connect();
    const pattern = `${this.sessionPrefix}*`;
    const keys = await this.client.keys(pattern);
    return keys.length;
  }

  async getUserSessionCount(userId: string): Promise<number> {
    await this.connect();
    const userSessionsKey = `${this.userSessionsPrefix}${userId}`;
    return await this.client.sCard(userSessionsKey);
  }

  // Password reset token methods
  async storePasswordResetToken(email: string, token: string, ttlSeconds: number): Promise<void> {
    await this.connect();
    
    const tokenData = {
      email,
      createdAt: new Date().toISOString()
    };

    // Store token -> email mapping
    await this.client.setEx(
      `${this.passwordResetPrefix}${token}`,
      ttlSeconds,
      JSON.stringify(tokenData)
    );
  }

  async getPasswordResetEmail(token: string): Promise<string | null> {
    await this.connect();
    
    const tokenData = await this.client.get(`${this.passwordResetPrefix}${token}`);
    
    if (!tokenData) {
      return null;
    }

    try {
      const parsed = JSON.parse(tokenData);
      return parsed.email;
    } catch (error) {
      logger.error('Failed to parse password reset token data:', error);
      return null;
    }
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await this.connect();
    await this.client.del(`${this.passwordResetPrefix}${token}`);
  }
}

export const redisSessionManager = new RedisSessionManager();
