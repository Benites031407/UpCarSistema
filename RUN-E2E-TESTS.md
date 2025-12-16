# Running End-to-End Tests

This guide explains how to run the complete E2E test suite.

## 🚀 Quick Start

```powershell
.\scripts\run-e2e-tests.ps1
```

That's it! The script will:
1. ✅ Check if PostgreSQL, Redis, and MQTT are running
2. ✅ Start any missing services automatically
3. ✅ Start the backend server
4. ✅ Wait for server to be ready
5. ✅ Run all E2E and Load tests
6. ✅ Stop the server when done

## 📋 Options

### Keep Server Running After Tests

```powershell
.\scripts\run-e2e-tests.ps1 -KeepServerRunning
```

Useful if you want to:
- Run tests multiple times
- Manually test the API
- Debug issues

### Stop the Server Later

```powershell
# The script will show you the Process ID (PID)
Stop-Process -Id <PID>
```

## 🔧 Prerequisites

Before running E2E tests, make sure:

1. **PostgreSQL is running** (port 5432)
   - Check in Services or pgAdmin
   - Database: `machine_rental`

2. **Docker Desktop is running**
   - Redis and MQTT will start automatically if needed

3. **Dependencies installed**
   ```powershell
   cd packages/backend
   npm install
   ```

## 📊 What Gets Tested

The E2E test suite includes:

### End-to-End Tests (`e2e.test.ts`)
- Complete customer journey (registration → payment → machine use)
- Admin workflows
- Real-time features
- Notification system
- Error handling and recovery
- Security integration

### Load Tests (`load.test.ts`)
- Concurrent API requests
- Database performance under load
- WebSocket performance
- MQTT message handling
- Memory usage
- Error rates under stress

### Final Integration Tests (`final-integration.test.ts`)
- Complete workflow integration
- Payment gateway integration
- IoT hardware simulation
- WhatsApp notifications
- Performance optimization
- Data consistency

## 🐛 Troubleshooting

### "PostgreSQL: NOT running"

**Solution**: Start PostgreSQL
- Windows Services: Look for `postgresql-x64-*` service
- Or use pgAdmin to start the server

### "Backend server failed to start"

**Solutions**:
1. Check if port 3000 is already in use:
   ```powershell
   netstat -ano | findstr ":3000"
   ```

2. Check backend logs for errors:
   ```powershell
   cd packages/backend
   npm run dev
   ```

3. Verify environment variables:
   - Check `packages/backend/.env.test` exists
   - Verify database credentials

### "Redis: Failed to start"

**Solutions**:
1. Check Docker is running
2. Check port 6380 is not in use:
   ```powershell
   netstat -ano | findstr ":6380"
   ```
3. Manually start Redis:
   ```powershell
   docker-compose -f docker-compose.test-local.yml up -d redis-test
   ```

### "MQTT: Failed to start"

**Solutions**:
1. Check Docker is running
2. Check port 1884 is not in use:
   ```powershell
   netstat -ano | findstr ":1884"
   ```
3. Manually start MQTT:
   ```powershell
   docker-compose -f docker-compose.test-local.yml up -d mosquitto-test
   ```

### Tests Timeout

**Cause**: Server is slow to start or under heavy load

**Solutions**:
1. Wait longer - first startup can take 30+ seconds
2. Check system resources (CPU, memory)
3. Close other applications

### Connection Refused Errors

**Cause**: Services not fully initialized

**Solutions**:
1. Wait a few more seconds and retry
2. Check service logs:
   ```powershell
   docker-compose -f docker-compose.test-local.yml logs redis-test
   docker-compose -f docker-compose.test-local.yml logs mosquitto-test
   ```

## 📈 Expected Results

### Typical Test Run

```
Test Files  3 passed (3)
     Tests  259 passed (259)
  Duration  45s
```

### Some Tests May Fail

It's normal for a few tests to fail on first run:
- **Mock-related failures**: Test setup issues, not real bugs
- **Timing issues**: Tests may need longer timeouts
- **Environment differences**: Local vs CI environment

### Critical Tests Must Pass

These tests MUST pass for production:
- ✅ Authentication tests
- ✅ Authorization tests
- ✅ Payment validation tests
- ✅ Data consistency tests
- ✅ Security tests

## 🎯 Running Specific Tests

### Only E2E Tests
```powershell
cd packages/backend
npm test -- --run src/test/e2e.test.ts
```

### Only Load Tests
```powershell
cd packages/backend
npm test -- --run src/test/load.test.ts
```

### Only Integration Tests
```powershell
cd packages/backend
npm test -- --run src/test/final-integration.test.ts
```

## 🔄 Continuous Testing

For development, you can:

1. **Start services once**:
   ```powershell
   .\scripts\test-infrastructure-local.ps1 start
   cd packages/backend
   npm run dev
   ```

2. **Run tests multiple times** (in another terminal):
   ```powershell
   cd packages/backend
   npm test -- --run src/test/e2e.test.ts
   ```

3. **Stop when done**:
   - Close the dev server terminal (Ctrl+C)
   - Stop infrastructure:
     ```powershell
     .\scripts\test-infrastructure-local.ps1 stop
     ```

## ✅ Success Criteria

Your system is ready for production when:
- ✅ All property-based tests pass (242/242)
- ✅ All unit tests pass
- ✅ Critical E2E tests pass (auth, payments, security)
- ✅ No critical security vulnerabilities
- ✅ Performance meets requirements

**Note**: Some E2E/Load tests may fail due to environment differences. Focus on critical functionality tests.
