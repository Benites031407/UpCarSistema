import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MQTTClient } from './client.js'
import { RelayController } from '../hardware/relay.js'

// Mock the MQTT library to avoid actual network connections in tests
vi.mock('mqtt', () => ({
  default: {
    connect: vi.fn(() => ({
      on: vi.fn(),
      subscribe: vi.fn(),
      publish: vi.fn(),
      end: vi.fn()
    }))
  }
}))

describe('MQTTClient', () => {
  let mqttClient: MQTTClient
  let relayController: RelayController

  beforeEach(() => {
    relayController = new RelayController()
    mqttClient = new MQTTClient('test-controller', 'test-machine', relayController)
  })

  afterEach(async () => {
    if (mqttClient) {
      await mqttClient.disconnect()
    }
    relayController.cleanup()
  })

  it('should initialize with correct parameters', () => {
    expect(mqttClient).toBeDefined()
    expect(mqttClient.isClientConnected()).toBe(false)
  })

  it('should provide machine status', async () => {
    const status = await mqttClient.getMachineStatus()
    
    expect(status).toBeDefined()
    expect(status.controllerId).toBe('test-controller')
    expect(status.machineId).toBe('test-machine')
    expect(status.status).toBe('inactive')
    expect(status.temperature).toBeTypeOf('number')
    expect(status.isConnected).toBe(false)
    expect(status.timestamp).toBeDefined()
  })

  it('should handle cleanup gracefully', async () => {
    expect(async () => await mqttClient.disconnect()).not.toThrow()
  })
})