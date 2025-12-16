import { Router } from 'express';
import { webSocketService } from '../services/websocketService.js';
import { realtimeDashboardService } from '../services/realtimeDashboardService.js';
import { requireAuth } from '../auth/middleware.js';

const router = Router();

/**
 * Get WebSocket connection status
 */
router.get('/status', requireAuth, async (_req, res) => {
  try {
    const status = {
      initialized: webSocketService.isInitialized(),
      connectedClients: webSocketService.getConnectedClientsCount(),
      dashboardServiceRunning: realtimeDashboardService.isRunning()
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao obter status do WebSocket' });
  }
});

/**
 * Get clients in specific room
 */
router.get('/rooms/:room/clients', requireAuth, async (req, res) => {
  try {
    const { room } = req.params;
    const clients = await webSocketService.getClientsInRoom(room);
    
    res.json({ room, clients: clients.length, clientIds: clients });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao obter clientes da sala' });
  }
});

/**
 * Trigger manual dashboard metrics update
 */
router.post('/dashboard/refresh', requireAuth, async (_req, res) => {
  try {
    await realtimeDashboardService.triggerUpdate();
    res.json({ message: 'Métricas do dashboard atualizadas' });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao atualizar métricas do dashboard' });
  }
});

/**
 * Send test notification to admin dashboard
 */
router.post('/test/notification', requireAuth, async (req, res) => {
  try {
    const { message, type = 'info' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    webSocketService.broadcastSystemAlert({
      type,
      message,
      details: { source: 'manual-test', timestamp: new Date().toISOString() }
    });

    res.json({ message: 'Notificação de teste enviada' });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao enviar notificação de teste' });
  }
});

export default router;