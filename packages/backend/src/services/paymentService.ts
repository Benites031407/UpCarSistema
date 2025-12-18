import { MercadoPagoConfig, Payment } from 'mercadopago';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, User, CreateTransactionInput } from '../models/types.js';
import { TransactionRepository } from '../repositories/interfaces.js';
import { UserRepository } from '../repositories/interfaces.js';
import { db } from '../database/connection.js';
import { retryPaymentOperation, retryExternalService } from '../utils/retry.js';
import { paymentOperationWithDegradation, ServiceCircuitBreaker } from '../utils/gracefulDegradation.js';
import { PaymentError, ValidationError, ExternalServiceError } from '../middleware/errorHandler.js';
import { validateBRLAmount } from '../middleware/validation.js';
import { createLogger } from '../utils/logger.js';

export interface PIXPaymentRequest {
  amount: number;
  description: string;
  externalReference?: string;
  payerEmail?: string;
}

export interface PIXPaymentResponse {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  qrCode?: string;
  qrCodeBase64?: string;
  pixCopyPaste?: string;
  expirationDate?: Date;
}

export interface CreditCardPaymentRequest {
  amount: number;
  description: string;
  token: string; // Card token from Mercado Pago SDK
  installments: number;
  payerEmail: string;
  externalReference?: string;
}

export interface CreditCardPaymentResponse {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  statusDetail?: string;
  installments?: number;
  transactionAmount?: number;
}

export interface PaymentMethodSelection {
  userId: string;
  amount: number;
  canUseBalance: boolean;
  balanceAmount: number;
  pixAmount: number;
  requiresPIX: boolean;
}

export class PaymentService {
  private mercadoPagoAccessToken: string;
  private mercadoPagoClient: MercadoPagoConfig | null = null;
  private paymentClient: Payment | null = null;
  private logger = createLogger('payment-service');
  private pixCircuitBreaker: ServiceCircuitBreaker;

  constructor(
    private transactionRepository: TransactionRepository,
    private userRepository: UserRepository
  ) {
    this.mercadoPagoAccessToken = process.env.PIX_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
    this.pixCircuitBreaker = new ServiceCircuitBreaker('payment_pix', 3, 120000, 10000);
    
    if (!this.mercadoPagoAccessToken) {
      this.logger.warn('PIX_ACCESS_TOKEN not configured. PIX payments will not work.');
    } else {
      // Initialize MercadoPago SDK
      this.mercadoPagoClient = new MercadoPagoConfig({ 
        accessToken: this.mercadoPagoAccessToken,
        options: {
          timeout: 30000
        }
      });
      this.paymentClient = new Payment(this.mercadoPagoClient);
      this.logger.info('MercadoPago SDK initialized successfully');
    }
  }

  /**
   * Analyzes payment options for a user and amount
   */
  async analyzePaymentOptions(userId: string, amount: number): Promise<PaymentMethodSelection> {
    // Validate input
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const amountValidation = validateBRLAmount(amount);
    if (!amountValidation.isValid) {
      throw new ValidationError(amountValidation.error!);
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ValidationError('User not found');
    }

    const canUseBalance = user.accountBalance >= amount;
    const balanceAmount = canUseBalance ? amount : Math.max(0, user.accountBalance);
    const pixAmount = Math.max(0, amount - balanceAmount);
    const requiresPIX = pixAmount > 0;

    this.logger.debug('Payment options analyzed:', {
      userId,
      amount,
      userBalance: user.accountBalance,
      canUseBalance,
      balanceAmount,
      pixAmount,
      requiresPIX
    });

    return {
      userId,
      amount,
      canUseBalance,
      balanceAmount,
      pixAmount,
      requiresPIX
    };
  }

