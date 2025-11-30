import { createLogger } from './logger.js';
import { AppError, IoTError, ExternalServiceError } from '../middleware/errorHandler.js';

const logger = createLogger('graceful-degradation');

export interface ServiceStatus {
  name: string;
  isHealthy: boolean;
  lastCheck: Date;
  errorCount: number;
  lastError?: string;
}

export interface DegradationOptions {
  fallbackValue?: any;
  cacheTimeout?: number;
  enableLogging?: boolean;
  criticalService?: boolean;
}

/**
 * Service health monitor for graceful degradation
 */
export class ServiceHealthMonitor {
  private services = new Map<string, ServiceStatus>();
  private cache = new Map<string, { value: any; timestamp: number; ttl: number }>();

  /**
   * Register a service for monitoring
   */
  registerService(name: string): void {
    this.services.set(name, {
      name,
      isHealthy: true,
      lastCheck: new Date(),
      errorCount: 0
    });
  }

  /**
   * Mark service as healthy
   */
  markHealthy(serviceName: string): void {
    const service = this.services.get(serviceName);
    if (service) {
      service.isHealthy = true;
      service.lastCheck = new Date();
      service.errorCount = 0;
      service.lastError = undefined;
      
      logger.info(`Service ${serviceName} marked as healthy`);
    }
  }

  /**
   * Mark service as unhealthy
   */
  markUnhealthy(serviceName: string, error: string): void {
    const service = this.services.get(serviceName);
    if (service) {
      service.isHealthy = false;
      service.lastCheck = new Date();
      service.errorCount++;
      service.lastError = error;
      
      logger.warn(`Service ${serviceName} marked as unhealthy:`, { error, errorCount: service.errorCount });
    }
  }

  /**
   * Check if service is healthy
   */
  isServiceHealthy(serviceName: string): boolean {
    const service = this.services.get(serviceName);
    return service?.isHealthy ?? false;
  }

  /**
   * Get service status
   */
  getServiceStatus(serviceName: string): ServiceStatus | undefined {
    return this.services.get(serviceName);
  }

  /**
   * Get all service statuses
   */
  getAllServiceStatuses(): ServiceStatus[] {
    return Array.from(this.services.values());
  }

