-- Diagnostic script to check machine and session status
-- Run this to see what's happening with your machines

-- 1. Check all machines and their current status
SELECT 
    m.id,
    m.code,
    m.location,
    m.status as machine_status,
    m.operating_hours,
    COUNT(us.id) FILTER (WHERE us.status = 'active') as active_sessions,
    COUNT(us.id) FILTER (WHERE us.status = 'pending') as pending_sessions,
    MAX(us.start_time) FILTER (WHERE us.status = 'active') as last_active_start
FROM machines m
LEFT JOIN usage_sessions us ON m.id = us.machine_id
GROUP BY m.id, m.code, m.location, m.status, m.operating_hours
ORDER BY m.code;

-- 2. Check all active sessions with details
SELECT 
    us.id as session_id,
    us.machine_id,
    m.code as machine_code,
    m.location,
    m.status as machine_status,
    us.user_id,
    u.email as user_email,
    us.status as session_status,
    us.start_time,
    us.end_time,
    us.duration as duration_minutes,
    us.start_time + (us.duration || ' minutes')::interval as expected_end_time,
    CASE 
        WHEN us.start_time + (us.duration || ' minutes')::interval < NOW() 
        THEN 'EXPIRED'
        ELSE 'ACTIVE'
    END as session_state,
    EXTRACT(EPOCH FROM (NOW() - us.start_time))/60 as elapsed_minutes
FROM usage_sessions us
JOIN machines m ON us.machine_id = m.id
JOIN users u ON us.user_id = u.id
WHERE us.status = 'active'
ORDER BY us.start_time DESC;

-- 3. Check for mismatched states (machines marked in_use but no active sessions)
SELECT 
    m.id,
    m.code,
    m.location,
    m.status,
    'Machine marked in_use but no active session' as issue
FROM machines m
WHERE m.status = 'in_use'
AND NOT EXISTS (
    SELECT 1 
    FROM usage_sessions us 
    WHERE us.machine_id = m.id 
    AND us.status = 'active'
);

-- 4. Check for sessions that should have ended
SELECT 
    us.id as session_id,
    m.code as machine_code,
    us.status,
    us.start_time,
    us.duration,
    us.start_time + (us.duration || ' minutes')::interval as expected_end_time,
    NOW() - (us.start_time + (us.duration || ' minutes')::interval) as overdue_by,
    'Session should have ended' as issue
FROM usage_sessions us
JOIN machines m ON us.machine_id = m.id
WHERE us.status = 'active'
AND us.start_time + (us.duration || ' minutes')::interval < NOW();
