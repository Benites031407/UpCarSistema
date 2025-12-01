-- Quick reset script - Use this to reset all machines to available state
-- WARNING: This will terminate ALL active sessions!

BEGIN;

-- Complete all active sessions
UPDATE usage_sessions
SET 
    status = 'completed',
    end_time = COALESCE(end_time, NOW()),
    updated_at = NOW()
WHERE status = 'active';

-- Cancel all pending sessions
UPDATE usage_sessions
SET 
    status = 'cancelled',
    updated_at = NOW()
WHERE status = 'pending';

-- Reset all machines to online
UPDATE machines
SET 
    status = 'online',
    updated_at = NOW()
WHERE status IN ('in_use', 'offline', 'maintenance');

COMMIT;

-- Show results
SELECT 
    'Machines Reset' as action,
    COUNT(*) as count
FROM machines
WHERE status = 'online'
UNION ALL
SELECT 
    'Sessions Completed' as action,
    COUNT(*) as count
FROM usage_sessions
WHERE status = 'completed' AND updated_at > NOW() - INTERVAL '1 minute'
UNION ALL
SELECT 
    'Active Sessions' as action,
    COUNT(*) as count
FROM usage_sessions
WHERE status = 'active';
