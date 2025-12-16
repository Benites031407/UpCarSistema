# Setup Guide - Using Local PostgreSQL

Since you already have PostgreSQL installed locally, we'll use that instead of Docker PostgreSQL.

## 🚀 Quick Setup

### Step 1: Make Sure PostgreSQL is Running

Check if PostgreSQL is running:
- Open **Services** (Windows key + R, type `services.msc`)
- Look for **postgresql-x64-** service
- Make sure it's **Running**

Or check in **pgAdmin** if you have it installed.

### Step 2: Create Test Database

Open **pgAdmin** or **psql** and run:

```sql
-- Create database if it doesn't exist
CREATE DATABASE machine_rental;

-- Connect to the database
\c machine_rental

-- Verify connection
SELECT current_database();
```

### Step 3: Update Your Password (if needed)

If your PostgreSQL password is NOT "banana", update it in:
- `packages/backend/.env.test` - Change `DB_PASSWORD=banana` to your password
- `packages/backend/.env` - Change `DB_PASSWORD=banana` to your password

### Step 4: Start Docker Services (Redis + MQTT only)

```powershell
.\scripts\test-infrastructure-local.ps1 start
```

This starts:
- 🔴 Redis (port 6380)
- 📡 MQTT (port 1884)

Your local PostgreSQL will be used automatically.

### Step 5: Run Database Migrations

```powershell
cd packages/backend
npm run migrate
```

This creates all the necessary tables.

### Step 6: Run Tests

```powershell
npm test
```

---

## 🔧 Configuration Summary

Your test environment uses:

| Service | Location | Port | Config |
|---------|----------|------|--------|
| PostgreSQL | Local | 5432 | Your local installation |
| Redis | Docker | 6380 | Managed by script |
| MQTT | Docker | 1884 | Managed by script |

---

## 📝 Common Commands

```powershell
# Start Redis + MQTT
.\scripts\test-infrastructure-local.ps1 start

# Check status
.\scripts\test-infrastructure-local.ps1 status

# View logs
.\scripts\test-infrastructure-local.ps1 logs

# Stop Redis + MQTT
.\scripts\test-infrastructure-local.ps1 stop
```

---

## ✅ Verify Setup

Run this to check everything:

```powershell
# 1. Check Docker services
.\scripts\test-infrastructure-local.ps1 status

# 2. Check PostgreSQL connection
cd packages/backend
node -e "const {Pool} = require('pg'); const pool = new Pool({host:'localhost',port:5432,database:'machine_rental',user:'postgres',password:'banana'}); pool.query('SELECT NOW()', (err, res) => { if(err) console.log('❌ Error:', err.message); else console.log('✅ PostgreSQL connected:', res.rows[0].now); pool.end(); });"
```

---

## 🐛 Troubleshooting

### PostgreSQL Connection Error

**Problem**: "connection refused" or "password authentication failed"

**Solutions**:
1. Check PostgreSQL is running in Services
2. Verify password in `.env.test` matches your PostgreSQL password
3. Check if database exists: `psql -U postgres -l`
4. Create database if missing: `createdb -U postgres machine_rental`

### Port 5432 Already in Use

**Problem**: Another PostgreSQL instance is running

**Solution**: That's fine! We're using your local PostgreSQL on port 5432.

### Redis/MQTT Not Starting

**Problem**: Docker containers won't start

**Solutions**:
1. Check Docker Desktop is running
2. Check ports 6380 and 1884 are free:
   ```powershell
   netstat -ano | findstr "6380"
   netstat -ano | findstr "1884"
   ```

---

## 🎯 You're Ready!

Once you see:
- ✅ PostgreSQL connected
- ✅ Redis container running
- ✅ MQTT container running

You can run all tests successfully! 🚀
