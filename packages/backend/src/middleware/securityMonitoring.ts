import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';
import { auditOperations } from './auditLog.js';

const logger = createLogger('security-monitoring');

/**
 * Security monitoring middleware to detect and log suspicious activities
 */
export function securityMonitoring(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // Track request metadata
  const requestMetadata = {
    ip: req.ip,
    userAgent: req.get('User-Agent') || '',
    method: req.method,
    url: req.url,
    timestamp: new Date(),
    headers: req.headers,
    contentLength: req.get('content-length') ? parseInt(req.get('content-length')!, 10) : 0
  };

  // Detect suspicious patterns
  const suspiciousIndicators = detectSuspiciousPatterns(requestMetadata);
  
  if (suspiciousIndicators.length > 0) {
    logger.warn('Suspicious request detected', {
      ...requestMetadata,
      indicators: suspiciousIndicators
    });
    
    auditOperations.suspiciousActivity(req, 'suspicious_request_pattern', {
      indicators: suspiciousIndicators,
      metadata: requestMetadata
    });
  }

  // Monitor response
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Log slow requests
    if (responseTime > 5000) { // 5 seconds
      logger.warn('Slow request detected', {
        ...requestMetadata,
        responseTime,
        statusCode
      });
    }
    
    // Log error responses
    if (statusCode >= 400) {
      const logLevel = statusCode >= 500 ? 'error' : 'warn';
      logger[logLevel]('Error response', {
        ...requestMetadata,
        statusCode,
        responseTime
      });
      
      // Audit critical errors
      if (statusCode >= 500) {
        auditOperations.suspiciousActivity(req, 'server_error', {
          statusCode,
          responseTime,
          metadata: requestMetadata
        });
      }
    }
  });

  next();
}

/**
 * Detect suspicious patterns in request metadata
 */
function detectSuspiciousPatterns(metadata: any): string[] {
  const indicators: string[] = [];
  
  // Check for suspicious user agents
  const suspiciousUserAgents = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /scanner/i,
    /nikto/i,
    /sqlmap/i,
    /nmap/i,
    /masscan/i,
    /zap/i
  ];
  
  if (suspiciousUserAgents.some(pattern => pattern.test(metadata.userAgent))) {
    indicators.push('suspicious_user_agent');
  }
  
  // Check for empty or missing user agent
  if (!metadata.userAgent || metadata.userAgent.length < 10) {
    indicators.push('missing_or_short_user_agent');
  }
  
  // Check for suspicious URLs
  const suspiciousUrlPatterns = [
    /\.\./,  // Directory traversal
    /\/etc\/passwd/,
    /\/proc\/self\/environ/,
    /\/wp-admin/,
    /\/phpmyadmin/,
    /\.php$/,
    /\.asp$/,
    /\.jsp$/,
    /\/cgi-bin/,
    /\/shell/,
    /\/cmd/,
    /\/exec/,
    /\/eval/,
    /\/system/,
    /\/ping/,
    /\/wget/,
    /\/curl/
  ];
  
  if (suspiciousUrlPatterns.some(pattern => pattern.test(metadata.url))) {
    indicators.push('suspicious_url_pattern');
  }
  
  // Check for unusual request methods
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'];
  if (!allowedMethods.includes(metadata.method)) {
    indicators.push('unusual_http_method');
  }
  
  // Check for large content length (potential DoS)
  if (metadata.contentLength > 50 * 1024 * 1024) { // 50MB
    indicators.push('large_content_length');
  }
  
  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-originating-ip',
    'x-remote-ip',
    'x-cluster-client-ip'
  ];
  
  const hasMultipleIpHeaders = suspiciousHeaders.filter(header => 
    metadata.headers[header] || metadata.headers[header.toLowerCase()]
  ).length > 1;
  
  if (hasMultipleIpHeaders) {
    indicators.push('multiple_ip_headers');
  }
  
  // Check for potential header injection
  Object.entries(metadata.headers).forEach(([key, value]) => {
    if (typeof value === 'string') {
      if (value.includes('\n') || value.includes('\r')) {
        indicators.push('header_injection_attempt');
      }
    }
  });
  
  return indicators;
}

/**
 * Request fingerprinting for anomaly detection
 */
export function generateRequestFingerprint(req: Request): string {
  const components = [
    req.ip,
    req.get('User-Agent') || '',
    req.get('Accept-Language') || '',
    req.get('Accept-Encoding') || '',
    req.method,
    new URL(req.url, `http://${req.get('host')}`).pathname
  ];
  
  return Buffer.from(components.join('|')).toString('base64');
}

