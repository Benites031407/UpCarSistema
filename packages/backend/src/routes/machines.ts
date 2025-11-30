import express from 'express';
import { body, param, validationResult } from 'express-validator';
import QRCode from 'qrcode';
import { PostgresMachineRepository } from '../repositories/machine.js';
import { authenticateToken, requireAuth, requireAdmin } from '../auth/middleware.js';
import { machineService } from '../services/machineService.js';
import { webSocketService } from '../services/websocketService.js';
import { createLogger } from '../utils/logger.js';

const router = express.Router();
const machineRepo = new PostgresMachineRepository();
const logger = createLogger('machines');

// Validation middleware
const validateMachineRegistration = [
  body('location').isString().isLength({ min: 1, max: 255 }).withMessage('Location is required and must be between 1-255 characters'),
  body('controllerId').isString().isLength({ min: 1, max: 100 }).withMessage('Controller ID is required and must be between 1-100 characters'),
  body('operatingHours.start').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
  body('operatingHours.end').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
  body('maintenanceInterval').isInt({ min: 1 }).withMessage('Maintenance interval must be a positive integer (hours)'),
  body('pricePerMinute').optional().isFloat({ min: 0.01, max: 100 }).withMessage('Price per minute must be between 0.01 and 100 BRL'),
  body('maxDurationMinutes').optional().isInt({ min: 1, max: 120 }).withMessage('Max duration must be between 1 and 120 minutes'),
  body('powerConsumptionWatts').optional().isInt({ min: 1, max: 10000 }).withMessage('Power consumption must be between 1 and 10000 watts'),
  body('kwhRate').optional().isFloat({ min: 0.01, max: 10 }).withMessage('kWh rate must be between 0.01 and 10 BRL')
];

const validateMachineUpdate = [
  body('location').optional().isString().isLength({ min: 1, max: 255 }).withMessage('Location must be between 1-255 characters'),
  body('status').optional().isIn(['online', 'offline', 'maintenance', 'in_use']).withMessage('Invalid status'),
  body('operatingHours.start').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
  body('operatingHours.end').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
  body('maintenanceInterval').optional().isInt({ min: 1 }).withMessage('Maintenance interval must be a positive integer (hours)'),
  body('pricePerMinute').optional().isFloat({ min: 0.01, max: 100 }).withMessage('Price per minute must be between 0.01 and 100 BRL'),
  body('maxDurationMinutes').optional().isInt({ min: 1, max: 120 }).withMessage('Max duration must be between 1 and 120 minutes'),
  body('powerConsumptionWatts').optional().isInt({ min: 1, max: 10000 }).withMessage('Power consumption must be between 1 and 10000 watts'),
  body('kwhRate').optional().isFloat({ min: 0.01, max: 10 }).withMessage('kWh rate must be between 0.01 and 10 BRL')
];

// Helper function to generate unique machine code
async function generateUniqueCode(): Promise<string> {
  let code: string;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    // Generate 6-character alphanumeric code
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    attempts++;
    
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique machine code');
    }
  } while (await machineRepo.findByCode(code));
  
  return code;
}

// Helper function to generate QR code
async function generateQRCode(machineCode: string): Promise<string> {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const qrData = `${baseUrl}/machine/${machineCode}`;
  
  try {
    return await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  } catch (error) {
    logger.error('Failed to generate QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

// GET /api/machines - List all machines with filtering and pagination
router.get('/', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { 
      status, 
      location, 
      limit = '50', 
      offset = '0' 
    } = req.query;

    let machines;

    if (status && typeof status === 'string') {
      if (!['online', 'offline', 'maintenance', 'in_use'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status filter' });
      }
      machines = await machineRepo.findByStatus(status as any);
    } else if (location && typeof location === 'string') {
      machines = await machineRepo.findByLocation(location);
    } else {
      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);
      
      if (isNaN(limitNum) || isNaN(offsetNum) || limitNum < 1 || limitNum > 100 || offsetNum < 0) {
        return res.status(400).json({ error: 'Invalid pagination parameters' });
      }
      
      machines = await machineRepo.findAll(limitNum, offsetNum);
    }

    res.json({ machines });
  } catch (error) {
    logger.error('Error fetching machines:', error);
    res.status(500).json({ error: 'Failed to fetch machines' });
  }
});

// GET /api/machines/:id - Get machine by ID
router.get('/:id', authenticateToken, requireAuth, param('id').isUUID().withMessage('Invalid machine ID'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const machine = await machineRepo.findById(req.params.id);
    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    res.json({ machine });
  } catch (error) {
    logger.error('Error fetching machine:', error);
    res.status(500).json({ error: 'Failed to fetch machine' });
  }
});

