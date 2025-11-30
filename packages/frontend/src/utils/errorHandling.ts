/**
 * Frontend error handling utilities
 */

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: any;
  timestamp?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: any;
  timestamp?: string;
}

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  public readonly code?: string;
  public readonly details?: any;
  public readonly statusCode?: number;

  constructor(message: string, code?: string, details?: any, statusCode?: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
  }
}

/**
 * Network error class
 */
export class NetworkError extends AppError {
  constructor(message: string = 'Network connection failed') {
    super(message, 'NETWORK_ERROR');
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', undefined, 401);
  }
}

/**
 * Payment error class
 */
export class PaymentError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'PAYMENT_ERROR', details);
  }
}

/**
 * Machine error class (IoT related)
 */
export class MachineError extends AppError {
  constructor(message: string, machineId?: string) {
    super(message, 'MACHINE_ERROR', { machineId });
  }
}

/**
 * Parse API error response
 */
export function parseApiError(error: any): AppError {
  // Handle network errors
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return new NetworkError('Request timeout. Please check your connection and try again.');
    }
    if (error.code === 'ERR_NETWORK') {
      return new NetworkError('Network error. Please check your internet connection.');
    }
    return new NetworkError('Unable to connect to the server. Please try again later.');
  }

  const { status, data } = error.response;
  const message = data?.error || data?.message || 'An unexpected error occurred';
  const code = data?.code;
  const details = data?.details;

  // Handle specific HTTP status codes
  switch (status) {
    case 400:
      return new ValidationError(message, details);
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new AppError('You do not have permission to perform this action', 'FORBIDDEN', details, 403);
    case 404:
      return new AppError('The requested resource was not found', 'NOT_FOUND', details, 404);
    case 409:
      return new AppError(message, 'CONFLICT', details, 409);
    case 429:
      return new AppError('Too many requests. Please wait a moment and try again.', 'RATE_LIMIT', details, 429);
    case 500:
      return new AppError('Server error. Please try again later.', 'SERVER_ERROR', details, 500);
    case 503:
      return new AppError('Service temporarily unavailable. Please try again later.', 'SERVICE_UNAVAILABLE', details, 503);
    default:
      return new AppError(message, code, details, status);
  }
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: Error | AppError | string): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof AppError) {
    // Provide user-friendly messages for common error codes
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Connection problem. Please check your internet and try again.';
      case 'VALIDATION_ERROR':
        return error.message;
      case 'AUTHENTICATION_ERROR':
        return 'Please log in to continue.';
      case 'PAYMENT_ERROR':
        return `Payment failed: ${error.message}`;
      case 'MACHINE_ERROR':
        return `Machine error: ${error.message}`;
      case 'RATE_LIMIT':
        return 'Too many requests. Please wait a moment before trying again.';
      case 'SERVER_ERROR':
        return 'Server error. Our team has been notified. Please try again later.';
      case 'SERVICE_UNAVAILABLE':
        return 'Service temporarily unavailable. Please try again in a few minutes.';
      default:
        return error.message;
    }
  }

  return error.message || 'An unexpected error occurred';
}

/**
 * Error retry utility
 */
export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
  retryCondition?: (error: Error) => boolean;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = true,
    retryCondition = (error) => {
      // Retry on network errors and 5xx server errors
      if (error instanceof NetworkError) return true;
      if (error instanceof AppError && error.statusCode && error.statusCode >= 500) return true;
      return false;
    }
  } = options;

  let lastError: Error;
  let currentDelay = delay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts || !retryCondition(lastError)) {
        throw lastError;
      }

      await new Promise(resolve => setTimeout(resolve, currentDelay));
      
      if (backoff) {
        currentDelay *= 2;
      }
    }
  }

  throw lastError!;
}

/**
 * Error boundary utility for React components
 */
export interface ErrorInfo {
  error: Error;
  errorInfo: { componentStack: string };
  timestamp: Date;
  userAgent: string;
  url: string;
}

export function logError(errorInfo: ErrorInfo): void {
  console.error('Application Error:', {
    message: errorInfo.error.message,
    stack: errorInfo.error.stack,
    componentStack: errorInfo.errorInfo.componentStack,
    timestamp: errorInfo.timestamp.toISOString(),
    userAgent: errorInfo.userAgent,
    url: errorInfo.url
  });

  // In production, you might want to send this to an error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to error tracking service
    // errorTrackingService.captureException(errorInfo.error, {
    //   extra: errorInfo
    // });
  }
}

/**
 * Graceful degradation utility
 */
export async function withFallback<T>(
  primaryOperation: () => Promise<T>,
  fallbackOperation: () => Promise<T> | T,
  condition?: (error: Error) => boolean
): Promise<T> {
  try {
    return await primaryOperation();
  } catch (error) {
    const shouldUseFallback = condition ? condition(error as Error) : true;
    
    if (shouldUseFallback) {
      console.warn('Primary operation failed, using fallback:', error);
      return await fallbackOperation();
    }
    
    throw error;
  }
}

