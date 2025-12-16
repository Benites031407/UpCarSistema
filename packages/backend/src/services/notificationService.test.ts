import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Create mock functions
const mockAxiosPost = vi.fn();
const mockNotificationRepo = {
  create: vi.fn(),
  updateWhatsappStatus: vi.fn(),
  findAll: vi.fn(),
  findRecent: vi.fn(),
  findByWhatsappStatus: vi.fn()
};

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: mockAxiosPost
  }
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}));

// Mock the notification repository
vi.mock('../repositories/notification.js', () => ({
  PostgresNotificationRepository: vi.fn(() => mockNotificationRepo)
}));

// Import after mocking
const { NotificationService } = await import('./notificationService.js');

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset environment variables
    process.env.WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
    process.env.WHATSAPP_ACCESS_TOKEN = 'test_token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'test_phone_id';
    process.env.ADMIN_PHONE = '+5511999999999';
    
    notificationService = new NotificationService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendMaintenanceNotification', () => {
    it('should create notification and send WhatsApp message', async () => {
      const mockNotification = {
        id: 'notification-1',
        type: 'maintenance_required',
        machineId: 'machine-1',
        message: 'Test message'
      };

      mockNotificationRepo.create.mockResolvedValue(mockNotification);
      mockAxiosPost.mockResolvedValue({ status: 200 });

      await notificationService.sendMaintenanceNotification(
        'machine-1',
        'M001',
        'Factory Floor',
        'Scheduled maintenance'
      );

      expect(mockNotificationRepo.create).toHaveBeenCalledWith({
        type: 'maintenance_required',
        machineId: 'machine-1',
        message: expect.stringContaining('🔧 MAINTENANCE REQUIRED')
      });

      expect(mockAxiosPost).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/test_phone_id/messages',
        {
          to: '+5511999999999',
          type: 'text',
          text: {
            body: expect.stringContaining('🔧 MAINTENANCE REQUIRED')
          }
        },
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test_token',
            'Content-Type': 'application/json'
          }
        })
      );

      expect(mockNotificationRepo.updateWhatsappStatus).toHaveBeenCalledWith(
        'notification-1',
        'sent'
      );
    });

    it('should handle WhatsApp API failure', async () => {
      const mockNotification = {
        id: 'notification-1',
        type: 'maintenance_required',
        machineId: 'machine-1',
        message: 'Test message'
      };

      mockNotificationRepo.create.mockResolvedValue(mockNotification);
      mockAxiosPost.mockRejectedValue(new Error('API Error'));

      await notificationService.sendMaintenanceNotification(
        'machine-1',
        'M001',
        'Factory Floor',
        'Scheduled maintenance'
      );

      expect(mockNotificationRepo.updateWhatsappStatus).toHaveBeenCalledWith(
        'notification-1',
        'failed'
      );
    });
  });

  describe('sendOfflineNotification', () => {
    it('should create notification with correct time calculation', async () => {
      const mockNotification = {
        id: 'notification-2',
        type: 'machine_offline',
        machineId: 'machine-2',
        message: 'Test message'
      };

      mockNotificationRepo.create.mockResolvedValue(mockNotification);
      mockAxiosPost.mockResolvedValue({ status: 200 });

      const lastHeartbeat = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

      await notificationService.sendOfflineNotification(
        'machine-2',
        'M002',
        'Warehouse',
        lastHeartbeat
      );

      expect(mockNotificationRepo.create).toHaveBeenCalledWith({
        type: 'machine_offline',
        machineId: 'machine-2',
        message: expect.stringContaining('10 minutes ago')
      });
    });
  });

  describe('rate limiting', () => {
    it('should prevent sending notifications when rate limited', async () => {
      const mockNotification = {
        id: 'notification-3',
        type: 'system_error',
        message: 'Test message'
      };

      mockNotificationRepo.create.mockResolvedValue(mockNotification);

      // Send 11 notifications rapidly (exceeds limit of 10 per hour)
      for (let i = 0; i < 11; i++) {
        await notificationService.sendSystemErrorNotification('Test error');
      }

      // The 11th notification should be rate limited
      expect(mockNotificationRepo.updateWhatsappStatus).toHaveBeenLastCalledWith(
        'notification-3',
        'failed'
      );
    });
  });

  describe('configuration handling', () => {
    it('should log messages when WhatsApp is not configured', async () => {
      // Clear WhatsApp configuration
      process.env.WHATSAPP_ACCESS_TOKEN = '';
      process.env.WHATSAPP_PHONE_NUMBER_ID = '';
      process.env.ADMIN_PHONE = '';

      const notificationServiceUnconfigured = new NotificationService();
      
      const mockNotification = {
        id: 'notification-4',
        type: 'system_error',
        message: 'Test message'
      };

      mockNotificationRepo.create.mockResolvedValue(mockNotification);

      await notificationServiceUnconfigured.sendSystemErrorNotification('Test error');

      // Should not call axios but should mark as sent (logged)
      expect(mockAxiosPost).not.toHaveBeenCalled();
      expect(mockNotificationRepo.updateWhatsappStatus).toHaveBeenCalledWith(
        'notification-4',
        'sent'
      );
    });
  });

  describe('getNotificationStats', () => {
    it('should calculate statistics correctly', async () => {
      const mockNotifications = [
        { whatsappStatus: 'sent', type: 'maintenance_required' },
        { whatsappStatus: 'sent', type: 'machine_offline' },
        { whatsappStatus: 'failed', type: 'system_error' },
        { whatsappStatus: 'pending', type: 'maintenance_required' }
      ];

      mockNotificationRepo.findAll.mockResolvedValue(mockNotifications);

      const stats = await notificationService.getNotificationStats();

      expect(stats).toEqual({
        total: 4,
        sent: 2,
        failed: 1,
        pending: 1,
        byType: {
          maintenance_required: 2,
          machine_offline: 1,
          system_error: 1
        }
      });
    });
  });

  describe('retryFailedNotifications', () => {
    it('should retry all failed notifications', async () => {
      const failedNotifications = [
        { id: 'notif-1', message: 'Failed message 1' },
        { id: 'notif-2', message: 'Failed message 2' }
      ];

      mockNotificationRepo.findByWhatsappStatus.mockResolvedValue(failedNotifications);
      mockAxiosPost.mockResolvedValue({ status: 200 });

      await notificationService.retryFailedNotifications();

      expect(mockAxiosPost).toHaveBeenCalledTimes(2);
      expect(mockNotificationRepo.updateWhatsappStatus).toHaveBeenCalledWith('notif-1', 'sent');
      expect(mockNotificationRepo.updateWhatsappStatus).toHaveBeenCalledWith('notif-2', 'sent');
    });
  });

  describe('sendTemperatureAlert', () => {
    it('should send temperature alert with correct format', async () => {
      const mockNotification = {
        id: 'notification-5',
        type: 'system_error',
        machineId: 'machine-5',
        message: 'Temperature alert'
      };

      mockNotificationRepo.create.mockResolvedValue(mockNotification);
      mockAxiosPost.mockResolvedValue({ status: 200 });

      await notificationService.sendTemperatureAlert('machine-5', 'M005', 85);

      expect(mockNotificationRepo.create).toHaveBeenCalledWith({
        type: 'system_error',
        machineId: 'machine-5',
        message: expect.stringContaining('🌡️ TEMPERATURE ALERT')
      });

      expect(mockNotificationRepo.create).toHaveBeenCalledWith({
        type: 'system_error',
        machineId: 'machine-5',
        message: expect.stringContaining('85°C')
      });
    });
  });
});