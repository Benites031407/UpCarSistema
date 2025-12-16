import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { createLogger } from '../utils/logger.js';
// Removed unused import

const logger = createLogger('security');

/**
 * Enhanced rate limiting configurations for different endpoint types
 */
export const rateLimitConfigs = {
  // General API endpoints
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        success: false,
        error: 'Too many requests from this IP, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(15 * 60) // 15 minutes in seconds
      });
    }
  }),

  // Authentication endpoints (more restrictive)
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 100 : 10, // Higher limit in development
    message: {
      success: false,
      error: 'Too many authentication attempts, please try again later',
      code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Auth rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        success: false,
        error: 'Too many authentication attempts, please try again later',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(15 * 60)
      });
    }
  }),

  // Payment endpoints (very restrictive in production, relaxed in development)
  payment: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: process.env.NODE_ENV === 'production' ? 5 : 100, // Relaxed for development
    message: {
      success: false,
      error: 'Too many payment attempts, please try again later',
      code: 'PAYMENT_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Payment rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id
      });
      res.status(429).json({
        success: false,
        error: 'Too many payment attempts, please try again later',
        code: 'PAYMENT_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(5 * 60)
      });
    }
  }),

  // Admin endpoints (moderate restrictions)
  admin: rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: process.env.NODE_ENV === 'development' ? 500 : 50, // Higher limit in development
    message: {
      success: false,
      error: 'Too many admin requests, please try again later',
      code: 'ADMIN_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Admin rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id
      });
      res.status(429).json({
        success: false,
        error: 'Too many admin requests, please try again later',
        code: 'ADMIN_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(10 * 60)
      });
    }
  })
};

/**
 * Enhanced input sanitization middleware
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logger.error('Input sanitization error:', error);
    res.status(400).json({
      success: false,
      error: 'Invalid input format',
      code: 'SANITIZATION_ERROR'
    });
  }
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key names to prevent prototype pollution
      const sanitizedKey = sanitizeString(key);
      if (sanitizedKey && !['__proto__', 'constructor', 'prototype'].includes(sanitizedKey)) {
        sanitized[sanitizedKey] = sanitizeObject(value);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Enhanced string sanitization
 * For JSON APIs, we only remove dangerous HTML/script content
 * We don't encode special characters as they're valid in passwords, emails, etc.
 */
function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }

  let sanitized = input.trim();
  
  // Remove all HTML tags including script, iframe, etc.
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // For JSON APIs, we don't encode special characters
  // They're validated by the application layer (email validation, password rules, etc.)
  // Only remove actual HTML/script threats
  
  // Limit length to prevent DoS
  return sanitized.substring(0, 10000);
}

/**
 * SQL injection prevention middleware
 */
export function preventSQLInjection(req: Request, res: Response, next: NextFunction): void {
  // Skip OAuth callback routes - they contain encoded data from external providers
  if (req.path.includes('/google/callback') || req.path.includes('/oauth')) {
    next();
    return;
  }

  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(\/\*|\*\/|--)/gi,
    /;\s*(DROP|DELETE|UPDATE|INSERT)/gi, // Dangerous commands after semicolon
  ];

  const checkForSQLInjection = (value: any): boolean => {
    if (typeof value === 'string') {
      // Skip check for ISO date formats (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
      }
      // Skip check for ISO datetime formats
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return false;
      }
      // Skip check for short search queries (less than 50 chars with no SQL keywords)
      if (value.length < 50 && !/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b/gi.test(value)) {
        return false;
      }
      return sqlInjectionPatterns.some(pattern => pattern.test(value));
    }
    if (Array.isArray(value)) {
      return value.some(item => checkForSQLInjection(item));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(val => checkForSQLInjection(val));
    }
    return false;
  };

  try {
    // Check request body
    if (req.body && checkForSQLInjection(req.body)) {
      logger.warn('SQL injection attempt detected in body', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        body: req.body
      });
      res.status(400).json({
        success: false,
        error: 'Invalid input detected',
        code: 'SECURITY_VIOLATION'
      });
      return;
    }

    // Check query parameters
    if (req.query && checkForSQLInjection(req.query)) {
      logger.warn('SQL injection attempt detected in query', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        query: req.query
      });
      res.status(400).json({
        success: false,
        error: 'Invalid input detected',
        code: 'SECURITY_VIOLATION'
      });
      return;
    }

    // Check URL parameters
    if (req.params && checkForSQLInjection(req.params)) {
      logger.warn('SQL injection attempt detected in params', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        params: req.params
      });
      res.status(400).json({
        success: false,
        error: 'Invalid input detected',
        code: 'SECURITY_VIOLATION'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('SQL injection check error:', error);
    res.status(500).json({
      success: false,
      error: 'Security check failed',
      code: 'SECURITY_CHECK_ERROR'
    });
  }
}

