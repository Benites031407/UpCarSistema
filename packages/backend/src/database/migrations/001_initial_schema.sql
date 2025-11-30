-- Machine Rental System Database Schema
-- Initial migration to create all required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    account_balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    subscription_status VARCHAR(20) DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'expired')),
    subscription_expiry TIMESTAMP WITH TIME ZONE,
    last_daily_use DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_balance_check CHECK (account_balance >= 0),
    CONSTRAINT users_auth_check CHECK (google_id IS NOT NULL OR password_hash IS NOT NULL)
);

-- Machines table
CREATE TABLE machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    qr_code TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    controller_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'maintenance', 'in_use')),
    operating_hours_start TIME NOT NULL DEFAULT '08:00',
    operating_hours_end TIME NOT NULL DEFAULT '18:00',
    maintenance_interval INTEGER NOT NULL DEFAULT 100, -- hours
    current_operating_hours INTEGER DEFAULT 0 NOT NULL,
    temperature DECIMAL(5,2),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT machines_maintenance_interval_check CHECK (maintenance_interval > 0),
    CONSTRAINT machines_operating_hours_check CHECK (current_operating_hours >= 0),
    CONSTRAINT machines_temperature_check CHECK (temperature IS NULL OR (temperature >= -50 AND temperature <= 100))
);

-- Usage sessions table
CREATE TABLE usage_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    duration INTEGER NOT NULL CHECK (duration >= 1 AND duration <= 30), -- minutes
    cost DECIMAL(10,2) NOT NULL CHECK (cost > 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('balance', 'pix')),
    payment_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'failed')),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT usage_sessions_time_check CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time)
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('credit_added', 'usage_payment', 'subscription_payment')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('pix', 'admin_credit')),
    payment_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(30) NOT NULL CHECK (type IN ('maintenance_required', 'machine_offline', 'system_error')),
    machine_id UUID REFERENCES machines(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    whatsapp_status VARCHAR(20) DEFAULT 'pending' CHECK (whatsapp_status IN ('pending', 'sent', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_machines_code ON machines(code);
CREATE INDEX idx_machines_controller_id ON machines(controller_id);
CREATE INDEX idx_machines_status ON machines(status);
CREATE INDEX idx_usage_sessions_user_id ON usage_sessions(user_id);
CREATE INDEX idx_usage_sessions_machine_id ON usage_sessions(machine_id);
CREATE INDEX idx_usage_sessions_status ON usage_sessions(status);
CREATE INDEX idx_usage_sessions_created_at ON usage_sessions(created_at);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_machine_id ON notifications(machine_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON machines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();