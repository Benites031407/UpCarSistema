import dotenv from 'dotenv'
import { createLogger } from './utils/logger.js'
import { MQTTClient } from './mqtt/client.js'
import { RelayController } from './hardware/relay.js'

// Load environment variables
dotenv.config()

const logger = createLogger('iot-controller')

async function main() {
  try {
    logger.info('Starting IoT Controller...')
    
    const controllerId = process.env.CONTROLLER_ID || 'controller-001'
    const machineId = process.env.MACHINE_ID || 'machine-001'
    
    logger.info(`Controller ID: ${controllerId}`)
    logger.info(`Machine ID: ${machineId}`)
    
    // Initialize hardware controllers
    const relayController = new RelayController()
    
    // Initialize MQTT client
    const mqttClient = new MQTTClient(controllerId, machineId, relayController)
    
    await mqttClient.connect()
    
    logger.info('IoT Controller started successfully')
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down IoT Controller...')
      await mqttClient.disconnect()
      relayController.cleanup()
      process.exit(0)
    })
    
  } catch (error) {
    logger.error('Failed to start IoT Controller:', error)
    process.exit(1)
  }
}

main()