import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { requireAuth, requireAdmin } from '../auth/middleware.js';
import { PostgresUserRepository } from '../repositories/user.js';
import { PostgresMachineRepository } from '../repositories/machine.js';
import { PostgresUsageSessionRepository } from '../repositories/usageSession.js';
import { PostgresTransactionRepository } from '../repositories/transaction.js';
import { PostgresMaintenanceLogRepository } from '../repositories/maintenanceLog.js';
import { createLogger } from '../utils/logger.js';
import { auditOperations, auditMiddleware, AuditEventType } from '../middleware/auditLog.js';
import { requireRecentAuth } from '../auth/sessionSecurity.js';

const router = express.Router();
const logger = createLogger('admin-routes');

const userRepository = new PostgresUserRepository();
const machineRepository = new PostgresMachineRepository();
const sessionRepository = new PostgresUsageSessionRepository();
const transactionRepository = new PostgresTransactionRepository();
const maintenanceLogRepository = new PostgresMaintenanceLogRepository();

// Apply auth middleware to all admin routes
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/dashboard/metrics
 * Get dashboard metrics for admin overview
 */
router.get('/dashboard/metrics', async (_req: express.Request, res: express.Response) => {
  try {
    // Get machine counts by status
    const machines = await machineRepository.findAll();
    const totalMachines = machines.length;
    const onlineMachines = machines.filter(m => m.status === 'online').length;
    const maintenanceMachines = machines.filter(m => m.status === 'maintenance').length;
    const inUseMachines = machines.filter(m => m.status === 'in_use').length;

    // Get revenue data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todaySessions = await sessionRepository.findByDateRange(today, todayEnd);
    const todayRevenue = todaySessions
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + s.cost, 0);

    const allCompletedSessions = await sessionRepository.findByStatus('completed');
    const totalRevenue = allCompletedSessions.reduce((sum, s) => sum + s.cost, 0);

    // Get active sessions count
    const activeSessions = await sessionRepository.findByStatus('active');

    // Get total customers count
    const allUsers = await userRepository.findAll();
    const totalCustomers = allUsers.filter(u => u.role === 'customer').length;

    const metrics = {
      totalMachines,
      onlineMachines,
      maintenanceMachines,
      inUseMachines,
      totalRevenue,
      todayRevenue,
      activeSessions: activeSessions.length,
      totalCustomers,
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

/**
 * GET /api/admin/machines/status
 * Get real-time machine status for monitoring
 */
router.get('/machines/status', async (_req: express.Request, res: express.Response) => {
  try {
    const machines = await machineRepository.findAll();
    
    const machineStatus = machines.map(machine => ({
      id: machine.id,
      code: machine.code,
      location: machine.location,
      status: machine.status,
      temperature: machine.temperature,
      currentOperatingHours: machine.currentOperatingHours,
      lastHeartbeat: machine.lastHeartbeat?.toISOString(),
    }));

    res.json(machineStatus);
  } catch (error) {
    logger.error('Error fetching machine status:', error);
    res.status(500).json({ error: 'Failed to fetch machine status' });
  }
});

/**
 * GET /api/admin/sessions/active
 * Get all active sessions for real-time monitoring
 */
router.get('/sessions/active', async (_req: express.Request, res: express.Response) => {
  try {
    const activeSessions = await sessionRepository.findByStatus('active');
    
    // Enrich with user and machine information
    const enrichedSessions = await Promise.all(
      activeSessions.map(async (session) => {
        const [user, machine] = await Promise.all([
          userRepository.findById(session.userId),
          machineRepository.findById(session.machineId)
        ]);

        const startTime = session.startTime || session.createdAt;
        const endTime = new Date(startTime.getTime() + session.duration * 60 * 1000);
        const now = new Date();
        const timeRemaining = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
        const progress = Math.min(100, Math.max(0, ((now.getTime() - startTime.getTime()) / (session.duration * 60 * 1000)) * 100));

        return {
          id: session.id,
          userId: session.userId,
          userName: user?.name || 'Unknown',
          userEmail: user?.email || 'Unknown',
          machineId: session.machineId,
          machineCode: machine?.code || 'Unknown',
          machineLocation: machine?.location || 'Unknown',
          duration: session.duration,
          cost: session.cost,
          paymentMethod: session.paymentMethod,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          timeRemaining,
          progress: Math.round(progress),
          status: session.status
        };
      })
    );

    res.json(enrichedSessions);
  } catch (error) {
    logger.error('Error fetching active sessions:', error);
    res.status(500).json({ error: 'Failed to fetch active sessions' });
  }
});

/**
 * GET /api/admin/machines
 * Get all machines for registry management
 */
router.get('/machines', async (_req: express.Request, res: express.Response) => {
  try {
    const machines = await machineRepository.findAll();
    res.json(machines);
  } catch (error) {
    logger.error('Error fetching machines:', error);
    res.status(500).json({ error: 'Failed to fetch machines' });
  }
});

/**
 * POST /api/admin/machines
 * Register a new machine
 */
router.post('/machines', [
  body('code').isString().isLength({ min: 1, max: 50 }),
  body('location').isString().isLength({ min: 1, max: 255 }),
  body('controllerId').isString().isLength({ min: 1, max: 100 }),
  body('operatingHours.start').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('operatingHours.end').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('maintenanceInterval').isInt({ min: 1 }),
  body('pricePerMinute').optional().isFloat({ min: 0.01, max: 100 }),
  body('maxDurationMinutes').optional().isInt({ min: 1, max: 120 }),
  body('powerConsumptionWatts').optional().isInt({ min: 1, max: 10000 }),
  body('kwhRate').optional().isFloat({ min: 0.01, max: 10 }),
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { code, location, controllerId, operatingHours, maintenanceInterval, pricePerMinute, maxDurationMinutes, powerConsumptionWatts, kwhRate } = req.body;

    // Check if machine code already exists
    const existingMachine = await machineRepository.findByCode(code);
    if (existingMachine) {
      res.status(409).json({ error: 'Machine code already exists' });
      return;
    }

    // Generate QR code (base64 encoded SVG)
    const QRCode = await import('qrcode');
    const qrCodeUrl = `${process.env.FRONTEND_URL}/machine/${code}`;
    const qrCode = await QRCode.toString(qrCodeUrl, { type: 'svg' });
    const qrCodeBase64 = Buffer.from(qrCode).toString('base64');

    const machineData = {
      code,
      qrCode: qrCodeBase64,
      location,
      controllerId,
      operatingHours,
      maintenanceInterval,
      pricePerMinute,
      maxDurationMinutes,
      powerConsumptionWatts,
      kwhRate,
    };

    const machine = await machineRepository.create(machineData);
    res.status(201).json(machine);
  } catch (error) {
    logger.error('Error creating machine:', error);
    res.status(500).json({ error: 'Failed to create machine' });
  }
});

/**
 * GET /api/admin/machines/:id/stats
 * Get detailed statistics for a specific machine
 */
router.get('/machines/:id/stats', [
  param('id').isUUID(),
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { id } = req.params;

    const machine = await machineRepository.findById(id);
    if (!machine) {
      res.status(404).json({ error: 'Machine not found' });
      return;
    }

    // Get all sessions for this machine
    const allSessions = await sessionRepository.findByMachineId(id);
    const completedSessions = allSessions.filter(s => s.status === 'completed');

    // Calculate statistics
    const totalActivations = completedSessions.length;
    const totalUsageMinutes = completedSessions.reduce((sum, s) => sum + s.duration, 0);
    const totalRevenue = completedSessions.reduce((sum, s) => sum + s.cost, 0);
    
    // Calculate energy consumption based on machine's actual power rating
    const powerConsumptionWatts = machine.powerConsumptionWatts;
    const kwhRate = machine.kwhRate;
    const totalUsageHours = totalUsageMinutes / 60;
    const totalWattageConsumption = powerConsumptionWatts * totalUsageHours; // Watt-hours
    const totalKwhConsumption = totalWattageConsumption / 1000; // Convert to kWh

    // Get last cleaning date from maintenance logs or machine record
    const lastCleaningLog = await maintenanceLogRepository.findLatestByMachineIdAndType(id, 'cleaning');
    const lastCleaning = lastCleaningLog?.createdAt || machine.lastCleaningDate || machine.createdAt;

    // Calculate days since last cleaning
    const daysSinceLastCleaning = Math.floor((Date.now() - lastCleaning.getTime()) / (1000 * 60 * 60 * 24));

    // Get all maintenance logs for this machine
    const maintenanceLogs = await maintenanceLogRepository.findByMachineId(id);

    // Get recent sessions (last 10)
    const recentSessions = await Promise.all(
      completedSessions
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10)
        .map(async (session) => {
          const user = await userRepository.findById(session.userId);
          return {
            id: session.id,
            userName: user?.name || 'Unknown',
            duration: session.duration,
            cost: session.cost,
            date: session.createdAt.toISOString(),
          };
        })
    );

    // Usage by day of week
    const usageByDayOfWeek = new Map<number, number>();
    completedSessions.forEach(session => {
      const dayOfWeek = session.createdAt.getDay();
      usageByDayOfWeek.set(dayOfWeek, (usageByDayOfWeek.get(dayOfWeek) || 0) + 1);
    });

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const usageByDay = Array.from(usageByDayOfWeek.entries())
      .map(([day, count]) => ({
        day: dayNames[day],
        sessions: count,
      }))
      .sort((a, b) => dayNames.indexOf(a.day) - dayNames.indexOf(b.day));

    // Calculate average session duration
    const averageSessionDuration = totalActivations > 0 
      ? totalUsageMinutes / totalActivations 
      : 0;

    // Calculate utilization rate (percentage of operating hours used)
    const operatingHoursPerDay = (() => {
      const [startHour, startMin] = machine.operatingHours.start.split(':').map(Number);
      const [endHour, endMin] = machine.operatingHours.end.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      return (endMinutes - startMinutes) / 60;
    })();

    const daysInOperation = Math.max(1, Math.floor((Date.now() - machine.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    const totalAvailableHours = operatingHoursPerDay * daysInOperation;
    const utilizationRate = totalAvailableHours > 0 
      ? (totalUsageHours / totalAvailableHours) * 100 
      : 0;

    const stats = {
      machine: {
        id: machine.id,
        code: machine.code,
        location: machine.location,
        status: machine.status,
        pricePerMinute: machine.pricePerMinute,
        maxDurationMinutes: machine.maxDurationMinutes,
        createdAt: machine.createdAt.toISOString(),
      },
      usage: {
        totalActivations,
        totalUsageMinutes,
        totalUsageHours: parseFloat(totalUsageHours.toFixed(2)),
        averageSessionDuration: parseFloat(averageSessionDuration.toFixed(2)),
        utilizationRate: parseFloat(utilizationRate.toFixed(2)),
      },
      revenue: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        averageRevenuePerSession: totalActivations > 0 
          ? parseFloat((totalRevenue / totalActivations).toFixed(2)) 
          : 0,
      },
      maintenance: {
        currentOperatingHours: machine.currentOperatingHours,
        maintenanceInterval: machine.maintenanceInterval,
        hoursUntilMaintenance: Math.max(0, machine.maintenanceInterval - machine.currentOperatingHours),
        lastCleaning: lastCleaning.toISOString(),
        daysSinceLastCleaning,
        maintenanceRequired: machine.currentOperatingHours >= machine.maintenanceInterval,
      },
      energy: {
        totalKwhConsumption: parseFloat(totalKwhConsumption.toFixed(2)),
        powerConsumptionWatts,
        kwhRate,
        totalEnergyCost: parseFloat((totalKwhConsumption * kwhRate).toFixed(2)),
      },
      maintenanceLogs: maintenanceLogs.slice(0, 10).map(log => ({
        id: log.id,
        type: log.type,
        description: log.description,
        cost: log.cost,
        partsReplaced: log.partsReplaced,
        date: log.createdAt.toISOString(),
      })),
      recentSessions,
      usageByDay,
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching machine stats:', error);
    res.status(500).json({ error: 'Failed to fetch machine statistics' });
  }
});

/**
 * PUT /api/admin/machines/:id
 * Update machine configuration
 */
router.put('/machines/:id', [
  param('id').isUUID(),
  body('location').optional().isString().isLength({ min: 1, max: 255 }),
  body('status').optional().isIn(['online', 'offline', 'maintenance']),
  body('operatingHours.start').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('operatingHours.end').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('maintenanceInterval').optional().isInt({ min: 1 }),
  body('pricePerMinute').optional().isFloat({ min: 0.01, max: 100 }),
  body('maxDurationMinutes').optional().isInt({ min: 1, max: 120 }),
  body('powerConsumptionWatts').optional().isInt({ min: 1, max: 10000 }),
  body('kwhRate').optional().isFloat({ min: 0.01, max: 10 }),
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error('Machine update validation failed:', { errors: errors.array(), body: req.body });
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { id } = req.params;
    const updateData = req.body;

    const machine = await machineRepository.findById(id);
    if (!machine) {
      res.status(404).json({ error: 'Machine not found' });
      return;
    }

    const updatedMachine = await machineRepository.update(id, updateData);
    res.json(updatedMachine);
  } catch (error) {
    logger.error('Error updating machine:', error);
    res.status(500).json({ error: 'Failed to update machine' });
  }
});

/**
 * GET /api/admin/customers
 * Get customers with optional search
 */
router.get('/customers', [
  query('search').optional().isString().isLength({ max: 255 }),
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { search } = req.query;
    let customers;

    if (search) {
      customers = await userRepository.searchByNameOrEmail(search as string);
    } else {
      customers = await userRepository.findAll();
    }

    // Filter out admin users from customer list
    const customerUsers = customers.filter(user => user.role === 'customer');

    res.json(customerUsers);
  } catch (error) {
    logger.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

/**
 * POST /api/admin/customers/:id/credit
 * Add credit to customer account
 */
router.post('/customers/:id/credit', [
  auditMiddleware(AuditEventType.USER_BALANCE_MODIFIED, { riskLevel: 'CRITICAL', resourceType: 'user_balance' }),
  param('id').isUUID(),
  body('amount').isFloat({ min: 0.01 }),
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { id } = req.params;
    const { amount } = req.body;

    const customer = await userRepository.findById(id);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const oldBalance = customer.accountBalance;
    const newBalance = oldBalance + amount;

    // Audit log balance modification
    auditOperations.balanceModified(req, id, oldBalance, newBalance, 'Admin credit addition');

    // Update customer balance
    await userRepository.update(id, { accountBalance: newBalance });

    // Create transaction record
    const transaction = await transactionRepository.create({
      userId: id,
      type: 'credit_added',
      amount,
      paymentMethod: 'admin_credit',
    });

    // Update transaction status to completed
    await transactionRepository.update(transaction.id, { status: 'completed' });

    res.json({ message: 'Credit added successfully', newBalance });
  } catch (error) {
    logger.error('Error adding credit:', error);
    res.status(500).json({ error: 'Failed to add credit' });
  }
});

/**
 * GET /api/admin/customers/:id/usage
 * Get customer usage history
 */
router.get('/customers/:id/usage', [
  param('id').isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const customer = await userRepository.findById(id);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    let sessions;
    if (startDate && endDate) {
      sessions = await sessionRepository.findByUserIdAndDateRange(
        id,
        new Date(startDate as string),
        new Date(endDate as string)
      );
    } else {
      sessions = await sessionRepository.findByUserId(id);
    }

    // Enrich with machine information
    const enrichedSessions = await Promise.all(
      sessions.map(async (session) => {
        const machine = await machineRepository.findById(session.machineId);
        return {
          id: session.id,
          customerName: customer.name,
          machineCode: machine?.code || 'Unknown',
          machineLocation: machine?.location || 'Unknown',
          duration: session.duration,
          cost: session.cost,
          paymentMethod: session.paymentMethod,
          status: session.status,
          createdAt: session.createdAt.toISOString(),
          startTime: session.startTime?.toISOString(),
          endTime: session.endTime?.toISOString(),
        };
      })
    );

    res.json(enrichedSessions);
  } catch (error) {
    logger.error('Error fetching usage history:', error);
    res.status(500).json({ error: 'Failed to fetch usage history' });
  }
});

/**
 * POST /api/admin/machines/:id/maintenance
 * Log a maintenance activity for a machine
 */
router.post('/machines/:id/maintenance', [
  param('id').isUUID(),
  body('type').isIn(['cleaning', 'repair', 'inspection', 'part_replacement', 'other']),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('cost').optional().isFloat({ min: 0 }),
  body('partsReplaced').optional().isArray(),
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { id } = req.params;
    const { type, description, cost, partsReplaced } = req.body;
    const userId = (req as any).user?.id;

    const machine = await machineRepository.findById(id);
    if (!machine) {
      res.status(404).json({ error: 'Machine not found' });
      return;
    }

    // Create maintenance log
    const maintenanceLog = await maintenanceLogRepository.create({
      machineId: id,
      type,
      performedBy: userId,
      description,
      cost,
      partsReplaced,
    });

    // Update machine's last maintenance/cleaning date
    const updateData: any = {
      lastMaintenanceDate: new Date(),
    };

    if (type === 'cleaning') {
      updateData.lastCleaningDate = new Date();
      // Reset operating hours after cleaning
      updateData.currentOperatingHours = 0;
      updateData.status = 'online';
    }

    await machineRepository.update(id, updateData);

    logger.info(`Maintenance logged for machine ${machine.code}: ${type}`);
    
    res.status(201).json({ 
      message: 'Maintenance logged successfully',
      maintenanceLog 
    });
  } catch (error) {
    logger.error('Error logging maintenance:', error);
    res.status(500).json({ error: 'Failed to log maintenance' });
  }
});

/**
 * GET /api/admin/machines/:id/maintenance
 * Get maintenance history for a machine
 */
router.get('/machines/:id/maintenance', [
  param('id').isUUID(),
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { id } = req.params;

    const machine = await machineRepository.findById(id);
    if (!machine) {
      res.status(404).json({ error: 'Machine not found' });
      return;
    }

    const maintenanceLogs = await maintenanceLogRepository.findByMachineId(id);

    // Enrich with user information
    const enrichedLogs = await Promise.all(
      maintenanceLogs.map(async (log) => {
        let performedByName = 'System';
        if (log.performedBy) {
          const user = await userRepository.findById(log.performedBy);
          performedByName = user?.name || 'Unknown';
        }

        return {
          id: log.id,
          type: log.type,
          performedBy: performedByName,
          description: log.description,
          cost: log.cost,
          partsReplaced: log.partsReplaced,
          nextMaintenanceDue: log.nextMaintenanceDue?.toISOString(),
          createdAt: log.createdAt.toISOString(),
        };
      })
    );

    res.json(enrichedLogs);
  } catch (error) {
    logger.error('Error fetching maintenance history:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance history' });
  }
});

