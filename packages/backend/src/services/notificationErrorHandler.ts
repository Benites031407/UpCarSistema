import { createLogger } from '../utils/logger.js';
import { retryExternalService } from '../utils/retry.js';
import { notificationWithDegradation } from '../utils/gracefulDegradation.js';
import { NotificationService } from './notificationService.js';

const logger = createLogger('notification-error-handler');

export interface NotificationErrorHandlerOptions {
  maxRetries?: number;
  retryDelay?: number;
  enableFallback?: boolean;
  fallbackMethod?: 'email' | 'sms' | 'log';
}

/**
 * Enhanced notification error handler with retry and fallback mechanisms
 * Implements Requirement 10.3 for notification error handling
 */
export class NotificationErrorHandler {
  private notificationService: NotificationService;
  private rateLimitTracker = new Map<string, { count: number; resetTime: number }>();

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
  }

  /**
   * Send notification with comprehensive error handling and retry logic
   */
  async sendNotificationWithRetry(
    type: 'maintenance_required' | 'machine_offline' | 'system_error',
    message: string,
    machineId?: string,
    options: NotificationErrorHandlerOptions = {}
  ): Promise<{ success: boolean; error?: string; fallbackUsed?: boolean }> {
    const {
      maxRetries = 3,
      retryDelay = 2000,
      enableFallback = true,
      fallbackMethod = 'log'
    } = options;

    // Check rate limiting first (Requirement 10.5)
    const rateLimitKey = `${type}_${machineId || 'global'}`;
    if (this.isRateLimited(rateLimitKey)) {
      logger.warn('Notification rate limited:', { type, machineId, message });
      return { 
        success: false, 
        error: 'Rate limit exceeded for this notification type' 
      };
    }

    try {
      // Primary notification attempt with retry
      await retryExternalService(
        () => this.notificationService.sendNotification(type, message, machineId),
        'whatsapp_notification',
        { maxAttempts: maxRetries, initialDelay: retryDelay }
      );

      // Update rate limit tracker on success
      this.updateRateLimit(rateLimitKey);
      
      logger.info('Notification sent successfully:', { type, machineId });
      return { success: true };

    } catch (error) {
      logger.error('Primary notification failed:', {
        type,
        machineId,
        message,
        error: error instanceof Error ? error.message : String(error)
      });

      // Try fallback if enabled
      if (enableFallback) {
        try {
          await this.sendFallbackNotification(type, message, machineId, fallbackMethod);
          
          // Still update rate limit even for fallback
          this.updateRateLimit(rateLimitKey);
          
          logger.info('Fallback notification sent:', { type, machineId, fallbackMethod });
          return { success: true, fallbackUsed: true };

        } catch (fallbackError) {
          logger.error('Fallback notification also failed:', {
            type,
            machineId,
            fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
          });
        }
      }

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Notification failed' 
      };
    }
  }

  /**
   * Send notification with graceful degradation
   */
  async sendNotificationWithDegradation(
    type: 'maintenance_required' | 'machine_offline' | 'system_error',
    message: string,
    machineId?: string
  ): Promise<void> {
    const rateLimitKey = `${type}_${machineId || 'global'}`;
    
    // Check rate limiting
    if (this.isRateLimited(rateLimitKey)) {
      logger.warn('Notification skipped due to rate limiting:', { type, machineId });
      return;
    }

    await notificationWithDegradation(
      () => this.notificationService.sendNotification(type, message, machineId),
      type,
      {
        queueForLater: true,
        queueCallback: async () => {
          // Queue for later delivery when service is available
          logger.info('Notification queued for later delivery:', { type, machineId, message });
          // In a real implementation, this would add to a persistent queue
        }
      }
    );

    // Update rate limit tracker
    this.updateRateLimit(rateLimitKey);
  }

  /**
   * Batch send notifications with error handling
   */
  async sendBatchNotifications(
    notifications: Array<{
      type: 'maintenance_required' | 'machine_offline' | 'system_error';
      message: string;
      machineId?: string;
    }>,
    options: NotificationErrorHandlerOptions = {}
  ): Promise<Array<{ success: boolean; error?: string; index: number }>> {
    const results: Array<{ success: boolean; error?: string; index: number }> = [];

    // Process notifications in batches to avoid overwhelming the service
    const batchSize = 5;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (notification, batchIndex) => {
        const globalIndex = i + batchIndex;
        try {
          const result = await this.sendNotificationWithRetry(
            notification.type,
            notification.message,
            notification.machineId,
            options
          );
          return { ...result, index: globalIndex };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            index: globalIndex
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, batchIndex) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Batch processing failed',
            index: i + batchIndex
          });
        }
      });

      // Add delay between batches to prevent rate limiting
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Check if notification type is rate limited
   */
  private isRateLimited(key: string): boolean {
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minutes
    const maxNotifications = 10; // Max 10 notifications per type per 5 minutes

    const tracker = this.rateLimitTracker.get(key);
    
    if (!tracker || now > tracker.resetTime) {
      return false;
    }

    return tracker.count >= maxNotifications;
  }

  /**
   * Update rate limit tracker
   */
  private updateRateLimit(key: string): void {
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minutes

    const tracker = this.rateLimitTracker.get(key);
    
    if (!tracker || now > tracker.resetTime) {
      this.rateLimitTracker.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
    } else {
      tracker.count++;
    }
  }

  /**
   * Send fallback notification using alternative method
   */
  private async sendFallbackNotification(
    type: string,
    message: string,
    machineId?: string,
    method: 'email' | 'sms' | 'log' = 'log'
  ): Promise<void> {
    switch (method) {
      case 'email':
        // In a real implementation, this would send an email
        logger.info('Fallback email notification:', { type, machineId, message });
        break;
      
      case 'sms':
        // In a real implementation, this would send an SMS
        logger.info('Fallback SMS notification:', { type, machineId, message });
        break;
      
      case 'log':
      default:
        // Log as fallback
        logger.warn('NOTIFICATION FALLBACK:', {
          type,
          machineId,
          message,
          timestamp: new Date().toISOString(),
          severity: type === 'system_error' ? 'HIGH' : 'MEDIUM'
        });
        break;
    }
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(): {
    rateLimitedTypes: Array<{ key: string; count: number; resetTime: Date }>;
    totalTrackedTypes: number;
  } {
    const rateLimitedTypes: Array<{ key: string; count: number; resetTime: Date }> = [];
    
    for (const [key, tracker] of this.rateLimitTracker.entries()) {
      if (Date.now() < tracker.resetTime) {
        rateLimitedTypes.push({
          key,
          count: tracker.count,
          resetTime: new Date(tracker.resetTime)
        });
      }
    }

    return {
      rateLimitedTypes,
      totalTrackedTypes: this.rateLimitTracker.size
    };
  }

  /**
   * Clear expired rate limit entries
   */
  cleanupRateLimitTracker(): void {
    const now = Date.now();
    
    for (const [key, tracker] of this.rateLimitTracker.entries()) {
      if (now > tracker.resetTime) {
        this.rateLimitTracker.delete(key);
      }
    }
  }

  /**
   * Reset rate limits for a specific type (admin function)
   */
  resetRateLimit(key?: string): void {
    if (key) {
      this.rateLimitTracker.delete(key);
      logger.info('Rate limit reset for key:', key);
    } else {
      this.rateLimitTracker.clear();
      logger.info('All rate limits reset');
    }
  }
}

// Export singleton instance
let notificationErrorHandler: NotificationErrorHandler | null = null;

export function getNotificationErrorHandler(notificationService?: NotificationService): NotificationErrorHandler {
  if (!notificationErrorHandler && notificationService) {
    notificationErrorHandler = new NotificationErrorHandler(notificationService);
    
    // Set up periodic cleanup
    setInterval(() => {
      notificationErrorHandler?.cleanupRateLimitTracker();
    }, 10 * 60 * 1000); // Cleanup every 10 minutes
  }
  
  if (!notificationErrorHandler) {
    throw new Error('NotificationErrorHandler not initialized. Provide NotificationService instance.');
  }
  
  return notificationErrorHandler;
}