  /**
   * Creates a PIX payment through Mercado Pago
   */
  async createPIXPayment(request: PIXPaymentRequest): Promise<PIXPaymentResponse> {
    if (!this.paymentClient) {
      throw new ExternalServiceError('PIX Gateway', 'PIX payment gateway not configured');
    }

    // Validate request
    const amountValidation = validateBRLAmount(request.amount);
    if (!amountValidation.isValid) {
      throw new ValidationError(`Invalid amount: ${amountValidation.error}`);
    }

    if (!request.description || request.description.trim().length === 0) {
      throw new ValidationError('Payment description is required');
    }

    return await this.pixCircuitBreaker.execute(
      async () => {
        return await retryPaymentOperation(
          async () => {
            const paymentData: any = {
              transaction_amount: request.amount,
              description: request.description.trim(),
              payment_method_id: 'pix',
              // Add items array for better fraud prevention and approval rates
              additional_info: {
                items: [
                  {
                    id: 'account_credit',
                    title: 'Crédito de Conta - Sistema de Aspiradores',
                    description: request.description.trim(),
                    category_id: 'services',
                    quantity: 1,
                    unit_price: request.amount
                  }
                ]
              }
            };

            // Add optional fields only if they exist
            if (request.externalReference) {
              paymentData.external_reference = request.externalReference;
            }

            if (request.payerEmail) {
              paymentData.payer = {
                email: request.payerEmail
              };
            }

            // Generate idempotency key to prevent duplicate payments
            const idempotencyKey = uuidv4();

            this.logger.debug('Creating PIX payment with SDK:', { 
              amount: request.amount, 
              description: request.description,
              externalReference: request.externalReference,
              idempotencyKey
            });

            let payment;
            try {
              payment = await this.paymentClient!.create({
                body: paymentData,
                requestOptions: {
                  idempotencyKey
                }
              });
            } catch (sdkError: any) {
              const mpError = sdkError.cause || sdkError;
              this.logger.error('MercadoPago SDK PIX error:', {
                message: sdkError.message,
                cause: mpError,
                status: sdkError.status,
                paymentData,
                fullError: JSON.stringify(sdkError, null, 2)
              });
              
              // Throw a more descriptive error with MercadoPago's message
              if (mpError?.message) {
                throw new ExternalServiceError('MercadoPago PIX', `${mpError.message}${mpError.cause ? ` - ${JSON.stringify(mpError.cause)}` : ''}`);
              }
              throw new ExternalServiceError('MercadoPago PIX', sdkError.message || 'Payment creation failed');
            }
            
            const result = {
              id: payment.id!.toString(),
              status: this.mapMercadoPagoStatus(payment.status!),
              qrCode: payment.point_of_interaction?.transaction_data?.qr_code,
              qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
              pixCopyPaste: payment.point_of_interaction?.transaction_data?.qr_code,
              expirationDate: payment.date_of_expiration ? new Date(payment.date_of_expiration) : undefined
            };

            this.logger.info('PIX payment created successfully with SDK:', { 
              paymentId: result.id, 
              status: result.status 
            });

            return result;
          },
          'createPIXPayment'
        );
      },
      async () => {
        // Fallback: return a manual payment instruction
        this.logger.warn('PIX gateway unavailable, returning manual payment fallback');
        throw new PaymentError('PIX payment gateway is temporarily unavailable. Please try again later or contact support.');
      }
    );
  }

  /**
   * Creates a credit card payment through Mercado Pago
   */
  async createCreditCardPayment(request: CreditCardPaymentRequest): Promise<CreditCardPaymentResponse> {
    if (!this.paymentClient) {
      throw new ExternalServiceError('Payment Gateway', 'Payment gateway not configured');
    }

    // Validate request
    const amountValidation = validateBRLAmount(request.amount);
    if (!amountValidation.isValid) {
      throw new ValidationError(`Invalid amount: ${amountValidation.error}`);
    }

    if (!request.token || request.token.trim().length === 0) {
      throw new ValidationError('Card token is required');
    }

    if (!request.description || request.description.trim().length === 0) {
      throw new ValidationError('Payment description is required');
    }

    if (!request.payerEmail || request.payerEmail.trim().length === 0) {
      throw new ValidationError('Payer email is required');
    }

    return await retryPaymentOperation(
      async () => {
        // Generate idempotency key
        const idempotencyKey = uuidv4();

        this.logger.debug('Creating credit card payment with SDK:', {
          amount: request.amount,
          description: request.description,
          installments: request.installments,
          idempotencyKey,
          token: request.token.substring(0, 20) + '...'
        });

        // Build payment data - MercadoPago will infer payment_method_id from token
        const paymentData: any = {
          transaction_amount: request.amount,
          token: request.token,
          description: request.description.trim(),
          installments: request.installments || 1,
          payer: {
            email: request.payerEmail
          },
          statement_descriptor: 'UPCAR ASPIRADORES',
          // Add items array for better fraud prevention and approval rates
          additional_info: {
            items: [
              {
                id: 'account_credit',
                title: 'Crédito de Conta - Sistema de Aspiradores',
                description: request.description.trim(),
                category_id: 'services',
                quantity: 1,
                unit_price: request.amount
              }
            ]
          }
        };

        // Add optional fields
        if (request.externalReference) {
          paymentData.external_reference = request.externalReference;
        }

        this.logger.debug('Payment data prepared (payment_method_id will be inferred from token):', {
          amount: paymentData.transaction_amount,
          installments: paymentData.installments,
          statement_descriptor: paymentData.statement_descriptor
        });

        // Create payment using SDK
        let payment;
        try {
          payment = await this.paymentClient!.create({
            body: paymentData,
            requestOptions: {
              idempotencyKey
            }
          });
        } catch (sdkError: any) {
          const mpError = sdkError.cause || sdkError;
          this.logger.error('MercadoPago SDK credit card error:', {
            message: sdkError.message,
            cause: mpError,
            status: sdkError.status,
            fullError: JSON.stringify(sdkError, null, 2)
          });
          
          // Throw a more descriptive error with MercadoPago's message
          if (mpError?.message) {
            throw new ExternalServiceError('MercadoPago', `${mpError.message}${mpError.cause ? ` - ${JSON.stringify(mpError.cause)}` : ''}`);
          }
          throw new ExternalServiceError('MercadoPago', sdkError.message || 'Payment creation failed');
        }

        const result = {
          id: payment.id!.toString(),
          status: this.mapMercadoPagoStatus(payment.status!),
          statusDetail: payment.status_detail,
          installments: payment.installments,
          transactionAmount: payment.transaction_amount
        };

        this.logger.info('Credit card payment created with SDK:', {
          paymentId: result.id,
          status: result.status,
          statusDetail: result.statusDetail
        });

        return result;
      },
      'createCreditCardPayment'
    );
  }

