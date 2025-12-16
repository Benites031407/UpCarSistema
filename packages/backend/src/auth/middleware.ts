import { Request, Response, NextFunction } from 'express';
import { jwtService, JWTPayload } from './jwt.js';
import { redisSessionManager } from './redis.js';
import { PostgresUserRepository } from '../repositories/user.js';
import { User as AppUser } from '../models/types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('auth-middleware');
const userRepository = new PostgresUserRepository();

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: AppUser;
  sessionId: string;
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    // Verify JWT token
    const payload: JWTPayload = jwtService.verifyToken(token);
    
    // Get user from database
    const user = await userRepository.findById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'Usuário não encontrado' });
      return;
    }

    // Check if session exists in Redis
    const sessionId = `${user.id}-${payload.iat}`;
    const session = await redisSessionManager.getSession(sessionId);
    
    if (!session) {
      res.status(401).json({ error: 'Session expired' });
      return;
    }

    // Extend session
    await redisSessionManager.extendSession(sessionId);

    // Attach user and session to request
    (req as any).user = user;
    req.sessionId = sessionId;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        res.status(401).json({ error: 'Token expirado' });
        return;
      }
      if (error.message === 'Invalid token') {
        res.status(401).json({ error: 'Token inválido' });
        return;
      }
    }

    res.status(401).json({ error: 'Authentication failed' });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const payload: JWTPayload = jwtService.verifyToken(token);
    const user = await userRepository.findById(payload.userId);
    
    if (user) {
      const sessionId = `${user.id}-${payload.iat}`;
      const session = await redisSessionManager.getSession(sessionId);
      
      if (session) {
        await redisSessionManager.extendSession(sessionId);
        (req as any).user = user;
        req.sessionId = sessionId;
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on errors, just continue without user
    logger.debug('Optional auth failed:', error);
    next();
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!(req as any).user) {
    res.status(401).json({ error: 'Autenticação necessária' });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as AppUser;
  if (!user) {
    res.status(401).json({ error: 'Autenticação necessária' });
    return;
  }

  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}