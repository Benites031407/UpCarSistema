import mqtt from 'mqtt'
import { createLogger } from '../utils/logger.js'
import type { RelayController } from '../hardware/relay.js'

const logger = createLogger('mqtt-client')

export class MQTTClient {
  private client: mqtt.MqttClient | null = null
  private controllerId: string
  private machineId: string
  private relayController: RelayController
  private heartbeatInterval: NodeJS.Timeout | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private currentSessionId: string | null = null

  constructor(controllerId: string, machineId: string, relayController: RelayController) {
    this.controllerId = controllerId
    this.machineId = machineId
    this.relayController = relayController
  }

  async connect(): Promise<void> {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883'
    
    this.client = mqtt.connect(brokerUrl, {
      clientId: this.controllerId,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
    })

    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Failed to create MQTT client'))
        return
      }

      this.client.on('connect', () => {
        logger.info('Connected to MQTT broker')
        this.isConnected = true
        this.reconnectAttempts = 0
        this.subscribeToTopics()
        this.startHeartbeat()
        resolve()
      })

      this.client.on('error', (error) => {
        logger.error('MQTT connection error:', error)
        this.isConnected = false
        reject(error)
      })

      this.client.on('offline', () => {
        logger.warn('MQTT client went offline')
        this.isConnected = false
        this.stopIntervals()
      })

