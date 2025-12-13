-- Add maintenance override feature
-- Allows admins to temporarily bypass maintenance requirement without resetting usage counter

ALTER TABLE machines 
ADD COLUMN maintenance_override BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN maintenance_override_reason TEXT,
ADD COLUMN maintenance_override_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN maintenance_override_by VARCHAR(255);

COMMENT ON COLUMN machines.maintenance_override IS 'When true, machine can operate despite exceeding maintenance interval';
COMMENT ON COLUMN machines.maintenance_override_reason IS 'Reason for overriding maintenance requirement';
COMMENT ON COLUMN machines.maintenance_override_at IS 'Timestamp when override was activated';
COMMENT ON COLUMN machines.maintenance_override_by IS 'Admin who activated the override';

-- Create index for finding machines with active overrides
CREATE INDEX idx_machines_maintenance_override ON machines(maintenance_override) WHERE maintenance_override = TRUE;
