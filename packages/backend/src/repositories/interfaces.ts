import { PoolClient } from 'pg';
import { 
  User, Machine, UsageSession, Transaction, Notification,
  CreateUserInput, CreateMachineInput, CreateUsageSessionInput, 
  CreateTransactionInput, CreateNotificationInput,
  UpdateUserInput, UpdateMachineInput, UpdateUsageSessionInput,
  UpdateTransactionInput, UpdateNotificationInput
} from '../models/types.js';
import { BaseRepository, QueryOptions, SearchOptions } from './base.js';

export interface UserRepository extends BaseRepository<User, CreateUserInput, UpdateUserInput> {
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  updateBalance(userId: string, amount: number, client?: PoolClient): Promise<User | null>;
  deductBalance(userId: string, amount: number, client?: PoolClient): Promise<User | null>;
  findBySubscriptionStatus(status: 'active' | 'expired'): Promise<User[]>;
  updateLastDailyUse(userId: string, date: Date, client?: PoolClient): Promise<User | null>;
}

export interface MachineRepository extends BaseRepository<Machine, CreateMachineInput, UpdateMachineInput> {
  findByCode(code: string): Promise<Machine | null>;
  findByControllerId(controllerId: string): Promise<Machine | null>;
  findByStatus(status: 'online' | 'offline' | 'maintenance' | 'in_use'): Promise<Machine[]>;
  updateStatus(machineId: string, status: 'online' | 'offline' | 'maintenance' | 'in_use', client?: PoolClient): Promise<Machine | null>;
  updateHeartbeat(machineId: string, timestamp: Date, client?: PoolClient): Promise<Machine | null>;
  updateTemperature(machineId: string, temperature: number, client?: PoolClient): Promise<Machine | null>;
  incrementOperatingHours(machineId: string, hours: number, client?: PoolClient): Promise<Machine | null>;
  findMaintenanceRequired(): Promise<Machine[]>;
  findByLocation(location: string): Promise<Machine[]>;
}

export interface UsageSessionRepository extends BaseRepository<UsageSession, CreateUsageSessionInput, UpdateUsageSessionInput> {
  findByUserId(userId: string, options?: QueryOptions): Promise<UsageSession[]>;
  findByMachineId(machineId: string, options?: QueryOptions): Promise<UsageSession[]>;
  findByStatus(status: 'pending' | 'active' | 'completed' | 'failed'): Promise<UsageSession[]>;
  findActiveSession(machineId: string): Promise<UsageSession | null>;
  findUserDailyUsage(userId: string, date: Date): Promise<UsageSession[]>;
  updateStatus(sessionId: string, status: 'pending' | 'active' | 'completed' | 'failed', client?: PoolClient): Promise<UsageSession | null>;
  startSession(sessionId: string, startTime: Date, client?: PoolClient): Promise<UsageSession | null>;
  endSession(sessionId: string, endTime: Date, client?: PoolClient): Promise<UsageSession | null>;
  findByDateRange(startDate: Date, endDate: Date, options?: SearchOptions): Promise<UsageSession[]>;
}

export interface TransactionRepository extends BaseRepository<Transaction, CreateTransactionInput, UpdateTransactionInput> {
  findByUserId(userId: string, options?: QueryOptions): Promise<Transaction[]>;
  findByType(type: 'credit_added' | 'usage_payment' | 'subscription_payment', options?: QueryOptions): Promise<Transaction[]>;
  findByStatus(status: 'pending' | 'completed' | 'failed'): Promise<Transaction[]>;
  findByPaymentId(paymentId: string): Promise<Transaction | null>;
  updateStatus(transactionId: string, status: 'pending' | 'completed' | 'failed', client?: PoolClient): Promise<Transaction | null>;
  findByDateRange(startDate: Date, endDate: Date, options?: SearchOptions): Promise<Transaction[]>;
  getTotalRevenue(startDate?: Date, endDate?: Date): Promise<number>;
  getRevenueByMachine(startDate?: Date, endDate?: Date): Promise<Array<{ machineId: string; revenue: number }>>;
}

export interface NotificationRepository extends BaseRepository<Notification, CreateNotificationInput, UpdateNotificationInput> {
  findByType(type: 'maintenance_required' | 'machine_offline' | 'system_error', options?: QueryOptions): Promise<Notification[]>;
  findByMachineId(machineId: string, options?: QueryOptions): Promise<Notification[]>;
  findByWhatsappStatus(status: 'pending' | 'sent' | 'failed'): Promise<Notification[]>;
  updateWhatsappStatus(notificationId: string, status: 'pending' | 'sent' | 'failed', client?: PoolClient): Promise<Notification | null>;
  findPendingNotifications(): Promise<Notification[]>;
  markAsSent(notificationId: string, client?: PoolClient): Promise<Notification | null>;
  markAsFailed(notificationId: string, client?: PoolClient): Promise<Notification | null>;
}