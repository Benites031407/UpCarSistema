import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PaymentService } from '../services/paymentService.js';
import { PostgresTransactionRepository } from '../repositories/transaction.js';
import { PostgresUserRepository } from '../repositories/user.js';
import { authenticateToken } from '../auth/middleware.js';
import { auditOperations, auditMiddleware, AuditEventType } from '../middleware/auditLog.js';
import { requireRecentAuth } from '../auth/sessionSecurity.js';
import { validatePaymentAmount, validatePagination } from '../middleware/comprehensiveValidation.js';
import { retryPaymentOperation } from '../utils/retry.js';

const router = express.Router();

// Initialize repositories and service
const transactionRepository = new PostgresTransactionRepository();
const userRepository = new PostgresUserRepository();
const paymentService = new PaymentService(transactionRepository, userRepository);

/**
 * GET /api/payments/options/:amount
 * Analyze payment options for a specific amount
 */
router.get('/options/:amount',
  authenticateToken,
  param('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  async (req: express.Request, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req as any).user.id;
      const amount = parseFloat(req.params.amount);

      const options = await paymentService.analyzePaymentOptions(userId, amount);
      
      res.json({
        success: true,
        data: options
      });
    } catch (error) {
      console.error('Payment options analysis failed:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Falha ao analisar opções de pagamento' 
      });
    }
  }
);

/**
 * POST /api/payments/balance
 * Process payment using account balance only
 */
router.post('/balance',
  authenticateToken,
  requireRecentAuth(15 * 60 * 1000), // Require recent auth within 15 minutes
  auditMiddleware(AuditEventType.PAYMENT_INITIATED, { riskLevel: 'HIGH', resourceType: 'payment' }),
  validatePaymentAmount(),
  body('description').isString().isLength({ min: 1, max: 255 }).withMessage('Description is required'),
  async (req: express.Request, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          error: 'Validation failed',
          details: errors.array(),
          code: 'VALIDATION_ERROR'
        });
      }

      const userId = (req as any).user.id;
      const { amount, description } = req.body;

      // Audit log payment initiation
      auditOperations.paymentInitiated(req, amount, 'balance');

      // Use retry mechanism for payment processing
      const transaction = await retryPaymentOperation(
        () => paymentService.processBalancePayment(userId, amount, description),
        'balance_payment'
      );
      
      res.json({
        success: true,
        data: { transaction }
      });
    } catch (error) {
      console.error('Balance payment failed:', error);
      res.status(400).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Falha no processamento do pagamento. Por favor, tente novamente.',
        code: 'PAYMENT_ERROR'
      });
    }
  }
);

/**
 * POST /api/payments/pix
 * Create a PIX payment
 */
router.post('/pix',
  authenticateToken,
  requireRecentAuth(15 * 60 * 1000), // Require recent auth within 15 minutes
  auditMiddleware(AuditEventType.PAYMENT_INITIATED, { riskLevel: 'HIGH', resourceType: 'payment' }),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('description').isString().isLength({ min: 1, max: 255 }).withMessage('Description is required'),
  body('externalReference').optional().isString(),
  async (req: express.Request, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req as any).user.id;
      const { amount, description, externalReference } = req.body;

      // Get user email for PIX payment
      const user = await userRepository.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'Usuário não encontrado' 
        });
      }

      // Audit log PIX payment initiation
      auditOperations.paymentInitiated(req, amount, 'pix');

      // Create transaction first to get ID for external_reference
      const pendingTransactionData = {
        userId,
        type: 'credit_added' as const,
        amount,
        paymentMethod: 'pix' as const,
        paymentId: null // Will be updated after payment creation
      };

      const transaction = await transactionRepository.create(pendingTransactionData);

      // Create PIX payment with transaction ID as external_reference
      const pixPayment = await paymentService.createPIXPayment({
        amount,
        description,
        externalReference: transaction.id, // Use transaction ID as external reference
        payerEmail: user.email
      });

      // Update transaction with payment ID
      await transactionRepository.update(transaction.id, {
        paymentId: pixPayment.id
      });
      
      res.json({
        success: true,
        data: { 
          pixPayment,
          transaction
        }
      });
    } catch (error) {
      console.error('PIX payment creation failed:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Falha ao criar pagamento PIX' 
      });
    }
  }
);

/**
 * POST /api/payments/credit-card
 * Create a credit card payment
 */
