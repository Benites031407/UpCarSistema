// Repository implementations
export { PostgresUserRepository } from './user.js';
export { PostgresMachineRepository } from './machine.js';
export { PostgresUsageSessionRepository } from './usageSession.js';
export { PostgresTransactionRepository } from './transaction.js';
export { PostgresNotificationRepository } from './notification.js';

// Repository interfaces
export * from './interfaces.js';
export * from './base.js';

// Repository factory for dependency injection
import { 
  UserRepository, 
  MachineRepository, 
  UsageSessionRepository, 
  TransactionRepository, 
  NotificationRepository 
} from './interfaces.js';
import { PostgresUserRepository } from './user.js';
import { PostgresMachineRepository } from './machine.js';
import { PostgresUsageSessionRepository } from './usageSession.js';
import { PostgresTransactionRepository } from './transaction.js';
import { PostgresNotificationRepository } from './notification.js';

export class RepositoryFactory {
  private static userRepository: UserRepository;
  private static machineRepository: MachineRepository;
  private static usageSessionRepository: UsageSessionRepository;
  private static transactionRepository: TransactionRepository;
  private static notificationRepository: NotificationRepository;

  static getUserRepository(): UserRepository {
    if (!this.userRepository) {
      this.userRepository = new PostgresUserRepository();
    }
    return this.userRepository;
  }

  static getMachineRepository(): MachineRepository {
    if (!this.machineRepository) {
      this.machineRepository = new PostgresMachineRepository();
    }
    return this.machineRepository;
  }

  static getUsageSessionRepository(): UsageSessionRepository {
    if (!this.usageSessionRepository) {
      this.usageSessionRepository = new PostgresUsageSessionRepository();
    }
    return this.usageSessionRepository;
  }

  static getTransactionRepository(): TransactionRepository {
    if (!this.transactionRepository) {
      this.transactionRepository = new PostgresTransactionRepository();
    }
    return this.transactionRepository;
  }

  static getNotificationRepository(): NotificationRepository {
    if (!this.notificationRepository) {
      this.notificationRepository = new PostgresNotificationRepository();
    }
    return this.notificationRepository;
  }
}