/**
 * Error toast notification helper
 */
export interface ToastOptions {
  duration?: number;
  type?: 'error' | 'warning' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function showErrorToast(error: Error | string, options: ToastOptions = {}): void {
  const message = formatErrorMessage(error);
  const { duration = 5000, type = 'error' } = options;

  // This would integrate with your toast notification system
  console.error(`[${type.toUpperCase()}] ${message}`);
  
  // Example integration with a toast library:
  // toast.error(message, {
  //   duration,
  //   action: action ? {
  //     label: action.label,
  //     onClick: action.onClick
  //   } : undefined
  // });
}

/**
 * Form error handler
 */
export function handleFormError(error: Error, setFieldError?: (field: string, message: string) => void): void {
  if (error instanceof ValidationError && error.details) {
    // Handle field-specific validation errors
    if (Array.isArray(error.details)) {
      error.details.forEach((fieldError: any) => {
        if (setFieldError && fieldError.field && fieldError.message) {
          setFieldError(fieldError.field, fieldError.message);
        }
      });
    } else if (typeof error.details === 'object') {
      Object.entries(error.details).forEach(([field, message]) => {
        if (setFieldError && typeof message === 'string') {
          setFieldError(field, message);
        }
      });
    }
  } else {
    // Show general error message
    showErrorToast(error);
  }
}

/**
 * Enhanced offline detection and handling with graceful degradation
 */
export class OfflineHandler {
  private isOnline = navigator.onLine;
  private listeners: Array<(isOnline: boolean) => void> = [];
  private queuedOperations: Array<{
    operation: () => Promise<any>;
    priority: 'high' | 'medium' | 'low';
    maxRetries: number;
    retries: number;
    timestamp: number;
  }> = [];
  private retryInterval: NodeJS.Timeout | null = null;

  constructor() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Start periodic retry for queued operations
    this.startRetryInterval();
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.notifyListeners();
    this.processQueuedOperations();
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.isOnline);
      } catch (error) {
        console.error('Error in offline handler listener:', error);
      }
    });
  }

  private startRetryInterval(): void {
    this.retryInterval = setInterval(() => {
      if (this.isOnline && this.queuedOperations.length > 0) {
        this.processQueuedOperations();
      }
    }, 30000); // Retry every 30 seconds
  }

  private async processQueuedOperations(): Promise<void> {
    if (!this.isOnline || this.queuedOperations.length === 0) {
      return;
    }

    // Sort by priority and timestamp
    this.queuedOperations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp; // Older operations first
    });

    const operations = [...this.queuedOperations];
    this.queuedOperations = [];

    for (const item of operations) {
      try {
        await item.operation();
        console.log('Queued operation completed successfully');
      } catch (error) {
        console.error('Queued operation failed:', error);
        
        // Re-queue if retries available and it's a network error
        if (item.retries < item.maxRetries && error instanceof NetworkError) {
          item.retries++;
          this.queuedOperations.push(item);
        } else {
          console.error('Operation permanently failed after retries:', error);
        }
      }
    }
  }

  public addListener(listener: (isOnline: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public queueOperation(
    operation: () => Promise<any>,
    options: {
      priority?: 'high' | 'medium' | 'low';
      maxRetries?: number;
    } = {}
  ): void {
    const { priority = 'medium', maxRetries = 3 } = options;

    if (this.isOnline) {
      operation().catch(error => {
        if (error instanceof NetworkError) {
          this.queuedOperations.push({
            operation,
            priority,
            maxRetries,
            retries: 0,
            timestamp: Date.now()
          });
        }
      });
    } else {
      this.queuedOperations.push({
        operation,
        priority,
        maxRetries,
        retries: 0,
        timestamp: Date.now()
      });
    }
  }

  public getStatus(): boolean {
    return this.isOnline;
  }

  public getQueuedOperationsCount(): number {
    return this.queuedOperations.length;
  }

  public clearQueue(): void {
    this.queuedOperations = [];
  }

  public destroy(): void {
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
    
    this.listeners = [];
    this.queuedOperations = [];
  }
}

// Global offline handler instance
export const offlineHandler = new OfflineHandler();

/**
 * React hook for error handling
 */
export function useErrorHandler() {
  return {
    handleError: (error: Error, options?: ToastOptions) => {
      const appError = error instanceof AppError ? error : parseApiError(error);
      showErrorToast(appError, options);
      return appError;
    },
    
    handleFormError: (error: Error, setFieldError?: (field: string, message: string) => void) => {
      const appError = error instanceof AppError ? error : parseApiError(error);
      handleFormError(appError, setFieldError);
      return appError;
    },
    
    withRetry: <T>(operation: () => Promise<T>, options?: RetryOptions) => {
      return withRetry(operation, options);
    },
    
    withFallback: <T>(
      primary: () => Promise<T>,
      fallback: () => Promise<T> | T,
      condition?: (error: Error) => boolean
    ) => {
      return withFallback(primary, fallback, condition);
    }
  };
}