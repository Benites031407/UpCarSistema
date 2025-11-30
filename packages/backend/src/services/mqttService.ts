import mqtt from 'mqtt';
import { createLogger } from '../utils/logger.js';
// import { Machine } from '../models/types.js';
import { MachineService } from './machineService.js';
import { NotificationService } from './notificationService.js';
import { RepositoryFactory } from '../repositories/index.js';
import { retryIoTOperation } from '../utils/retry.js';
import { iotOperationWithDegradation } from '../utils/gracefulDegradation.js';
import { IoTError, ValidationError } from '../middleware/errorHandler.js';
// Removed unused imports

const logger = createLogger('mqtt-service');

export interface MachineCommand {
  type: 'activate' | 'deactivate' | 'status';
  sessionId?: string;
  duration?: number; // in minutes
  timestamp: string;
}

export interface MachineStatus {
  controllerId: string;
  machineId: string;
  status: 'active' | 'inactive' | 'error';
  temperature?: number;
  timestamp: string;
  sessionId?: string;
  duration?: number;
}

export class MQTTService {
  private client: mqtt.MqttClient | null = null;
  private machineService: MachineService;
  private notificationService: NotificationService;
  private usageSessionRepo = RepositoryFactory.getUsageSessionRepository();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  // Removed unused private variables for now - will be implemented in future iterations
  private pendingOperations = new Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();

  constructor() {
    this.machineService = new MachineService();
    this.notificationService = new NotificationService();
  }

  /**
   * Connect to MQTT broker
   */
  async connect(): Promise<void> {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    
    this.client = mqtt.connect(brokerUrl, {
      clientId: `backend-${Date.now()}`,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
    });

    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Failed to create MQTT client'));
        return;
      }

      this.client.on('connect', () => {
        logger.info('Connected to MQTT broker');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.subscribeToTopics();
        resolve();
      });

      this.client.on('error', (error) => {
        logger.error('MQTT connection error:', error);
        this.isConnected = false;
        reject(error);
      });

