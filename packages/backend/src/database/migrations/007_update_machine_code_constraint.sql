-- Update machine code constraint to only allow 1-6 digit numbers
-- This ensures consistency across the system

-- First, check if any existing machines violate the new constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM machines 
    WHERE code !~ '^[0-9]{1,6}$'
  ) THEN
    RAISE NOTICE 'Warning: Some machines have codes that do not match the new format (1-6 digits only)';
    RAISE NOTICE 'Please update these machines before applying this migration:';
    RAISE NOTICE '%', (
      SELECT string_agg(code || ' (' || location || ')', ', ')
      FROM machines 
      WHERE code !~ '^[0-9]{1,6}$'
    );
  END IF;
END $$;

-- Add constraint to ensure machine codes are 1-6 digits only
ALTER TABLE machines 
ADD CONSTRAINT machines_code_format_check 
CHECK (code ~ '^[0-9]{1,6}$');

-- Update the code column to be smaller since we only need 6 characters max
ALTER TABLE machines 
ALTER COLUMN code TYPE VARCHAR(6);

COMMENT ON COLUMN machines.code IS 'Machine code: 1-6 digits only (e.g., 123456)';
