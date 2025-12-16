import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';
// Removed unused import

const auditLogger = createLogger('audit');

/**
 * Audit event types for sensitive operations
 */
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  
  // Authorization events
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ADMIN_ACCESS = 'ADMIN_ACCESS',
  
  // Financial events
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  BALANCE_ADDED = 'BALANCE_ADDED',
  BALANCE_DEDUCTED = 'BALANCE_DEDUCTED',
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  
  // Machine operations
  MACHINE_ACTIVATED = 'MACHINE_ACTIVATED',
  MACHINE_DEACTIVATED = 'MACHINE_DEACTIVATED',
  MACHINE_REGISTERED = 'MACHINE_REGISTERED',
  MACHINE_DELETED = 'MACHINE_DELETED',
  MACHINE_MAINTENANCE = 'MACHINE_MAINTENANCE',
  
  // Admin operations
  USER_BALANCE_MODIFIED = 'USER_BALANCE_MODIFIED',
  USER_ACCOUNT_ACCESSED = 'USER_ACCOUNT_ACCESSED',
  SYSTEM_CONFIGURATION_CHANGED = 'SYSTEM_CONFIGURATION_CHANGED',
  BULK_OPERATION = 'BULK_OPERATION',
  
  // Security events
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  
  // Data access
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  DATA_EXPORT = 'DATA_EXPORT',
  REPORT_GENERATED = 'REPORT_GENERATED'
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  eventType: AuditEventType;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  sessionId?: string;
  ip: string;
  userAgent: string;
  url: string;
  method: string;
  timestamp: Date;
  success: boolean;
  details?: any;
  resourceId?: string;
  resourceType?: string;
  oldValue?: any;
  newValue?: any;
  errorMessage?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Create audit log entry
 */
export function createAuditLog(
  req: Request,
  eventType: AuditEventType,
  options: {
    success?: boolean;
    details?: any;
    resourceId?: string;
    resourceType?: string;
    oldValue?: any;
    newValue?: any;
    errorMessage?: string;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  } = {}
): AuditLogEntry {
  const user = (req as any).user;
  const {
    success = true,
    details,
    resourceId,
    resourceType,
    oldValue,
    newValue,
    errorMessage,
    riskLevel = 'LOW'
  } = options;

  const entry: AuditLogEntry = {
    eventType,
    userId: user?.id,
    userEmail: user?.email,
    userRole: user?.role,
    sessionId: req.sessionId,
    ip: req.ip || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    url: req.url,
    method: req.method,
    timestamp: new Date(),
    success,
    riskLevel
  };

  if (details !== undefined) entry.details = details;
  if (resourceId !== undefined) entry.resourceId = resourceId;
  if (resourceType !== undefined) entry.resourceType = resourceType;
  if (oldValue !== undefined) entry.oldValue = oldValue;
  if (newValue !== undefined) entry.newValue = newValue;
  if (errorMessage !== undefined) entry.errorMessage = errorMessage;

  return entry;
}

/**
 * Log audit event
 */
export function logAuditEvent(entry: AuditLogEntry): void {
  // Sanitize sensitive data before logging
  const sanitizedEntry = sanitizeAuditEntry(entry);
  
  // Log with appropriate level based on risk and success
  if (entry.riskLevel === 'CRITICAL' || !entry.success) {
    auditLogger.error('AUDIT', sanitizedEntry);
  } else if (entry.riskLevel === 'HIGH') {
    auditLogger.warn('AUDIT', sanitizedEntry);
  } else {
    auditLogger.info('AUDIT', sanitizedEntry);
  }

  // In production, you might also want to send to external audit system
  if (process.env.NODE_ENV === 'production' && entry.riskLevel === 'CRITICAL') {
    // TODO: Send to external security monitoring system
    // sendToSecurityMonitoring(sanitizedEntry);
  }
}

/**
 * Sanitize audit entry to remove sensitive information
 */
function sanitizeAuditEntry(entry: AuditLogEntry): AuditLogEntry {
  const sanitized = { ...entry };

  // Remove sensitive fields from details
  if (sanitized.details) {
    sanitized.details = sanitizeObject(sanitized.details);
  }

  // Remove sensitive fields from old/new values
  if (sanitized.oldValue) {
    sanitized.oldValue = sanitizeObject(sanitized.oldValue);
  }
  if (sanitized.newValue) {
    sanitized.newValue = sanitizeObject(sanitized.newValue);
  }

  return sanitized;
}

/**
 * Sanitize object to remove sensitive fields
 */
function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sensitiveFields = [
    'password', 'passwordHash', 'token', 'secret', 'key', 'apiKey',
    'accessToken', 'refreshToken', 'privateKey', 'creditCard', 'ssn',
    'taxId', 'bankAccount', 'routingNumber'
  ];

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeObject(value);
    }
  }

  return sanitized;
}

/**
 * Audit middleware for sensitive operations
 */
