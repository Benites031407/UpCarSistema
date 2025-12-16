import { createLogger } from './logger.js';
import { AppError, ExternalServiceError, IoTError, PaymentError } from '../middleware/errorHandler.js';

const logger = createLogger('retry-utils');

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error, nextDelay: number) => void;
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  totalTime: number;
}

/**
 * Generic retry mechanism with exponential backoff and jitter
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    jitter = true,
    retryCondition = () => true,
    onRetry
  } = options;

  const startTime = Date.now();
  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation();
      const totalTime = Date.now() - startTime;
      
      if (attempt > 1) {
        logger.info(`Operation succeeded after ${attempt} attempts in ${totalTime}ms`);
      }
      
      return { result, attempts: attempt, totalTime };
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if this is the last attempt or if retry condition fails
      if (attempt === maxAttempts || !retryCondition(lastError)) {
        break;
      }

      // Calculate next delay with jitter
      let nextDelay = Math.min(delay, maxDelay);
      if (jitter) {
        nextDelay = nextDelay * (0.5 + Math.random() * 0.5); // 50-100% of calculated delay
      }

      if (onRetry) {
        onRetry(attempt, lastError, nextDelay);
      }

      logger.warn(`Attempt ${attempt} failed, retrying in ${nextDelay}ms:`, {
        error: lastError instanceof Error ? lastError.message : String(lastError),
        nextDelay,
        attempt,
        maxAttempts
      });

      await new Promise(resolve => setTimeout(resolve, nextDelay));
      delay *= backoffFactor;
    }
  }

  const totalTime = Date.now() - startTime;
  logger.error(`Operation failed after ${maxAttempts} attempts in ${totalTime}ms:`, lastError!);
  throw lastError!;
}

/**
 * Retry condition for payment operations
 */
export function isPaymentRetryable(error: Error): boolean {
  // Don't retry validation errors or authentication errors
  if (error instanceof AppError) {
    return error.statusCode >= 500 || error.code === 'EXTERNAL_SERVICE_ERROR';
  }

  // Retry network errors, timeouts, and 5xx responses
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504')
  );
}

/**
 * Retry condition for IoT operations
 */
export function isIoTRetryable(error: Error): boolean {
  // Don't retry if machine is offline or in maintenance
  if (error instanceof IoTError) {
    const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
    return !(
      message.includes('offline') ||
      message.includes('maintenance') ||
      message.includes('not found')
    );
  }

  // Retry MQTT connection issues and timeouts
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    message.includes('mqtt') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('not connected')
  );
}

/**
 * Specialized retry for payment operations with enhanced error handling
 */
export async function retryPaymentOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const defaultOptions: RetryOptions = {
    maxAttempts: 3,
    initialDelay: 2000,
    maxDelay: 10000,
    backoffFactor: 2,
    jitter: true,
    retryCondition: isPaymentRetryable,
    onRetry: (attempt, error, nextDelay) => {
      logger.warn(`Payment operation "${operationName}" failed on attempt ${attempt}:`, {
        error: error instanceof Error ? error.message : String(error),
        nextRetryIn: nextDelay,
        operationName,
        attempt,
        maxAttempts: defaultOptions.maxAttempts
      });
    }
  };

  try {
    const result = await retry(operation, { ...defaultOptions, ...options });
    
    if (result.attempts > 1) {
      logger.info(`Payment operation "${operationName}" succeeded after ${result.attempts} attempts`);
    }
    
    return result.result;
  } catch (error) {
    logger.error(`Payment operation "${operationName}" failed after all retries:`, {
      error: error instanceof Error ? error.message : String(error),
      operationName,
      maxAttempts: defaultOptions.maxAttempts
    });
    
    // Provide user-friendly error message based on error type
      console.error("=== RETRY WRAPPER CAUGHT ERROR ===");
      console.error("Error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      if (error.response) {
        console.error("Response Status:", error.response.status);
        console.error("Response Data:", JSON.stringify(error.response.data, null, 2));
      }
      console.error("===================================");
    let userMessage = 'Payment processing failed. Please try again.';
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('network') || errorMsg.includes('connection')) {
        userMessage = 'Payment failed due to network issues. Please check your connection and try again.';
      } else if (errorMsg.includes('timeout')) {
        userMessage = 'Payment request timed out. Please try again.';
      } else if (errorMsg.includes('insufficient')) {
        userMessage = 'Insufficient funds. Please add credit to your account.';
      } else if (errorMsg.includes('invalid')) {
        userMessage = 'Invalid payment information. Please check your details.';
      }
    }
    
    throw new PaymentError(userMessage, {
      operationName,
      originalError: error instanceof Error ? error.message : String(error),
      retryable: isPaymentRetryable(error as Error)
    });
  }
}

/**
 * Specialized retry for IoT operations with graceful degradation
 */
