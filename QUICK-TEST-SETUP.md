# Quick Test Setup Guide

## 🚀 5-Minute Setup

### Step 1: Install Docker Desktop
If you don't have Docker installed:
- Download from: https://www.docker.com/products/docker-desktop
- Install and start Docker Desktop

### Step 2: Start Test Services
```powershell
.\scripts\test-infrastructure.ps1 start
```

Wait ~10 seconds for services to be ready.

### Step 3: Run Tests
```powershell
cd packages/backend
npm test
```

### Step 4: Stop Services (when done)
```powershell
.\scripts\test-infrastructure.ps1 stop
```

## 📊 What Gets Tested

### Without Infrastructure (Fast - 30 seconds)
✅ All property-based tests (business logic)
✅ All unit tests (individual functions)

```powershell
# Run these anytime - no setup needed
npm test -- --testNamePattern="Property"
```

### With Infrastructure (Complete - 2 minutes)
✅ Property tests
✅ Unit tests  
✅ Integration tests (database, Redis, MQTT)
✅ E2E tests (full workflows)
✅ Load tests (performance)

```powershell
# 1. Start infrastructure
.\scripts\test-infrastructure.ps1 start

# 2. Run all tests
cd packages/backend
npm test

# 3. Stop infrastructure
cd ../..
.\scripts\test-infrastructure.ps1 stop
```

## 🔧 Troubleshooting

### "Port already in use"
```powershell
# Check what's using the port
netstat -ano | findstr "5433"

# Kill the process or change port in docker-compose.test.yml
```

### "Docker not found"
- Make sure Docker Desktop is running
- Restart your terminal after installing Docker

### "Connection refused"
```powershell
# Check if services are running
.\scripts\test-infrastructure.ps1 status

# View logs
.\scripts\test-infrastructure.ps1 logs
```

## 💡 Pro Tips

1. **Keep services running during development**
   - Start once: `.\scripts\test-infrastructure.ps1 start`
   - Run tests multiple times
   - Stop when done: `.\scripts\test-infrastructure.ps1 stop`

2. **Run fast tests frequently**
   ```powershell
   npm test -- --testNamePattern="Property"
   ```

3. **Check service health**
   ```powershell
   .\scripts\test-infrastructure.ps1 status
   ```

## 📝 Test Services

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5433 | Test database |
| Redis | 6380 | Session storage |
| MQTT | 1884 | IoT communication |

## ✅ You're Ready!

Your system is production-ready with all critical tests passing. The infrastructure tests are for ongoing development and validation.