router.post('/credit-card',
  authenticateToken,
  requireRecentAuth(15 * 60 * 1000),
  auditMiddleware(AuditEventType.PAYMENT_INITIATED, { riskLevel: 'HIGH', resourceType: 'payment' }),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('description').isString().isLength({ min: 1, max: 255 }).withMessage('Description is required'),
  body('token').isString().withMessage('Card token is required'),
  body('installments').optional().isInt({ min: 1, max: 12 }).withMessage('Installments must be between 1 and 12'),
  async (req: express.Request, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req as any).user.id;
      const { amount, description, token, installments = 1 } = req.body;

      // Get user data
      const user = await userRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
      }

      // Audit log credit card payment initiation
      auditOperations.paymentInitiated(req, amount, 'credit_card');

      // Create transaction first to get ID for external_reference
      const pendingTransactionData = {
        userId,
        type: 'credit_added' as const,
        amount,
        paymentMethod: 'credit_card' as const,
        paymentId: null // Will be updated after payment creation
      };

      const transaction = await transactionRepository.create(pendingTransactionData);

      // Create payment with transaction ID as external_reference
      const cardPayment = await paymentService.createCreditCardPayment({
        amount,
        description,
        token,
        installments,
        payerEmail: user.email,
        payerName: user.name,
        externalReference: transaction.id // Use transaction ID as external reference
      });

      // Update transaction with payment ID
      await transactionRepository.update(transaction.id, {
        paymentId: cardPayment.id
      });

      // If payment was approved immediately, add credit
      if (cardPayment.status === 'approved') {
        const result = await paymentService.addCredit(userId, amount, cardPayment.id);
        
        return res.json({
          success: true,
          data: {
            payment: cardPayment,
            transaction: result.transaction,
            newBalance: result.user.accountBalance
          }
        });
      }

      res.json({
        success: true,
        data: {
          payment: cardPayment,
          transaction
        }
      });
    } catch (error) {
      console.error('Credit card payment creation failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Falha ao processar pagamento com cartão'
      });
    }
  }
);

/**
 * POST /api/payments/mixed
 * Process mixed payment (balance + PIX)
 */
router.post('/mixed',
  authenticateToken,
  body('totalAmount').isFloat({ min: 0.01 }).withMessage('Total amount must be a positive number'),
  body('balanceAmount').isFloat({ min: 0 }).withMessage('Balance amount must be non-negative'),
  body('description').isString().isLength({ min: 1, max: 255 }).withMessage('Description is required'),
  async (req: express.Request, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req as any).user.id;
      const { totalAmount, balanceAmount, description } = req.body;

      if (balanceAmount > totalAmount) {
        return res.status(400).json({
          success: false,
          error: 'O valor do saldo não pode exceder o valor total'
        });
      }

      const result = await paymentService.processMixedPayment(
        userId, 
        totalAmount, 
        balanceAmount, 
        description
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Mixed payment failed:', error);
      res.status(400).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Falha no pagamento' 
      });
    }
  }
);

/**
 * POST /api/payments/credit
 * Add credit to account (admin function)
 */
router.post('/credit',
  authenticateToken,
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('paymentId').optional().isString(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // TODO: Add admin authorization check
      const { userId, amount, paymentId } = req.body;

      const result = await paymentService.addCredit(userId, amount, paymentId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Credit addition failed:', error);
      res.status(400).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Falha ao adicionar crédito' 
      });
    }
  }
);

/**
 * POST /api/payments/subscription
 * Process subscription payment
 */
router.post('/subscription',
  authenticateToken,
  async (req: express.Request, res) => {
    try {
      const userId = (req as any).user.id;

      // Check if user can subscribe
      const canSubscribe = await paymentService.canSubscribe(userId);
      if (!canSubscribe) {
        return res.status(400).json({
          success: false,
          error: 'Usuário já possui uma assinatura ativa'
        });
      }

      const result = await paymentService.processSubscriptionPayment(userId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Subscription payment failed:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Falha ao processar pagamento de assinatura' 
      });
    }
  }
);

/**
 * GET /api/payments/status/:paymentId
 * Check PIX payment status
 */
router.get('/status/:paymentId',
  authenticateToken,
  param('paymentId').isString().withMessage('Payment ID is required'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { paymentId } = req.params;

      const status = await paymentService.checkPIXPaymentStatus(paymentId);
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Payment status check failed:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Falha ao verificar status do pagamento' 
      });
    }
  }
);

/**
 * POST /api/payments/confirm/:paymentId
 * Confirm PIX payment (webhook or manual confirmation)
 */
router.post('/confirm/:paymentId',
  param('paymentId').isString().withMessage('Payment ID is required'),
  async (req: express.Request, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { paymentId } = req.params;

      const transaction = await paymentService.confirmPIXPayment(paymentId);
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transação não encontrada'
        });
      }

      res.json({
        success: true,
        data: { transaction }
      });
    } catch (error) {
      console.error('Payment confirmation failed:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Falha ao confirmar pagamento' 
      });
    }
  }
);

/**
 * GET /api/payments/history
 * Get transaction history for authenticated user
 */
router.get('/history',
  authenticateToken,
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  async (req: express.Request, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = (req as any).user.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const transactions = await paymentService.getTransactionHistory(userId, limit, offset);
      
      res.json({
        success: true,
        data: { transactions }
      });
    } catch (error) {
      console.error('Transaction history retrieval failed:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Falha ao recuperar histórico de transações' 
      });
    }
  }
);

/**
 * GET /api/payments/balance
 * Get current account balance for authenticated user
 */
router.get('/balance',
  authenticateToken,
  async (req: express.Request, res) => {
    try {
      const userId = (req as any).user.id;
      const user = await userRepository.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        data: { 
          balance: user.accountBalance,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionExpiry: user.subscriptionExpiry
        }
      });
    } catch (error) {
      console.error('Balance retrieval failed:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve balance' 
      });
    }
  }
);

export default router;