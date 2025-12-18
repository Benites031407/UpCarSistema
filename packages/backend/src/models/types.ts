// Core data model interfaces for the Machine Rental System

export interface User {
  id: string;
  email: string;
  name: string;
  googleId?: string;
  passwordHash?: string;
  accountBalance: number;
  subscriptionStatus: 'none' | 'active' | 'expired';
  subscriptionExpiry?: Date;
  lastDailyUse?: Date;
  role: 'customer' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface Machine {
  id: string;
  code: string;
  qrCode: string;
  location: string;
  city?: string;
  controllerId: string;
  status: 'online' | 'offline' | 'maintenance' | 'in_use';
  operatingHours: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  maintenanceInterval: number; // hours
  currentOperatingHours: number;
  pricePerMinute: number; // BRL per minute
  maxDurationMinutes: number; // maximum usage duration in minutes (1-120)
  powerConsumptionWatts: number; // power consumption in watts
  kwhRate: number; // cost per kWh in BRL
  locationOwnerQuota: number; // percentage (0-100) of net revenue for location owner
  operationalCostQuota: number; // percentage (0-100) of revenue for operational costs
  maintenanceOverride: boolean; // allows operation despite exceeding maintenance interval
  maintenanceOverrideReason?: string;
  maintenanceOverrideAt?: Date;
  maintenanceOverrideBy?: string;
  lastCleaningDate?: Date;
  lastMaintenanceDate?: Date;
  temperature?: number;
  lastHeartbeat?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceLog {
  id: string;
  machineId: string;
  type: 'cleaning' | 'repair' | 'inspection' | 'part_replacement' | 'other';
  performedBy?: string;
  description?: string;
  cost?: number;
  partsReplaced?: string[];
  nextMaintenanceDue?: Date;
  createdAt: Date;
}

export interface UsageSession {
  id: string;
  userId: string;
  machineId: string;
  duration: number; // minutes
  cost: number;
  paymentMethod: 'balance' | 'pix';
  paymentId?: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  createdAt: Date;
  machineCode?: string; // Added for display purposes
  machineLocation?: string; // Added for display purposes
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'credit_added' | 'usage_payment' | 'subscription_payment';
  amount: number;
  paymentMethod: 'pix' | 'admin_credit';
  paymentId?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

export interface Notification {
  id: string;
  type: 'maintenance_required' | 'machine_offline' | 'system_error';
  machineId?: string;
  message: string;
  whatsappStatus: 'pending' | 'sent' | 'failed';
  createdAt: Date;
}

// Input types for creating new records (without generated fields)
export interface CreateUserInput {
  email: string;
  name: string;
  googleId?: string;
  passwordHash?: string;
  accountBalance?: number;
  subscriptionStatus?: 'none' | 'active' | 'expired';
  subscriptionExpiry?: Date;
  role?: 'customer' | 'admin';
}

export interface CreateMachineInput {
  code: string;
  qrCode: string;
  location: string;
  controllerId: string;
  operatingHours: {
    start: string;
    end: string;
  };
  maintenanceInterval: number;
  pricePerMinute?: number;
  maxDurationMinutes?: number;
  powerConsumptionWatts?: number;
  kwhRate?: number;
  locationOwnerQuota?: number;
}

export interface CreateMaintenanceLogInput {
  machineId: string;
  type: 'cleaning' | 'repair' | 'inspection' | 'part_replacement' | 'other';
  performedBy?: string;
  description?: string;
  cost?: number;
  partsReplaced?: string[];
  nextMaintenanceDue?: Date;
}

export interface CreateUsageSessionInput {
  userId: string;
  machineId: string;
  duration: number;
  cost: number;
  paymentMethod: 'balance' | 'pix';
  paymentId?: string;
}

export interface CreateTransactionInput {
  userId: string;
  type: 'credit_added' | 'usage_payment' | 'subscription_payment';
  amount: number;
  paymentMethod: 'pix' | 'admin_credit';
  paymentId?: string;
}

export interface CreateNotificationInput {
  type: 'maintenance_required' | 'machine_offline' | 'system_error';
  machineId?: string;
  message: string;
}

// Update types for modifying existing records
export interface UpdateUserInput {
  email?: string;
  name?: string;
  googleId?: string;
  passwordHash?: string;
  accountBalance?: number;
  subscriptionStatus?: 'none' | 'active' | 'expired';
  subscriptionExpiry?: Date;
  lastDailyUse?: Date;
  role?: 'customer' | 'admin';
}

export interface UpdateMachineInput {
  location?: string;
  city?: string;
  status?: 'online' | 'offline' | 'maintenance' | 'in_use';
  qrCode?: string;
  operatingHours?: {
    start: string;
    end: string;
  };
  maintenanceInterval?: number;
  currentOperatingHours?: number;
  pricePerMinute?: number;
  maxDurationMinutes?: number;
  powerConsumptionWatts?: number;
  kwhRate?: number;
  locationOwnerQuota?: number;
  operationalCostQuota?: number;
  maintenanceOverride?: boolean;
  maintenanceOverrideReason?: string;
  maintenanceOverrideAt?: Date;
  maintenanceOverrideBy?: string;
  lastCleaningDate?: Date;
  lastMaintenanceDate?: Date;
  temperature?: number;
  lastHeartbeat?: Date;
}

export interface UpdateUsageSessionInput {
  status?: 'pending' | 'active' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  paymentId?: string;
}

export interface UpdateTransactionInput {
  status?: 'pending' | 'completed' | 'failed';
  paymentId?: string;
}

export interface UpdateNotificationInput {
  whatsappStatus?: 'pending' | 'sent' | 'failed';
}