// GET /api/machines/code/:code - Get machine by code (for customer access)
router.get('/code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    // Enhanced machine code validation per Requirement 1.3
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: 'Machine code is required. Please scan the QR code or enter the 6-character code.',
        code: 'MACHINE_CODE_REQUIRED'
      });
    }

    const sanitizedCode = code.trim().toUpperCase();
    
    if (sanitizedCode.length !== 6) {
      return res.status(400).json({ 
        success: false,
        error: sanitizedCode.length < 6 
          ? `Machine code is too short. Please enter all 6 characters (you entered ${sanitizedCode.length}).`
          : `Machine code is too long. Please enter exactly 6 characters (you entered ${sanitizedCode.length}).`,
        code: 'INVALID_MACHINE_CODE_LENGTH'
      });
    }

    if (!/^[A-Z0-9]+$/.test(sanitizedCode)) {
      const invalidChars = sanitizedCode.match(/[^A-Z0-9]/g);
      return res.status(400).json({ 
        success: false,
        error: `Machine code contains invalid characters: ${invalidChars?.join(', ')}. Only letters and numbers are allowed.`,
        code: 'INVALID_MACHINE_CODE_FORMAT'
      });
    }

    // Check for common confusing characters
    if (sanitizedCode.includes('O') || sanitizedCode.includes('I')) {
      return res.status(400).json({ 
        success: false,
        error: 'Machine codes do not contain the letters O or I to avoid confusion with 0 and 1.',
        code: 'INVALID_MACHINE_CODE_CHARACTERS'
      });
    }

    const machine = await machineRepo.findByCode(sanitizedCode);
    if (!machine) {
      return res.status(404).json({ 
        success: false,
        error: 'Machine not found. Please check the code and try again.',
        code: 'MACHINE_NOT_FOUND'
      });
    }

    // Check if machine is available for use
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    const isWithinOperatingHours = currentTime >= machine.operatingHours.start && 
                                  currentTime <= machine.operatingHours.end;

    const availability = {
      available: machine.status === 'online' && isWithinOperatingHours,
      status: machine.status,
      withinOperatingHours: isWithinOperatingHours,
      operatingHours: machine.operatingHours,
      maintenanceRequired: machine.currentOperatingHours >= machine.maintenanceInterval
    };

    res.json({ 
      machine: {
        id: machine.id,
        code: machine.code,
        location: machine.location,
        status: machine.status,
        operatingHours: machine.operatingHours,
        temperature: machine.temperature
      },
      availability 
    });
  } catch (error) {
    logger.error('Error fetching machine by code:', error);
    res.status(500).json({ error: 'Failed to fetch machine' });
  }
});

// POST /api/machines - Register new machine (admin only)
router.post('/', authenticateToken, requireAdmin, validateMachineRegistration, async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { location, controllerId, operatingHours, maintenanceInterval, pricePerMinute, maxDurationMinutes, powerConsumptionWatts, kwhRate } = req.body;

    // Check if controller ID is already in use
    const existingMachine = await machineRepo.findByControllerId(controllerId);
    if (existingMachine) {
      return res.status(400).json({ error: 'Controller ID is already in use' });
    }

    // Validate operating hours
    if (operatingHours.start >= operatingHours.end) {
      return res.status(400).json({ error: 'Start time must be before end time' });
    }

    // Generate unique code and QR code
    const code = await generateUniqueCode();
    const qrCode = await generateQRCode(code);

    const machineData = {
      code,
      qrCode,
      location,
      controllerId,
      operatingHours,
      maintenanceInterval,
      pricePerMinute: pricePerMinute || 1.00,
      maxDurationMinutes: maxDurationMinutes || 30,
      powerConsumptionWatts: powerConsumptionWatts || 1200,
      kwhRate: kwhRate || 0.65
    };

    const machine = await machineRepo.create(machineData);
    
    // Broadcast real-time machine update
    webSocketService.broadcastMachineUpdate(machine);
    
    logger.info(`Machine registered: ${machine.id} (${machine.code}) at ${machine.location}`);
    
    res.status(201).json({ machine });
  } catch (error) {
    logger.error('Error registering machine:', error);
    res.status(500).json({ error: 'Failed to register machine' });
  }
});