export function auditMiddleware(
  eventType: AuditEventType,
  options: {
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    resourceType?: string;
    captureRequestBody?: boolean;
    captureResponseBody?: boolean;
  } = {}
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const {
      riskLevel = 'MEDIUM',
      resourceType,
      captureRequestBody = false,
      captureResponseBody = false
    } = options;

    // Capture original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody: any;

    // Override response methods to capture response
    if (captureResponseBody) {
      res.send = function(body: any) {
        responseBody = body;
        return originalSend.call(this, body);
      };

      res.json = function(body: any) {
        responseBody = body;
        return originalJson.call(this, body);
      };
    }

    // Log the audit event after response
    res.on('finish', () => {
      const success = res.statusCode < 400;
      const details: any = {};

      if (captureRequestBody && req.body) {
        details.requestBody = req.body;
      }

      if (captureResponseBody && responseBody) {
        details.responseBody = responseBody;
      }

      const auditEntry = createAuditLog(req, eventType, {
        success,
        details: Object.keys(details).length > 0 ? details : undefined,
        resourceType,
        riskLevel,
        errorMessage: success ? undefined : `HTTP ${res.statusCode}`
      });

      logAuditEvent(auditEntry);
    });

    next();
  };
}

/**
 * Audit specific operations
 */
export const auditOperations = {
  /**
   * Audit authentication events
   */
  login: (req: Request, success: boolean, userEmail?: string, errorMessage?: string) => {
    const entry = createAuditLog(req, success ? AuditEventType.LOGIN_SUCCESS : AuditEventType.LOGIN_FAILURE, {
      success,
      details: { userEmail },
      errorMessage,
      riskLevel: success ? 'LOW' : 'MEDIUM'
    });
    logAuditEvent(entry);
  },

  logout: (req: Request) => {
    const entry = createAuditLog(req, AuditEventType.LOGOUT, {
      success: true,
      riskLevel: 'LOW'
    });
    logAuditEvent(entry);
  },

  /**
   * Audit financial operations
   */
  paymentInitiated: (req: Request, amount: number, paymentMethod: string, resourceId?: string) => {
    const entry = createAuditLog(req, AuditEventType.PAYMENT_INITIATED, {
      success: true,
      details: { amount, paymentMethod },
      resourceId,
      resourceType: 'payment',
      riskLevel: 'HIGH'
    });
    logAuditEvent(entry);
  },

  balanceModified: (req: Request, targetUserId: string, oldBalance: number, newBalance: number, reason: string) => {
    const entry = createAuditLog(req, AuditEventType.USER_BALANCE_MODIFIED, {
      success: true,
      details: { targetUserId, reason },
      oldValue: { balance: oldBalance },
      newValue: { balance: newBalance },
      resourceId: targetUserId,
      resourceType: 'user_balance',
      riskLevel: 'HIGH'
    });
    logAuditEvent(entry);
  },

  /**
   * Audit machine operations
   */
  machineActivated: (req: Request, machineId: string, duration: number, cost: number) => {
    const entry = createAuditLog(req, AuditEventType.MACHINE_ACTIVATED, {
      success: true,
      details: { duration, cost },
      resourceId: machineId,
      resourceType: 'machine',
      riskLevel: 'MEDIUM'
    });
    logAuditEvent(entry);
  },

  /**
   * Audit security events
   */
  suspiciousActivity: (req: Request, activityType: string, details?: any) => {
    const entry = createAuditLog(req, AuditEventType.SUSPICIOUS_ACTIVITY, {
      success: false,
      details: { activityType, ...details },
      riskLevel: 'HIGH'
    });
    logAuditEvent(entry);
  },

  unauthorizedAccess: (req: Request, attemptedResource: string) => {
    const entry = createAuditLog(req, AuditEventType.UNAUTHORIZED_ACCESS, {
      success: false,
      details: { attemptedResource },
      riskLevel: 'HIGH'
    });
    logAuditEvent(entry);
  },

  /**
   * Audit data access
   */
  sensitiveDataAccess: (req: Request, dataType: string, resourceId?: string) => {
    const entry = createAuditLog(req, AuditEventType.SENSITIVE_DATA_ACCESS, {
      success: true,
      details: { dataType },
      resourceId,
      resourceType: 'sensitive_data',
      riskLevel: 'MEDIUM'
    });
    logAuditEvent(entry);
  },

  dataExport: (req: Request, exportType: string, recordCount: number) => {
    const entry = createAuditLog(req, AuditEventType.DATA_EXPORT, {
      success: true,
      details: { exportType, recordCount },
      resourceType: 'data_export',
      riskLevel: 'HIGH'
    });
    logAuditEvent(entry);
  }
};

/**
 * Middleware to audit all admin operations
 */
export function auditAdminOperations(req: Request, res: Response, next: NextFunction): void {
  const entry = createAuditLog(req, AuditEventType.ADMIN_ACCESS, {
    success: true,
    details: {
      endpoint: req.url,
      method: req.method
    },
    riskLevel: 'HIGH'
  });

  // Log after response
  res.on('finish', () => {
    entry.success = res.statusCode < 400;
    if (!entry.success) {
      entry.errorMessage = `HTTP ${res.statusCode}`;
      entry.riskLevel = 'CRITICAL';
    }
    logAuditEvent(entry);
  });

  next();
}

/**
 * Middleware to detect and audit rate limit violations
 */
export function auditRateLimit(req: Request, res: Response, next: NextFunction): void {
  const originalStatus = res.status;
  
  res.status = function(code: number) {
    if (code === 429) {
      const entry = createAuditLog(req, AuditEventType.RATE_LIMIT_EXCEEDED, {
        success: false,
        details: {
          endpoint: req.url,
          method: req.method
        },
        riskLevel: 'MEDIUM'
      });
      logAuditEvent(entry);
    }
    return originalStatus.call(this, code);
  };

  next();
}