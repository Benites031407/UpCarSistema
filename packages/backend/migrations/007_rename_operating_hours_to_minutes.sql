-- Migration: Rename current_operating_hours to current_operating_minutes
-- This allows storing operating time in minutes instead of fractional hours
-- Date: 2025-12-01

BEGIN;

-- Rename the column
ALTER TABLE machines 
  RENAME COLUMN current_operating_hours TO current_operating_minutes;

-- Update the comment
COMMENT ON COLUMN machines.current_operating_minutes IS 'Total operating time in minutes';

-- Update the check constraint name if it exists
ALTER TABLE machines 
  DROP CONSTRAINT IF EXISTS machines_operating_hours_check;

ALTER TABLE machines 
  ADD CONSTRAINT machines_operating_minutes_check 
  CHECK (current_operating_minutes >= 0);

COMMIT;
