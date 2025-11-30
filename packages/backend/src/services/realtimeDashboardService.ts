import { webSocketService, DashboardMetrics } from './websocketService.js';
import { machineService } from './machineService.js';
import { usageSessionService } from './usageSessionService.js';
import { notificationService } from './notificationService.js';
import { RepositoryFactory } from '../repositories/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('realtime-dashboard-service');

export class RealtimeDashboardService {
  private transactionRepo = RepositoryFactory.getTransactionRepository();
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL_MS = 30000; // 30 seconds

  /**
   * Start real-time dashboard updates
   */
  start(): void {
    if (this.updateInterval) {
      logger.warn('Real-time dashboard service already started');
      return;
    }

    // Send initial metrics
    this.broadcastDashboardMetrics();

    // Set up periodic updates
    this.updateInterval = setInterval(() => {
      this.broadcastDashboardMetrics();
    }, this.UPDATE_INTERVAL_MS);

    logger.info('Real-time dashboard service started');
  }

  /**
   * Stop real-time dashboard updates
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      logger.info('Real-time dashboard service stopped');
    }
  }

  /**
   * Collect and broadcast current dashboard metrics
   */
  async broadcastDashboardMetrics(): Promise<void> {
    try {
      const metrics = await this.collectDashboardMetrics();
      webSocketService.broadcastDashboardMetrics(metrics);
    } catch (error) {
      logger.error('Failed to broadcast dashboard metrics:', error);
    }
  }

  /**
   * Collect current dashboard metrics
   */
  async collectDashboardMetrics(): Promise<DashboardMetrics> {
    const [machineStats, sessionStats, notificationStats, revenueStats] = await Promise.all([
      machineService.getMachineStats(),
      usageSessionService.getSessionStats(),
      notificationService.getNotificationStats(),
      this.getRevenueStats()
    ]);

    return {
      machines: machineStats,
      sessions: sessionStats,
      revenue: revenueStats,
      notifications: notificationStats
    };
  }

  /**
   * Get revenue statistics
   */
  private async getRevenueStats(): Promise<{ today: number; thisMonth: number; total: number }> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [todayRevenue, monthRevenue, totalRevenue] = await Promise.all([
        this.transactionRepo.getTotalRevenue(today),
        this.transactionRepo.getTotalRevenue(thisMonth),
        this.transactionRepo.getTotalRevenue()
      ]);

      return {
        today: todayRevenue,
        thisMonth: monthRevenue,
        total: totalRevenue
      };
    } catch (error) {
      logger.error('Failed to get revenue stats:', error);
      return { today: 0, thisMonth: 0, total: 0 };
    }
  }

  /**
   * Trigger immediate dashboard update
   */
  async triggerUpdate(): Promise<void> {
    await this.broadcastDashboardMetrics();
  }

  /**
   * Check if service is running
   */
  isRunning(): boolean {
    return this.updateInterval !== null;
  }
}

export const realtimeDashboardService = new RealtimeDashboardService();