/**
 * Security configuration for the Machine Rental System
 * This file centralizes all security-related settings and policies
 */

export interface SecurityConfig {
  // Rate limiting configuration
  rateLimiting: {
    api: {
      windowMs: number;
      max: number;
    };
    auth: {
      windowMs: number;
      max: number;
    };
    payment: {
      windowMs: number;
      max: number;
    };
    admin: {
      windowMs: number;
      max: number;
    };
  };

  // Session security configuration
  session: {
    maxConcurrentSessions: number;
    sessionTimeout: number; // in milliseconds
    inactivityTimeout: number; // in milliseconds
    requireReauthForSensitive: boolean;
    trackDeviceFingerprint: boolean;
    detectSuspiciousActivity: boolean;
  };

  // Password policy
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number; // in days, 0 = no expiration
    preventReuse: number; // number of previous passwords to check
  };

  // Input validation and sanitization
  input: {
    maxRequestSize: string;
    maxParameterCount: number;
    enableSQLInjectionPrevention: boolean;
    enableXSSPrevention: boolean;
    enableCSRFProtection: boolean;
  };

  // Audit logging configuration
  audit: {
    enableAuditLogging: boolean;
    logLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    retentionDays: number;
    enableExternalLogging: boolean;
    sensitiveOperations: string[];
  };

  // CORS configuration
  cors: {
    allowedOrigins: string[];
    allowCredentials: boolean;
    maxAge: number;
    allowedMethods: string[];
    allowedHeaders: string[];
  };

  // Content Security Policy
  csp: {
    defaultSrc: string[];
    scriptSrc: string[];
    styleSrc: string[];
    imgSrc: string[];
    connectSrc: string[];
    fontSrc: string[];
    objectSrc: string[];
    mediaSrc: string[];
    frameSrc: string[];
  };

  // IP restrictions
  ipRestrictions: {
    enableWhitelist: boolean;
    adminWhitelist: string[];
    enableBlacklist: boolean;
    blacklist: string[];
  };

  // Encryption settings
  encryption: {
    jwtSecret: string;
    jwtExpiresIn: string;
    jwtRefreshExpiresIn: string;
    bcryptSaltRounds: number;
  };
}

/**
 * Default security configuration
 */
export const defaultSecurityConfig: SecurityConfig = {
  rateLimiting: {
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10
    },
    payment: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 5
    },
    admin: {
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 50
    }
  },

  session: {
    maxConcurrentSessions: 5,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    inactivityTimeout: 2 * 60 * 60 * 1000, // 2 hours
    requireReauthForSensitive: true,
    trackDeviceFingerprint: true,
    detectSuspiciousActivity: true
  },

  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    maxAge: 0, // No expiration by default
    preventReuse: 5
  },

  input: {
    maxRequestSize: '10mb',
    maxParameterCount: 100,
    enableSQLInjectionPrevention: true,
    enableXSSPrevention: true,
    enableCSRFProtection: true
  },

  audit: {
    enableAuditLogging: true,
    logLevel: 'MEDIUM',
    retentionDays: 90,
    enableExternalLogging: false,
    sensitiveOperations: [
      'LOGIN_SUCCESS',
      'LOGIN_FAILURE',
      'PAYMENT_INITIATED',
      'PAYMENT_COMPLETED',
      'BALANCE_MODIFIED',
      'ADMIN_ACCESS',
      'MACHINE_ACTIVATED',
      'SUSPICIOUS_ACTIVITY'
    ]
  },

  cors: {
    allowedOrigins: ['http://localhost:3000'],
    allowCredentials: true,
    maxAge: 86400, // 24 hours
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },

  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "wss:", "ws:"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"]
  },

  ipRestrictions: {
    enableWhitelist: false,
    adminWhitelist: [],
    enableBlacklist: false,
    blacklist: []
  },

  encryption: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10)
  }
};

/**
 * Load security configuration from environment variables
 */
