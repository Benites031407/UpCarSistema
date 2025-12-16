import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { z, ZodSchema, ZodError } from 'zod';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('validation');

/**
 * Middleware to handle express-validator validation results
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: 'param' in error ? error.param : 'unknown',
      message: error.msg,
      value: 'value' in error ? error.value : undefined
    }));

    logger.warn('Validation failed:', { 
      url: req.url, 
      method: req.method, 
      errors: formattedErrors 
    });

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: formattedErrors
    });
    return;
  }
  next();
}

/**
 * Creates middleware for Zod schema validation
 */
export function validateSchema<T>(schema: ZodSchema<T>, target: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = target === 'body' ? req.body : 
                   target === 'query' ? req.query : 
                   req.params;

      const result = schema.parse(data);
      
      // Replace the original data with validated/transformed data
      if (target === 'body') {
        req.body = result;
      } else if (target === 'query') {
        req.query = result as any;
      } else {
        req.params = result as any;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: undefined // ZodError doesn't provide input value in the same way
        }));

        logger.warn('Zod validation failed:', { 
          url: req.url, 
          method: req.method, 
          errors: formattedErrors 
        });

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: formattedErrors
        });
        return;
      }

      logger.error('Unexpected validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }
  };
}

/**
 * Combines multiple validation chains and handles results
 */
export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Check for errors
    handleValidationErrors(req, res, next);
  };
}

/**
 * Common validation schemas using Zod
 */
export const commonSchemas = {
  uuid: z.string().uuid('Invalid UUID format'),
  
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters'),
  
  password: z.string()
    .min(6, 'Password must be at least 6 characters long')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/\d/, 'Password must contain at least one number'),
  
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name can only contain letters, spaces, hyphens, apostrophes, and periods'),
  
  machineCode: z.string()
    .length(6, 'Machine code must be exactly 6 characters')
    .regex(/^[A-Z0-9]+$/, 'Machine code must contain only uppercase letters and numbers'),
  
  duration: z.number()
    .int('Duration must be an integer')
    .min(1, 'Duration must be at least 1 minute')
    .max(30, 'Duration cannot exceed 30 minutes'),
  
  amount: z.number()
    .positive('Amount must be positive')
    .max(10000, 'Amount cannot exceed R$ 10,000')
    .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
  
  pagination: z.object({
    limit: z.coerce.number()
      .int('Limit must be an integer')
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .default(50),
    offset: z.coerce.number()
      .int('Offset must be an integer')
      .min(0, 'Offset must be non-negative')
      .default(0)
  }),
  
  timeFormat: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
  
  machineStatus: z.enum(['online', 'offline', 'maintenance', 'in_use'], {
    errorMap: () => ({ message: 'Status must be one of: online, offline, maintenance, in_use' })
  }),
  
  paymentMethod: z.enum(['balance', 'pix', 'admin_credit'], {
    errorMap: () => ({ message: 'Payment method must be one of: balance, pix, admin_credit' })
  })
};

/**
 * Sanitizes string input to prevent XSS and injection attacks
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes that could break SQL
    .substring(0, 1000); // Limit length
}

/**
 * Validates and sanitizes machine code input
 */
export function validateMachineCode(code: string): { isValid: boolean; sanitized?: string; error?: string } {
  if (!code || typeof code !== 'string') {
    return { isValid: false, error: 'Machine code is required' };
  }

  const sanitized = code.trim().toUpperCase();
  
  if (sanitized.length !== 6) {
    return { isValid: false, error: 'Machine code must be exactly 6 characters' };
  }

  if (!/^[A-Z0-9]+$/.test(sanitized)) {
    return { isValid: false, error: 'Machine code must contain only uppercase letters and numbers' };
  }

  return { isValid: true, sanitized };
}

/**
 * Validates operating hours format and logic
 */
export function validateOperatingHours(start: string, end: string): { isValid: boolean; error?: string } {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  if (!timeRegex.test(start)) {
    return { isValid: false, error: 'Start time must be in HH:MM format' };
  }
  
  if (!timeRegex.test(end)) {
    return { isValid: false, error: 'End time must be in HH:MM format' };
  }
  
  if (start >= end) {
    return { isValid: false, error: 'Start time must be before end time' };
  }
  
  return { isValid: true };
}

/**
 * Validates currency amount for Brazilian Real
 */
export function validateBRLAmount(amount: number): { isValid: boolean; error?: string } {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { isValid: false, error: 'Amount must be a valid number' };
  }
  
  if (amount <= 0) {
    return { isValid: false, error: 'Amount must be positive' };
  }
  
  if (amount > 10000) {
    return { isValid: false, error: 'Amount cannot exceed R$ 10,000' };
  }
  
  // Check for more than 2 decimal places using a more robust method
  // that accounts for floating point precision issues
  const rounded = Math.round(amount * 100) / 100;
  if (Math.abs(amount - rounded) > 0.001) {
    return { isValid: false, error: 'Amount must have at most 2 decimal places' };
  }
  
  return { isValid: true };
}

/**
 * Rate limiting validation helper
 */
export function createRateLimitValidator(maxRequests: number, windowMs: number) {
  const requests = new Map<string, number[]>();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.ip || 'unknown';
    const now = Date.now();
    
    if (!requests.has(identifier)) {
      requests.set(identifier, []);
    }
    
    const userRequests = requests.get(identifier)!;
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
    
    if (validRequests.length >= maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
      return;
    }
    
    validRequests.push(now);
    requests.set(identifier, validRequests);
    
    next();
  };
}

