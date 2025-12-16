import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('error-handler');

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Predefined error types for common scenarios
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, true, 'CONFLICT_ERROR', details);
  }
}

export class PaymentError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 402, true, 'PAYMENT_ERROR', details);
  }
}

export class IoTError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 503, true, 'IOT_ERROR', details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: any) {
    super(`${service} service error: ${message}`, 503, true, 'EXTERNAL_SERVICE_ERROR', details);
  }
}

/**
 * Async error wrapper to catch async route handler errors
 */
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handling middleware
 */
export function globalErrorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details: any = undefined;

  // Handle known application errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || 'APP_ERROR';
    details = error.details;
  }
  // Handle database errors
  else if (error.message?.includes('duplicate key')) {
    statusCode = 409;
    message = 'Resource already exists';
    code = 'DUPLICATE_ERROR';
  }
  else if (error.message?.includes('foreign key')) {
    statusCode = 400;
    message = 'Invalid reference to related resource';
    code = 'FOREIGN_KEY_ERROR';
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  }
  // Handle validation errors from other libraries
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = error.message;
  }

  // Log error details
  const errorLog = {
    message: error.message,
    stack: error.stack,
    statusCode,
    code,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString()
  };

  if (statusCode >= 500) {
    logger.error('Server error:', errorLog);
  } else {
    logger.warn('Client error:', errorLog);
  }

  // Send error response
  const response: any = {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString()
  };

  // Include details in development or for client errors
  if (details && (process.env.NODE_ENV === 'development' || statusCode < 500)) {
    response.details = details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn('Route not found:', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
}

/**
 * Graceful shutdown handler
 */
export function createGracefulShutdownHandler(server: any, services: Array<{ name: string; shutdown: () => Promise<void> }>) {
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn('Shutdown already in progress, forcing exit');
      process.exit(1);
    }

    isShuttingDown = true;
    logger.info(`${signal} received, starting graceful shutdown`);

    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed');
    });

    try {
      // Shutdown services in parallel with timeout
      const shutdownPromises = services.map(async (service) => {
        try {
          await Promise.race([
            service.shutdown(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`${service.name} shutdown timeout`)), 10000)
            )
          ]);
          logger.info(`${service.name} shutdown completed`);
        } catch (error) {
          logger.error(`Error shutting down ${service.name}:`, error);
        }
      });

      await Promise.allSettled(shutdownPromises);
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return shutdown;
}

/**
 * Health check error handler
 */
