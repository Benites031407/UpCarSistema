-- Add operational_cost_quota column to machines table
ALTER TABLE machines 
ADD COLUMN operational_cost_quota DECIMAL(5,2) DEFAULT 10.00 CHECK (operational_cost_quota >= 0 AND operational_cost_quota <= 100);

COMMENT ON COLUMN machines.operational_cost_quota IS 'Percentage (0-100) of revenue allocated to operational costs';

-- Update existing machines to have default 10% operational cost
UPDATE machines SET operational_cost_quota = 10.00 WHERE operational_cost_quota IS NULL;
