import express from 'express';
import { usageSessionService, SessionActivationRequest } from '../services/usageSessionService.js';
import { RepositoryFactory } from '../repositories/index.js';
import { authenticateToken } from '../auth/middleware.js';

import { validateSchema, commonSchemas, createRateLimitValidator } from '../middleware/validation.js';
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import { validateUsageDuration, validatePagination } from '../middleware/comprehensiveValidation.js';
import { retryIoTOperation } from '../utils/retry.js';
import { z } from 'zod';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Rate limiting for session operations
router.use('/create', createRateLimitValidator(10, 60000)); // 10 session creations per minute
router.use('/:sessionId/activate', createRateLimitValidator(5, 60000)); // 5 activations per minute

// Validation schemas
const createSessionSchema = z.object({
  machineId: commonSchemas.uuid,
  duration: commonSchemas.duration,
  paymentMethod: commonSchemas.paymentMethod
});

const sessionIdSchema = z.object({
  sessionId: commonSchemas.uuid
});

const confirmPaymentSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required').max(100, 'Payment ID too long')
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

/**
 * POST /api/sessions/create
 * Creates a new usage session
 */
router.post('/create', 
  authenticateToken,
  validateSchema(createSessionSchema),
  validateUsageDuration(),
  asyncHandler(async (req, res) => {
    const { machineId, duration, paymentMethod } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const request: SessionActivationRequest = {
      userId,
      machineId,
      duration,
      paymentMethod
    };

    const result = await usageSessionService.createSession(request);
    
    res.status(201).json({
      success: true,
      session: result.session,
      paymentRequired: result.paymentRequired,
      message: result.message === 'Session created successfully with subscription' 
        ? 'Sessão criada com sucesso com assinatura'
        : 'Sessão criada com sucesso'
    });
  })
);

/**
 * POST /api/sessions/:sessionId/activate
 * Activates a pending session (starts the machine)
 */
router.post('/:sessionId/activate',
  validateSchema(sessionIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    
    const session = await usageSessionService.activateSession(sessionId);
    
    res.json({
      success: true,
      session,
      message: 'Sessão ativada com sucesso'
    });
  })
);

/**
 * POST /api/sessions/:sessionId/terminate
 * Terminates an active session (stops the machine)
 */
router.post('/:sessionId/terminate',
  validateSchema(sessionIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    
    const session = await usageSessionService.terminateSession(sessionId);
    
    res.json({
      success: true,
      session,
      message: 'Sessão encerrada com sucesso'
    });
  })
);

/**
 * POST /api/sessions/:sessionId/cancel
 * Cancels a pending session
 */
router.post('/:sessionId/cancel',
  validateSchema(sessionIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    
    const session = await usageSessionService.cancelSession(sessionId);
    
    res.json({
      success: true,
      session,
      message: 'Sessão cancelada com sucesso'
    });
  })
);

/**
 * POST /api/sessions/:sessionId/confirm-payment
 * Confirms payment and activates session
 */
router.post('/:sessionId/confirm-payment',
  validateSchema(sessionIdSchema, 'params'),
  validateSchema(confirmPaymentSchema),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { paymentId } = req.body;
    
    const session = await usageSessionService.confirmPayment(sessionId, paymentId);
    
    res.json({
      success: true,
      session,
      message: 'Pagamento confirmado e sessão ativada'
    });
  })
);

/**
 * GET /api/sessions/my-sessions
 * Gets current user's session history
 */
router.get('/my-sessions',
  validateSchema(paginationSchema, 'query'),
  asyncHandler(async (req, res) => {
    const userId = (req as any).user?.id;
    const { limit, offset } = req.query as unknown as { limit: number; offset: number };

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const sessions = await usageSessionService.getUserSessions(userId, limit, offset);
    
    res.json({
      success: true,
      sessions,
      pagination: {
        limit,
        offset,
        count: sessions.length
      }
    });
  })
);

/**
 * GET /api/sessions/machine/:machineId
 * Gets session history for a specific machine
 */
router.get('/machine/:machineId',
  validateSchema(sessionIdSchema.pick({ sessionId: true }).extend({ machineId: commonSchemas.uuid }), 'params'),
  validateSchema(paginationSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { machineId } = req.params;
    const { limit, offset } = req.query as unknown as { limit: number; offset: number };

    const sessions = await usageSessionService.getMachineSessions(machineId, limit, offset);
    
    res.json({
      success: true,
      sessions,
      pagination: {
        limit,
        offset,
        count: sessions.length
      }
    });
  })
);

/**
 * GET /api/sessions/active
 * Gets all currently active sessions
 */
router.get('/active', 
  asyncHandler(async (_req, res) => {
    const sessions = await usageSessionService.getActiveSessions();
    
    res.json({
      success: true,
      sessions,
      count: sessions.length
    });
  })
);

/**
 * GET /api/sessions/stats
 * Gets session statistics
 */
router.get('/stats', 
  asyncHandler(async (_req, res) => {
    const stats = await usageSessionService.getSessionStats();
    
    res.json({
      success: true,
      stats
    });
  })
);

/**
 * GET /api/sessions/:sessionId
 * Gets a specific session by ID
 */
router.get('/:sessionId',
  validateSchema(sessionIdSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    
    const usageSessionRepo = RepositoryFactory.getUsageSessionRepository();
    const session = await usageSessionRepo.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ 
        success: false,
        error: 'Sessão não encontrada',
        code: 'SESSION_NOT_FOUND'
      });
    }

    // Check if user owns this session or is admin (for now, just check ownership)
    const userId = (req as any).user?.id;
    if (session.userId !== userId) {
      return res.status(403).json({ 
        success: false,
        error: 'Acesso negado',
        code: 'ACCESS_DENIED'
      });
    }
    
    res.json({
      success: true,
      session
    });
  })
);

export default router;