/**
 * Security headers middleware
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' wss: ws:; " +
    "font-src 'self'; " +
    "object-src 'none'; " +
    "media-src 'self'; " +
    "frame-src 'none';"
  );

  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Remove server information
  res.removeHeader('X-Powered-By');

  next();
}

/**
 * Request size limiting middleware
 */
export function limitRequestSize(maxSize: string = '10mb') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('content-length');
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        logger.warn('Request size limit exceeded', {
          ip: req.ip,
          url: req.url,
          method: req.method,
          contentLength: sizeInBytes,
          maxSize: maxSizeInBytes
        });
        res.status(413).json({
          success: false,
          error: 'Request entity too large',
          code: 'REQUEST_TOO_LARGE'
        });
        return;
      }
    }
    next();
  };
}

/**
 * Parse size string to bytes
 */
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * units[unit]);
}

/**
 * IP whitelist middleware for admin endpoints
 */
export function ipWhitelist(allowedIPs: string[] = []) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // In development, allow all IPs
    if (process.env.NODE_ENV === 'development') {
      next();
      return;
    }

    const clientIP = req.ip || req.connection.remoteAddress || '';
    const isAllowed = allowedIPs.length === 0 || allowedIPs.includes(clientIP) || 
                     allowedIPs.some(ip => clientIP.startsWith(ip));

    if (!isAllowed) {
      logger.warn('IP not whitelisted for admin access', {
        ip: clientIP,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
      res.status(403).json({
        success: false,
        error: 'Access denied from this IP address',
        code: 'IP_NOT_WHITELISTED'
      });
      return;
    }

    next();
  };
}

/**
 * Suspicious activity detection middleware
 */
export function detectSuspiciousActivity(req: Request, res: Response, next: NextFunction): void {
  const suspiciousPatterns = [
    // Common attack patterns
    /\.\.\//g, // Directory traversal
    /\0/g, // Null bytes
    /%00/g, // URL encoded null bytes
    /%2e%2e%2f/gi, // URL encoded directory traversal
    /\${.*}/g, // Template injection
    /{{.*}}/g, // Template injection
    /<\?php/gi, // PHP injection
    /<%.*%>/g, // ASP injection
  ];

  const checkSuspiciousContent = (value: any): boolean => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    if (Array.isArray(value)) {
      return value.some(item => checkSuspiciousContent(item));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(val => checkSuspiciousContent(val));
    }
    return false;
  };

  try {
    // Check URL for suspicious patterns
    if (suspiciousPatterns.some(pattern => pattern.test(req.url))) {
      logger.warn('Suspicious URL pattern detected', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
      res.status(400).json({
        success: false,
        error: 'Invalid request format',
        code: 'SUSPICIOUS_ACTIVITY'
      });
      return;
    }

    // Check request data
    if ((req.body && checkSuspiciousContent(req.body)) ||
        (req.query && checkSuspiciousContent(req.query)) ||
        (req.params && checkSuspiciousContent(req.params))) {
      logger.warn('Suspicious content detected', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
      res.status(400).json({
        success: false,
        error: 'Invalid request content',
        code: 'SUSPICIOUS_ACTIVITY'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Suspicious activity detection error:', error);
    next();
  }
}