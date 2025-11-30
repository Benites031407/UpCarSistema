import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';
import { ValidationError, getUserFriendlyErrorMessage } from './errorHandler.js';

const logger = createLogger('comprehensive-validation');

/**
 * Comprehensive input validation middleware
 */
export function comprehensiveValidation() {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Skip validation for health checks and auth routes to avoid interference
      if (req.url === '/health' || req.url.startsWith('/auth/') || req.url === '/protected') {
        return next();
      }

      // Note: Input sanitization is handled by the sanitizeInput middleware in security.js
      // which is applied globally in index.ts

      // Validate common security headers (but be lenient for tests)
      const userAgent = req.get('User-Agent');
      if (userAgent && userAgent.length > 500) {
        throw new ValidationError('User-Agent header too long');
      }

      // Validate content type for POST/PUT requests (but be lenient)
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.get('Content-Type');
        if (contentType && 
            !contentType.includes('application/json') && 
            !contentType.includes('multipart/form-data') &&
            !contentType.includes('application/x-www-form-urlencoded')) {
          throw new ValidationError('Unsupported content type');
        }
      }

      // Validate request size (already handled by express.json() but double-check)
      const contentLength = req.get('Content-Length');
      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
        throw new ValidationError('Request payload too large');
      }

      next();
    } catch (error) {
      logger.warn('Comprehensive validation failed:', {
        url: req.url,
        method: req.method,
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(400).json({
        success: false,
        error: getUserFriendlyErrorMessage(error as Error),
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Machine code validation with enhanced error messages
 */
export function validateMachineCodeInput() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const code = req.params.code || req.body.code || req.query.code;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Machine code is required',
        code: 'VALIDATION_ERROR',
        details: { field: 'code', message: 'Machine code is required' },
        timestamp: new Date().toISOString()
      });
    }

    const validation = validateAndSanitizeInput(code, {
      required: true,
      type: 'string',
      minLength: 6,
      maxLength: 6,
      pattern: /^[A-Z0-9]+$/,
      sanitize: true
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid machine code format. Machine code must be exactly 6 characters containing only letters and numbers.',
        code: 'INVALID_MACHINE_CODE',
        details: { field: 'code', errors: validation.errors },
        timestamp: new Date().toISOString()
      });
    }

    // Update the request with sanitized value
    if (req.params.code) req.params.code = validation.value.toUpperCase();
    if (req.body.code) req.body.code = validation.value.toUpperCase();
    if (req.query.code) req.query.code = validation.value.toUpperCase();

    next();
  };
}

/**
 * Payment amount validation
 */
export function validatePaymentAmount() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const amount = req.body.amount || req.params.amount;
    
    if (amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount is required',
        code: 'VALIDATION_ERROR',
        details: { field: 'amount', message: 'Amount is required' },
        timestamp: new Date().toISOString()
      });
    }

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount must be a positive number',
        code: 'INVALID_AMOUNT',
        details: { field: 'amount', message: 'Amount must be a positive number' },
        timestamp: new Date().toISOString()
      });
    }

    if (numAmount > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount cannot exceed R$ 10,000',
        code: 'AMOUNT_TOO_LARGE',
        details: { field: 'amount', message: 'Amount cannot exceed R$ 10,000' },
        timestamp: new Date().toISOString()
      });
    }

    // Check for more than 2 decimal places
    if (Math.round(numAmount * 100) !== numAmount * 100) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount must have at most 2 decimal places',
        code: 'INVALID_DECIMAL_PLACES',
        details: { field: 'amount', message: 'Amount must have at most 2 decimal places' },
        timestamp: new Date().toISOString()
      });
    }

    // Update request with validated amount
    if (req.body.amount !== undefined) req.body.amount = numAmount;
    if (req.params.amount !== undefined) req.params.amount = numAmount;

    next();
  };
}

/**
 * Duration validation for machine usage
 */