      this.client.on('offline', () => {
        logger.warn('MQTT client went offline');
        this.isConnected = false;
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        logger.info(`MQTT reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          logger.error('Max reconnection attempts reached');
          this.client?.end();
        }
      });

      this.client.on('message', this.handleMessage.bind(this));
    });
  }

  /**
   * Subscribe to machine status topics
   */
  private subscribeToTopics(): void {
    if (!this.client) return;

    const topics = [
      'machines/+/status',           // Machine status updates
      'machines/+/heartbeat',        // Machine heartbeat
      'machines/+/alerts',           // Machine alerts (temperature, etc.)
      'machines/+/errors',           // Machine errors
      'controllers/+/status',        // Controller status
    ];

    topics.forEach(topic => {
      this.client!.subscribe(topic, (err) => {
        if (err) {
          logger.error(`Failed to subscribe to ${topic}:`, err);
        } else {
          logger.info(`Subscribed to ${topic}`);
        }
      });
    });
  }

  /**
   * Handle incoming MQTT messages
   */
  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    try {
      const payload = JSON.parse(message.toString());
      logger.debug(`Received message on ${topic}:`, payload);

      if (topic.includes('/status')) {
        await this.handleStatusUpdate(payload);
      } else if (topic.includes('/heartbeat')) {
        await this.handleHeartbeat(payload);
      } else if (topic.includes('/alerts')) {
        await this.handleAlert(payload);
      } else if (topic.includes('/errors')) {
        await this.handleError(payload);
      }
    } catch (error) {
      logger.error('Error processing MQTT message:', error);
    }
  }

  /**
   * Handle machine status updates
   */
  private async handleStatusUpdate(payload: MachineStatus): Promise<void> {
    try {
      const { machineId, status, temperature, sessionId } = payload;

      // Update machine heartbeat and temperature
      await this.machineService.updateHeartbeat(machineId, temperature);

      // Handle session completion
      if (status === 'inactive' && sessionId) {
        try {
          const session = await this.usageSessionRepo.findById(sessionId);
          if (session && session.status === 'active') {
            // Update session status to completed
            await this.usageSessionRepo.endSession(sessionId, new Date());
            logger.info(`Session ${sessionId} completed via IoT status update`);
          }
        } catch (error) {
          logger.error(`Error terminating session ${sessionId}:`, error);
        }
      }

      logger.debug(`Updated status for machine ${machineId}: ${status}`);
    } catch (error) {
      logger.error('Error handling status update:', error);
    }
  }

  /**
   * Handle machine heartbeat
   */
  private async handleHeartbeat(payload: any): Promise<void> {
    try {
      const { machineId, temperature } = payload;
      await this.machineService.updateHeartbeat(machineId, temperature);
      logger.debug(`Heartbeat received from machine ${machineId}`);
    } catch (error) {
      logger.error('Error handling heartbeat:', error);
    }
  }

  /**
   * Handle machine alerts (temperature, safety, etc.)
   */
  private async handleAlert(payload: any): Promise<void> {
    try {
      const { machineId, type, temperature, message } = payload;
      
      if (type === 'temperature_alert') {
        // Get machine details for notification
        const machine = await this.machineService.getMachineById(machineId);
        if (machine) {
          await this.notificationService.sendTemperatureAlert(
            machineId,
            machine.code,
            temperature
          );
        }
      }
      
      logger.warn(`Alert received from machine ${machineId}: ${message}`);
    } catch (error) {
      logger.error('Error handling alert:', error);
    }
  }

  /**
   * Handle machine errors
   */
  private async handleError(payload: any): Promise<void> {
    try {
      const { machineId, message, error } = payload;
      
      await this.notificationService.sendSystemErrorNotification(
        `Machine ${machineId} error: ${message}`,
        error
      );
      
      logger.error(`Error reported by machine ${machineId}: ${message}`, error);
    } catch (error) {
      logger.error('Error handling machine error:', error);
    }
  }

  /**
   * Send activation command to machine
   */
  async activateMachine(machineId: string, sessionId: string, duration: number): Promise<boolean> {
    // Validate inputs
    if (!machineId || machineId.trim().length === 0) {
      throw new ValidationError('Machine ID is required');
    }
    if (!sessionId || sessionId.trim().length === 0) {
      throw new ValidationError('Session ID is required');
    }
    if (!duration || duration < 1 || duration > 30) {
      throw new ValidationError('Duration must be between 1 and 30 minutes');
    }

    return await iotOperationWithDegradation(
      async () => {
        return await retryIoTOperation(
          async () => {
            if (!this.isConnected || !this.client) {
              throw new IoTError('MQTT client not connected');
            }

            const command: MachineCommand = {
              type: 'activate',
              sessionId: sessionId.trim(),
              duration,
              timestamp: new Date().toISOString()
            };

            const topic = `machines/${machineId.trim()}/commands/activate`;
            
            return new Promise<boolean>((resolve, reject) => {
              const operationId = `activate_${machineId}_${Date.now()}`;
              
              // Set up timeout for the operation
              const timeout = setTimeout(() => {
                this.pendingOperations.delete(operationId);
                reject(new IoTError(`Activation command timeout for machine ${machineId}`));
              }, 10000); // 10 second timeout

              this.pendingOperations.set(operationId, { resolve, reject, timeout });

              this.client!.publish(topic, JSON.stringify(command), { qos: 1 }, (error) => {
                if (error) {
                  clearTimeout(timeout);
                  this.pendingOperations.delete(operationId);
                  logger.error(`Failed to send activation command to ${machineId}:`, error);
                  reject(new IoTError(`Failed to send activation command: ${error.message}`));
                } else {
                  // Don't resolve immediately - wait for confirmation or timeout
                  logger.info(`Activation command sent to machine ${machineId} for session ${sessionId}`);
                  
                  // For now, resolve immediately since we don't have confirmation mechanism
                  clearTimeout(timeout);
                  this.pendingOperations.delete(operationId);
                  resolve(true);
                }
              });
            });
          },
          'activateMachine',
          machineId
        );
      },
      machineId,
      'activate',
      {
        allowOfflineMode: false, // Machine activation is critical
        cacheTimeout: 0 // Don't cache activation commands
      }
    );
  }

  /**
   * Send deactivation command to machine
   */
  async deactivateMachine(machineId: string, sessionId?: string): Promise<boolean> {
    // Validate inputs
    if (!machineId || machineId.trim().length === 0) {
      throw new ValidationError('Machine ID is required');
    }

    return await iotOperationWithDegradation(
      async () => {
        return await retryIoTOperation(
          async () => {
            if (!this.isConnected || !this.client) {
              throw new IoTError('MQTT client not connected');
            }

            const command: MachineCommand = {
              type: 'deactivate',
              sessionId: sessionId?.trim(),
              timestamp: new Date().toISOString()
            };

            const topic = `machines/${machineId.trim()}/commands/deactivate`;
            
            return new Promise<boolean>((resolve, reject) => {
              const operationId = `deactivate_${machineId}_${Date.now()}`;
              
              const timeout = setTimeout(() => {
                this.pendingOperations.delete(operationId);
                reject(new IoTError(`Deactivation command timeout for machine ${machineId}`));
              }, 8000); // 8 second timeout for deactivation

              this.pendingOperations.set(operationId, { resolve, reject, timeout });

              this.client!.publish(topic, JSON.stringify(command), { qos: 1 }, (error) => {
                if (error) {
                  clearTimeout(timeout);
                  this.pendingOperations.delete(operationId);
                  logger.error(`Failed to send deactivation command to ${machineId}:`, error);
                  reject(new IoTError(`Failed to send deactivation command: ${error.message}`));
                } else {
                  clearTimeout(timeout);
                  this.pendingOperations.delete(operationId);
                  logger.info(`Deactivation command sent to machine ${machineId}`);
                  resolve(true);
                }
              });
            });
          },
          'deactivateMachine',
          machineId
        );
      },
      machineId,
      'deactivate',
      {
        allowOfflineMode: true, // Allow graceful degradation for deactivation
        offlineCallback: async () => {
          logger.warn(`Machine ${machineId} offline during deactivation, assuming success`);
          return true;
        }
      }
    );
  }

  /**
   * Request status from machine
   */
  async requestMachineStatus(machineId: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      throw new Error('MQTT client not connected');
    }

    const command: MachineCommand = {
      type: 'status',
      timestamp: new Date().toISOString()
    };

    const topic = `machines/${machineId}/commands/status`;
    
    return new Promise((resolve, reject) => {
      this.client!.publish(topic, JSON.stringify(command), { qos: 1 }, (error) => {
        if (error) {
          logger.error(`Failed to request status from ${machineId}:`, error);
          reject(error);
        } else {
          logger.info(`Status request sent to machine ${machineId}`);
          resolve(true);
        }
      });
    });
  }

  /**
   * Check connection status
   */
  isClientConnected(): boolean {
    return this.isConnected && this.client?.connected === true;
  }

  /**
   * Disconnect from MQTT broker
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await new Promise<void>((resolve) => {
        this.client!.end(false, {}, () => {
          logger.info('Disconnected from MQTT broker');
          this.isConnected = false;
          resolve();
        });
      });
    }
  }

  /**
   * Start offline detection monitoring
   */
  startOfflineDetection(): void {
    // Check for offline machines every 2 minutes
    setInterval(async () => {
      try {
        await this.machineService.checkOfflineMachines();
      } catch (error) {
        logger.error('Error during offline detection:', error);
      }
    }, 2 * 60 * 1000);

    logger.info('Offline detection monitoring started');
  }

  /**
   * Broadcast status request to all machines
   */
  async broadcastStatusRequest(): Promise<void> {
    if (!this.isConnected || !this.client) {
      throw new Error('MQTT client not connected');
    }

    const command: MachineCommand = {
      type: 'status',
      timestamp: new Date().toISOString()
    };

    const topic = 'machines/broadcast/commands/status';
    
    return new Promise((resolve, reject) => {
      this.client!.publish(topic, JSON.stringify(command), { qos: 1 }, (error) => {
        if (error) {
          logger.error('Failed to broadcast status request:', error);
          reject(error);
        } else {
          logger.info('Status request broadcasted to all machines');
          resolve();
        }
      });
    });
  }
}

export const mqttService = new MQTTService();