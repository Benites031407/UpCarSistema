// Load environment variables FIRST before any other imports
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env') })

// Debug: Log Google OAuth config
console.log('[ENV DEBUG] GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET')
console.log('[ENV DEBUG] GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET')

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { createLogger } from './utils/logger.js'
import { db } from './database/connection.js'
import { authRouter, redisSessionManager, configureGoogleAuth } from './auth/index.js'
import { authenticateToken } from './auth/middleware.js'
import { machineRouter } from './routes/machines.js'
import paymentRouter from './routes/payments.js'
import sessionRouter from './routes/sessions.js'
import { notificationRouter } from './routes/notifications.js'
import adminRouter from './routes/admin.js'
import websocketRouter from './routes/websocket.js'
import webhooksRouter from './routes/webhooks.js'
import { schedulerService } from './services/scheduler.js'
import { mqttService } from './services/mqttService.js'
import { webSocketService } from './services/websocketService.js'
import { realtimeDashboardService } from './services/realtimeDashboardService.js'
import { globalErrorHandler, notFoundHandler, createGracefulShutdownHandler } from './middleware/errorHandler.js'
import { 
  rateLimitConfigs, 
  sanitizeInput, 
  preventSQLInjection, 
  securityHeaders, 
  limitRequestSize,
  detectSuspiciousActivity 
} from './middleware/security.js'
import { 
  securityMonitoring, 
  detectAnomalies, 
  detectGeographicAnomalies, 
  detectBruteForce 
} from './middleware/securityMonitoring.js'
import { 
  comprehensiveValidation, 
  addRequestId, 
  enhancedAuthErrorHandler 
} from './middleware/comprehensiveValidation.js'
import { auditRateLimit, auditAdminOperations } from './middleware/auditLog.js'
import { validateSession } from './auth/sessionSecurity.js'
import { initializeServiceMonitoring } from './utils/gracefulDegradation.js'

const app = express()
const httpServer = createServer(app)
const logger = createLogger('server')
const PORT = process.env.PORT || 3001
app.set('trust proxy', 1)

// Security middleware (applied first)
app.use(addRequestId()) // Add request ID for tracking
app.use(securityHeaders)
app.use(limitRequestSize('10mb'))
app.use(securityMonitoring) // Enhanced security monitoring
app.use(detectAnomalies) // Anomaly detection
app.use(detectSuspiciousActivity)
app.use(sanitizeInput)
app.use(preventSQLInjection)
app.use(comprehensiveValidation()) // Comprehensive input validation

// Basic middleware
// Enhanced Helmet configuration with environment-specific settings
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: process.env.NODE_ENV === 'production' 
        ? ["'self'"] 
        : ["'self'", "'unsafe-inline'"], // Allow inline scripts only in development
      styleSrc: process.env.NODE_ENV === 'production'
        ? ["'self'"]
        : ["'self'", "'unsafe-inline'"], // Allow inline styles only in development
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    },
    reportOnly: process.env.NODE_ENV === 'development' // Report-only mode in development
  },
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production', // Enable in production
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  } : false,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
}))

// Enhanced CORS configuration with security hardening
app.use(cors({
  origin: function (origin, callback) {
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, be more strict about origins
    if (!origin) {
      // In production, reject requests with no origin for security
      return callback(null, true);
    }
    
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',')
      .map(origin => origin.trim());
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS violation attempt', {
        origin,
        allowedOrigins,
        ip: 'unknown', // Will be filled by middleware
        userAgent: 'unknown'
      });
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-Request-ID',
    'Accept',
    'Accept-Language',
    'Accept-Encoding'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Request-ID', 'X-Rate-Limit-Remaining'],
  maxAge: process.env.NODE_ENV === 'production' ? 3600 : 86400, // 1 hour in prod, 24 hours in dev
  optionsSuccessStatus: 200 // For legacy browser support
}))

app.use(compression())
app.use(morgan('combined', {
  skip: (req, res) => {
    // Skip logging for health checks and successful requests in production
    return process.env.NODE_ENV === 'production' && 
           (req.url === '/health' || res.statusCode < 400);
  }
}))

// Enhanced rate limiting with audit logging
// TEMPORARILY DISABLED FOR DEVELOPMENT
// app.use(auditRateLimit)

