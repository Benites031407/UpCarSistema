import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { notificationService } from '../services/notificationService.js';
import { requireAuth, requireAdmin } from '../auth/middleware.js';
import { createLogger } from '../utils/logger.js';

const router = express.Router();
const logger = createLogger('notification-routes');

// Validation middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }
  next();
};

/**
 * GET /api/notifications/stats
 * Get notification statistics (admin only)
 */
router.get('/stats', 
  requireAuth,
  requireAdmin,
  async (_req: express.Request, res: express.Response) => {
    try {
      const stats = await notificationService.getNotificationStats();
      res.json(stats);
    } catch (error) {
      logger.error('Failed to get notification stats:', error);
      res.status(500).json({ error: 'Failed to get notification statistics' });
    }
  }
);

/**
 * GET /api/notifications/recent
 * Get recent notifications (admin only)
 */
router.get('/recent',
  requireAuth,
  requireAdmin,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const notifications = await notificationService.getRecentNotifications(limit);
      res.json(notifications);
    } catch (error) {
      logger.error('Failed to get recent notifications:', error);
      res.status(500).json({ error: 'Failed to get recent notifications' });
    }
  }
);

/**
 * POST /api/notifications/retry-failed
 * Retry failed notifications (admin only)
 */
router.post('/retry-failed',
  requireAuth,
  requireAdmin,
  async (_req: express.Request, res: express.Response) => {
    try {
      await notificationService.retryFailedNotifications();
      res.json({ message: 'Failed notifications retry initiated' });
    } catch (error) {
      logger.error('Failed to retry notifications:', error);
      res.status(500).json({ error: 'Failed to retry notifications' });
    }
  }
);

/**
 * POST /api/notifications/test
 * Send test notification (admin only)
 */
router.post('/test',
  requireAuth,
  requireAdmin,
  [
    body('message')
      .isString()
      .isLength({ min: 1, max: 500 })
      .withMessage('Message must be between 1 and 500 characters')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { message } = req.body;
      await notificationService.sendSystemErrorNotification('Test notification', message);
      res.json({ message: 'Test notification sent' });
    } catch (error) {
      logger.error('Failed to send test notification:', error);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  }
);

export { router as notificationRouter };