export async function retryIoTOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  machineId?: string,
  options: Partial<RetryOptions> & {
    allowOfflineMode?: boolean;
    offlineFallback?: () => Promise<T>;
  } = {}
): Promise<T> {
  const { allowOfflineMode = false, offlineFallback, ...retryOptions } = options;
  
  const defaultOptions: RetryOptions = {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 8000,
    backoffFactor: 1.5,
    jitter: true,
    retryCondition: isIoTRetryable,
    onRetry: (attempt, error, nextDelay) => {
      logger.warn(`IoT operation "${operationName}" failed on attempt ${attempt}:`, {
        error: error instanceof Error ? error.message : String(error),
        nextRetryIn: nextDelay,
        operationName,
        machineId,
        attempt,
        maxAttempts: defaultOptions.maxAttempts
      });
    }
  };

  try {
    const result = await retry(operation, { ...defaultOptions, ...retryOptions });
    
    if (result.attempts > 1) {
      logger.info(`IoT operation "${operationName}" succeeded after ${result.attempts} attempts`, {
        operationName,
        machineId,
        attempts: result.attempts
      });
    }
    
    return result.result;
  } catch (error) {
    logger.error(`IoT operation "${operationName}" failed after all retries:`, {
      error: error instanceof Error ? error.message : String(error),
      operationName,
      machineId,
      maxAttempts: defaultOptions.maxAttempts
    });

    // Try offline fallback if available
    if (allowOfflineMode && offlineFallback) {
      logger.warn(`Using offline fallback for IoT operation "${operationName}"`, {
        operationName,
        machineId
      });
      
      try {
        return await offlineFallback();
      } catch (fallbackError) {
        logger.error(`Offline fallback also failed for "${operationName}":`, fallbackError);
      }
    }
    
    // Provide user-friendly error message
    let userMessage = 'Machine is currently unavailable. Please try again later.';
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('offline') || errorMsg.includes('not connected')) {
        userMessage = 'Machine is offline. Please contact support if this persists.';
      } else if (errorMsg.includes('maintenance')) {
        userMessage = 'Machine is currently under maintenance. Please try a different machine.';
      } else if (errorMsg.includes('timeout')) {
        userMessage = 'Machine is not responding. Please try again in a few minutes.';
      } else if (errorMsg.includes('busy') || errorMsg.includes('in use')) {
        userMessage = 'Machine is currently in use. Please wait and try again.';
      }
    }
    
    throw new IoTError(userMessage, {
      operationName,
      machineId,
      originalError: error instanceof Error ? error.message : String(error),
      retryable: isIoTRetryable(error as Error),
      offlineModeAvailable: allowOfflineMode
    });
  }
}

/**
 * Specialized retry for external service calls
 */
export async function retryExternalService<T>(
  operation: () => Promise<T>,
  serviceName: string,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const defaultOptions: RetryOptions = {
    maxAttempts: 3,
    initialDelay: 1500,
    maxDelay: 15000,
    backoffFactor: 2.5,
    jitter: true,
    retryCondition: (error) => {
      // Retry on network errors and 5xx responses
      const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
      return (
        message.includes('timeout') ||
        message.includes('network') ||
        message.includes('connection') ||
        message.includes('500') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('504')
      );
    },
    onRetry: (attempt, error, nextDelay) => {
      logger.warn(`External service "${serviceName}" call failed on attempt ${attempt}:`, {
        error: error instanceof Error ? error.message : String(error),
        nextRetryIn: nextDelay,
        serviceName
      });
    }
  };

  try {
    const result = await retry(operation, { ...defaultOptions, ...options });
    return result.result;
  } catch (error) {
    logger.error(`External service "${serviceName}" call failed after all retries:`, error);
    throw new ExternalServiceError(serviceName, error instanceof Error ? error.message : String(error), {
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Batch retry for multiple operations
 */
export async function retryBatch<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions & { 
    concurrency?: number;
    failFast?: boolean;
  } = {}
): Promise<Array<{ success: boolean; result?: T; error?: Error; attempts: number }>> {
  const { concurrency = 3, failFast = false, ...retryOptions } = options;
  const results: Array<{ success: boolean; result?: T; error?: Error; attempts: number }> = [];
  
  // Process operations in batches
  for (let i = 0; i < operations.length; i += concurrency) {
    const batch = operations.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (operation, index) => {
      try {
        const result = await retry(operation, retryOptions);
        return {
          success: true,
          result: result.result,
          attempts: result.attempts,
          index: i + index
        };
      } catch (error) {
        const result = {
          success: false,
          error: error as Error,
          attempts: retryOptions.maxAttempts || 3,
          index: i + index
        };
        
        if (failFast) {
          throw result;
        }
        
        return result;
      }
    });

    try {
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(result => {
        results[result.index] = result;
      });
    } catch (error) {
      if (failFast) {
        throw error;
      }
    }
  }

  return results;
}

/**
 * Timeout wrapper with retry
 */
export async function withTimeoutAndRetry<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  retryOptions: RetryOptions = {}
): Promise<T> {
  const timeoutOperation = async (): Promise<T> => {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  };

  return retry(timeoutOperation, retryOptions).then(result => result.result);
}

/**
 * Exponential backoff calculator
 */
export function calculateBackoff(
  attempt: number,
  initialDelay: number = 1000,
  maxDelay: number = 30000,
  backoffFactor: number = 2,
  jitter: boolean = true
): number {
  let delay = initialDelay * Math.pow(backoffFactor, attempt - 1);
  delay = Math.min(delay, maxDelay);
  
  if (jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }
  
  return Math.floor(delay);
}