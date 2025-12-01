-- Clean up stuck sessions and reset machine statuses
-- This script helps when sessions are stuck in 'active' state

-- First, let's see what sessions are currently active
SELECT 
    us.id,
    us.machine_id,
    us.user_id,
    us.status,
    us.start_time,
    us.end_time,
    us.duration,
    m.code as machine_code,
    m.status as machine_status,
    m.location
FROM usage_sessions us
JOIN machines m ON us.machine_id = m.id
WHERE us.status = 'active'
ORDER BY us.start_time DESC;

-- Force complete any sessions that should have ended
-- (sessions where start_time + duration has passed)
UPDATE usage_sessions
SET 
    status = 'completed',
    end_time = start_time + (duration || ' minutes')::interval,
    updated_at = NOW()
WHERE 
    status = 'active' 
    AND start_time + (duration || ' minutes')::interval < NOW();

-- Reset machine statuses to 'online' for machines with no active sessions
UPDATE machines m
SET 
    status = 'online',
    updated_at = NOW()
WHERE 
    status = 'in_use'
    AND NOT EXISTS (
        SELECT 1 
        FROM usage_sessions us 
        WHERE us.machine_id = m.id 
        AND us.status = 'active'
    );

-- Show the results
SELECT 
    m.id,
    m.code,
    m.location,
    m.status,
    COUNT(us.id) FILTER (WHERE us.status = 'active') as active_sessions
FROM machines m
LEFT JOIN usage_sessions us ON m.id = us.machine_id
GROUP BY m.id, m.code, m.location, m.status
ORDER BY m.code;
