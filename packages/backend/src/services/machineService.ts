import { PostgresMachineRepository } from '../repositories/machine.js';
// import { PostgresNotificationRepository } from '../repositories/notification.js';
import { Machine, UpdateMachineInput } from '../models/types.js';
import { createLogger } from '../utils/logger.js';
import { NotificationService } from './notificationService.js';
import { webSocketService } from './websocketService.js';

const logger = createLogger('machine-service');

export class MachineService {
  private machineRepo: PostgresMachineRepository;
  // private notificationRepo: PostgresNotificationRepository;
  private notificationService: NotificationService;

  constructor() {
    this.machineRepo = new PostgresMachineRepository();
    // this.notificationRepo = new PostgresNotificationRepository();
    this.notificationService = new NotificationService();
  }

  /**
   * Check if a machine is available for activation
   */
  async checkMachineAvailability(machineId: string): Promise<{
    available: boolean;
    reason?: string;
    machine: Machine;
  }> {
    const machine = await this.machineRepo.findById(machineId);
    if (!machine) {
      throw new Error('Machine not found');
    }

    // Check if machine is in maintenance mode
    if (machine.status === 'maintenance') {
      return {
        available: false,
        reason: 'Machine is in maintenance mode',
        machine
      };
    }

    // Check if machine is offline
    if (machine.status === 'offline') {
      return {
        available: false,
        reason: 'Machine is offline',
        machine
      };
    }

    // Check if machine is already in use
    if (machine.status === 'in_use') {
      return {
        available: false,
        reason: 'Machine is currently in use',
        machine
      };
    }

    // Check operating hours
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    const isWithinOperatingHours = currentTime >= machine.operatingHours.start && 
                                  currentTime <= machine.operatingHours.end;

    if (!isWithinOperatingHours) {
      return {
        available: false,
        reason: `Machine operates from ${machine.operatingHours.start} to ${machine.operatingHours.end}`,
        machine
      };
    }

    // Check if maintenance is required
    if (machine.currentOperatingHours >= machine.maintenanceInterval) {
      // Check if maintenance override is active
      if (machine.maintenanceOverride) {
        logger.warn(`Machine ${machine.code} exceeds maintenance interval but override is active`);
        return {
          available: true,
          machine,
          maintenanceWarning: true,
          reason: 'Machine requires maintenance but override is active'
        };
      }
      
      // Automatically set to maintenance mode
      await this.setMaintenanceMode(machineId, 'Automatic maintenance required');
      
      return {
        available: false,
        reason: 'Machine requires maintenance',
        machine: { ...machine, status: 'maintenance' }
      };
    }

    return {
      available: true,
      machine
    };
  }

  /**
   * Set machine to maintenance mode and create notification
   */
  async setMaintenanceMode(machineId: string, reason: string): Promise<Machine> {
    const machine = await this.machineRepo.updateStatus(machineId, 'maintenance');
    if (!machine) {
      throw new Error('Machine not found');
    }

    // Send maintenance notification
    await this.notificationService.sendMaintenanceNotification(
      machineId,
      machine.code,
      machine.location,
      reason
    );

    // Broadcast real-time update
    webSocketService.broadcastMachineUpdate(machine);

    logger.info(`Machine ${machine.code} set to maintenance mode: ${reason}`);
    
    return machine;
  }

  /**
   * Update machine heartbeat and check for offline status
   */
  async updateHeartbeat(machineId: string, temperature?: number): Promise<Machine> {
    const now = new Date();
    
    const updateData: UpdateMachineInput = {
      lastHeartbeat: now,
      status: 'online'
    };

    if (temperature !== undefined) {
      updateData.temperature = temperature;
    }

    const machine = await this.machineRepo.update(machineId, updateData);
    if (!machine) {
      throw new Error('Machine not found');
    }

    // Broadcast heartbeat update
    webSocketService.broadcastMachineHeartbeat(machineId, {
      temperature,
      timestamp: now
    });

    // Broadcast machine update if status changed
    webSocketService.broadcastMachineUpdate(machine);

    return machine;
  }

  /**
   * Check for machines that haven't sent heartbeat recently and mark as offline
   */
  async checkOfflineMachines(): Promise<void> {
    // Check both online and in_use machines for offline status
    const onlineMachines = await this.machineRepo.findByStatus('online');
    const inUseMachines = await this.machineRepo.findByStatus('in_use');
    const machines = [...onlineMachines, ...inUseMachines];
    
    const now = new Date();
    const offlineThreshold = 90 * 1000; // 90 seconds (3x heartbeat interval of 30s)

    for (const machine of machines) {
      if (machine.lastHeartbeat) {
        const timeSinceHeartbeat = now.getTime() - machine.lastHeartbeat.getTime();
        
        if (timeSinceHeartbeat > offlineThreshold) {
          const updatedMachine = await this.machineRepo.updateStatus(machine.id, 'offline');
          
          if (updatedMachine) {
            // Send offline notification
            await this.notificationService.sendOfflineNotification(
              machine.id,
              machine.code,
              machine.location,
              machine.lastHeartbeat
            );

            // Broadcast real-time update
            webSocketService.broadcastMachineUpdate(updatedMachine);

            logger.warn(`Machine ${machine.code} marked as offline - no heartbeat for ${Math.round(timeSinceHeartbeat / 1000)} seconds`);
          }
        }
      }
    }
  }

  /**
   * Increment machine operating hours after usage
   */
  async incrementOperatingHours(machineId: string, minutes: number, client?: any): Promise<Machine> {
    // Store minutes directly instead of converting to hours
    const machine = await this.machineRepo.incrementOperatingHours(machineId, minutes, client);
    
    if (!machine) {
      throw new Error('Machine not found');
    }

    // Check if maintenance is now required
    if (machine.currentOperatingHours >= machine.maintenanceInterval) {
      await this.setMaintenanceMode(machineId, 'Operating hours limit reached');
    }

    return machine;
  }

  /**
   * Reset machine maintenance (admin function)
   */
  async resetMaintenance(machineId: string): Promise<Machine> {
    const machine = await this.machineRepo.update(machineId, {
      currentOperatingHours: 0,
      status: 'online'
    });

    if (!machine) {
      throw new Error('Machine not found');
    }

    // Broadcast real-time update
    webSocketService.broadcastMachineUpdate(machine);

    logger.info(`Maintenance reset for machine ${machine.code}`);
    
    return machine;
  }

  /**
   * Get machines requiring maintenance
   */
  async getMaintenanceRequired(): Promise<Machine[]> {
    return await this.machineRepo.findMaintenanceRequired();
  }

  /**
   * Search machines by location
   */
  async searchByLocation(location: string): Promise<Machine[]> {
    return await this.machineRepo.findByLocation(location);
  }

  /**
   * Get machine by ID
   */
  async getMachineById(machineId: string): Promise<Machine | null> {
    return await this.machineRepo.findById(machineId);
  }

  /**
   * Get machine statistics
   */
  async getMachineStats(): Promise<{
    total: number;
    online: number;
    offline: number;
    maintenance: number;
    inUse: number;
  }> {
    const [online, offline, maintenance, inUse] = await Promise.all([
      this.machineRepo.findByStatus('online'),
      this.machineRepo.findByStatus('offline'),
      this.machineRepo.findByStatus('maintenance'),
      this.machineRepo.findByStatus('in_use')
    ]);

    return {
      total: online.length + offline.length + maintenance.length + inUse.length,
      online: online.length,
      offline: offline.length,
      maintenance: maintenance.length,
      inUse: inUse.length
    };
  }
}

export const machineService = new MachineService();