  /**
   * Checks the status of a PIX payment
   */
  async checkPIXPaymentStatus(paymentId: string): Promise<PIXPaymentResponse> {
    if (!this.paymentClient) {
      throw new ExternalServiceError('PIX Gateway', 'PIX payment gateway not configured');
    }

    if (!paymentId || paymentId.trim().length === 0) {
      throw new ValidationError('Payment ID is required');
    }

    return await paymentOperationWithDegradation(
      async () => {
        return await retryExternalService(
          async () => {
            this.logger.debug('Checking PIX payment status with SDK:', { paymentId });

            const payment = await this.paymentClient!.get({ id: paymentId.trim() });
            
            const result = {
              id: payment.id!.toString(),
              status: this.mapMercadoPagoStatus(payment.status!),
              qrCode: payment.point_of_interaction?.transaction_data?.qr_code,
              qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
              pixCopyPaste: payment.point_of_interaction?.transaction_data?.qr_code
            };

            this.logger.debug('PIX payment status retrieved with SDK:', { 
              paymentId, 
              status: result.status 
            });

            return result;
          },
          'PIX Gateway'
        );
      },
      'pix',
      {
        allowManualProcessing: true,
        manualProcessingCallback: async () => {
          // Return pending status as fallback
          this.logger.warn('PIX status check failed, returning pending status as fallback');
          return {
            id: paymentId,
            status: 'pending' as const,
            qrCode: undefined,
            qrCodeBase64: undefined,
            pixCopyPaste: undefined
          };
        }
      }
    );
  }

  /**
   * Processes account balance payment
   */
  async processBalancePayment(userId: string, amount: number, _description: string): Promise<Transaction> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Deduct balance
      const updatedUser = await this.userRepository.deductBalance(userId, amount, client);
      if (!updatedUser) {
        throw new Error('Insufficient balance or user not found');
      }

      // Create transaction record
      const transactionData: CreateTransactionInput = {
        userId,
        type: 'usage_payment',
        amount,
        paymentMethod: 'admin_credit' // Using admin_credit for balance payments
      };

      const transaction = await this.transactionRepository.create(transactionData, client);

      await client.query('COMMIT');
      return transaction;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Processes mixed payment (balance + PIX)
   */
  async processMixedPayment(
    userId: string, 
    totalAmount: number, 
    balanceAmount: number, 
    description: string
  ): Promise<{ balanceTransaction?: Transaction; pixPayment: PIXPaymentResponse }> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      let balanceTransaction: Transaction | undefined;

      // Process balance portion if any
      if (balanceAmount > 0) {
        const updatedUser = await this.userRepository.deductBalance(userId, balanceAmount, client);
        if (!updatedUser) {
          throw new Error('Insufficient balance or user not found');
        }

        const transactionData: CreateTransactionInput = {
          userId,
          type: 'usage_payment',
          amount: balanceAmount,
          paymentMethod: 'admin_credit'
        };

        balanceTransaction = await this.transactionRepository.create(transactionData, client);
      }

