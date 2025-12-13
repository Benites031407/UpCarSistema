import { UsageSession, CreateUsageSessionInput, User, Machine } from '../models/types.js';
import { RepositoryFactory } from '../repositories/index.js';
import { PaymentService } from './paymentService.js';
import { MachineService } from './machineService.js';
import { NotificationService } from './notificationService.js';
import { sessionMqttHandler } from './sessionMqttHandler.js';
import { db } from '../database/connection.js';
import { createLogger } from '../utils/logger.js';
import { webSocketService } from './websocketService.js';

const logger = createLogger('usage-session-service');

export interface SessionActivationRequest {
  userId: string;
  machineId: string;
  duration: number; // minutes (1-30)
  paymentMethod: 'balance' | 'pix' | 'subscription';
}

export interface SessionActivationResult {
  session: UsageSession;
  paymentRequired?: {
    pixPayment?: any;
    balanceTransaction?: any;
  };
  message: string;
}

export class UsageSessionService {
  private usageSessionRepo = RepositoryFactory.getUsageSessionRepository();
  private userRepo = RepositoryFactory.getUserRepository();
  private machineRepo = RepositoryFactory.getMachineRepository();
  private transactionRepo = RepositoryFactory.getTransactionRepository();
  private paymentService: PaymentService;
  private machineService: MachineService;
  private notificationService: NotificationService;

  constructor() {
    this.paymentService = new PaymentService(
      this.transactionRepo,
      this.userRepo
    );
    this.machineService = new MachineService();
    this.notificationService = new NotificationService();
  }

  /**
   * Validates duration selection (1-30 minutes)
   */
  validateDuration(duration: number): boolean {
    return Number.isInteger(duration) && duration >= 1 && duration <= 30;
  }

  /**
   * Calculates cost for usage duration (1 R$ per minute)
   */
  calculateCost(duration: number): number {
    if (!this.validateDuration(duration)) {
      throw new Error('Invalid duration. Must be between 1 and 30 minutes.');
    }
    return duration; // 1 R$ per minute
  }

  /**
   * Checks if subscription user has already used a machine today
   */
  async checkSubscriptionDailyUsage(userId: string): Promise<boolean> {
    const today = new Date();
    const dailyUsage = await this.usageSessionRepo.findUserDailyUsage(userId, today);
    
    // Check if any session was completed today
    return dailyUsage.some(session => session.status === 'completed');
  }

  /**
   * Validates machine activation request
   */
  async validateActivationRequest(request: SessionActivationRequest): Promise<{
    valid: boolean;
    error?: string;
    user?: User;
    machine?: Machine;
    cost?: number;
  }> {
    // Validate duration
    if (!this.validateDuration(request.duration)) {
      return {
        valid: false,
        error: 'Invalid duration. Must be between 1 and 30 minutes.'
      };
    }

    // Get user
    const user = await this.userRepo.findById(request.userId);
    if (!user) {
      return {
        valid: false,
        error: 'User not found'
      };
    }

    // Check machine availability
    const availability = await this.machineService.checkMachineAvailability(request.machineId);
    if (!availability.available) {
      return {
        valid: false,
        error: availability.reason,
        user,
        machine: availability.machine
      };
    }

    const cost = this.calculateCost(request.duration);

    // Check subscription usage if user has active subscription
    if (user.subscriptionStatus === 'active' && user.subscriptionExpiry && user.subscriptionExpiry > new Date()) {
      if (request.paymentMethod === 'subscription') {
        const hasUsedToday = await this.checkSubscriptionDailyUsage(request.userId);
        if (hasUsedToday) {
          return {
            valid: false,
            error: 'Daily usage limit reached for subscription users',
            user,
            machine: availability.machine,
            cost
          };
        }
      }
    } else if (request.paymentMethod === 'subscription') {
      return {
        valid: false,
        error: 'No active subscription found',
        user,
        machine: availability.machine,
        cost
      };
    }

    // Validate payment method for non-subscription users
    if (request.paymentMethod === 'balance' && user.accountBalance < cost) {
      return {
        valid: false,
        error: `Insufficient balance. Required: R$ ${cost.toFixed(2)}, Available: R$ ${user.accountBalance.toFixed(2)}`,
        user,
        machine: availability.machine,
        cost
      };
    }

    return {
      valid: true,
      user,
      machine: availability.machine,
      cost
    };
  }

