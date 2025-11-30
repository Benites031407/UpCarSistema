/**
 * Environment-specific security configuration
 * This file loads security settings from environment variables with secure defaults
 */

export interface SecurityEnvironmentConfig {
  // CORS settings
  corsOrigins: string[];
  corsCredentials: boolean;
  corsMaxAge: number;
  
  // Rate limiting
  rateLimitEnabled: boolean;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  
  // Session security
  sessionTimeout: number;
  sessionSecret: string;
  sessionSecure: boolean;
  sessionSameSite: 'strict' | 'lax' | 'none';
  
  // Content Security Policy
  cspEnabled: boolean;
  cspReportOnly: boolean;
  cspReportUri?: string;
  
  // HTTPS enforcement
  httpsOnly: boolean;
  hstsMaxAge: number;
  hstsIncludeSubdomains: boolean;
  hstsPreload: boolean;
  
  // Input validation
  maxRequestSize: string;
  maxParameterCount: number;
  jsonDepthLimit: number;
  
  // Monitoring and logging
  securityLoggingEnabled: boolean;
  auditLoggingLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suspiciousActivityThreshold: number;
  
  // IP restrictions
  ipWhitelistEnabled: boolean;
  adminIpWhitelist: string[];
  ipBlacklistEnabled: boolean;
  ipBlacklist: string[];
  
  // Brute force protection
  bruteForceEnabled: boolean;
  bruteForceMaxAttempts: number;
  bruteForceWindowMs: number;
  
  // Geographic restrictions
  geoAnomalyDetectionEnabled: boolean;
  allowedCountries: string[];
  blockedCountries: string[];
}

/**
 * Load security configuration from environment variables
 */
