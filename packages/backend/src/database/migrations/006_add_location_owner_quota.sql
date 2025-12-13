-- Add location owner quota (cota) field to machines table
-- This represents the percentage of revenue that goes to the location owner

ALTER TABLE machines 
ADD COLUMN location_owner_quota DECIMAL(5,2) DEFAULT 50.00 NOT NULL
CHECK (location_owner_quota >= 0 AND location_owner_quota <= 100);

COMMENT ON COLUMN machines.location_owner_quota IS 'Percentage of net revenue allocated to location owner (0-100)';

-- Update existing machines to have default 50% quota
UPDATE machines SET location_owner_quota = 50.00 WHERE location_owner_quota IS NULL;
