import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';
import { redisSessionManager } from './redis.js';
import { auditOperations } from '../middleware/auditLog.js';

const logger = createLogger('session-security');

/**
 * Session security configuration
 */
export interface SessionSecurityConfig {
  maxConcurrentSessions: number;
  sessionTimeout: number; // in milliseconds
  inactivityTimeout: number; // in milliseconds
  requireReauthForSensitive: boolean;
  trackDeviceFingerprint: boolean;
  detectSuspiciousActivity: boolean;
}

/**
 * Default session security configuration
 */
export const defaultSessionConfig: SessionSecurityConfig = {
  maxConcurrentSessions: 5,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  inactivityTimeout: 2 * 60 * 60 * 1000, // 2 hours
  requireReauthForSensitive: true,
  trackDeviceFingerprint: true,
  detectSuspiciousActivity: true
};

/**
 * Device fingerprint interface
 */
export interface DeviceFingerprint {
  userAgent: string;
  ip: string;
  acceptLanguage?: string;
  acceptEncoding?: string;
  fingerprint: string;
}

/**
 * Session metadata interface
 */
export interface SessionMetadata {
  userId: string;
  deviceFingerprint: DeviceFingerprint;
  createdAt: Date;
  lastActivity: Date;
  lastReauth?: Date;
  isActive: boolean;
  riskScore: number;
  loginAttempts: number;
  suspiciousActivity: string[];
}

/**
 * Generate device fingerprint from request
 */
export function generateDeviceFingerprint(req: Request): DeviceFingerprint {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || '';
  const acceptLanguage = req.get('Accept-Language') || '';
  const acceptEncoding = req.get('Accept-Encoding') || '';

  // Create a simple fingerprint hash
  const fingerprintData = `${userAgent}|${ip}|${acceptLanguage}|${acceptEncoding}`;
  const fingerprint = Buffer.from(fingerprintData).toString('base64');

  return {
    userAgent,
    ip,
    acceptLanguage,
    acceptEncoding,
    fingerprint
  };
}

/**
 * Calculate session risk score based on various factors
 */
export function calculateRiskScore(
  currentFingerprint: DeviceFingerprint,
  sessionMetadata: SessionMetadata,
  _req: Request
): number {
  let riskScore = 0;

  // IP address change
  if (currentFingerprint.ip !== sessionMetadata.deviceFingerprint.ip) {
    riskScore += 30;
  }

  // User agent change
  if (currentFingerprint.userAgent !== sessionMetadata.deviceFingerprint.userAgent) {
    riskScore += 20;
  }

  // Time-based factors
  const now = new Date();
  const timeSinceLastActivity = now.getTime() - sessionMetadata.lastActivity.getTime();
  const timeSinceCreation = now.getTime() - sessionMetadata.createdAt.getTime();

  // Long inactivity
  if (timeSinceLastActivity > 4 * 60 * 60 * 1000) { // 4 hours
    riskScore += 15;
  }

  // Very old session
  if (timeSinceCreation > 7 * 24 * 60 * 60 * 1000) { // 7 days
    riskScore += 25;
  }

  // Multiple login attempts
  if (sessionMetadata.loginAttempts > 3) {
    riskScore += 10;
  }

  // Previous suspicious activity
  riskScore += sessionMetadata.suspiciousActivity.length * 5;

  // Geographic location check (simplified - in production use proper geolocation)
  const isUnusualLocation = checkUnusualLocation(currentFingerprint.ip, sessionMetadata.deviceFingerprint.ip);
  if (isUnusualLocation) {
    riskScore += 40;
  }

  return Math.min(riskScore, 100); // Cap at 100
}

/**
 * Simple unusual location check (in production, use proper geolocation service)
 */
