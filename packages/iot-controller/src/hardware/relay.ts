import { createLogger } from '../utils/logger.js'

const logger = createLogger('relay-controller')

export class RelayController {
  private isRelayActive = false
  private activeTimeout: NodeJS.Timeout | null = null
  private relayPin1: number
  private relayPin2: number
  private gpio1: any = null
  private gpio2: any = null
  private maxDurationMs: number
  private activationStartTime: Date | null = null

  constructor() {
    this.relayPin1 = parseInt(process.env.RELAY_PIN || '18')
    this.relayPin2 = parseInt(process.env.RELAY_PIN_2 || '23')
    this.maxDurationMs = parseInt(process.env.MAX_ACTIVATION_DURATION_MS || '1800000') // 30 minutes default
    this.initializeGPIO()
  }

  private async initializeGPIO(): Promise<void> {
    try {
      // Try to import pigpio, but handle gracefully if not available (e.g., on Windows)
      const pigpio = await import('pigpio') as any
      this.gpio1 = new pigpio.Gpio(this.relayPin1, { mode: pigpio.Gpio.OUTPUT })
      this.gpio2 = new pigpio.Gpio(this.relayPin2, { mode: pigpio.Gpio.OUTPUT })
      logger.info(`Relay controller initialized on GPIO pins ${this.relayPin1} and ${this.relayPin2}`)
    } catch (error) {
      logger.info(`Relay controller initialized in simulation mode (pins ${this.relayPin1}, ${this.relayPin2}) - pigpio not available`)
    }
  }

  activate(durationMs: number): void {
    if (this.isRelayActive) {
      logger.warn('Relay is already active')
      throw new Error('Relay is already active')
    }

    // Safety check: validate duration
    if (durationMs <= 0 || durationMs > this.maxDurationMs) {
      logger.error(`Invalid activation duration: ${durationMs}ms (max: ${this.maxDurationMs}ms)`)
      throw new Error(`Invalid activation duration: ${durationMs}ms`)
    }

    logger.info(`Activating both relays for ${durationMs}ms (${Math.round(durationMs / 60000)} minutes)`)
    
    try {
      // Control GPIO pins if available, otherwise simulate
      if (this.gpio1 && this.gpio2) {
        this.gpio1.digitalWrite(1) // Turn on relay 1
        this.gpio2.digitalWrite(1) // Turn on relay 2
        logger.info(`GPIO pins ${this.relayPin1} and ${this.relayPin2} set to HIGH`)
      } else {
        logger.info(`Simulated relay activation on pins ${this.relayPin1} and ${this.relayPin2}`)
      }
      
      this.isRelayActive = true
      this.activationStartTime = new Date()
      
      // Set timeout to automatically deactivate
      this.activeTimeout = setTimeout(() => {
        logger.info('Automatic deactivation triggered by timeout')
        this.deactivate()
      }, durationMs)
      
    } catch (error) {
      logger.error('Failed to activate relay:', error)
      this.isRelayActive = false
      this.activationStartTime = null
      throw error
    }
  }

  deactivate(): void {
    if (!this.isRelayActive) {
      logger.warn('Relay is already inactive')
      return
    }

    const activeDuration = this.activationStartTime 
      ? Date.now() - this.activationStartTime.getTime() 
      : 0

    logger.info(`Deactivating relay (was active for ${Math.round(activeDuration / 1000)}s)`)
    
    try {
      // Clear any existing timeout
      if (this.activeTimeout) {
        clearTimeout(this.activeTimeout)
        this.activeTimeout = null
      }
      
      // Control GPIO pins if available
      if (this.gpio1 && this.gpio2) {
        this.gpio1.digitalWrite(0) // Turn off relay 1
        this.gpio2.digitalWrite(0) // Turn off relay 2
        logger.info(`GPIO pins ${this.relayPin1} and ${this.relayPin2} set to LOW`)
      } else {
        logger.info(`Simulated relay deactivation on pins ${this.relayPin1} and ${this.relayPin2}`)
      }
      
      this.isRelayActive = false
      this.activationStartTime = null
      
    } catch (error) {
      logger.error('Error during relay deactivation:', error)
      // Force state reset even if GPIO operation fails
      this.isRelayActive = false
      this.activationStartTime = null
      throw error
    }
  }

  isActive(): boolean {
    return this.isRelayActive
  }

  /**
   * Get current activation status with timing information
   */
  getStatus(): {
    isActive: boolean
    activationStartTime: Date | null
    activeDurationMs: number
    pin1: number
    pin2: number
  } {
    const activeDurationMs = this.activationStartTime 
      ? Date.now() - this.activationStartTime.getTime() 
      : 0

    return {
      isActive: this.isRelayActive,
      activationStartTime: this.activationStartTime,
      activeDurationMs,
      pin1: this.relayPin1,
      pin2: this.relayPin2
    }
  }

  /**
   * Emergency stop - immediately deactivate relay
   */
  emergencyStop(): void {
    logger.warn('Emergency stop triggered')
    try {
      if (this.activeTimeout) {
        clearTimeout(this.activeTimeout)
        this.activeTimeout = null
      }
      
      if (this.gpio1 && this.gpio2) {
        this.gpio1.digitalWrite(0)
        this.gpio2.digitalWrite(0)
      }
      
      this.isRelayActive = false
      this.activationStartTime = null
      
      logger.info('Emergency stop completed')
    } catch (error) {
      logger.error('Error during emergency stop:', error)
      // Force state reset
      this.isRelayActive = false
      this.activationStartTime = null
    }
  }

  cleanup(): void {
    logger.info('Cleaning up relay controller...')
    
    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout)
      this.activeTimeout = null
    }
    
    if (this.isRelayActive) {
      this.deactivate()
    }
    
    logger.info('Relay controller cleaned up')
  }
}