      // Create PIX payment for remaining amount
      const pixAmount = totalAmount - balanceAmount;
      const user = await this.userRepository.findById(userId);
      
      const pixPayment = await this.createPIXPayment({
        amount: pixAmount,
        description: `${description} - PIX portion`,
        externalReference: `mixed_${Date.now()}`,
        payerEmail: user?.email
      });

      // Create pending transaction for PIX portion
      const pixTransactionData: CreateTransactionInput = {
        userId,
        type: 'usage_payment',
        amount: pixAmount,
        paymentMethod: 'pix',
        paymentId: pixPayment.id
      };

      await this.transactionRepository.create(pixTransactionData, client);

      await client.query('COMMIT');
      return { balanceTransaction, pixPayment };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Adds credit to user account
   */
  async addCredit(userId: string, amount: number, paymentId?: string): Promise<{ user: User; transaction: Transaction }> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Update user balance
      const updatedUser = await this.userRepository.updateBalance(userId, amount, client);
      if (!updatedUser) {
        throw new Error('User not found');
      }

      // Create transaction record
      const transactionData: CreateTransactionInput = {
        userId,
        type: 'credit_added',
        amount,
        paymentMethod: paymentId ? 'pix' : 'admin_credit',
        paymentId
      };

      const transaction = await this.transactionRepository.create(transactionData, client);

      await client.query('COMMIT');
      return { user: updatedUser, transaction };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Processes subscription payment
   */
  async processSubscriptionPayment(userId: string): Promise<{ pixPayment: PIXPaymentResponse; transaction: Transaction }> {
    const subscriptionAmount = 59.90; // R$ 59.90 monthly subscription
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Create PIX payment for subscription
    const pixPayment = await this.createPIXPayment({
      amount: subscriptionAmount,
      description: 'Monthly Subscription - Machine Rental System',
      externalReference: `subscription_${userId}_${Date.now()}`,
      payerEmail: user.email
    });

    // Create pending transaction
    const transactionData: CreateTransactionInput = {
      userId,
      type: 'subscription_payment',
      amount: subscriptionAmount,
      paymentMethod: 'pix',
      paymentId: pixPayment.id
    };

    const transaction = await this.transactionRepository.create(transactionData);

    return { pixPayment, transaction };
  }

  /**
   * Confirms a PIX payment and updates related records
   */
  async confirmPIXPayment(paymentId: string): Promise<Transaction | null> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Find transaction by payment ID
      const transaction = await this.transactionRepository.findByPaymentId(paymentId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Update transaction status
      const updatedTransaction = await this.transactionRepository.updateStatus(
        transaction.id, 
        'completed', 
        client
      );

      // If it's a credit addition, update the user's balance
      if (transaction.type === 'credit_added') {
        await this.userRepository.updateBalance(transaction.userId, transaction.amount, client);
        this.logger.info(`Added ${transaction.amount} credit to user ${transaction.userId} from payment ${paymentId}`);
      }
      
      // If it's a subscription payment, update user subscription status
      if (transaction.type === 'subscription_payment') {
        const subscriptionExpiry = new Date();
        subscriptionExpiry.setMonth(subscriptionExpiry.getMonth() + 1);

        await this.userRepository.update(transaction.userId, {
          subscriptionStatus: 'active',
          subscriptionExpiry
        }, client);
      }

      await client.query('COMMIT');
      return updatedTransaction;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Maps Mercado Pago status to our internal status
   */
  private mapMercadoPagoStatus(mpStatus: string): 'pending' | 'approved' | 'rejected' | 'cancelled' {
    switch (mpStatus) {
      case 'approved':
        return 'approved';
      case 'rejected':
      case 'cancelled':
        return 'rejected';
      case 'pending':
      case 'in_process':
      default:
        return 'pending';
    }
  }

  /**
   * Gets transaction history for a user
   */
  async getTransactionHistory(userId: string, limit = 50, offset = 0): Promise<Transaction[]> {
    return this.transactionRepository.findByUserId(userId, { limit, offset });
  }

  /**
   * Calculates shortfall amount for insufficient balance
   */
  calculateShortfall(userBalance: number, requiredAmount: number): number {
    return Math.max(0, requiredAmount - userBalance);
  }

  /**
   * Validates if user can make a subscription payment (not already active)
   */
  async canSubscribe(userId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return false;
    }

    // Check if subscription is not active or has expired
    if (user.subscriptionStatus !== 'active') {
      return true;
    }

    // Check if subscription has expired
    if (user.subscriptionExpiry && user.subscriptionExpiry < new Date()) {
      return true;
    }

    return false;
  }
}