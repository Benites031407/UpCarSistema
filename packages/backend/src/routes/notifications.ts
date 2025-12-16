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
      error: 'Falha na validação', 
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
      res.status(500).json({ error: 'Falha ao obter estatísticas de notificações' });
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
      .withMessage('O limite deve estar entre 1 e 100')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const notifications = await notificationService.getRecentNotifications(limit);
      res.json(notifications);
    } catch (error) {
      logger.error('Failed to get recent notifications:', error);
      res.status(500).json({ error: 'Falha ao obter notificações recentes' });
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
      res.json({ message: 'Reenvio de notificações falhadas iniciado' });
    } catch (error) {
      logger.error('Failed to retry notifications:', error);
      res.status(500).json({ error: 'Falha ao reenviar notificações' });
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
      .withMessage('A mensagem deve ter entre 1 e 500 caracteres')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { message } = req.body;
      await notificationService.sendSystemErrorNotification('Notificação de teste', message);
      res.json({ message: 'Notificação de teste enviada' });
    } catch (error) {
      logger.error('Failed to send test notification:', error);
      res.status(500).json({ error: 'Falha ao enviar notificação de teste' });
    }
  }
);

export { router as notificationRouter };