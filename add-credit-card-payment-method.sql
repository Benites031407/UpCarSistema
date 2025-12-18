-- Add 'credit_card' to allowed payment methods in transactions table

-- Drop the old constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;

-- Add new constraint with 'credit_card' included
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check 
CHECK (payment_method IN ('pix', 'admin_credit', 'credit_card'));

-- Verify the change
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'transactions_payment_method_check';