  /**
   * Cache a value with TTL
   */
  cacheValue(key: string, value: any, ttlMs: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  /**
   * Get cached value if not expired
   */
  getCachedValue(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Global service health monitor instance
export const serviceHealthMonitor = new ServiceHealthMonitor();

/**
 * Execute operation with graceful degradation
 */
export async function withGracefulDegradation<T>(
  operation: () => Promise<T>,
  serviceName: string,
  options: DegradationOptions = {}
): Promise<T> {
  const {
    fallbackValue,
    cacheTimeout = 300000, // 5 minutes
    enableLogging = true,
    criticalService = false
  } = options;

  const cacheKey = `${serviceName}_last_success`;

  try {
    const result = await operation();
    
    // Cache successful result
    serviceHealthMonitor.cacheValue(cacheKey, result, cacheTimeout);
    serviceHealthMonitor.markHealthy(serviceName);
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    serviceHealthMonitor.markUnhealthy(serviceName, errorMessage);

    if (enableLogging) {
      logger.warn(`Service ${serviceName} failed, attempting graceful degradation:`, { error: errorMessage });
    }

    // Try to return cached value first
    const cachedValue = serviceHealthMonitor.getCachedValue(cacheKey);
    if (cachedValue !== null) {
      if (enableLogging) {
        logger.info(`Returning cached value for ${serviceName}`);
      }
      return cachedValue;
    }

    // Return fallback value if available
    if (fallbackValue !== undefined) {
      if (enableLogging) {
        logger.info(`Returning fallback value for ${serviceName}`);
      }
      return fallbackValue;
    }

    // If it's a critical service or no fallback available, throw error
    if (criticalService) {
      throw error;
    }

    throw new AppError(
      `Service ${serviceName} is temporarily unavailable`,
      503,
      true,
      'SERVICE_DEGRADED',
      { originalError: errorMessage }
    );
  }
}

/**
 * IoT operation with graceful degradation
 */
export async function iotOperationWithDegradation<T>(
  operation: () => Promise<T>,
  machineId: string,
  operationName: string,
  options: DegradationOptions & { 
    allowOfflineMode?: boolean;
    offlineCallback?: () => Promise<T>;
  } = {}
): Promise<T> {
  const {
    allowOfflineMode = false,
    offlineCallback,
    ...degradationOptions
  } = options;

  const serviceName = `iot_${machineId}`;
  
  try {
    return await withGracefulDegradation(operation, serviceName, {
      ...degradationOptions,
      criticalService: !allowOfflineMode
    });
  } catch (error) {
    if (allowOfflineMode && offlineCallback) {
      logger.warn(`IoT operation ${operationName} for machine ${machineId} failed, using offline mode`);
      return await offlineCallback();
    }

    throw new IoTError(
      `Machine ${machineId} is offline or unreachable for operation: ${operationName}`,
      { machineId, operationName, originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Payment operation with graceful degradation
 */
export async function paymentOperationWithDegradation<T>(
  operation: () => Promise<T>,
  paymentProvider: string,
  options: DegradationOptions & {
    allowManualProcessing?: boolean;
    manualProcessingCallback?: () => Promise<T>;
  } = {}
): Promise<T> {
  const {
    allowManualProcessing = false,
    manualProcessingCallback,
    ...degradationOptions
  } = options;

  const serviceName = `payment_${paymentProvider}`;

  try {
    return await withGracefulDegradation(operation, serviceName, {
      ...degradationOptions,
      criticalService: !allowManualProcessing
    });
  } catch (error) {
    if (allowManualProcessing && manualProcessingCallback) {
      logger.warn(`Payment provider ${paymentProvider} failed, switching to manual processing`);
      return await manualProcessingCallback();
    }

    throw new ExternalServiceError(
      paymentProvider,
      `Payment processing temporarily unavailable`,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Notification operation with graceful degradation
 */
export async function notificationWithDegradation(
  operation: () => Promise<void>,
  notificationType: string,
  options: DegradationOptions & {
    queueForLater?: boolean;
    queueCallback?: () => Promise<void>;
  } = {}
): Promise<void> {
  const {
    queueForLater = true,
    queueCallback,
    ...degradationOptions
  } = options;

  const serviceName = `notification_${notificationType}`;

  try {
    await withGracefulDegradation(operation, serviceName, {
      ...degradationOptions,
      criticalService: false
    });
  } catch (error) {
    if (queueForLater && queueCallback) {
      logger.warn(`Notification ${notificationType} failed, queuing for later delivery`);
      await queueCallback();
    } else {
      logger.error(`Notification ${notificationType} failed and could not be queued:`, error);
    }
    // Don't throw for notifications - they're not critical
  }
}

/**
 * Database operation with graceful degradation
 */
export async function databaseOperationWithDegradation<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: DegradationOptions & {
    readOnly?: boolean;
    useReadReplica?: boolean;
  } = {}
): Promise<T> {
  const {
    readOnly = false,
    useReadReplica = false,
    ...degradationOptions
  } = options;

  const serviceName = readOnly ? 'database_read' : 'database_write';

  try {
    return await withGracefulDegradation(operation, serviceName, {
      ...degradationOptions,
      criticalService: !readOnly
    });
  } catch (error) {
    if (readOnly && useReadReplica) {
      logger.warn(`Primary database failed for read operation ${operationName}, attempting read replica`);
      // This would need to be implemented based on your database setup
      throw error; // For now, just throw the original error
    }

    throw new AppError(
      `Database operation ${operationName} failed`,
      503,
      true,
      'DATABASE_ERROR',
      { operationName, originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Circuit breaker for service degradation
 */
export class ServiceCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly serviceName: string,
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 60000, // 1 minute
    private readonly testTimeout: number = 30000 // 30 seconds
  ) {
    serviceHealthMonitor.registerService(serviceName);
  }

  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
        logger.info(`Circuit breaker for ${this.serviceName} entering half-open state`);
      } else {
        if (fallback) {
          logger.warn(`Circuit breaker for ${this.serviceName} is open, using fallback`);
          return await fallback();
        }
        throw new AppError(
          `Service ${this.serviceName} is temporarily unavailable`,
          503,
          true,
          'CIRCUIT_BREAKER_OPEN'
        );
      }
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Circuit breaker timeout')), this.testTimeout)
        )
      ]);

      // Success - reset circuit breaker
      this.failures = 0;
      this.state = 'closed';
      serviceHealthMonitor.markHealthy(this.serviceName);
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      serviceHealthMonitor.markUnhealthy(this.serviceName, error instanceof Error ? error.message : String(error));

      if (this.failures >= this.failureThreshold) {
        this.state = 'open';
        logger.error(`Circuit breaker for ${this.serviceName} opened after ${this.failures} failures`);
      }

      if (fallback && this.state === 'open') {
        logger.warn(`Using fallback for ${this.serviceName} due to circuit breaker`);
        return await fallback();
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
    serviceHealthMonitor.markHealthy(this.serviceName);
    logger.info(`Circuit breaker for ${this.serviceName} manually reset`);
  }
}

/**
 * Initialize service health monitoring
 */
export function initializeServiceMonitoring(): void {
  // Register core services
  serviceHealthMonitor.registerService('database_read');
  serviceHealthMonitor.registerService('database_write');
  serviceHealthMonitor.registerService('payment_pix');
  serviceHealthMonitor.registerService('notification_whatsapp');
  serviceHealthMonitor.registerService('mqtt_broker');

  // Clean up expired cache entries every 5 minutes
  setInterval(() => {
    serviceHealthMonitor.clearExpiredCache();
  }, 5 * 60 * 1000);

  logger.info('Service health monitoring initialized');
}