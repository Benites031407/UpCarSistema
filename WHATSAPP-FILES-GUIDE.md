# 📱 WhatsApp Integration - Files Guide

This guide explains all the WhatsApp-related files in your project and how to use them.

## 📁 Files Overview

### 🚀 Quick Start Files

| File | Purpose | When to Use |
|------|---------|-------------|
| **WHATSAPP-QUICK-START.md** | 5-minute setup guide | Start here! Quick overview |
| **setup-whatsapp.ps1** | Windows setup wizard | Automated setup on Windows |
| **setup-whatsapp.sh** | Linux/Mac setup wizard | Automated setup on Linux/Mac |

### 📚 Documentation Files

| File | Purpose | When to Use |
|------|---------|-------------|
| **WHATSAPP-API-SETUP.md** | Complete setup guide | Detailed instructions, troubleshooting |
| **.env.whatsapp.example** | Configuration reference | See all available options |
| **WHATSAPP-FILES-GUIDE.md** | This file | Understand the file structure |

### 🧪 Testing Files

| File | Purpose | When to Use |
|------|---------|-------------|
| **test-whatsapp.ts** | Full test suite | Test all notification types |
| **test-whatsapp-curl.sh** | Simple curl test | Quick API test without Node.js |

### 💻 Application Files

| File | Purpose | Location |
|------|---------|----------|
| **notificationService.ts** | WhatsApp service implementation | `packages/backend/src/services/` |
| **notifications.ts** | API routes | `packages/backend/src/routes/` |
| **.env** | Configuration | `packages/backend/.env` |

## 🎯 Quick Start Workflow

### Step 1: Read the Quick Start
```bash
# Open and read
WHATSAPP-QUICK-START.md
```

### Step 2: Run Setup Wizard

**Windows:**
```powershell
.\setup-whatsapp.ps1
```

**Linux/Mac:**
```bash
chmod +x setup-whatsapp.sh
./setup-whatsapp.sh
```

### Step 3: Test Configuration
```bash
npx tsx test-whatsapp.ts
```

### Step 4: Restart Backend
```bash
cd packages/backend
npm run dev
```

## 📖 Detailed Workflow

### For First-Time Setup

1. **Read**: `WHATSAPP-QUICK-START.md` (5 min)
2. **Setup**: Run `setup-whatsapp.ps1` or `setup-whatsapp.sh`
3. **Test**: Run `test-whatsapp.ts`
4. **Deploy**: Restart your backend

### For Troubleshooting

1. **Check**: `WHATSAPP-API-SETUP.md` → Troubleshooting section
2. **Verify**: `.env.whatsapp.example` → Correct format
3. **Test**: `test-whatsapp.ts` → See detailed errors
4. **Logs**: Check `packages/backend/logs/`

### For Production Setup

1. **Read**: `WHATSAPP-API-SETUP.md` → Production Setup section
2. **Configure**: Get permanent System User token
3. **Verify**: Complete business verification
4. **Update**: Production `.env` file
5. **Test**: Run tests in production environment

## 🔧 Configuration Files

### .env (Main Configuration)
Location: `packages/backend/.env`

Required variables:
```env
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token
ADMIN_PHONE=5511948580070
```

### .env.whatsapp.example (Reference)
Location: `.env.whatsapp.example`

Contains:
- All available options
- Format examples
- Troubleshooting tips
- Quick setup checklist

## 🧪 Testing Files Explained

### test-whatsapp.ts (Comprehensive Test)

**What it does:**
- Validates configuration
- Tests simple messages
- Tests maintenance notifications
- Tests offline alerts
- Provides detailed error messages

**When to use:**
- After initial setup
- When troubleshooting
- Before production deployment

**How to run:**
```bash
npx tsx test-whatsapp.ts
```

### test-whatsapp-curl.sh (Simple Test)

**What it does:**
- Quick API test using curl
- No Node.js dependencies
- Direct HTTP request

**When to use:**
- Quick verification
- Testing from different machines
- Debugging network issues

**How to run:**
```bash
chmod +x test-whatsapp-curl.sh
./test-whatsapp-curl.sh
```

## 📱 Application Integration

Your application already has WhatsApp fully integrated:

### Notification Service
File: `packages/backend/src/services/notificationService.ts`

Features:
- ✅ Automatic notification sending
- ✅ Rate limiting (10/hour)
- ✅ Retry failed messages
- ✅ Status tracking
- ✅ Real-time broadcasting

### API Endpoints
File: `packages/backend/src/routes/notifications.ts`

Available endpoints:
- `GET /api/notifications/stats` - Get statistics
- `GET /api/notifications/recent` - Get recent notifications
- `POST /api/notifications/retry-failed` - Retry failed
- `POST /api/notifications/test` - Send test notification

### Notification Types

The system automatically sends notifications for:

1. **Maintenance Required** (`sendMaintenanceNotification`)
   - Triggered when machine needs maintenance
   - Includes machine code, location, reason

2. **Machine Offline** (`sendOfflineNotification`)
   - Triggered when machine goes offline
   - Includes last heartbeat time

3. **System Errors** (`sendSystemErrorNotification`)
   - Triggered on critical errors
   - Includes error details

4. **Temperature Alerts** (`sendTemperatureAlert`)
   - Triggered on overheating
   - Includes temperature reading

## 🎓 Learning Path

### Beginner
1. Read `WHATSAPP-QUICK-START.md`
2. Run `setup-whatsapp.ps1`
3. Test with `test-whatsapp.ts`
4. Done! ✅

### Intermediate
1. Read `WHATSAPP-API-SETUP.md`
2. Understand `.env.whatsapp.example`
3. Review `notificationService.ts`
4. Test all notification types

### Advanced
1. Study Meta WhatsApp API docs
2. Implement message templates
3. Set up webhooks
4. Configure production environment
5. Implement custom notification types

## 🆘 Quick Help

### "Where do I start?"
→ Open `WHATSAPP-QUICK-START.md`

### "How do I configure it?"
→ Run `setup-whatsapp.ps1` (Windows) or `setup-whatsapp.sh` (Linux/Mac)

### "How do I test it?"
→ Run `npx tsx test-whatsapp.ts`

### "It's not working!"
→ Check `WHATSAPP-API-SETUP.md` → Troubleshooting section

### "I need detailed docs"
→ Read `WHATSAPP-API-SETUP.md`

### "What are all these env variables?"
→ Check `.env.whatsapp.example`

## 📊 File Dependency Tree

```
WHATSAPP-QUICK-START.md (Start here!)
    ├── setup-whatsapp.ps1 (Windows setup)
    │   └── Updates: packages/backend/.env
    │       └── Used by: notificationService.ts
    │
    ├── setup-whatsapp.sh (Linux/Mac setup)
    │   └── Updates: packages/backend/.env
    │       └── Used by: notificationService.ts
    │
    └── test-whatsapp.ts (Testing)
        └── Validates: packages/backend/.env

WHATSAPP-API-SETUP.md (Detailed guide)
    ├── References: .env.whatsapp.example
    └── Explains: notificationService.ts

Application Files:
    packages/backend/.env
        └── Used by: notificationService.ts
            └── Used by: notifications.ts (routes)
                └── Used by: index.ts (main app)
```

## ✅ Checklist

Use this checklist to track your setup:

- [ ] Read `WHATSAPP-QUICK-START.md`
- [ ] Create Meta Developer account
- [ ] Create Meta App with WhatsApp
- [ ] Get Phone Number ID
- [ ] Get Access Token
- [ ] Run setup wizard (`setup-whatsapp.ps1` or `.sh`)
- [ ] Add phone to test list in Meta Console
- [ ] Run `test-whatsapp.ts`
- [ ] Verify messages arrive on phone
- [ ] Restart backend server
- [ ] Test through application
- [ ] Read `WHATSAPP-API-SETUP.md` for production
- [ ] Get permanent System User token (production)
- [ ] Complete business verification (production)

## 🎯 Next Steps

After setup:
1. ✅ Test all notification types
2. ✅ Monitor notification logs
3. ✅ Adjust rate limits if needed
4. ✅ Plan production deployment
5. ✅ Create message templates (optional)

---

**Quick Links:**
- [Meta Developer Console](https://developers.facebook.com/)
- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Getting Started Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)

**Status**: Ready to configure
**Last Updated**: 2025-12-14
