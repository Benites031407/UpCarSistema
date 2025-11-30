import { describe, it, expect, beforeEach } from 'vitest';
import { TemperatureSensor } from './temperatureSensor.js';

describe('TemperatureSensor', () => {
  let sensor: TemperatureSensor;

  beforeEach(() => {
    sensor = new TemperatureSensor();
  });

  it('should initialize correctly', () => {
    const status = sensor.getStatus();
    expect(status.isHealthy).toBe(true);
    expect(status.type).toBeDefined();
  });

  it('should read temperature successfully', async () => {
    const reading = await sensor.readTemperature();
    
    expect(reading).toBeDefined();
    expect(reading.temperature).toBeTypeOf('number');
    expect(reading.timestamp).toBeInstanceOf(Date);
    expect(reading.temperature).toBeGreaterThan(0);
    expect(reading.temperature).toBeLessThan(100);
  });

  it('should validate temperature safety correctly', () => {
    expect(sensor.isTemperatureSafe(25)).toBe(true);
    expect(sensor.isTemperatureSafe(-10)).toBe(false);
    expect(sensor.isTemperatureSafe(60)).toBe(false);
  });

  it('should detect critical temperatures', () => {
    expect(sensor.isTemperatureCritical(25)).toBe(false);
    expect(sensor.isTemperatureCritical(60)).toBe(true);
    expect(sensor.isTemperatureCritical(70)).toBe(true);
  });

  it('should provide detailed safety status', () => {
    let status = sensor.getTemperatureSafetyStatus(25);
    expect(status.isSafe).toBe(true);
    expect(status.isCritical).toBe(false);
    expect(status.status).toBe('safe');

    status = sensor.getTemperatureSafetyStatus(55);
    expect(status.isSafe).toBe(false);
    expect(status.isCritical).toBe(false);
    expect(status.status).toBe('warning');

    status = sensor.getTemperatureSafetyStatus(65);
    expect(status.isSafe).toBe(false);
    expect(status.isCritical).toBe(true);
    expect(status.status).toBe('critical');
  });

  it('should handle cleanup gracefully', () => {
    expect(() => sensor.cleanup()).not.toThrow();
  });
});