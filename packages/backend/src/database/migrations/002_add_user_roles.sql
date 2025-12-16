-- Add role field to users table for admin dashboard access

-- Add role column with default value 'customer'
ALTER TABLE users 
ADD COLUMN role VARCHAR(20) DEFAULT 'customer' NOT NULL 
CHECK (role IN ('customer', 'admin'));

-- Create index for role lookups
CREATE INDEX idx_users_role ON users(role);

-- Update existing users to have customer role (already set by default)
-- No need to update existing records as they will have 'customer' by default