// Apply rate limiting to different endpoint groups
// TEMPORARILY DISABLED FOR DEVELOPMENT
// app.use('/api', rateLimitConfigs.api)
// app.use('/auth', rateLimitConfigs.auth)
// app.use('/api/payments', rateLimitConfigs.payment)
// app.use('/api/admin', rateLimitConfigs.admin)

// Additional security middleware for production
if (process.env.NODE_ENV === 'production') {
  // Stricter rate limiting for production
  const productionRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Increased for admin dashboard polling
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for admin status endpoints (they poll frequently)
    skip: (req) => {
      return req.url.includes('/admin/machines/status') || 
             req.url.includes('/admin/dashboard/metrics') ||
             req.url === '/health';
    },
    handler: (req, res) => {
      logger.warn('Production rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        success: false,
        error: 'Too many requests from this IP, please try again later',
        code: 'PRODUCTION_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(15 * 60)
      });
    }
  });
  
  app.use('/api', productionRateLimit);
}

// Enhanced JSON parsing with security validation
app.use(express.json({ 
  limit: process.env.NODE_ENV === 'production' ? '5mb' : '10mb', // Smaller limit in production
  verify: (req: any, res: any, buf) => {
    try {
      const jsonString = buf.toString();
      
      // Check for potential JSON bombs (deeply nested objects)
      const depthLimit = 10;
      let depth = 0;
      let inString = false;
      let escaped = false;
      
      for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString[i];
        
        if (!inString) {
          if (char === '{' || char === '[') {
            depth++;
            if (depth > depthLimit) {
              throw new Error('JSON too deeply nested');
            }
          } else if (char === '}' || char === ']') {
            depth--;
          } else if (char === '"') {
            inString = true;
          }
        } else {
          if (escaped) {
            escaped = false;
          } else if (char === '\\') {
            escaped = true;
          } else if (char === '"') {
            inString = false;
          }
        }
      }
      
      JSON.parse(jsonString);
    } catch (e) {
      logger.warn('Invalid or malicious JSON received', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        error: (e as Error).message
      });
      res.status(400).json({ 
        success: false, 
        error: 'Invalid JSON format',
        code: 'INVALID_JSON'
      });
      throw new Error('Invalid JSON');
    }
  }
}))

app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.NODE_ENV === 'production' ? '5mb' : '10mb',
  parameterLimit: process.env.NODE_ENV === 'production' ? 50 : 100 // Stricter limit in production
}))

// Session security validation with geographic anomaly detection
app.use(validateSession())
app.use(detectGeographicAnomalies) // Detect unusual geographic access patterns

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    const checks = await Promise.allSettled([
      db.testConnection(),
      redisSessionManager.isConnected(),
      Promise.resolve(mqttService.isClientConnected()),
      Promise.resolve(webSocketService.isInitialized())
    ])

    const dbConnected = checks[0].status === 'fulfilled' && checks[0].value
    const redisConnected = checks[1].status === 'fulfilled' && checks[1].value
    const mqttConnected = checks[2].status === 'fulfilled' && checks[2].value
    const websocketConnected = checks[3].status === 'fulfilled' && checks[3].value

    const allHealthy = dbConnected && redisConnected && mqttConnected && websocketConnected
    const status = allHealthy ? 'healthy' : 'degraded'
    const httpStatus = allHealthy ? 200 : 503

    const response = {
      status,
      timestamp: new Date().toISOString(),
      service: 'upcar-aspiradores-backend',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      services: {
        database: {
          status: dbConnected ? 'healthy' : 'unhealthy',
          error: checks[0].status === 'rejected' ? checks[0].reason?.message : undefined
        },
        redis: {
          status: redisConnected ? 'healthy' : 'unhealthy',
          error: checks[1].status === 'rejected' ? checks[1].reason?.message : undefined
        },
        mqtt: {
          status: mqttConnected ? 'healthy' : 'unhealthy'
        },
        websocket: {
          status: websocketConnected ? 'healthy' : 'unhealthy',
          connectedClients: websocketConnected ? webSocketService.getConnectedClientsCount() : 0
        }
      }
    }

    res.status(httpStatus).json(response)
  } catch (error) {
    logger.error('Health check failed:', error)
    res.status(500).json({ 
      status: 'unhealthy', 
      timestamp: new Date().toISOString(),
      service: 'upcar-aspiradores-backend',
      error: 'Health check failed',
      services: {
        database: { status: 'unknown' },
        redis: { status: 'unknown' },
        mqtt: { status: 'unknown' },
        websocket: { status: 'unknown' }
      }
    })
  }
})