/**
 * Enhanced validation schemas for comprehensive input validation
 */
export const enhancedSchemas = {
  // Machine-related validations
  machineActivation: z.object({
    machineId: commonSchemas.uuid,
    duration: commonSchemas.duration,
    paymentMethod: commonSchemas.paymentMethod
  }),

  machineCodeLookup: z.object({
    code: commonSchemas.machineCode
  }),

  machineRegistration: z.object({
    location: z.string()
      .min(1, 'Location is required')
      .max(255, 'Location must be less than 255 characters')
      .regex(/^[a-zA-Z0-9\s\-,\.]+$/, 'Location contains invalid characters'),
    controllerId: z.string()
      .min(1, 'Controller ID is required')
      .max(100, 'Controller ID must be less than 100 characters')
      .regex(/^[a-zA-Z0-9\-_]+$/, 'Controller ID can only contain letters, numbers, hyphens, and underscores'),
    operatingHours: z.object({
      start: commonSchemas.timeFormat,
      end: commonSchemas.timeFormat
    }).refine(data => data.start < data.end, {
      message: 'Start time must be before end time'
    }),
    maintenanceInterval: z.number()
      .int('Maintenance interval must be an integer')
      .min(1, 'Maintenance interval must be at least 1 hour')
      .max(8760, 'Maintenance interval cannot exceed 1 year (8760 hours)')
  }),

  // Payment-related validations
  paymentRequest: z.object({
    amount: commonSchemas.amount,
    description: z.string()
      .min(1, 'Description is required')
      .max(255, 'Description must be less than 255 characters')
      .regex(/^[a-zA-Z0-9\s\-,\.]+$/, 'Description contains invalid characters'),
    externalReference: z.string()
      .max(100, 'External reference must be less than 100 characters')
      .optional()
  }),

  mixedPayment: z.object({
    totalAmount: commonSchemas.amount,
    balanceAmount: z.number()
      .min(0, 'Balance amount must be non-negative')
      .max(10000, 'Balance amount cannot exceed R$ 10,000'),
    description: z.string()
      .min(1, 'Description is required')
      .max(255, 'Description must be less than 255 characters')
  }).refine(data => data.balanceAmount <= data.totalAmount, {
    message: 'Balance amount cannot exceed total amount'
  }),

  // User management validations
  userRegistration: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    name: commonSchemas.name
  }),

  userLogin: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password is required')
  }),

  profileUpdate: z.object({
    name: commonSchemas.name.optional(),
    email: commonSchemas.email.optional()
  }),

  passwordChange: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: commonSchemas.password
  }),

  // Admin operations
  adminCreditAddition: z.object({
    userId: commonSchemas.uuid,
    amount: commonSchemas.amount,
    reason: z.string()
      .min(1, 'Reason is required')
      .max(500, 'Reason must be less than 500 characters')
  }),

  // Notification validations
  notificationCreate: z.object({
    type: z.enum(['maintenance_required', 'machine_offline', 'system_error'], {
      errorMap: () => ({ message: 'Invalid notification type' })
    }),
    machineId: commonSchemas.uuid.optional(),
    message: z.string()
      .min(1, 'Message is required')
      .max(500, 'Message must be less than 500 characters')
      .regex(/^[a-zA-Z0-9\s\-,\.\!\?]+$/, 'Message contains invalid characters')
  }),

  // Session management
  sessionOperation: z.object({
    sessionId: commonSchemas.uuid
  }),

  // Search and filtering
  searchQuery: z.object({
    query: z.string()
      .min(1, 'Search query is required')
      .max(100, 'Search query must be less than 100 characters')
      .regex(/^[a-zA-Z0-9\s\-@\.]+$/, 'Search query contains invalid characters'),
    limit: z.coerce.number()
      .int('Limit must be an integer')
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .default(20),
    offset: z.coerce.number()
      .int('Offset must be an integer')
      .min(0, 'Offset must be non-negative')
      .default(0)
  }),

  // Date range filtering
  dateRange: z.object({
    startDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
      .optional(),
    endDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
      .optional()
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, {
    message: 'Start date must be before or equal to end date'
  })
};

/**
 * Comprehensive input sanitization
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/\\/g, '') // Remove backslashes
      .substring(0, 1000); // Limit length
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: any): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { isValid: false, error: 'File size cannot exceed 5MB' };
  }

  // Check file type for images
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return { isValid: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed' };
  }

  return { isValid: true };
}

/**
 * Validate IP address
 */
export function validateIPAddress(ip: string): { isValid: boolean; error?: string } {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
    return { isValid: false, error: 'Invalid IP address format' };
  }
  
  return { isValid: true };
}

/**
 * Advanced rate limiting with different tiers
 */
export function createAdvancedRateLimit(config: {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}) {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = config.keyGenerator ? config.keyGenerator(req) : req.ip || 'unknown';
    const now = Date.now();
    
    let requestData = requests.get(key);
    
    // Reset if window has expired
    if (!requestData || now > requestData.resetTime) {
      requestData = {
        count: 0,
        resetTime: now + config.windowMs
      };
    }
    
    requestData.count++;
    requests.set(key, requestData);
    
    if (requestData.count > config.maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
        limit: config.maxRequests,
        remaining: 0,
        reset: new Date(requestData.resetTime).toISOString()
      });
      return;
    }
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': (config.maxRequests - requestData.count).toString(),
      'X-RateLimit-Reset': new Date(requestData.resetTime).toISOString()
    });
    
    next();
  };
}