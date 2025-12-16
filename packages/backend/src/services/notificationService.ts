import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import { PostgresNotificationRepository } from '../repositories/notification.js';
import { Notification } from '../models/types.js';
import { webSocketService } from './websocketService.js';

const logger = createLogger('notification-service');

export interface WhatsAppMessage {
  to: string;
  type: 'text';
  text: {
    body: string;
  };
}

export class NotificationService {
  private notificationRepo: PostgresNotificationRepository;
  private whatsappApiUrl: string;
  private accessToken: string;
  private phoneNumberId: string;
  private adminPhone: string;
  private rateLimitMap = new Map<string, number[]>();
  private maxNotificationsPerHour = 10;

  constructor() {
    this.notificationRepo = new PostgresNotificationRepository();
    this.whatsappApiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.adminPhone = process.env.ADMIN_PHONE || '';

    if (!this.accessToken || !this.phoneNumberId || !this.adminPhone) {
      logger.warn('WhatsApp configuration incomplete - notifications will be logged only');
    }
  }

  /**
   * Send maintenance notification
   */
  async sendMaintenanceNotification(machineId: string, machineCode: string, location: string, reason: string): Promise<void> {
    const message = `🔧 MANUTENÇÃO NECESSÁRIA\n\nMáquina: ${machineCode}\nLocal: ${location}\nMotivo: ${reason}\n\nPor favor, agende a manutenção o mais breve possível.`;
    
    const notification = await this.notificationRepo.create({
      type: 'maintenance_required',
      machineId,
      message
    });

    // Broadcast real-time notification
    webSocketService.broadcastNotification(notification);

    await this.sendWhatsAppMessage(message, notification.id);
  }

  /**
   * Send offline notification
   */
  async sendOfflineNotification(machineId: string, machineCode: string, location: string, lastHeartbeat: Date): Promise<void> {
    const timeSince = Math.round((Date.now() - lastHeartbeat.getTime()) / (1000 * 60)); // minutes
    const message = `📡 MÁQUINA OFFLINE\n\nMáquina: ${machineCode}\nLocal: ${location}\nÚltima conexão: há ${timeSince} minutos\n\nPor favor, verifique a conexão da máquina.`;
    
    const notification = await this.notificationRepo.create({
      type: 'machine_offline',
      machineId,
      message
    });

    // Broadcast real-time notification
    webSocketService.broadcastNotification(notification);

    await this.sendWhatsAppMessage(message, notification.id);
  }

  /**
   * Send session notification
   */
  async sendSessionNotification(sessionId: string, type: 'session_started' | 'session_ending' | 'session_completed' | 'session_failed', message: string): Promise<void> {
    const notification = {
      type,
      message,
      sessionId,
      timestamp: new Date().toISOString()
    };

    // Broadcast real-time session notification
    webSocketService.sendToClient(sessionId, 'session-notification', notification);

    logger.debug(`Sent session notification: ${type} for session ${sessionId}`);
  }

  /**
   * Send system error notification
   */
  async sendSystemErrorNotification(error: string, details?: string): Promise<void> {
    const message = `⚠️ ERRO DO SISTEMA\n\nErro: ${error}\n${details ? `Detalhes: ${details}\n` : ''}\nPor favor, verifique os logs do sistema.`;
    
    const notification = await this.notificationRepo.create({
      type: 'system_error',
      message
    });

    // Broadcast real-time notification
    webSocketService.broadcastNotification(notification);

    await this.sendWhatsAppMessage(message, notification.id);
  }

  /**
   * Send temperature alert notification
   */
  async sendTemperatureAlert(machineId: string, machineCode: string, temperature: number): Promise<void> {
    const message = `🌡️ ALERTA DE TEMPERATURA\n\nMáquina: ${machineCode}\nTemperatura: ${temperature}°C\n\nA máquina foi automaticamente desativada por segurança.`;
    
    const notification = await this.notificationRepo.create({
      type: 'system_error',
      machineId,
      message
    });

    // Broadcast real-time notification
    webSocketService.broadcastNotification(notification);

    await this.sendWhatsAppMessage(message, notification.id);
  }

  /**
   * Check rate limiting for notifications
   */
  private isRateLimited(type: string): boolean {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    if (!this.rateLimitMap.has(type)) {
      this.rateLimitMap.set(type, []);
    }
    
    const timestamps = this.rateLimitMap.get(type)!;
    
    // Remove timestamps older than 1 hour
    const recentTimestamps = timestamps.filter(ts => ts > hourAgo);
    this.rateLimitMap.set(type, recentTimestamps);
    
    // Check if we've exceeded the limit
    if (recentTimestamps.length >= this.maxNotificationsPerHour) {
      logger.warn(`Rate limit exceeded for notification type: ${type}`);
      return true;
    }
    
    // Add current timestamp
    recentTimestamps.push(now);
    return false;
  }

  /**
   * Send WhatsApp message
   */
  private async sendWhatsAppMessage(message: string, notificationId: string): Promise<void> {
    // Check rate limiting
    if (this.isRateLimited('whatsapp')) {
      logger.warn('WhatsApp notification rate limited');
      await this.notificationRepo.updateWhatsappStatus(notificationId, 'failed');
      return;
    }

    // If WhatsApp is not configured, just log the message
    if (!this.accessToken || !this.phoneNumberId || !this.adminPhone) {
      logger.info(`WhatsApp notification (would send to ${this.adminPhone}): ${message}`);
      await this.notificationRepo.updateWhatsappStatus(notificationId, 'sent');
      return;
    }

    try {
      const whatsappMessage: WhatsAppMessage = {
        to: this.adminPhone,
        type: 'text',
        text: {
          body: message
        }
      };

      const response = await axios.post(
        `${this.whatsappApiUrl}/${this.phoneNumberId}/messages`,
        whatsappMessage,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.status === 200) {
        logger.info('WhatsApp notification sent successfully');
        await this.notificationRepo.updateWhatsappStatus(notificationId, 'sent');
      } else {
        logger.error('WhatsApp API returned non-200 status:', response.status);
        await this.notificationRepo.updateWhatsappStatus(notificationId, 'failed');
      }
    } catch (error) {
      logger.error('Failed to send WhatsApp notification:', error);
      await this.notificationRepo.updateWhatsappStatus(notificationId, 'failed');
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
    byType: Record<string, number>;
  }> {
    const notifications = await this.notificationRepo.findAll();
    
    const stats = {
      total: notifications.length,
      sent: 0,
      failed: 0,
      pending: 0,
      byType: {} as Record<string, number>
    };

    notifications.forEach(notification => {
      // Count by status
      if (notification.whatsappStatus === 'sent') {
        stats.sent++;
      } else if (notification.whatsappStatus === 'failed') {
        stats.failed++;
      } else {
        stats.pending++;
      }

      // Count by type
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Get recent notifications
   */
  async getRecentNotifications(limit = 50): Promise<Notification[]> {
    return await this.notificationRepo.findRecent(limit);
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(): Promise<void> {
    const failedNotifications = await this.notificationRepo.findByWhatsappStatus('failed');
    
    for (const notification of failedNotifications) {
      try {
        await this.sendWhatsAppMessage(notification.message, notification.id);
        logger.info(`Retried notification ${notification.id}`);
      } catch (error) {
        logger.error(`Failed to retry notification ${notification.id}:`, error);
      }
    }
  }
}

export const notificationService = new NotificationService();