/**
 * DELETE /api/admin/machines/:id
 * Delete a machine
 */
router.delete('/machines/:id', [
  param('id').isUUID(),
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { id } = req.params;

    const machine = await machineRepository.findById(id);
    if (!machine) {
      res.status(404).json({ error: 'Machine not found' });
      return;
    }

    const deleted = await machineRepository.delete(id);
    if (!deleted) {
      res.status(500).json({ error: 'Failed to delete machine' });
      return;
    }

    logger.info(`Machine deleted: ${machine.code} from ${machine.location}`);
    
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting machine:', error);
    res.status(500).json({ error: 'Failed to delete machine' });
  }
});

/**
 * POST /api/admin/machines/:id/regenerate-qr
 * Regenerate QR code for a machine
 */
router.post('/machines/:id/regenerate-qr', [
  param('id').isUUID(),
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { id } = req.params;

    const machine = await machineRepository.findById(id);
    if (!machine) {
      res.status(404).json({ error: 'Machine not found' });
      return;
    }

    // Generate QR code
    const QRCode = await import('qrcode');
    const qrCodeUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/machine/${machine.code}`;
    const qrCode = await QRCode.toString(qrCodeUrl, { 
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    const qrCodeBase64 = Buffer.from(qrCode).toString('base64');

    // Update machine with new QR code
    await machineRepository.update(id, { qrCode: qrCodeBase64 } as any);

    logger.info(`QR code regenerated for machine ${machine.code}`);
    
    res.json({ message: 'QR code regenerated successfully', qrCode: qrCodeBase64 });
  } catch (error) {
    logger.error('Error regenerating QR code:', error);
    res.status(500).json({ error: 'Failed to regenerate QR code' });
  }
});

/**
 * GET /api/admin/analytics
 * Get analytics data for the specified date range
 */
router.get('/analytics', [
  query('startDate').isISO8601(),
  query('endDate').isISO8601(),
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Validation failed', details: errors.array() });
      return;
    }

    const { startDate, endDate } = req.query;
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Get sessions in date range
    const sessions = await sessionRepository.findByDateRange(start, end);
    const completedSessions = sessions.filter(s => s.status === 'completed');

    // Calculate basic metrics
    const totalRevenue = completedSessions.reduce((sum, s) => sum + s.cost, 0);
    const totalSessions = completedSessions.length;
    const averageSessionDuration = totalSessions > 0 
      ? completedSessions.reduce((sum, s) => sum + s.duration, 0) / totalSessions 
      : 0;

    // Get unique customers in period
    const uniqueCustomers = new Set(completedSessions.map(s => s.userId));
    const totalCustomers = uniqueCustomers.size;

    // Revenue by machine
    const machineRevenue = new Map<string, { revenue: number; sessions: number; machine: any }>();
    
    for (const session of completedSessions) {
      const machine = await machineRepository.findById(session.machineId);
      if (machine) {
        const key = machine.id;
        const current = machineRevenue.get(key) || { revenue: 0, sessions: 0, machine };
        machineRevenue.set(key, {
          revenue: current.revenue + session.cost,
          sessions: current.sessions + 1,
          machine,
        });
      }
    }

    const revenueByMachine = Array.from(machineRevenue.values()).map(item => ({
      machineCode: item.machine.code,
      location: item.machine.location,
      revenue: item.revenue,
      sessions: item.sessions,
    }));

    // Revenue by day
    const dailyRevenue = new Map<string, { revenue: number; sessions: number }>();
    
    for (const session of completedSessions) {
      const dateKey = session.createdAt.toISOString().split('T')[0];
      const current = dailyRevenue.get(dateKey) || { revenue: 0, sessions: 0 };
      dailyRevenue.set(dateKey, {
        revenue: current.revenue + session.cost,
        sessions: current.sessions + 1,
      });
    }

    const revenueByDay = Array.from(dailyRevenue.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      sessions: data.sessions,
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Peak usage hours
    const hourlyUsage = new Map<number, number>();
    
    for (const session of completedSessions) {
      if (session.startTime) {
        const hour = session.startTime.getHours();
        hourlyUsage.set(hour, (hourlyUsage.get(hour) || 0) + 1);
      }
    }

    const peakUsageHours = Array.from(hourlyUsage.entries())
      .map(([hour, sessions]) => ({ hour, sessions }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 6);

    // Customer activity
    const customerActivity = new Map<string, { sessions: number; spent: number; lastActivity: Date; user: any }>();
    
    for (const session of completedSessions) {
      const userId = session.userId;
      const current = customerActivity.get(userId) || { 
        sessions: 0, 
        spent: 0, 
        lastActivity: session.createdAt,
        user: null 
      };
      
      if (!current.user) {
        current.user = await userRepository.findById(userId);
      }
      
      customerActivity.set(userId, {
        sessions: current.sessions + 1,
        spent: current.spent + session.cost,
        lastActivity: session.createdAt > current.lastActivity ? session.createdAt : current.lastActivity,
        user: current.user,
      });
    }

    const topCustomers = Array.from(customerActivity.values())
      .filter(item => item.user)
      .map(item => ({
        customerId: item.user.id,
        customerName: item.user.name,
        totalSessions: item.sessions,
        totalSpent: item.spent,
        lastActivity: item.lastActivity.toISOString(),
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    const analytics = {
      totalRevenue,
      totalSessions,
      totalCustomers,
      averageSessionDuration,
      revenueByMachine,
      revenueByDay,
      peakUsageHours,
      customerActivity: topCustomers,
    };

    res.json(analytics);
  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/admin/reports/export
 * Export reports as PDF
 */
router.get('/reports/export',
  query('type').isIn(['revenue', 'usage', 'customers', 'consolidated']),
  query('startDate').isISO8601(),
  query('endDate').isISO8601(),
  query('machineId').optional().isUUID(),
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const { type, startDate, endDate, machineId } = req.query;
      const { PDFGenerator } = await import('../services/pdfGenerator.js');
      const { ReportsRepository } = await import('../repositories/reports.js');

      if (type === 'consolidated') {
        // Generate consolidated report
        const data = await ReportsRepository.getConsolidatedReportData({
          startDate: startDate as string,
          endDate: endDate as string,
        });

        const pdfStream = PDFGenerator.generateConsolidatedReport(data);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio-consolidado-${startDate}-${endDate}.pdf`);
        
        pdfStream.pipe(res);
      } else if (machineId) {
        // Generate individual machine report
        const data = await ReportsRepository.getMachineReportData(machineId as string, {
          startDate: startDate as string,
          endDate: endDate as string,
        });

        const pdfStream = PDFGenerator.generateMachineReport(data);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio-${data.machine.code}-${startDate}-${endDate}.pdf`);
        
        pdfStream.pipe(res);
      } else {
        res.status(400).json({
          success: false,
          error: 'machineId is required for individual reports',
        });
      }
    } catch (error: any) {
      logger.error('Error generating report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate report',
        details: error.message,
      });
    }
  }
);

/**
 * GET /api/admin/reports/export-all-machines
 * Export individual reports for all machines (ZIP file)
 */
router.get('/reports/export-all-machines',
  query('startDate').isISO8601(),
  query('endDate').isISO8601(),
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const { startDate, endDate } = req.query;
      const { PDFGenerator } = await import('../services/pdfGenerator.js');
      const { ReportsRepository } = await import('../repositories/reports.js');
      const archiver = (await import('archiver')).default;

      const machineIds = await ReportsRepository.getAllMachineIds();

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=relatorios-maquinas-${startDate}-${endDate}.zip`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);

      for (const machineId of machineIds) {
        try {
          const data = await ReportsRepository.getMachineReportData(machineId, {
            startDate: startDate as string,
            endDate: endDate as string,
          });

          const pdfStream = PDFGenerator.generateMachineReport(data);
          archive.append(pdfStream, { name: `relatorio-${data.machine.code}.pdf` });
        } catch (error) {
          logger.error(`Error generating report for machine ${machineId}:`, error);
        }
      }

      await archive.finalize();
    } catch (error: any) {
      logger.error('Error generating machine reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate machine reports',
        details: error.message,
      });
    }
  }
);

export default router;