      this.client.on('reconnect', () => {
        this.reconnectAttempts++
        logger.info(`MQTT reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          logger.error('Max reconnection attempts reached')
          this.client?.end()
        }
      })

      this.client.on('message', this.handleMessage.bind(this))
    })
  }

  private subscribeToTopics(): void {
    if (!this.client) return

    const topics = [
      `machines/${this.machineId}/commands/activate`,
      `machines/${this.machineId}/commands/deactivate`,
      `machines/${this.machineId}/commands/status`,
      `machines/broadcast/commands/status`,
      `controllers/${this.controllerId}/commands/status`,
    ]

    topics.forEach(topic => {
      this.client!.subscribe(topic, (err) => {
        if (err) {
          logger.error(`Failed to subscribe to ${topic}:`, err)
        } else {
          logger.info(`Subscribed to ${topic}`)
        }
      })
    })
  }

  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    logger.info(`Received message on ${topic}: ${message.toString()}`)
    
    try {
      const payload = JSON.parse(message.toString())
      
      if (topic.includes('/commands/activate')) {
        await this.handleActivateCommand(payload)
      } else if (topic.includes('/commands/deactivate')) {
        await this.handleDeactivateCommand(payload)
      } else if (topic.includes('/commands/status') || topic.includes('broadcast')) {
        await this.handleStatusCommand()
      }
    } catch (error) {
      logger.error('Error processing message:', error)
      await this.publishError('Message processing failed', error)
    }
  }

  private async handleActivateCommand(payload: any): Promise<void> {
    const duration = payload.duration || 0
    const sessionId = payload.sessionId
    
    // Validate required fields
    if (!sessionId) {
      logger.error('Activation command missing sessionId')
      await this.publishError('Activation failed', new Error('Missing sessionId'))
      return
    }

    if (!duration || duration <= 0 || duration > 30) {
      logger.error(`Invalid duration: ${duration} minutes`)
      await this.publishError('Activation failed', new Error(`Invalid duration: ${duration} minutes`))
      return
    }

    // Check if machine is already active
    if (this.relayController.isActive()) {
      logger.warn(`Machine is already active (session: ${this.currentSessionId})`)
      await this.publishError('Activation failed', new Error('Machine is already active'))
      return
    }

    logger.info(`Activating machine for ${duration} minutes (session: ${sessionId})`)
    
    try {
      this.relayController.activate(duration * 60 * 1000) // Convert to milliseconds
      this.currentSessionId = sessionId
      
      await this.publishStatus('active', { duration, sessionId })
      
      // Schedule automatic deactivation report
      setTimeout(async () => {
        if (this.currentSessionId === sessionId) {
          logger.info(`Session ${sessionId} completed automatically`)
          this.relayController.deactivate()
          await this.publishStatus('inactive', { 
            sessionId,
            reason: 'duration_completed'
          })
          this.currentSessionId = null
        }
      }, duration * 60 * 1000)
      
    } catch (error) {
      logger.error('Failed to activate machine:', error)
      await this.publishError('Machine activation failed', error)
    }
  }

  private async handleDeactivateCommand(payload?: any): Promise<void> {
    const sessionId = payload?.sessionId || this.currentSessionId
    
    logger.info(`Deactivating machine (session: ${sessionId})`)
    
    try {
      this.relayController.deactivate()
      await this.publishStatus('inactive', { 
        sessionId,
        reason: 'manual_deactivation'
      })
      this.currentSessionId = null
    } catch (error) {
      logger.error('Failed to deactivate machine:', error)
      await this.publishError('Machine deactivation failed', error)
    }
  }

  private async handleStatusCommand(): Promise<void> {
    await this.publishStatus()
  }

  private async publishStatus(status?: string, extra?: any): Promise<void> {
    if (!this.client || !this.isConnected) return

    try {
      const statusData = {
        controllerId: this.controllerId,
        machineId: this.machineId,
        status: status || (this.relayController.isActive() ? 'active' : 'inactive'),
        timestamp: new Date().toISOString(),
        sessionId: this.currentSessionId,
        ...extra
      }

      const topic = `machines/${this.machineId}/status`
      
      this.client.publish(topic, JSON.stringify(statusData), { qos: 1 }, (error) => {
        if (error) {
          logger.error('Failed to publish status:', error)
        } else {
          logger.debug(`Status published: ${statusData.status}`)
        }
      })
    } catch (error) {
      logger.error('Error publishing status:', error)
    }
  }

  private startHeartbeat(): void {
    const interval = parseInt(process.env.HEARTBEAT_INTERVAL || '60000')
    
    this.heartbeatInterval = setInterval(async () => {
      if (this.isConnected) {
        await this.publishHeartbeat()
      }
    }, interval)
    
    logger.info(`Heartbeat started with ${interval}ms interval`)
  }

  private async publishHeartbeat(): Promise<void> {
    if (!this.client || !this.isConnected) return

    try {
      const heartbeatData = {
        controllerId: this.controllerId,
        machineId: this.machineId,
        timestamp: new Date().toISOString(),
        status: this.relayController.isActive() ? 'active' : 'inactive',
        sessionId: this.currentSessionId
      }

      const topic = `machines/${this.machineId}/heartbeat`
      
      this.client.publish(topic, JSON.stringify(heartbeatData), { qos: 0 }, (error) => {
        if (error) {
          logger.error('Failed to publish heartbeat:', error)
        } else {
          logger.debug('Heartbeat sent')
        }
      })
    } catch (error) {
      logger.error('Error publishing heartbeat:', error)
    }
  }



  private publishError(message: string, error: any): void {
    if (!this.client || !this.isConnected) return

    const errorData = {
      controllerId: this.controllerId,
      machineId: this.machineId,
      type: 'error',
      message,
      error: error.message || error.toString(),
      timestamp: new Date().toISOString()
    }

    const topic = `machines/${this.machineId}/errors`
    
    this.client.publish(topic, JSON.stringify(errorData), { qos: 1 }, (error) => {
      if (error) {
        logger.error('Failed to publish error:', error)
      }
    })
  }

  private stopIntervals(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  async disconnect(): Promise<void> {
    this.stopIntervals()
    
    if (this.client) {
      await new Promise<void>((resolve) => {
        this.client!.end(false, {}, () => {
          logger.info('Disconnected from MQTT broker')
          this.isConnected = false
          resolve()
        })
      })
    }
    
    // Cleanup hardware resources
    this.relayController.cleanup()
  }

  /**
   * Get connection status
   */
  isClientConnected(): boolean {
    return this.isConnected && this.client?.connected === true
  }

  /**
   * Get current machine status
   */
  getMachineStatus(): any {
    return {
      controllerId: this.controllerId,
      machineId: this.machineId,
      status: this.relayController.isActive() ? 'active' : 'inactive',
      sessionId: this.currentSessionId,
      isConnected: this.isConnected,
      timestamp: new Date().toISOString()
    }
  }
}