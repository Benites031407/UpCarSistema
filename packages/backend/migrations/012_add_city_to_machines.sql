-- Add city column to machines table
ALTER TABLE machines 
ADD COLUMN city VARCHAR(100);

COMMENT ON COLUMN machines.city IS 'City where the machine is located';
