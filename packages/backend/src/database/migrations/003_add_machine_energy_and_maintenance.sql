-- Add energy consumption and maintenance tracking fields to machines table

-- Add energy-related fields
ALTER TABLE machines 
ADD COLUMN power_consumption_watts INTEGER DEFAULT 1200 NOT NULL CHECK (power_consumption_watts > 0),
ADD COLUMN kwh_rate DECIMAL(10,4) DEFAULT 0.65 NOT NULL CHECK (kwh_rate > 0);

-- Add maintenance tracking
ALTER TABLE machines
ADD COLUMN last_cleaning_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN last_maintenance_date TIMESTAMP WITH TIME ZONE;

-- Create maintenance logs table
CREATE TABLE maintenance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('cleaning', 'repair', 'inspection', 'part_replacement', 'other')),
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    description TEXT,
    cost DECIMAL(10,2),
    parts_replaced TEXT[],
    next_maintenance_due TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_maintenance_logs_machine_id ON maintenance_logs(machine_id);
CREATE INDEX idx_maintenance_logs_type ON maintenance_logs(type);
CREATE INDEX idx_maintenance_logs_created_at ON maintenance_logs(created_at);

-- Add comments for documentation
COMMENT ON COLUMN machines.power_consumption_watts IS 'Power consumption of the machine in watts';
COMMENT ON COLUMN machines.kwh_rate IS 'Cost per kilowatt-hour in BRL';
COMMENT ON COLUMN machines.last_cleaning_date IS 'Date of last cleaning maintenance';
COMMENT ON COLUMN machines.last_maintenance_date IS 'Date of last maintenance of any type';
COMMENT ON TABLE maintenance_logs IS 'Log of all maintenance activities performed on machines';