export function loadSecurityConfig(): SecurityConfig {
  const config = { ...defaultSecurityConfig };

  // Override with environment variables if present
  if (process.env.CORS_ORIGIN) {
    config.cors.allowedOrigins = process.env.CORS_ORIGIN.split(',');
  }

  if (process.env.ADMIN_WHITELIST_IPS) {
    config.ipRestrictions.adminWhitelist = process.env.ADMIN_WHITELIST_IPS.split(',');
    config.ipRestrictions.enableWhitelist = true;
  }

  if (process.env.SECURITY_AUDIT_LEVEL) {
    config.audit.logLevel = process.env.SECURITY_AUDIT_LEVEL as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }

  if (process.env.MAX_CONCURRENT_SESSIONS) {
    config.session.maxConcurrentSessions = parseInt(process.env.MAX_CONCURRENT_SESSIONS, 10);
  }

  if (process.env.SESSION_TIMEOUT_HOURS) {
    config.session.sessionTimeout = parseInt(process.env.SESSION_TIMEOUT_HOURS, 10) * 60 * 60 * 1000;
  }

  if (process.env.INACTIVITY_TIMEOUT_HOURS) {
    config.session.inactivityTimeout = parseInt(process.env.INACTIVITY_TIMEOUT_HOURS, 10) * 60 * 60 * 1000;
  }

  // Production security hardening
  if (process.env.NODE_ENV === 'production') {
    // Stricter rate limits in production
    config.rateLimiting.auth.max = 5;
    config.rateLimiting.payment.max = 3;
    
    // Shorter session timeouts in production
    config.session.sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours
    config.session.inactivityTimeout = 1 * 60 * 60 * 1000; // 1 hour
    
    // Enable all security features in production
    config.session.requireReauthForSensitive = true;
    config.session.trackDeviceFingerprint = true;
    config.session.detectSuspiciousActivity = true;
    config.audit.enableAuditLogging = true;
    config.audit.logLevel = 'HIGH';
    
    // Stricter CSP in production
    config.csp.scriptSrc = ["'self'"];
    config.csp.styleSrc = ["'self'"];
  }

  return config;
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(config: SecurityConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate JWT secret
  if (!config.encryption.jwtSecret || config.encryption.jwtSecret.length < 32) {
    errors.push('JWT secret must be at least 32 characters long');
  }

  // Validate bcrypt salt rounds
  if (config.encryption.bcryptSaltRounds < 10 || config.encryption.bcryptSaltRounds > 15) {
    errors.push('Bcrypt salt rounds should be between 10 and 15');
  }

  // Validate session timeouts
  if (config.session.sessionTimeout < 30 * 60 * 1000) { // 30 minutes minimum
    errors.push('Session timeout should be at least 30 minutes');
  }

  if (config.session.inactivityTimeout > config.session.sessionTimeout) {
    errors.push('Inactivity timeout cannot be longer than session timeout');
  }

  // Validate rate limits
  if (config.rateLimiting.auth.max > 20) {
    errors.push('Authentication rate limit should not exceed 20 requests per window');
  }

  if (config.rateLimiting.payment.max > 10) {
    errors.push('Payment rate limit should not exceed 10 requests per window');
  }

  // Validate CORS origins
  if (config.cors.allowedOrigins.includes('*') && process.env.NODE_ENV === 'production') {
    errors.push('Wildcard CORS origins are not allowed in production');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Security headers configuration
 */
export const securityHeaders = {
  contentSecurityPolicy: (config: SecurityConfig) => ({
    directives: {
      defaultSrc: config.csp.defaultSrc,
      scriptSrc: config.csp.scriptSrc,
      styleSrc: config.csp.styleSrc,
      imgSrc: config.csp.imgSrc,
      connectSrc: config.csp.connectSrc,
      fontSrc: config.csp.fontSrc,
      objectSrc: config.csp.objectSrc,
      mediaSrc: config.csp.mediaSrc,
      frameSrc: config.csp.frameSrc
    }
  }),
  
  additionalHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  }
};

/**
 * Get current security configuration
 */
export const securityConfig = loadSecurityConfig();

/**
 * Validate current configuration on startup
 */
const validation = validateSecurityConfig(securityConfig);
if (!validation.isValid) {
  console.error('Security configuration validation failed:');
  validation.errors.forEach(error => console.error(`- ${error}`));
  
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Invalid security configuration in production environment');
  }
}