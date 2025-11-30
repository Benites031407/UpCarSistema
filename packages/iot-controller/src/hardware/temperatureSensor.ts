import { createLogger } from '../utils/logger.js';

const logger = createLogger('temperature-sensor');

export interface TemperatureReading {
  temperature: number;
  humidity?: number;
  timestamp: Date;
}

export class TemperatureSensor {
  private sensorType: string;
  private isSimulated: boolean = false;

  constructor() {
    this.sensorType = process.env.TEMPERATURE_SENSOR_TYPE || 'DHT22';
    this.initializeSensor();
  }

  private async initializeSensor(): Promise<void> {
    try {
      // Try to initialize actual sensor hardware
      // This would typically involve GPIO setup for DHT22 or similar sensors
      logger.info(`Temperature sensor initialized: ${this.sensorType}`);
      
      // For now, we'll simulate the sensor since actual hardware setup
      // requires specific GPIO libraries that may not be available in all environments
      this.isSimulated = true;
      logger.info('Running in simulation mode - generating mock temperature readings');
    } catch (error) {
      logger.warn('Failed to initialize hardware sensor, falling back to simulation:', error);
      this.isSimulated = true;
    }
  }

  /**
   * Read temperature from sensor
   */
  async readTemperature(): Promise<TemperatureReading> {
    if (this.isSimulated) {
      return this.simulateReading();
    }

    try {
      // In a real implementation, this would read from actual hardware
      // For DHT22: const reading = await dht22.read();
      
      // For now, return simulated data
      return this.simulateReading();
    } catch (error) {
      logger.error('Error reading temperature sensor:', error);
      // Fall back to simulation on error
      return this.simulateReading();
    }
  }

  /**
   * Simulate temperature reading for testing/development
   */
  private simulateReading(): TemperatureReading {
    // Simulate realistic temperature variations (20-35°C)
    const baseTemp = 25;
    const variation = (Math.random() - 0.5) * 10; // ±5°C variation
    const temperature = Math.round((baseTemp + variation) * 10) / 10; // Round to 1 decimal

    // Simulate humidity if sensor supports it
    const humidity = Math.round((50 + (Math.random() - 0.5) * 40) * 10) / 10; // 30-70% range

    return {
      temperature,
      humidity,
      timestamp: new Date()
    };
  }

  /**
   * Check if temperature is within safe operating range
   */
  isTemperatureSafe(temperature: number): boolean {
    const minTemp = parseFloat(process.env.MIN_SAFE_TEMP || '0');
    const maxTemp = parseFloat(process.env.MAX_SAFE_TEMP || '50');
    
    return temperature >= minTemp && temperature <= maxTemp;
  }

  /**
   * Check if temperature is critically high (requires immediate shutdown)
   */
  isTemperatureCritical(temperature: number): boolean {
    const criticalTemp = parseFloat(process.env.CRITICAL_TEMP || '60');
    return temperature >= criticalTemp;
  }

  /**
   * Get temperature safety status with details
   */
  getTemperatureSafetyStatus(temperature: number): {
    isSafe: boolean;
    isCritical: boolean;
    status: 'safe' | 'warning' | 'critical';
    message: string;
  } {
    const minTemp = parseFloat(process.env.MIN_SAFE_TEMP || '0');
    const maxTemp = parseFloat(process.env.MAX_SAFE_TEMP || '50');
    const criticalTemp = parseFloat(process.env.CRITICAL_TEMP || '60');

    if (temperature >= criticalTemp) {
      return {
        isSafe: false,
        isCritical: true,
        status: 'critical',
        message: `Critical temperature: ${temperature}°C (>= ${criticalTemp}°C)`
      };
    }

    if (temperature < minTemp || temperature > maxTemp) {
      return {
        isSafe: false,
        isCritical: false,
        status: 'warning',
        message: `Temperature out of safe range: ${temperature}°C (safe: ${minTemp}°C - ${maxTemp}°C)`
      };
    }

    return {
      isSafe: true,
      isCritical: false,
      status: 'safe',
      message: `Temperature normal: ${temperature}°C`
    };
  }

  /**
   * Get sensor status
   */
  getStatus(): {
    type: string;
    isSimulated: boolean;
    isHealthy: boolean;
  } {
    return {
      type: this.sensorType,
      isSimulated: this.isSimulated,
      isHealthy: true // In real implementation, this would check sensor health
    };
  }

  /**
   * Cleanup sensor resources
   */
  cleanup(): void {
    logger.info('Temperature sensor cleaned up');
  }
}