/**
 * Anomaly detection based on request patterns
 */
const requestPatterns = new Map<string, { count: number, lastSeen: Date, suspicious: boolean }>();

export function detectAnomalies(req: Request, res: Response, next: NextFunction): void {
  const fingerprint = generateRequestFingerprint(req);
  const now = new Date();
  
  const pattern = requestPatterns.get(fingerprint);
  
  if (pattern) {
    pattern.count++;
    pattern.lastSeen = now;
    
    // Check for rapid repeated requests (potential bot behavior)
    if (pattern.count > 100 && !pattern.suspicious) {
      pattern.suspicious = true;
      logger.warn('Anomalous request pattern detected', {
        fingerprint,
        count: pattern.count,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url
      });
      
      auditOperations.suspiciousActivity(req, 'anomalous_request_pattern', {
        fingerprint,
        count: pattern.count
      });
    }
  } else {
    requestPatterns.set(fingerprint, {
      count: 1,
      lastSeen: now,
      suspicious: false
    });
  }
  
  // Clean up old patterns (older than 1 hour)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  for (const [key, value] of requestPatterns.entries()) {
    if (value.lastSeen < oneHourAgo) {
      requestPatterns.delete(key);
    }
  }
  
  next();
}

/**
 * Geographic anomaly detection (simplified)
 */
const userLocations = new Map<string, { ip: string, country?: string, lastSeen: Date }>();

export function detectGeographicAnomalies(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  if (!user) {
    next();
    return;
  }
  
  const currentIP = req.ip;
  const userId = user.id;
  const now = new Date();
  
  const lastLocation = userLocations.get(userId);
  
  if (lastLocation && lastLocation.ip !== currentIP) {
    // In a real implementation, you would use a geolocation service
    // For now, we'll do a simple check based on IP address changes
    const ipChanged = !currentIP.startsWith(lastLocation.ip.split('.').slice(0, 2).join('.'));
    
    if (ipChanged) {
      logger.warn('Geographic anomaly detected', {
        userId,
        previousIP: lastLocation.ip,
        currentIP,
        userAgent: req.get('User-Agent')
      });
      
      auditOperations.suspiciousActivity(req, 'geographic_anomaly', {
        previousIP: lastLocation.ip,
        currentIP,
        userId
      });
    }
  }
  
  userLocations.set(userId, {
    ip: currentIP,
    lastSeen: now
  });
  
  next();
}

/**
 * Brute force detection
 */
const failedAttempts = new Map<string, { count: number, lastAttempt: Date, blocked: boolean }>();

export function detectBruteForce(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip}:${req.url}`;
    const now = new Date();
    
    const attempts = failedAttempts.get(key);
    
    if (attempts && attempts.blocked) {
      const timeSinceLastAttempt = now.getTime() - attempts.lastAttempt.getTime();
      if (timeSinceLastAttempt < windowMs) {
        logger.warn('Blocked brute force attempt', {
          ip: req.ip,
          url: req.url,
          attempts: attempts.count
        });
        
        res.status(429).json({
          success: false,
          error: 'Too many failed attempts. Please try again later.',
          code: 'BRUTE_FORCE_BLOCKED',
          retryAfter: Math.ceil((windowMs - timeSinceLastAttempt) / 1000)
        });
        return;
      } else {
        // Reset after window expires
        failedAttempts.delete(key);
      }
    }
    
    // Monitor response for failures
    res.on('finish', () => {
      if (res.statusCode === 401 || res.statusCode === 403) {
        const currentAttempts = failedAttempts.get(key) || { count: 0, lastAttempt: now, blocked: false };
        currentAttempts.count++;
        currentAttempts.lastAttempt = now;
        
        if (currentAttempts.count >= maxAttempts) {
          currentAttempts.blocked = true;
          logger.warn('Brute force attack detected', {
            ip: req.ip,
            url: req.url,
            attempts: currentAttempts.count
          });
          
          auditOperations.suspiciousActivity(req, 'brute_force_attack', {
            attempts: currentAttempts.count,
            endpoint: req.url
          });
        }
        
        failedAttempts.set(key, currentAttempts);
      } else if (res.statusCode < 400) {
        // Success - clear failed attempts
        failedAttempts.delete(key);
      }
    });
    
    next();
  };
}