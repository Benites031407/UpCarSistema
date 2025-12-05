import { machineService } from './machineService.js';
import { notificationService } from './notificationService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('scheduler');

export class SchedulerService {
  private intervals: NodeJS.Timeout[] = [];

  /**
   * Start all scheduled tasks
   */
  start(): void {
    logger.info('Starting scheduled tasks');

    // Check for offline machines every 30 seconds
    const offlineCheckInterval = setInterval(async () => {
      try {
        await machineService.checkOfflineMachines();
      } catch (error) {
        logger.error('Error checking offline machines:', error);
      }
    }, 30 * 1000); // 30 seconds

    // Retry failed notifications every 15 minutes
    const notificationRetryInterval = setInterval(async () => {
      try {
        await notificationService.retryFailedNotifications();
      } catch (error) {
        logger.error('Error retrying failed notifications:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes

    this.intervals.push(offlineCheckInterval);
    this.intervals.push(notificationRetryInterval);

    logger.info('Scheduled tasks started');
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    logger.info('Stopping scheduled tasks');
    
    this.intervals.forEach(interval => {
      clearInterval(interval);
    });
    
    this.intervals = [];
    
    logger.info('Scheduled tasks stopped');
  }
}

export const schedulerService = new SchedulerService();