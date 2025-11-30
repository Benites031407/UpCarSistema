-- Create mock usage sessions and transactions for analytics testing
-- This script creates 50 completed sessions over the last 30 days

DO $$
DECLARE
  user_ids UUID[];
  machine_ids UUID[];
  session_date TIMESTAMP;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration INT;
  cost DECIMAL(10,2);
  payment_method VARCHAR(20);
  random_user UUID;
  random_machine UUID;
  i INT;
BEGIN
  -- Get existing customer users
  SELECT ARRAY_AGG(id) INTO user_ids FROM users WHERE role = 'customer' LIMIT 5;
  
  -- Get existing machines
  SELECT ARRAY_AGG(id) INTO machine_ids FROM machines LIMIT 3;
  
  -- Check if we have data
  IF array_length(user_ids, 1) IS NULL OR array_length(machine_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No users or machines found';
  END IF;
  
  -- Create 50 sessions
  FOR i IN 1..50 LOOP
    -- Random date within last 30 days
    session_date := NOW() - (random() * 30 || ' days')::INTERVAL;
    
    -- Random time of day (6 AM to 10 PM)
    session_date := date_trunc('day', session_date) + (6 + floor(random() * 16))::INT * INTERVAL '1 hour' + (floor(random() * 60))::INT * INTERVAL '1 minute';
    
    -- Random user and machine
    random_user := user_ids[1 + floor(random() * array_length(user_ids, 1))::INT];
    random_machine := machine_ids[1 + floor(random() * array_length(machine_ids, 1))::INT];
    
    -- Random duration (5-30 minutes)
    duration := 5 + floor(random() * 26)::INT;
    
    -- Cost calculation (R$ 2.00 per minute)
    cost := duration * 2.0;
    
    -- Random payment method (only 'pix' or 'admin_credit' allowed for transactions)
    payment_method := CASE WHEN random() > 0.5 THEN 'pix' ELSE 'pix' END;
    
    -- Start and end times
    start_time := session_date;
    end_time := start_time + (duration || ' minutes')::INTERVAL;
    
    -- Create session
    INSERT INTO usage_sessions 
    (user_id, machine_id, duration, cost, payment_method, status, start_time, end_time, created_at)
    VALUES (random_user, random_machine, duration, cost, payment_method, 'completed', start_time, end_time, session_date);
    
    -- Create corresponding transaction
    INSERT INTO transactions 
    (user_id, type, amount, payment_method, status, created_at)
    VALUES (random_user, 'usage_payment', cost, payment_method, 'completed', session_date);
  END LOOP;
  
  RAISE NOTICE 'Created 50 mock sessions successfully!';
END $$;

-- Show summary
SELECT 
  COUNT(*) as total_sessions,
  SUM(cost) as total_revenue,
  AVG(duration) as avg_duration
FROM usage_sessions
WHERE status = 'completed';