export function handleHealthCheckError(error: any): { status: string; details: any } {
  logger.error('Health check failed:', error);
  
  return {
    status: 'unhealthy',
    details: {
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Retry mechanism for operations that might fail temporarily
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: boolean;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = true,
    onRetry
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError!;
}

/**
 * Circuit breaker pattern for external service calls
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly resetTimeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new ExternalServiceError('Circuit breaker', 'Service temporarily unavailable');
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), this.timeout)
        )
      ]);

      // Success - reset circuit breaker
      this.failures = 0;
      this.state = 'closed';
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.threshold) {
        this.state = 'open';
      }

      throw error;
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailureTime = 0;
  }
}

/**
 * Enhanced error messages for user-friendly display
 */
export function getUserFriendlyErrorMessage(error: Error | AppError): string {
  if (error instanceof AppError) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      case 'AUTHENTICATION_ERROR':
        return 'Please log in to continue.';
      case 'AUTHORIZATION_ERROR':
        return 'You do not have permission to perform this action.';
      case 'NOT_FOUND_ERROR':
        return 'The requested item was not found.';
      case 'CONFLICT_ERROR':
        return 'This action conflicts with existing data.';
      case 'PAYMENT_ERROR':
        return 'Payment processing failed. Please try again or use a different payment method.';
      case 'IOT_ERROR':
        return 'Machine is currently unavailable. Please try again later.';
      case 'EXTERNAL_SERVICE_ERROR':
        return 'External service is temporarily unavailable. Please try again later.';
      case 'RATE_LIMIT':
        return 'Too many requests. Please wait a moment before trying again.';
      default:
        return error.message;
    }
  }

  // Handle specific error patterns
  const message = error.message.toLowerCase();
  if (message.includes('network') || message.includes('connection')) {
    return 'Network connection failed. Please check your internet connection and try again.';
  }
  if (message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  if (message.includes('invalid machine code')) {
    return 'Invalid machine code. Please check the code and try again.';
  }
  if (message.includes('machine not found')) {
    return 'Machine not found. Please verify the machine code.';
  }
  if (message.includes('insufficient balance')) {
    return 'Insufficient account balance. Please add credit to your account.';
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Enhanced validation error formatter
 */
export function formatValidationErrors(errors: any[]): { field: string; message: string }[] {
  return errors.map(error => {
    let field = 'unknown';
    let message = 'Invalid input';

    if ('param' in error) {
      field = error.param;
    } else if ('path' in error && Array.isArray(error.path)) {
      field = error.path.join('.');
    }

    if (error.msg) {
      message = error.msg;
    } else if (error.message) {
      message = error.message;
    }

    // Make error messages more user-friendly
    if (message.includes('must be')) {
      // Keep as is - already user-friendly
    } else if (message.includes('required')) {
      message = `${field} is required`;
    } else if (message.includes('invalid')) {
      message = `${field} is invalid`;
    }

    return { field, message };
  });
}

/**
 * Retry mechanism with exponential backoff for critical operations
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    retryCondition?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = () => true
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts || !retryCondition(lastError)) {
        throw lastError;
      }

      logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, {
        error: lastError.message,
        attempt,
        maxAttempts
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Graceful degradation for non-critical operations
 */
export async function withGracefulDegradation<T>(
  operation: () => Promise<T>,
  fallback: T | (() => T | Promise<T>),
  options: {
    logError?: boolean;
    errorMessage?: string;
  } = {}
): Promise<T> {
  const { logError = true, errorMessage = 'Operation failed, using fallback' } = options;

  try {
    return await operation();
  } catch (error) {
    if (logError) {
      logger.warn(errorMessage, error);
    }

    if (typeof fallback === 'function') {
      return await (fallback as () => T | Promise<T>)();
    }
    return fallback;
  }
}

/**
 * Input validation with detailed error reporting
 */
export function validateAndSanitizeInput(
  input: any,
  rules: {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowedValues?: any[];
    sanitize?: boolean;
  }
): { isValid: boolean; value?: any; errors: string[] } {
  const errors: string[] = [];
  let value = input;

  // Check if required
  if (rules.required && (input === null || input === undefined || input === '')) {
    errors.push('This field is required');
    return { isValid: false, errors };
  }

  // Skip further validation if not required and empty
  if (!rules.required && (input === null || input === undefined || input === '')) {
    return { isValid: true, value: input, errors: [] };
  }

  // Type validation
  if (rules.type) {
    const actualType = Array.isArray(input) ? 'array' : typeof input;
    if (actualType !== rules.type) {
      errors.push(`Expected ${rules.type} but got ${actualType}`);
    }
  }

  // String-specific validations
  if (typeof input === 'string') {
    if (rules.minLength && input.length < rules.minLength) {
      errors.push(`Must be at least ${rules.minLength} characters long`);
    }
    if (rules.maxLength && input.length > rules.maxLength) {
      errors.push(`Must be no more than ${rules.maxLength} characters long`);
    }
    if (rules.pattern && !rules.pattern.test(input)) {
      errors.push('Invalid format');
    }
    if (rules.sanitize) {
      value = input.trim().replace(/[<>]/g, '').substring(0, rules.maxLength || 1000);
    }
  }

  // Allowed values validation
  if (rules.allowedValues && !rules.allowedValues.includes(input)) {
    errors.push(`Must be one of: ${rules.allowedValues.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    value,
    errors
  };
}

/**
 * Enhanced error response formatter
 */
export function createErrorResponse(
  error: Error | AppError,
  req?: Request
): {
  success: false;
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
  requestId?: string;
} {
  const response: any = {
    success: false,
    error: getUserFriendlyErrorMessage(error),
    timestamp: new Date().toISOString()
  };

  if (error instanceof AppError) {
    response.code = error.code;
    if (error.details && (process.env.NODE_ENV === 'development' || error.statusCode < 500)) {
      response.details = error.details;
    }
  }

  if (req) {
    response.requestId = (req as any).requestId || 'unknown';
  }

  return response;
}