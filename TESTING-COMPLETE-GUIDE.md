# Complete Testing Guide

## 🎯 Three Ways to Run Tests

### Option 1: Run Everything (Recommended)
```powershell
.\test-all.ps1
```
Runs all tests in order:
1. Unit & Property tests (fast, no infrastructure)
2. E2E & Load tests (slower, needs infrastructure)

### Option 2: Run Only E2E Tests
```powershell
.\scripts\run-e2e-tests.ps1
```
Automatically starts services and runs E2E tests.

### Option 3: Run Only Fast Tests
```powershell
cd packages/backend
npm test
```
Runs unit and property tests only (no infrastructure needed).

---

## 📊 What Each Script Does

### `test-all.ps1` - Complete Test Suite
**What it does:**
1. Runs all unit and property tests first
2. If those pass, runs E2E and load tests
3. Shows summary of all results

**When to use:**
- Before committing code
- Before deploying
- Weekly full system check

**Time:** ~2-3 minutes

---

### `scripts/run-e2e-tests.ps1` - E2E Test Runner
**What it does:**
1. ✅ Checks PostgreSQL is running
2. ✅ Starts Redis (if not running)
3. ✅ Starts MQTT (if not running)
4. ✅ Starts backend server
5. ✅ Waits for server to be ready
6. ✅ Runs E2E and load tests
7. ✅ Stops server when done

**When to use:**
- Testing full system integration
- After infrastructure changes
- Before production deployment

**Time:** ~1-2 minutes

**Options:**
```powershell
# Keep server running after tests
.\scripts\run-e2e-tests.ps1 -KeepServerRunning
```

---

### `npm test` - Fast Tests Only
**What it does:**
- Runs unit tests
- Runs property-based tests
- Runs integration tests (mocked)

**When to use:**
- During development
- Quick validation
- After code changes

**Time:** ~30 seconds

---

## 🚀 Quick Start

### First Time Setup

1. **Make sure PostgreSQL is running**
   ```powershell
   # Check in Windows Services or pgAdmin
   ```

2. **Make sure Docker Desktop is running**
   ```powershell
   # Just open Docker Desktop
   ```

3. **Run complete test suite**
   ```powershell
   .\test-all.ps1
   ```

### Daily Development

```powershell
# Quick tests during development
cd packages/backend
npm test

# Full tests before committing
cd ../..
.\test-all.ps1
```

---

## 📋 Test Categories

### ✅ Unit Tests (Fast)
- Individual function tests
- No external dependencies
- Run in milliseconds

**Examples:**
- Password hashing
- JWT token generation
- Validation logic

### ✅ Property-Based Tests (Fast)
- Test properties across many inputs
- Use fast-check library
- Catch edge cases

**Examples:**
- Email validation with random inputs
- Cost calculation with various values
- Balance updates with concurrent operations

### ✅ Integration Tests (Medium)
- Multiple components working together
- May use mocked services
- Run in seconds

**Examples:**
- API endpoint tests
- Database operations
- Service interactions

### ✅ E2E Tests (Slow)
- Complete user workflows
- Real services running
- Run in minutes

**Examples:**
- User registration → login → payment → machine use
- Admin dashboard workflows
- Real-time notifications

### ✅ Load Tests (Slow)
- Performance under stress
- Concurrent operations
- Resource usage

**Examples:**
- 100 concurrent API requests
- WebSocket with many connections
- Database under heavy load

---

## 🎯 Test Results Interpretation

### All Tests Passing
```
Test Files  40 passed (40)
     Tests  275 passed (275)
```
✅ **System is production-ready!**

### Some E2E Tests Failing
```
Test Files  3 failed | 37 passed (40)
     Tests  16 failed | 259 passed (275)
```
⚠️ **Check if failures are critical:**
- Authentication failures → **Critical, must fix**
- Payment failures → **Critical, must fix**
- Load test timeouts → **Not critical, environment issue**
- Mock setup failures → **Not critical, test issue**

### Unit Tests Failing
```
Test Files  5 failed | 35 passed (40)
     Tests  45 failed | 230 passed (275)
```
🚨 **Critical! Fix before deploying:**
- Core business logic broken
- Security vulnerabilities
- Data corruption risks

---

## 🔧 Troubleshooting

### "PostgreSQL: NOT running"
```powershell
# Check Windows Services
services.msc
# Look for: postgresql-x64-*
# Status should be: Running
```

### "Backend server failed to start"
```powershell
# Check what's using port 3000
netstat -ano | findstr ":3000"

# If something is using it, stop it or change port
```

### "Tests timeout"
```powershell
# First run can be slow, wait 60 seconds
# If still timing out, check:
# 1. System resources (CPU, RAM)
# 2. Antivirus blocking connections
# 3. Firewall settings
```

### "Connection refused"
```powershell
# Services not ready yet
# Solution: Wait 10 more seconds and retry
```

---

## 📈 Performance Benchmarks

### Expected Test Times

| Test Type | Time | Infrastructure |
|-----------|------|----------------|
| Unit Tests | 5-10s | None |
| Property Tests | 10-20s | None |
| Integration Tests | 10-20s | Mocked |
| E2E Tests | 30-60s | Full |
| Load Tests | 30-60s | Full |
| **Total** | **2-3 min** | Full |

### Expected Pass Rates

| Test Type | Target | Critical |
|-----------|--------|----------|
| Unit Tests | 100% | Yes |
| Property Tests | 100% | Yes |
| Integration Tests | 95%+ | Mostly |
| E2E Tests | 85%+ | Some |
| Load Tests | 80%+ | No |

---

## ✅ Production Readiness Checklist

Before deploying to production:

- [ ] All unit tests pass (100%)
- [ ] All property tests pass (100%)
- [ ] Critical E2E tests pass:
  - [ ] User authentication
  - [ ] Payment processing
  - [ ] Machine activation
  - [ ] Session management
- [ ] Security tests pass:
  - [ ] XSS protection
  - [ ] SQL injection prevention
  - [ ] Authentication bypass prevention
  - [ ] Rate limiting
- [ ] Performance acceptable:
  - [ ] API response < 2000ms
  - [ ] Concurrent users handled
  - [ ] Memory usage stable

---

## 🎓 Best Practices

### During Development
```powershell
# Run fast tests frequently
npm test

# Run full tests before committing
.\test-all.ps1
```

### Before Deployment
```powershell
# Run complete test suite
.\test-all.ps1

# If all pass, deploy!
```

### After Deployment
```powershell
# Run smoke tests on production
# (Use separate smoke test script)
```

---

## 📞 Need Help?

Check these files:
- `TESTING.md` - Detailed testing documentation
- `RUN-E2E-TESTS.md` - E2E test guide
- `QUICK-TEST-SETUP.md` - Quick start guide
- `SETUP-LOCAL-POSTGRES.md` - Database setup

---

## 🎉 You're Ready!

Your testing infrastructure is complete. Just run:

```powershell
.\test-all.ps1
```

And you'll know if your system is production-ready! 🚀