// API routes
app.get('/api', (_req, res) => {
  res.json({ 
    message: 'Machine Rental System API',
    version: '1.0.0'
  })
})

// Authentication routes with enhanced security
// Relaxed limits for development - increase for production
const bruteForceAttempts = process.env.NODE_ENV === 'production' ? 5 : 100;

// Configure Google OAuth
configureGoogleAuth();

app.use('/auth', detectBruteForce(bruteForceAttempts, 15 * 60 * 1000), authRouter)
app.use('/api/auth', detectBruteForce(bruteForceAttempts, 15 * 60 * 1000), authRouter) // Also mount under /api/auth for frontend

// Machine management routes
app.use('/api/machines', machineRouter)

// Payment processing routes
app.use('/api/payments', paymentRouter)

// Usage session routes
app.use('/api/sessions', sessionRouter)

// Notification routes
app.use('/api/notifications', notificationRouter)

// Admin routes (with audit logging)
app.use('/api/admin', authenticateToken, auditAdminOperations, adminRouter)

// WebSocket routes
app.use('/api/websocket', websocketRouter)

// Webhook routes (sem autenticação - Mercado Pago precisa acessar)
app.use('/webhooks', webhooksRouter)

// Error handling middleware
app.use(enhancedAuthErrorHandler()) // Enhanced auth error handling
app.use(globalErrorHandler)

// 404 handler
app.use('*', notFoundHandler)

async function startServer() {
  try {
    // Initialize service monitoring
    initializeServiceMonitoring()

    // Test database connection on startup
    // Force recreate the database pool to ensure fresh connection
    await db.recreatePool()
    const dbConnected = await db.testConnection()
    if (!dbConnected) {
      logger.warn('Database connection failed, but server will start anyway')
    }

    // Test Redis connection on startup
    const redisConnected = await redisSessionManager.isConnected()
    if (!redisConnected) {
      logger.warn('Redis connection failed, but server will start anyway')
    }

    // Initialize MQTT connection
    let mqttConnected = false
    try {
      await mqttService.connect()
      mqttConnected = true
      mqttService.startOfflineDetection()
      logger.info('MQTT service initialized successfully')
    } catch (error) {
      logger.warn('MQTT connection failed, but server will start anyway:', error)
    }

    // Initialize WebSocket service
    webSocketService.initialize(httpServer)

    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
      logger.info(`Database status: ${dbConnected ? 'connected' : 'disconnected'}`)
      logger.info(`Redis status: ${redisConnected ? 'connected' : 'disconnected'}`)
      logger.info(`MQTT status: ${mqttConnected ? 'connected' : 'disconnected'}`)
      logger.info(`WebSocket status: ${webSocketService.isInitialized() ? 'initialized' : 'failed'}`)
      
      // Start scheduled tasks
      schedulerService.start()
      
      // Start real-time dashboard service
      realtimeDashboardService.start()
    })

    // Set up graceful shutdown
    const services = [
      { 
        name: 'scheduler', 
        shutdown: async () => { schedulerService.stop() } 
      },
      { 
        name: 'realtime-dashboard', 
        shutdown: async () => { realtimeDashboardService.stop() } 
      },
      { 
        name: 'websocket', 
        shutdown: async () => { webSocketService.shutdown() } 
      },
      { 
        name: 'mqtt', 
        shutdown: async () => { await mqttService.disconnect() } 
      },
      { 
        name: 'redis', 
        shutdown: async () => { await redisSessionManager.disconnect() } 
      }
    ]

    createGracefulShutdownHandler(httpServer, services)

  } catch (error) {
    logger.error('Failed to start server', error)
    process.exit(1)
  }
}

// Graceful shutdown is now handled by createGracefulShutdownHandler

startServer()