  /**
   * Creates a new usage session
   */
  async createSession(request: SessionActivationRequest): Promise<SessionActivationResult> {
    const validation = await this.validateActivationRequest(request);
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { user, cost } = validation;
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Create usage session
      const sessionData: CreateUsageSessionInput = {
        userId: request.userId,
        machineId: request.machineId,
        duration: request.duration,
        cost: cost!,
        paymentMethod: request.paymentMethod === 'subscription' ? 'balance' : request.paymentMethod
      };

      const session = await this.usageSessionRepo.create(sessionData, client);

      let paymentResult: any = {};

      // Process payment based on method
      if (request.paymentMethod === 'subscription') {
        // For subscription users, no payment processing needed
        // Update user's last daily use
        await this.userRepo.update(request.userId, {
          lastDailyUse: new Date()
        }, client);
      } else if (request.paymentMethod === 'balance') {
        // Process balance payment
        const balanceTransaction = await this.paymentService.processBalancePayment(
          request.userId,
          cost!,
          `Machine usage - ${request.duration} minutes`
        );
        paymentResult.balanceTransaction = balanceTransaction;
      } else if (request.paymentMethod === 'pix') {
        // Create PIX payment
        const pixPayment = await this.paymentService.createPIXPayment({
          amount: cost!,
          description: `Machine usage - ${request.duration} minutes`,
          externalReference: `session_${session.id}`,
          payerEmail: user!.email
        });
        
        // Store payment ID in session
        await this.usageSessionRepo.update(session.id, {
          paymentId: pixPayment.id
        }, client);
        
        // Update session object with paymentId
        session.paymentId = pixPayment.id;
        
        paymentResult.pixPayment = pixPayment;
      }

      await client.query('COMMIT');

      // Broadcast real-time session update
      webSocketService.broadcastSessionUpdate(session);

      return {
        session,
        paymentRequired: Object.keys(paymentResult).length > 0 ? paymentResult : undefined,
        message: request.paymentMethod === 'subscription' 
          ? 'Session created successfully with subscription'
          : 'Session created successfully'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Activates a machine session (starts the machine)
   */
  async activateSession(sessionId: string): Promise<UsageSession> {
    const session = await this.usageSessionRepo.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'pending') {
      throw new Error(`Cannot activate session with status: ${session.status}`);
    }

    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Update session to active
      const startTime = new Date();
      const updatedSession = await this.usageSessionRepo.startSession(sessionId, startTime, client);
      
      if (!updatedSession) {
        throw new Error('Failed to start session');
      }

      // Update machine status to in_use
      await this.machineRepo.updateStatus(session.machineId, 'in_use', client);

      await client.query('COMMIT');

      // Send MQTT activation command (after commit to ensure session is saved)
      await sessionMqttHandler.activateSession(sessionId);

      // Schedule automatic termination
      this.scheduleSessionTermination(sessionId, session.duration);

      // Send session started notification
      await this.notificationService.sendSessionNotification(
        sessionId,
        'session_started',
        `Machine activated for ${session.duration} minutes`
      );

      // Broadcast real-time session update
      webSocketService.broadcastSessionUpdate(updatedSession);

      logger.info(`Session ${sessionId} activated for machine ${session.machineId}`);
      
      return updatedSession;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Terminates a session (stops the machine)
   */
  async terminateSession(sessionId: string): Promise<UsageSession> {
    const session = await this.usageSessionRepo.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'active') {
      throw new Error(`Cannot terminate session with status: ${session.status}`);
    }

    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Calculate actual usage time
      const endTime = new Date();
      const startTime = session.startTime || session.createdAt;
      const actualMinutesUsed = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      const plannedMinutes = session.duration;
      
      logger.info(`Session ${sessionId} - Planned: ${plannedMinutes}min, Actual: ${actualMinutesUsed}min (No refund - user paid for ${plannedMinutes}min)`);

      // Update session to completed
      const updatedSession = await this.usageSessionRepo.endSession(sessionId, endTime, client);
      
      if (!updatedSession) {
        throw new Error('Failed to end session');
      }

      // Update machine status back to online
      await this.machineRepo.updateStatus(session.machineId, 'online', client);

      // Increment machine operating hours with ACTUAL time used (not planned duration)
      await this.machineService.incrementOperatingHours(session.machineId, actualMinutesUsed, client);

      await client.query('COMMIT');

      // Send MQTT deactivation command (after commit)
      await sessionMqttHandler.terminateSession(sessionId);

      // Send session completed notification
      await this.notificationService.sendSessionNotification(
        sessionId,
        'session_completed',
        'Session completed successfully'
      );

      // Broadcast real-time session update
      webSocketService.broadcastSessionUpdate(updatedSession);

      logger.info(`Session ${sessionId} terminated for machine ${session.machineId} - Actual usage: ${actualMinutesUsed}min of ${plannedMinutes}min paid`);
      
      return updatedSession;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Schedules automatic session termination
   */
  private scheduleSessionTermination(sessionId: string, durationMinutes: number): void {
    const timeoutMs = durationMinutes * 60 * 1000; // Convert minutes to milliseconds
    
    // Send warning notification 1 minute before termination
    const warningTimeoutMs = Math.max(0, timeoutMs - 60000); // 1 minute before
    if (warningTimeoutMs > 0) {
      setTimeout(async () => {
        try {
          const session = await this.usageSessionRepo.findById(sessionId);
          if (session && session.status === 'active') {
            await this.notificationService.sendSessionNotification(
              sessionId,
              'session_ending',
              'Session will end in 1 minute'
            );
          }
        } catch (error) {
          logger.error(`Failed to send session warning for ${sessionId}:`, error);
        }
      }, warningTimeoutMs);
    }

    setTimeout(async () => {
      try {
        const session = await this.usageSessionRepo.findById(sessionId);
        if (session && session.status === 'active') {
          await this.terminateSession(sessionId);
          logger.info(`Auto-terminated session ${sessionId} after ${durationMinutes} minutes`);
        }
      } catch (error) {
        logger.error(`Failed to auto-terminate session ${sessionId}:`, error);
      }
    }, timeoutMs);
  }

  /**
   * Gets active session for a machine
   */
  async getActiveSession(machineId: string): Promise<UsageSession | null> {
    return await this.usageSessionRepo.findActiveSession(machineId);
  }

  /**
   * Gets user's session history
   */
  async getUserSessions(userId: string, limit = 50, offset = 0): Promise<UsageSession[]> {
    return await this.usageSessionRepo.findByUserId(userId, { limit, offset });
  }

  /**
   * Gets machine's session history
   */
  async getMachineSessions(machineId: string, limit = 50, offset = 0): Promise<UsageSession[]> {
    return await this.usageSessionRepo.findByMachineId(machineId, { limit, offset });
  }

  /**
   * Gets all active sessions
   */
  async getActiveSessions(): Promise<UsageSession[]> {
    return await this.usageSessionRepo.findByStatus('active');
  }

  /**
   * Handles payment confirmation for PIX payments
   */
  async confirmPayment(sessionId: string, paymentId: string): Promise<UsageSession> {
    const session = await this.usageSessionRepo.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    logger.info('Confirming payment:', { 
      sessionId, 
      sessionPaymentId: session.paymentId, 
      providedPaymentId: paymentId 
    });

    if (session.paymentId !== paymentId) {
      throw new Error(`Payment ID mismatch: session has ${session.paymentId}, provided ${paymentId}`);
    }

    // Check payment status with Mercado Pago
    const paymentStatus = await this.paymentService.checkPIXPaymentStatus(paymentId);
    
    if (paymentStatus.status !== 'approved') {
      throw new Error(`Payment not approved. Current status: ${paymentStatus.status}`);
    }

    // Activate the session (payment is confirmed)
    return await this.activateSession(sessionId);
  }

  /**
   * Cancels a pending session
   */
  async cancelSession(sessionId: string): Promise<UsageSession> {
    const session = await this.usageSessionRepo.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'pending') {
      throw new Error(`Cannot cancel session with status: ${session.status}`);
    }

    const updatedSession = await this.usageSessionRepo.updateStatus(sessionId, 'failed');
    if (!updatedSession) {
      throw new Error('Failed to cancel session');
    }

    // Broadcast real-time session update
    webSocketService.broadcastSessionUpdate(updatedSession);

    logger.info(`Session ${sessionId} cancelled`);
    
    return updatedSession;
  }

  /**
   * Gets session statistics
   */
  async getSessionStats(): Promise<{
    total: number;
    pending: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [pending, active, completed, failed] = await Promise.all([
      this.usageSessionRepo.findByStatus('pending'),
      this.usageSessionRepo.findByStatus('active'),
      this.usageSessionRepo.findByStatus('completed'),
      this.usageSessionRepo.findByStatus('failed')
    ]);

    return {
      total: pending.length + active.length + completed.length + failed.length,
      pending: pending.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };
  }
}

export const usageSessionService = new UsageSessionService();
