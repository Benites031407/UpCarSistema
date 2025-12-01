-- Add credits to test users so they can test the account balance payment option
-- This script adds 100.00 BRL to all users

-- Update all users to have 100 BRL balance
UPDATE users 
SET account_balance = 100.00, 
    updated_at = NOW()
WHERE account_balance < 100.00;

-- Show updated users
SELECT 
    id,
    name,
    email,
    account_balance,
    subscription_status
FROM users
ORDER BY created_at DESC
LIMIT 10;