// PUT /api/machines/:id - Update machine configuration (admin only)
router.put('/:id', authenticateToken, requireAdmin, param('id').isUUID(), validateMachineUpdate, async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Validate operating hours if provided
    if (updateData.operatingHours && 
        updateData.operatingHours.start >= updateData.operatingHours.end) {
      return res.status(400).json({ error: 'Start time must be before end time' });
    }

    const machine = await machineRepo.update(id, updateData);
    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    // Broadcast real-time machine update
    webSocketService.broadcastMachineUpdate(machine);

    logger.info(`Machine updated: ${machine.id} (${machine.code})`);
    
    res.json({ machine });
  } catch (error) {
    logger.error('Error updating machine:', error);
    res.status(500).json({ error: 'Failed to update machine' });
  }
});

// PATCH /api/machines/:id/status - Update machine status
router.patch('/:id/status', authenticateToken, requireAuth, [
  param('id').isUUID().withMessage('Invalid machine ID'),
  body('status').isIn(['online', 'offline', 'maintenance', 'in_use']).withMessage('Invalid status')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    const machine = await machineRepo.updateStatus(id, status);
    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    // Broadcast real-time machine update
    webSocketService.broadcastMachineUpdate(machine);

    logger.info(`Machine status updated: ${machine.code} -> ${status}`);
    
    res.json({ machine });
  } catch (error) {
    logger.error('Error updating machine status:', error);
    res.status(500).json({ error: 'Failed to update machine status' });
  }
});

// PATCH /api/machines/:id/maintenance-reset - Reset maintenance status (admin only)
router.patch('/:id/maintenance-reset', authenticateToken, requireAdmin, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    // Reset operating hours and set status to online
    const machine = await machineRepo.update(id, {
      currentOperatingHours: 0,
      status: 'online'
    });

    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    // Broadcast real-time machine update
    webSocketService.broadcastMachineUpdate(machine);

    logger.info(`Maintenance reset for machine: ${machine.code}`);
    
    res.json({ machine });
  } catch (error) {
    logger.error('Error resetting maintenance:', error);
    res.status(500).json({ error: 'Failed to reset maintenance' });
  }
});

// GET /api/machines/maintenance/required - Get machines requiring maintenance
router.get('/maintenance/required', authenticateToken, requireAuth, async (_req: express.Request, res: express.Response) => {
  try {
    const machines = await machineRepo.findMaintenanceRequired();
    res.json({ machines });
  } catch (error) {
    logger.error('Error fetching maintenance required machines:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance required machines' });
  }
});

// DELETE /api/machines/:id - Delete machine (admin only)
router.delete('/:id', authenticateToken, requireAdmin, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    
    const machine = await machineRepo.findById(id);
    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    const deleted = await machineRepo.delete(id);
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete machine' });
    }

    logger.info(`Machine deleted: ${machine.code} from ${machine.location}`);
    
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting machine:', error);
    res.status(500).json({ error: 'Failed to delete machine' });
  }
});

// GET /api/machines/stats - Get machine statistics (admin only)
router.get('/stats', authenticateToken, requireAdmin, async (_req: express.Request, res: express.Response) => {
  try {
    const stats = await machineService.getMachineStats();
    res.json({ stats });
  } catch (error) {
    logger.error('Error fetching machine statistics:', error);
    res.status(500).json({ error: 'Failed to fetch machine statistics' });
  }
});

export { router as machineRouter };