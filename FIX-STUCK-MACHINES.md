# Fix Stuck Machines - Troubleshooting Guide

## Problem
Machines showing as "in use" even after stopping a session, preventing new sessions from starting.

## Root Cause
Sessions can get stuck in "active" state if:
1. The termination endpoint fails silently
2. The database transaction doesn't complete
3. The machine status isn't updated properly
4. Sessions expire but aren't auto-terminated

## Quick Fix - Run These SQL Scripts

### Step 1: Diagnose the Issue
Run this to see what's happening:
```bash
psql -U your_username -d your_database -f diagnose-machine-status.sql
```

This will show you:
- All machines and their status
- Active sessions
- Mismatched states (machines marked in_use but no active session)
- Sessions that should have ended

### Step 2: Clean Up Stuck Sessions
Run this to fix the issue:
```bash
psql -U your_username -d your_database -f cleanup-stuck-sessions.sql
```

This will:
- Complete any sessions that should have ended
- Reset machine statuses to 'online' for machines with no active sessions
- Show you the results

### Step 3: Verify the Fix
After running the cleanup, check the machines table:
```sql
SELECT code, location, status FROM machines ORDER BY code;
```

All machines should show 'online' status if no sessions are active.

## Manual Cleanup (Alternative)

If you prefer to do it manually, run these commands in your PostgreSQL database:

```sql
-- 1. Force complete expired sessions
UPDATE usage_sessions
SET 
    status = 'completed',
    end_time = start_time + (duration || ' minutes')::interval,
    updated_at = NOW()
WHERE 
    status = 'active' 
    AND start_time + (duration || ' minutes')::interval < NOW();

-- 2. Reset machine statuses
UPDATE machines
SET 
    status = 'online',
    updated_at = NOW()
WHERE 
    status = 'in_use'
    AND NOT EXISTS (
        SELECT 1 
        FROM usage_sessions us 
        WHERE us.machine_id = machines.id 
        AND us.status = 'active'
    );
```

## Prevention

To prevent this from happening in the future:

1. **Backend Auto-Cleanup**: The system should have a cron job or scheduled task that runs every minute to:
   - Check for expired sessions
   - Auto-complete them
   - Reset machine statuses

2. **Better Error Handling**: The termination endpoint now has better error handling and logging.

3. **Frontend Improvements**: The stop button now:
   - Shows a confirmation modal
   - Has better error handling
   - Logs the response for debugging

## Testing the Fix

1. Start a session with a short duration (e.g., 1 minute)
2. Click "Parar Aspirador" (Stop)
3. Confirm the stop in the modal
4. Check the browser console for logs
5. Try to start a new session immediately - it should work!

## If Problems Persist

Check the backend logs for errors:
```bash
# If using Docker
docker-compose logs backend

# If running locally
# Check your terminal where the backend is running
```

Look for errors related to:
- Session termination
- Database transactions
- MQTT commands (if using IoT)