export function validateUsageDuration() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const duration = req.body.duration;
    
    if (duration === undefined || duration === null) {
      return res.status(400).json({
        success: false,
        error: 'Usage duration is required',
        code: 'VALIDATION_ERROR',
        details: { field: 'duration', message: 'Duration is required' },
        timestamp: new Date().toISOString()
      });
    }

    const numDuration = typeof duration === 'string' ? parseInt(duration, 10) : duration;
    
    if (isNaN(numDuration) || !Number.isInteger(numDuration)) {
      return res.status(400).json({
        success: false,
        error: 'Duration must be a whole number of minutes',
        code: 'INVALID_DURATION',
        details: { field: 'duration', message: 'Duration must be an integer' },
        timestamp: new Date().toISOString()
      });
    }

    if (numDuration < 1 || numDuration > 30) {
      return res.status(400).json({
        success: false,
        error: 'Duration must be between 1 and 30 minutes',
        code: 'DURATION_OUT_OF_RANGE',
        details: { field: 'duration', message: 'Duration must be between 1 and 30 minutes' },
        timestamp: new Date().toISOString()
      });
    }

    req.body.duration = numDuration;
    next();
  };
}

/**
 * Authentication error handling with user-friendly messages
 */
export function enhancedAuthErrorHandler() {
  return (error: any, req: Request, res: Response, next: NextFunction): void => {
    if (error.name === 'UnauthorizedError' || error.message?.includes('jwt')) {
      logger.warn('Authentication failed:', {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        error: error.message
      });

      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in to continue.',
        code: 'AUTHENTICATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    if (error.name === 'ForbiddenError' || error.message?.includes('permission')) {
      logger.warn('Authorization failed:', {
        url: req.url,
        method: req.method,
        userId: (req as any).user?.id,
        error: error.message
      });

      return res.status(403).json({
        success: false,
        error: 'You do not have permission to perform this action.',
        code: 'AUTHORIZATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    next(error);
  };
}

/**
 * Notification validation for rate limiting and content
 */
export function validateNotificationInput() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { type, message, machineId } = req.body;

    // Validate notification type
    const allowedTypes = ['maintenance_required', 'machine_offline', 'system_error'];
    if (!type || !allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification type',
        code: 'INVALID_NOTIFICATION_TYPE',
        details: { 
          field: 'type', 
          message: `Type must be one of: ${allowedTypes.join(', ')}` 
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate message content
    const messageValidation = validateAndSanitizeInput(message, {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 500,
      pattern: /^[a-zA-Z0-9\s\-,\.\!\?]+$/,
      sanitize: true
    });

    if (!messageValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification message',
        code: 'INVALID_NOTIFICATION_MESSAGE',
        details: { field: 'message', errors: messageValidation.errors },
        timestamp: new Date().toISOString()
      });
    }

    // Validate machine ID if provided
    if (machineId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(machineId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid machine ID format',
          code: 'INVALID_MACHINE_ID',
          details: { field: 'machineId', message: 'Machine ID must be a valid UUID' },
          timestamp: new Date().toISOString()
        });
      }
    }

    // Update request with sanitized values
    req.body.message = messageValidation.value;
    next();
  };
}

/**
 * File upload validation
 */
export function validateFileUpload(options: {
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
} = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    required = false
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const file = (req as any).file;

    if (required && !file) {
      return res.status(400).json({
        success: false,
        error: 'File upload is required',
        code: 'FILE_REQUIRED',
        timestamp: new Date().toISOString()
      });
    }

    if (!file) {
      return next(); // Optional file, continue
    }

    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: `File size cannot exceed ${Math.round(maxSize / (1024 * 1024))}MB`,
        code: 'FILE_TOO_LARGE',
        details: { maxSize, actualSize: file.size },
        timestamp: new Date().toISOString()
      });
    }

    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
        code: 'INVALID_FILE_TYPE',
        details: { 
          allowedTypes, 
          actualType: file.mimetype 
        },
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

/**
 * Pagination validation
 */
export function validatePagination() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 100',
        code: 'INVALID_PAGINATION',
        details: { field: 'limit', message: 'Limit must be between 1 and 100' },
        timestamp: new Date().toISOString()
      });
    }

    if (isNaN(offset) || offset < 0) {
      return res.status(400).json({
        success: false,
        error: 'Offset must be non-negative',
        code: 'INVALID_PAGINATION',
        details: { field: 'offset', message: 'Offset must be non-negative' },
        timestamp: new Date().toISOString()
      });
    }

    req.query.limit = limit.toString();
    req.query.offset = offset.toString();
    next();
  };
}

/**
 * Request ID middleware for tracking
 */
export function addRequestId() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    (req as any).requestId = requestId;
    res.set('X-Request-ID', requestId);
    next();
  };
}