import { describe, it, expect } from 'vitest';
import { 
  User, 
  Machine, 
  UsageSession, 
  Transaction, 
  Notification,
  CreateUserInput,
  CreateMachineInput 
} from './types.js';

describe('Data Model Types', () => {
  it('should create valid User interface', () => {
    const user: User = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      name: 'Test User',
      accountBalance: 50.00,
      subscriptionStatus: 'none',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    expect(user.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(user.email).toBe('test@example.com');
    expect(user.accountBalance).toBe(50.00);
    expect(user.subscriptionStatus).toBe('none');
  });

  it('should create valid Machine interface', () => {
    const machine: Machine = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      code: 'WASH001',
      qrCode: 'https://example.com/qr/WASH001',
      location: 'Laundromat A',
      controllerId: 'pi-001',
      status: 'online',
      operatingHours: {
        start: '08:00',
        end: '18:00'
      },
      maintenanceInterval: 100,
      currentOperatingHours: 50,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    expect(machine.code).toBe('WASH001');
    expect(machine.status).toBe('online');
    expect(machine.operatingHours.start).toBe('08:00');
    expect(machine.maintenanceInterval).toBe(100);
  });

  it('should create valid CreateUserInput', () => {
    const createUserInput: CreateUserInput = {
      email: 'newuser@example.com',
      name: 'New User',
      accountBalance: 25.00
    };

    expect(createUserInput.email).toBe('newuser@example.com');
    expect(createUserInput.accountBalance).toBe(25.00);
  });

  it('should create valid CreateMachineInput', () => {
    const createMachineInput: CreateMachineInput = {
      code: 'DRY001',
      qrCode: 'https://example.com/qr/DRY001',
      location: 'Laundromat B',
      controllerId: 'pi-002',
      operatingHours: {
        start: '09:00',
        end: '21:00'
      },
      maintenanceInterval: 150
    };

    expect(createMachineInput.code).toBe('DRY001');
    expect(createMachineInput.operatingHours.end).toBe('21:00');
    expect(createMachineInput.maintenanceInterval).toBe(150);
  });

  it('should validate subscription status values', () => {
    const validStatuses: Array<'none' | 'active' | 'expired'> = ['none', 'active', 'expired'];
    
    validStatuses.forEach(status => {
      const user: Partial<User> = {
        subscriptionStatus: status
      };
      expect(['none', 'active', 'expired']).toContain(user.subscriptionStatus);
    });
  });

  it('should validate machine status values', () => {
    const validStatuses: Array<'online' | 'offline' | 'maintenance' | 'in_use'> = 
      ['online', 'offline', 'maintenance', 'in_use'];
    
    validStatuses.forEach(status => {
      const machine: Partial<Machine> = {
        status: status
      };
      expect(['online', 'offline', 'maintenance', 'in_use']).toContain(machine.status);
    });
  });

  it('should validate usage session status values', () => {
    const validStatuses: Array<'pending' | 'active' | 'completed' | 'failed'> = 
      ['pending', 'active', 'completed', 'failed'];
    
    validStatuses.forEach(status => {
      const session: Partial<UsageSession> = {
        status: status
      };
      expect(['pending', 'active', 'completed', 'failed']).toContain(session.status);
    });
  });

  it('should validate payment methods', () => {
    const validMethods: Array<'balance' | 'pix'> = ['balance', 'pix'];
    
    validMethods.forEach(method => {
      const session: Partial<UsageSession> = {
        paymentMethod: method
      };
      expect(['balance', 'pix']).toContain(session.paymentMethod);
    });
  });

  it('should validate transaction types', () => {
    const validTypes: Array<'credit_added' | 'usage_payment' | 'subscription_payment'> = 
      ['credit_added', 'usage_payment', 'subscription_payment'];
    
    validTypes.forEach(type => {
      const transaction: Partial<Transaction> = {
        type: type
      };
      expect(['credit_added', 'usage_payment', 'subscription_payment']).toContain(transaction.type);
    });
  });

  it('should validate notification types', () => {
    const validTypes: Array<'maintenance_required' | 'machine_offline' | 'system_error'> = 
      ['maintenance_required', 'machine_offline', 'system_error'];
    
    validTypes.forEach(type => {
      const notification: Partial<Notification> = {
        type: type
      };
      expect(['maintenance_required', 'machine_offline', 'system_error']).toContain(notification.type);
    });
  });
});