function checkUnusualLocation(currentIP: string, originalIP: string): boolean {
  // This is a simplified check - in production, use a proper geolocation service
  // to check if the IP addresses are from significantly different locations
  
  // For now, just check if IPs are completely different
  const currentParts = currentIP.split('.');
  const originalParts = originalIP.split('.');
  
  if (currentParts.length !== 4 || originalParts.length !== 4) {
    return false;
  }

  // Check if first two octets are different (different network)
  return currentParts[0] !== originalParts[0] || currentParts[1] !== originalParts[1];
}

/**
 * Enhanced session validation middleware
 */
export function validateSession(config: SessionSecurityConfig = defaultSessionConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.sessionId;
      if (!sessionId) {
        next();
        return;
      }

      // Get session metadata
      const sessionData = await redisSessionManager.getSession(sessionId);
      if (!sessionData) {
        res.status(401).json({
          success: false,
          error: 'Session expired',
          code: 'SESSION_EXPIRED'
        });
        return;
      }

      const sessionMetadata: SessionMetadata = JSON.parse(sessionData);
      const currentFingerprint = generateDeviceFingerprint(req);

      // Check session timeout
      const now = new Date();
      const sessionAge = now.getTime() - sessionMetadata.createdAt.getTime();
      if (sessionAge > config.sessionTimeout) {
        await redisSessionManager.deleteSession(sessionId);
        res.status(401).json({
          success: false,
          error: 'Session expired due to timeout',
          code: 'SESSION_TIMEOUT'
        });
        return;
      }

      // Check inactivity timeout
      const inactivityTime = now.getTime() - sessionMetadata.lastActivity.getTime();
      if (inactivityTime > config.inactivityTimeout) {
        await redisSessionManager.deleteSession(sessionId);
        res.status(401).json({
          success: false,
          error: 'Session expired due to inactivity',
          code: 'SESSION_INACTIVE'
        });
        return;
      }

      // Calculate risk score
      const riskScore = calculateRiskScore(currentFingerprint, sessionMetadata, req);

      // Handle high-risk sessions
      if (riskScore > 70) {
        logger.warn('High-risk session detected', {
          sessionId,
          userId: sessionMetadata.userId,
          riskScore,
          currentIP: currentFingerprint.ip,
          originalIP: sessionMetadata.deviceFingerprint.ip
        });

        auditOperations.suspiciousActivity(req, 'high_risk_session', {
          riskScore,
          sessionId,
          userId: sessionMetadata.userId
        });

        // Require re-authentication for high-risk sessions
        res.status(401).json({
          success: false,
          error: 'Reautenticação necessária devido a atividade suspeita',
          code: 'REAUTH_REQUIRED',
          riskScore
        });
        return;
      }

      // Update session metadata
      sessionMetadata.lastActivity = now;
      sessionMetadata.riskScore = riskScore;
      sessionMetadata.deviceFingerprint = currentFingerprint;

      // Store updated metadata
      await redisSessionManager.setSession(sessionId, JSON.stringify(sessionMetadata), config.sessionTimeout);

      // Add session info to request
      (req as any).sessionMetadata = sessionMetadata;
      (req as any).riskScore = riskScore;

      next();
    } catch (error) {
      logger.error('Session validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Session validation failed',
        code: 'SESSION_VALIDATION_ERROR'
      });
    }
  };
}

/**
 * Middleware to enforce concurrent session limits
 */
export function enforceConcurrentSessionLimit(maxSessions: number = defaultSessionConfig.maxConcurrentSessions) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      if (!user) {
        next();
        return;
      }

      // Get all active sessions for the user
      const userSessionsKey = `user_sessions:${user.id}`;
      const activeSessions = await redisSessionManager.getActiveSessions(userSessionsKey);

      if (activeSessions.length >= maxSessions) {
        // Remove oldest session
        const oldestSession = activeSessions[0];
        await redisSessionManager.deleteSession(oldestSession);
        
        logger.info('Removed oldest session due to concurrent session limit', {
          userId: user.id,
          removedSession: oldestSession,
          maxSessions
        });
      }

      next();
    } catch (error) {
      logger.error('Concurrent session limit enforcement error:', error);
      next(); // Don't block the request on this error
    }
  };
}

