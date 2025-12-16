# 📱 WhatsApp API - Quick Start

Get your WhatsApp notifications working in 5 minutes!

## 🚀 Super Quick Setup

### Option 1: Automated Setup (Recommended)

Run the setup wizard:

**Windows (PowerShell):**
```powershell
.\setup-whatsapp.ps1
```

**Linux/Mac:**
```bash
chmod +x setup-whatsapp.sh
./setup-whatsapp.sh
```

The wizard will:
1. Ask for your credentials
2. Update your `.env` file
3. Test the configuration
4. Confirm everything works

### Option 2: Manual Setup

1. **Get your credentials from Meta:**
   - Go to [developers.facebook.com](https://developers.facebook.com/)
   - Create an app → Add WhatsApp product
   - Copy your **Phone Number ID** and **Access Token**

2. **Update your `.env` file:**
   ```env
   WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
   WHATSAPP_ACCESS_TOKEN=your-access-token
   ADMIN_PHONE=5511948580070
   ```

3. **Test it:**
   ```bash
   npx tsx test-whatsapp.ts
   ```

## 📋 What You Need

Before starting, get these from [Meta Developer Console](https://developers.facebook.com/):

| Item | Where to Find | Example |
|------|---------------|---------|
| **Phone Number ID** | WhatsApp → API Setup → "From" dropdown | `123456789012345` |
| **Access Token** | WhatsApp → API Setup → "Temporary access token" | `EAABsb...` |
| **Admin Phone** | Your phone number (with country code) | `5511948580070` |

## ✅ Quick Test

After configuration, test with:

```bash
# Test the WhatsApp API directly
npx tsx test-whatsapp.ts

# Or test through your application
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"message": "Test notification"}'
```

You should receive a WhatsApp message on your phone! 📱

## 🎯 What Gets Sent

Your app automatically sends WhatsApp notifications for:

- 🔧 **Maintenance Required** - When a machine needs maintenance
- 📡 **Machine Offline** - When a machine goes offline
- ⚠️ **System Errors** - When critical errors occur
- 🌡️ **Temperature Alerts** - When machines overheat

## 🔧 Troubleshooting

### "Invalid OAuth access token"
→ Token expired (temporary tokens last 24h). Get a new one from Meta Console.

### "Recipient phone number not valid"
→ Add your phone to the test list: WhatsApp → API Setup → Manage phone numbers

### "Phone number not registered"
→ Format must be: country code + number, no spaces or +
   - ✅ Correct: `5511948580070`
   - ❌ Wrong: `+55 11 94858-0070`

### Messages not arriving
1. Check your `.env` file has all values
2. Verify phone is in test list (for development)
3. Check backend logs: `packages/backend/logs/`
4. Restart your backend server

## 📚 Full Documentation

For detailed setup, production configuration, and advanced features:
- **[WHATSAPP-API-SETUP.md](./WHATSAPP-API-SETUP.md)** - Complete setup guide
- **[.env.whatsapp.example](./.env.whatsapp.example)** - Configuration reference

## 🎉 That's It!

Your WhatsApp notifications are now configured. The system will automatically send alerts when:
- Machines need maintenance
- Machines go offline
- Critical errors occur

No additional code needed - it's already integrated! 🚀

---

**Need help?** Check [WHATSAPP-API-SETUP.md](./WHATSAPP-API-SETUP.md) for detailed instructions.
