import { createLogger } from '../utils/logger.js';
import { mqttService } from './mqttService.js';
import { RepositoryFactory } from '../repositories/index.js';

const logger = createLogger('session-mqtt-handler');

export class SessionMqttHandler {
  private usageSessionRepo = RepositoryFactory.getUsageSessionRepository();
  // private machineRepo = RepositoryFactory.getMachineRepository();

  /**
   * Handle session activation with MQTT
   */
  async activateSession(sessionId: string): Promise<void> {
    try {
      const session = await this.usageSessionRepo.findById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Send MQTT activation command
      if (mqttService.isClientConnected()) {
        await mqttService.activateMachine(session.machineId, sessionId, session.duration);
        logger.info(`MQTT activation command sent for session ${sessionId}`);
      } else {
        logger.warn(`MQTT not connected, session ${sessionId} activated without IoT command`);
      }
    } catch (error) {
      logger.error(`Failed to send MQTT activation for session ${sessionId}:`, error);
      // Don't throw error - session should still be activated even if MQTT fails
    }
  }

  /**
   * Handle session termination with MQTT
   */
  async terminateSession(sessionId: string): Promise<void> {
    try {
      const session = await this.usageSessionRepo.findById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Send MQTT deactivation command
      if (mqttService.isClientConnected()) {
        await mqttService.deactivateMachine(session.machineId, sessionId);
        logger.info(`MQTT deactivation command sent for session ${sessionId}`);
      } else {
        logger.warn(`MQTT not connected, session ${sessionId} terminated without IoT command`);
      }
    } catch (error) {
      logger.error(`Failed to send MQTT deactivation for session ${sessionId}:`, error);
      // Don't throw error - session should still be terminated even if MQTT fails
    }
  }

  /**
   * Handle emergency stop for a machine
   */
  async emergencyStop(machineId: string): Promise<void> {
    try {
      if (mqttService.isClientConnected()) {
        await mqttService.deactivateMachine(machineId);
        logger.info(`Emergency stop command sent for machine ${machineId}`);
      } else {
        logger.warn(`MQTT not connected, emergency stop for machine ${machineId} not sent`);
      }
    } catch (error) {
      logger.error(`Failed to send emergency stop for machine ${machineId}:`, error);
    }
  }

  /**
   * Request status from all machines
   */
  async requestAllMachineStatus(): Promise<void> {
    try {
      if (mqttService.isClientConnected()) {
        await mqttService.broadcastStatusRequest();
        logger.info('Status request broadcasted to all machines');
      } else {
        logger.warn('MQTT not connected, status request not sent');
      }
    } catch (error) {
      logger.error('Failed to broadcast status request:', error);
    }
  }

  /**
   * Request status from specific machine
   */
  async requestMachineStatus(machineId: string): Promise<void> {
    try {
      if (mqttService.isClientConnected()) {
        await mqttService.requestMachineStatus(machineId);
        logger.info(`Status request sent to machine ${machineId}`);
      } else {
        logger.warn(`MQTT not connected, status request for machine ${machineId} not sent`);
      }
    } catch (error) {
      logger.error(`Failed to request status for machine ${machineId}:`, error);
    }
  }
}

export const sessionMqttHandler = new SessionMqttHandler();