import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { createLogger } from '../utils/logger.js';
import { Machine, UsageSession, Notification } from '../models/types.js';

const logger = createLogger('websocket-service');

export interface DashboardMetrics {
  machines: {
    total: number;
    online: number;
    offline: number;
    maintenance: number;
    inUse: number;
  };
  sessions: {
    total: number;
    active: number;
    completed: number;
    pending: number;
    failed: number;
  };
  revenue: {
    today: number;
    thisMonth: number;
    total: number;
  };
  notifications: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
  };
}

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private connectedClients = new Set<string>();

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    logger.info('WebSocket service initialized');
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Handle client joining specific rooms
      socket.on('join-admin-dashboard', () => {
        socket.join('admin-dashboard');
        logger.info(`Client ${socket.id} joined admin dashboard`);
      });

      socket.on('join-machine-monitoring', (machineId: string) => {
        socket.join(`machine-${machineId}`);
        logger.info(`Client ${socket.id} joined machine monitoring for ${machineId}`);
      });

      socket.on('join-session-monitoring', (sessionId: string) => {
        socket.join(`session-${sessionId}`);
        logger.info(`Client ${socket.id} joined session monitoring for ${sessionId}`);
      });

      socket.on('join-user-room', (userId: string) => {
        socket.join(`user-${userId}`);
        logger.info(`Client ${socket.id} joined user room for ${userId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      // Handle ping for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });
  }

  /**
   * Broadcast machine status update
   */
  broadcastMachineUpdate(machine: Machine): void {
    if (!this.io) return;

    const update = {
      type: 'machine-update',
      data: machine,
      timestamp: new Date().toISOString()
    };

    // Broadcast to admin dashboard
    this.io.to('admin-dashboard').emit('machine-update', update);
    
    // Broadcast to specific machine monitoring
    this.io.to(`machine-${machine.id}`).emit('machine-update', update);

    logger.debug(`Broadcasted machine update for ${machine.code}`);
  }

  /**
   * Broadcast usage session update
   */
  broadcastSessionUpdate(session: UsageSession): void {
    if (!this.io) return;

    const update = {
      type: 'session-update',
      data: session,
      timestamp: new Date().toISOString()
    };

    // Broadcast to admin dashboard
    this.io.to('admin-dashboard').emit('session-update', update);
    
    // Broadcast to specific session monitoring
    this.io.to(`session-${session.id}`).emit('session-update', update);
    
    // Broadcast to machine monitoring (sessions affect machine status)
    this.io.to(`machine-${session.machineId}`).emit('session-update', update);

    logger.debug(`Broadcasted session update for ${session.id}`);
  }

  /**
   * Broadcast notification
   */
  broadcastNotification(notification: Notification): void {
    if (!this.io) return;

    const update = {
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString()
    };

    // Broadcast to admin dashboard
    this.io.to('admin-dashboard').emit('notification', update);

    // If notification is machine-specific, also broadcast to machine monitoring
    if (notification.machineId) {
      this.io.to(`machine-${notification.machineId}`).emit('notification', update);
    }

    logger.debug(`Broadcasted notification: ${notification.type}`);
  }

  /**
   * Broadcast dashboard metrics update
   */
  broadcastDashboardMetrics(metrics: DashboardMetrics): void {
    if (!this.io) return;

    const update = {
      type: 'dashboard-metrics',
      data: metrics,
      timestamp: new Date().toISOString()
    };

    this.io.to('admin-dashboard').emit('dashboard-metrics', update);
    logger.debug('Broadcasted dashboard metrics update');
  }

  /**
   * Broadcast machine heartbeat update
   */
  broadcastMachineHeartbeat(machineId: string, heartbeat: { temperature?: number; timestamp: Date }): void {
    if (!this.io) return;

    const update = {
      type: 'machine-heartbeat',
      data: {
        machineId,
        ...heartbeat
      },
      timestamp: new Date().toISOString()
    };

    // Broadcast to admin dashboard
    this.io.to('admin-dashboard').emit('machine-heartbeat', update);
    
    // Broadcast to specific machine monitoring
    this.io.to(`machine-${machineId}`).emit('machine-heartbeat', update);

    logger.debug(`Broadcasted heartbeat for machine ${machineId}`);
  }

  /**
   * Broadcast system alert
   */
  broadcastSystemAlert(alert: { type: 'error' | 'warning' | 'info'; message: string; details?: any }): void {
    if (!this.io) return;

    const update = {
      type: 'system-alert',
      data: alert,
      timestamp: new Date().toISOString()
    };

    this.io.to('admin-dashboard').emit('system-alert', update);
    logger.debug(`Broadcasted system alert: ${alert.type} - ${alert.message}`);
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, event: string, data: any): void {
    if (!this.io) return;

    this.io.to(clientId).emit(event, {
      type: event,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send message to user room (all connected clients for a user)
   */
  sendToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;

    this.io.to(`user-${userId}`).emit(event, {
      type: event,
      data,
      timestamp: new Date().toISOString()
    });

    logger.debug(`Sent ${event} to user ${userId}`);
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get clients in specific room
   */
  async getClientsInRoom(room: string): Promise<string[]> {
    if (!this.io) return [];

    const sockets = await this.io.in(room).fetchSockets();
    return sockets.map(socket => socket.id);
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.io !== null;
  }

  /**
   * Shutdown WebSocket service
   */
  shutdown(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
      this.connectedClients.clear();
      logger.info('WebSocket service shutdown');
    }
  }
}

export const webSocketService = new WebSocketService();