export function loadSecurityEnvironmentConfig(): SecurityEnvironmentConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    // CORS settings
    corsOrigins: process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
      : isProduction 
        ? [] // Must be explicitly set in production
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    corsCredentials: process.env.CORS_CREDENTIALS === 'true' || true,
    corsMaxAge: parseInt(process.env.CORS_MAX_AGE || (isProduction ? '3600' : '86400'), 10),
    
    // Rate limiting
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || (isProduction ? '50' : '100'), 10),
    
    // Session security
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT_MS || (isProduction ? '28800000' : '86400000'), 10), // 8h prod, 24h dev
    sessionSecret: process.env.SESSION_SECRET || (() => {
      if (isProduction) {
        throw new Error('SESSION_SECRET must be set in production');
      }
      return 'dev-session-secret-change-in-production';
    })(),
    sessionSecure: process.env.SESSION_SECURE === 'true' || isProduction,
    sessionSameSite: (process.env.SESSION_SAME_SITE as 'strict' | 'lax' | 'none') || (isProduction ? 'strict' : 'lax'),
    
    // Content Security Policy
    cspEnabled: process.env.CSP_ENABLED !== 'false',
    cspReportOnly: process.env.CSP_REPORT_ONLY === 'true' || !isProduction,
    cspReportUri: process.env.CSP_REPORT_URI,
    
    // HTTPS enforcement
    httpsOnly: process.env.HTTPS_ONLY === 'true' || isProduction,
    hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000', 10), // 1 year
    hstsIncludeSubdomains: process.env.HSTS_INCLUDE_SUBDOMAINS !== 'false',
    hstsPreload: process.env.HSTS_PRELOAD === 'true' || isProduction,
    
    // Input validation
    maxRequestSize: process.env.MAX_REQUEST_SIZE || (isProduction ? '5mb' : '10mb'),
    maxParameterCount: parseInt(process.env.MAX_PARAMETER_COUNT || (isProduction ? '50' : '100'), 10),
    jsonDepthLimit: parseInt(process.env.JSON_DEPTH_LIMIT || '10', 10),
    
    // Monitoring and logging
    securityLoggingEnabled: process.env.SECURITY_LOGGING_ENABLED !== 'false',
    auditLoggingLevel: (process.env.AUDIT_LOGGING_LEVEL as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') || 
      (isProduction ? 'HIGH' : 'MEDIUM'),
    suspiciousActivityThreshold: parseInt(process.env.SUSPICIOUS_ACTIVITY_THRESHOLD || '5', 10),
    
    // IP restrictions
    ipWhitelistEnabled: process.env.IP_WHITELIST_ENABLED === 'true',
    adminIpWhitelist: process.env.ADMIN_IP_WHITELIST 
      ? process.env.ADMIN_IP_WHITELIST.split(',').map(ip => ip.trim())
      : [],
    ipBlacklistEnabled: process.env.IP_BLACKLIST_ENABLED === 'true',
    ipBlacklist: process.env.IP_BLACKLIST 
      ? process.env.IP_BLACKLIST.split(',').map(ip => ip.trim())
      : [],
    
    // Brute force protection
    bruteForceEnabled: process.env.BRUTE_FORCE_ENABLED !== 'false',
    bruteForceMaxAttempts: parseInt(process.env.BRUTE_FORCE_MAX_ATTEMPTS || '5', 10),
    bruteForceWindowMs: parseInt(process.env.BRUTE_FORCE_WINDOW_MS || '900000', 10), // 15 minutes
    
    // Geographic restrictions
    geoAnomalyDetectionEnabled: process.env.GEO_ANOMALY_DETECTION_ENABLED !== 'false',
    allowedCountries: process.env.ALLOWED_COUNTRIES 
      ? process.env.ALLOWED_COUNTRIES.split(',').map(country => country.trim().toUpperCase())
      : [],
    blockedCountries: process.env.BLOCKED_COUNTRIES 
      ? process.env.BLOCKED_COUNTRIES.split(',').map(country => country.trim().toUpperCase())
      : []
  };
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(config: SecurityEnvironmentConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Production-specific validations
  if (isProduction) {
    if (config.corsOrigins.length === 0) {
      errors.push('CORS origins must be explicitly configured in production');
    }
    
    if (config.corsOrigins.includes('*')) {
      errors.push('Wildcard CORS origins are not allowed in production');
    }
    
    if (config.sessionSecret === 'dev-session-secret-change-in-production') {
      errors.push('SESSION_SECRET must be changed from default value in production');
    }
    
    if (config.sessionSecret.length < 32) {
      errors.push('SESSION_SECRET must be at least 32 characters long in production');
    }
    
    if (!config.sessionSecure) {
      errors.push('Secure sessions must be enabled in production');
    }
    
    if (!config.httpsOnly) {
      errors.push('HTTPS enforcement should be enabled in production');
    }
  }
  
  // General validations
  if (config.rateLimitMaxRequests < 1) {
    errors.push('Rate limit max requests must be at least 1');
  }
  
  if (config.rateLimitWindowMs < 60000) { // 1 minute minimum
    errors.push('Rate limit window must be at least 1 minute');
  }
  
  if (config.sessionTimeout < 300000) { // 5 minutes minimum
    errors.push('Session timeout must be at least 5 minutes');
  }
  
  if (config.bruteForceMaxAttempts < 3) {
    errors.push('Brute force max attempts should be at least 3');
  }
  
  if (config.jsonDepthLimit < 5 || config.jsonDepthLimit > 50) {
    errors.push('JSON depth limit should be between 5 and 50');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get current security configuration
 */
export const securityEnvConfig = loadSecurityEnvironmentConfig();

/**
 * Validate configuration on startup
 */
const validation = validateSecurityConfig(securityEnvConfig);
if (!validation.isValid) {
  console.error('Security configuration validation failed:');
  validation.errors.forEach(error => console.error(`- ${error}`));
  
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Invalid security configuration in production environment');
  } else {
    console.warn('Continuing with invalid security configuration in development mode');
  }
}

/**
 * Export configuration for use in other modules
 */
export default securityEnvConfig;