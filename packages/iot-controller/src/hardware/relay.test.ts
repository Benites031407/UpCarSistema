import { describe, it, expect } from 'vitest'
import { RelayController } from './relay'

describe('RelayController', () => {
  it('should initialize in simulation mode', () => {
    const relay = new RelayController()
    expect(relay).toBeDefined()
    expect(relay.isActive()).toBe(false)
  })

  it('should activate and deactivate', () => {
    const relay = new RelayController()
    
    relay.activate(1000) // 1 second
    expect(relay.isActive()).toBe(true)
    
    relay.deactivate()
    expect(relay.isActive()).toBe(false)
  })

  it('should reject invalid activation durations', () => {
    const relay = new RelayController()
    
    expect(() => relay.activate(0)).toThrow('Invalid activation duration')
    expect(() => relay.activate(-1000)).toThrow('Invalid activation duration')
    expect(() => relay.activate(2000000)).toThrow('Invalid activation duration') // > 30 minutes
  })

  it('should prevent double activation', () => {
    const relay = new RelayController()
    
    relay.activate(1000)
    expect(() => relay.activate(1000)).toThrow('Relay is already active')
    
    relay.deactivate()
  })

  it('should provide status information', () => {
    const relay = new RelayController()
    
    let status = relay.getStatus()
    expect(status.isActive).toBe(false)
    expect(status.activationStartTime).toBeNull()
    expect(status.pin).toBe(18)
    
    relay.activate(1000)
    status = relay.getStatus()
    expect(status.isActive).toBe(true)
    expect(status.activationStartTime).toBeInstanceOf(Date)
    expect(status.activeDurationMs).toBeGreaterThanOrEqual(0)
    
    relay.deactivate()
  })

  it('should handle emergency stop', () => {
    const relay = new RelayController()
    
    relay.activate(5000)
    expect(relay.isActive()).toBe(true)
    
    relay.emergencyStop()
    expect(relay.isActive()).toBe(false)
  })
})