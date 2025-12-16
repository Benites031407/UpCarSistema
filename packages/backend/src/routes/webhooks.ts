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

    // Responder imediatamente para o Mercado Pago
    res.status(200).json({ success: true });

    // Processar notificação de forma assíncrona
    if (notificationType === 'payment' || notificationType === 'payment.updated') {
      if (!paymentId) {
        logger.warn('Webhook sem payment ID:', req.body);
        return;
      }

      logger.info(`Processando notificação de pagamento: ${paymentId}`);

      // Aguardar um pouco para garantir que o pagamento foi processado pelo MP
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Buscar status atualizado do pagamento
      const paymentStatus = await paymentService.checkPIXPaymentStatus(paymentId.toString());

      logger.info(`Status do pagamento ${paymentId}:`, paymentStatus);

      if (paymentStatus.status === 'approved') {
        // Confirmar pagamento no sistema
        const transaction = await paymentService.confirmPIXPayment(paymentId.toString());

        if (transaction) {
          logger.info(`Pagamento ${paymentId} confirmado com sucesso para usuário ${transaction.userId}`);

          // Buscar usuário atualizado
          const user = await userRepository.findById(transaction.userId);

          if (user) {
            // Notificar usuário via WebSocket
            webSocketService.sendToUser(transaction.userId, 'payment-confirmed', {
              transactionId: transaction.id,
              paymentId: paymentId.toString(),
              amount: transaction.amount,
              newBalance: user.accountBalance,
              type: transaction.type,
              timestamp: new Date().toISOString()
            });

            logger.info(`Notificação WebSocket enviada para usuário ${transaction.userId}`);
          }
        }
      } else if (paymentStatus.status === 'rejected' || paymentStatus.status === 'cancelled') {
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
    } else {
      logger.debug(`Tipo de notificação ignorado: ${notificationType}`);
    }
  } catch (error) {
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
