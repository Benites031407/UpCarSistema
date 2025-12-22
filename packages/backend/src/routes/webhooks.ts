import express from 'express';
import { createLogger } from '../utils/logger.js';
import { PaymentService } from '../services/paymentService.js';
import { RepositoryFactory } from '../repositories/index.js';
import { webSocketService } from '../services/websocketService.js';

const router = express.Router();
const logger = createLogger('webhooks');

const transactionRepository = RepositoryFactory.getTransactionRepository();
const userRepository = RepositoryFactory.getUserRepository();
const paymentService = new PaymentService(transactionRepository, userRepository);

/**
 * POST /webhooks/mercadopago
 * Webhook do Mercado Pago para notificações de pagamento
 * 
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
router.post('/mercadopago', async (req: express.Request, res: express.Response) => {
  try {
    console.log('=== WEBHOOK RECEIVED ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Query:', req.query);
    
    logger.info('Webhook do Mercado Pago recebido:', {
      body: req.body,
      query: req.query,
      headers: {
        'x-signature': req.headers['x-signature'],
        'x-request-id': req.headers['x-request-id']
      }
    });

    // Mercado Pago envia notificações em diferentes formatos
    // Formato 1: { action, api_version, data: { id }, ... }
    // Formato 2: { type, data: { id }, ... }
    const notificationType = req.body.type || req.body.action;
    const paymentId = req.body.data?.id || req.query.id;

    console.log('Notification type:', notificationType);
    console.log('Payment ID:', paymentId);

    // Responder imediatamente para o Mercado Pago
    res.status(200).json({ success: true });

    // Processar notificação de forma assíncrona
    if (notificationType === 'payment' || notificationType === 'payment.updated') {
      if (!paymentId) {
        console.log('WARNING: Webhook sem payment ID');
        logger.warn('Webhook sem payment ID:', req.body);
        return;
      }

      console.log(`Processing payment notification: ${paymentId}`);
      logger.info(`Processando notificação de pagamento: ${paymentId}`);

      // Process asynchronously without blocking
      (async () => {
        try {
          // Aguardar um pouco para garantir que o pagamento foi processado pelo MP
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log(`Checking payment status for: ${paymentId}`);

          // Buscar status atualizado do pagamento
          const paymentStatus = await paymentService.checkPIXPaymentStatus(paymentId.toString());
          console.log(`Payment status for ${paymentId}:`, paymentStatus.status);

          logger.info(`Status do pagamento ${paymentId}:`, paymentStatus);

          if (paymentStatus.status === 'approved') {
            console.log(`Payment ${paymentId} approved, confirming...`);
            
            // Try to find transaction first (for credit additions)
            let transaction = await transactionRepository.findByPaymentId(paymentId.toString());
            
            if (transaction) {
              // This is a credit addition payment
              console.log(`Found transaction for payment ${paymentId}, confirming credit addition...`);
              transaction = await paymentService.confirmPIXPayment(paymentId.toString());

              if (transaction) {
                console.log(`Payment ${paymentId} confirmed for user ${transaction.userId}`);
                logger.info(`Pagamento ${paymentId} confirmado com sucesso para usuário ${transaction.userId}`);

                // Buscar usuário atualizado
                const user = await userRepository.findById(transaction.userId);

                if (user) {
                  console.log(`Sending WebSocket notification to user ${transaction.userId}`);
                  // Notificar usuário via WebSocket
                  webSocketService.sendToUser(transaction.userId, 'payment-confirmed', {
                    transactionId: transaction.id,
                    paymentId: paymentId.toString(),
                    amount: transaction.amount,
                    newBalance: user.accountBalance,
                    type: transaction.type,
                    timestamp: new Date().toISOString()
                  });

                  console.log(`WebSocket notification sent to user ${transaction.userId}`);
                  logger.info(`Notificação WebSocket enviada para usuário ${transaction.userId}`);
                }
              }
            } else {
              // No transaction found, check if this is a session payment
              console.log(`No transaction found for payment ${paymentId}, checking for session...`);
              const usageSessionRepo = RepositoryFactory.getUsageSessionRepository();
              const session = await usageSessionRepo.findByPaymentId(paymentId.toString());
              
              if (session) {
                console.log(`Found session ${session.id} for payment ${paymentId}, activating...`);
                logger.info(`Sessão ${session.id} encontrada para pagamento ${paymentId}`);
                
                // Import session service dynamically to avoid circular dependency
                const { usageSessionService } = await import('../services/usageSessionService.js');
                
                // Activate the session
                const activatedSession = await usageSessionService.activateSession(session.id);
                
                console.log(`Session ${session.id} activated for user ${session.userId}`);
                logger.info(`Sessão ${session.id} ativada com sucesso para usuário ${session.userId}`);
                
                // Notify user via WebSocket
                webSocketService.sendToUser(session.userId, 'payment-confirmed', {
                  sessionId: session.id,
                  paymentId: paymentId.toString(),
                  amount: session.cost,
                  timestamp: new Date().toISOString()
                });
                
                console.log(`WebSocket notification sent to user ${session.userId} for session ${session.id}`);
                logger.info(`Notificação WebSocket enviada para usuário ${session.userId}`);
              } else {
                console.log(`WARNING: No transaction or session found for payment ${paymentId}`);
                logger.warn(`Nenhuma transação ou sessão encontrada para pagamento ${paymentId}`);
              }
            }
          } else if (paymentStatus.status === 'rejected' || paymentStatus.status === 'cancelled') {
            console.log(`Payment ${paymentId} was ${paymentStatus.status}`);
            logger.warn(`Pagamento ${paymentId} foi ${paymentStatus.status}`);
            
            // Buscar transação para notificar usuário
            const transaction = await transactionRepository.findByPaymentId(paymentId.toString());
            if (transaction) {
              // Notificar usuário sobre falha
              webSocketService.sendToUser(transaction.userId, 'payment-failed', {
                paymentId: paymentId.toString(),
                status: paymentStatus.status,
                timestamp: new Date().toISOString()
              });
            }
          }
        } catch (webhookError) {
          console.error(`Error processing webhook for payment ${paymentId}:`, webhookError);
          logger.error('Erro ao processar webhook:', webhookError);
        }
      })();
    } else {
      logger.debug(`Tipo de notificação ignorado: ${notificationType}`);
    }
  } catch (error) {
    console.error('Error in webhook handler:', error);
    logger.error('Erro ao processar webhook do Mercado Pago:', error);
    // Não retornar erro para o MP, já respondemos 200
  }
});

/**
 * GET /webhooks/mercadopago/test
 * Endpoint de teste para verificar se o webhook está funcionando
 */
router.get('/mercadopago/test', (_req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    message: 'Webhook do Mercado Pago está configurado e funcionando',
    timestamp: new Date().toISOString()
  });
});

export default router;
