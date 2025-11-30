-- Add pricing and max duration fields to machines table

ALTER TABLE machines 
ADD COLUMN price_per_minute DECIMAL(10,2) DEFAULT 1.00 NOT NULL CHECK (price_per_minute > 0),
ADD COLUMN max_duration_minutes INTEGER DEFAULT 30 NOT NULL CHECK (max_duration_minutes >= 1 AND max_duration_minutes <= 120);

-- Add comment for documentation
COMMENT ON COLUMN machines.price_per_minute IS 'Price charged per minute of usage in BRL';
COMMENT ON COLUMN machines.max_duration_minutes IS 'Maximum allowed usage duration in minutes (1-120)';