/**
 * Middleware to require re-authentication for sensitive operations
 */
export function requireRecentAuth(maxAge: number = 30 * 60 * 1000) { // 30 minutes default
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.sessionId;
      
      if (!sessionId) {
        res.status(401).json({
          success: false,
          error: 'Session required',
          code: 'SESSION_REQUIRED'
        });
        return;
      }

      // Get session metadata from Redis
      const sessionData = await redisSessionManager.getSession(sessionId);
      if (!sessionData) {
        res.status(401).json({
          success: false,
          error: 'Session expired',
          code: 'SESSION_EXPIRED'
        });
        return;
      }

      const sessionMetadata: SessionMetadata = JSON.parse(sessionData);
      
      const now = new Date();
      const lastReauth = sessionMetadata.lastReauth || sessionMetadata.createdAt;
      const timeSinceReauth = now.getTime() - new Date(lastReauth).getTime();

      if (timeSinceReauth > maxAge) {
        res.status(401).json({
          success: false,
          error: 'Autenticação recente necessária para esta operação',
          code: 'REAUTH_REQUIRED',
          lastReauth: new Date(lastReauth).toISOString(),
          timeSinceReauth: Math.floor(timeSinceReauth / 1000), // in seconds
          maxAge: Math.floor(maxAge / 1000) // in seconds
        });
        return;
      }

      // Attach session metadata to request for other middleware
      (req as any).sessionMetadata = sessionMetadata;

      next();
    } catch (error) {
      logger.error('Recent auth check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify authentication',
        code: 'AUTH_CHECK_ERROR'
      });
    }
  };
}

/**
 * Update last re-authentication time
 */
export async function updateReauthTime(sessionId: string): Promise<void> {
  try {
    const sessionData = await redisSessionManager.getSession(sessionId);
    if (sessionData) {
      const sessionMetadata: SessionMetadata = JSON.parse(sessionData);
      sessionMetadata.lastReauth = new Date();
      
      await redisSessionManager.setSession(
        sessionId, 
        JSON.stringify(sessionMetadata),
        defaultSessionConfig.sessionTimeout
      );
    }
  } catch (error) {
    logger.error('Failed to update reauth time:', error);
  }
}

/**
 * Invalidate all sessions for a user (useful for password changes, etc.)
 */
export async function invalidateAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
  try {
    const userSessionsKey = `user_sessions:${userId}`;
    const activeSessions = await redisSessionManager.getActiveSessions(userSessionsKey);

    for (const sessionId of activeSessions) {
      if (sessionId !== exceptSessionId) {
        await redisSessionManager.deleteSession(sessionId);
      }
    }

    logger.info('Invalidated all user sessions', {
      userId,
      sessionCount: activeSessions.length,
      exceptSessionId
    });
  } catch (error) {
    logger.error('Failed to invalidate user sessions:', error);
  }
}

/**
 * Create new session with security metadata
 */
export async function createSecureSession(
  userId: string, 
  req: Request,
  sessionId: string
): Promise<void> {
  try {
    const deviceFingerprint = generateDeviceFingerprint(req);
    const now = new Date();

    const sessionMetadata: SessionMetadata = {
      userId,
      deviceFingerprint,
      createdAt: now,
      lastActivity: now,
      isActive: true,
      riskScore: 0,
      loginAttempts: 0,
      suspiciousActivity: []
    };

    await redisSessionManager.setSession(
      sessionId,
      JSON.stringify(sessionMetadata),
      defaultSessionConfig.sessionTimeout
    );

    // Add to user's active sessions list
    const userSessionsKey = `user_sessions:${userId}`;
    await redisSessionManager.addToUserSessions(userSessionsKey, sessionId);

    logger.info('Created secure session', {
      userId,
      sessionId,
      deviceFingerprint: deviceFingerprint.fingerprint
    });
  } catch (error) {
    logger.error('Failed to create secure session:', error);
    throw error;
  }
}