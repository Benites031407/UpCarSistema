# 📱 WhatsApp Business API Setup Guide

## Overview

This guide will help you set up the WhatsApp Business API for your UpCar-Aspiradores system to send automated notifications for maintenance alerts, offline machines, and system errors.

## Prerequisites

- A Facebook Business Account
- A verified business phone number
- A Meta Developer Account
- Your application already has WhatsApp integration code ready

## 🚀 Quick Setup Steps

### Step 1: Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Business"** as the app type
4. Fill in the app details:
   - **App Name**: UpCar-Aspiradores Notifications
   - **App Contact Email**: Your business email
   - **Business Account**: Select or create your business account

### Step 2: Add WhatsApp Product

1. In your app dashboard, click **"Add Product"**
2. Find **"WhatsApp"** and click **"Set Up"**
3. Select your **Business Portfolio** (or create one)

### Step 3: Configure WhatsApp Business API

1. In the WhatsApp section, go to **"API Setup"**
2. You'll see:
   - **Phone Number ID** (copy this)
   - **WhatsApp Business Account ID**
   - **Temporary Access Token** (valid for 24 hours)

### Step 4: Get Your Credentials

#### A. Phone Number ID
- Found in: WhatsApp → API Setup → "From" dropdown
- Example: `123456789012345`

#### B. Access Token (Temporary - for testing)
- Found in: WhatsApp → API Setup → "Temporary access token"
- Valid for: 24 hours
- Use this for initial testing

#### C. Access Token (Permanent - for production)
1. Go to **Settings** → **Basic**
2. Copy your **App ID** and **App Secret**
3. Go to **WhatsApp** → **Configuration**
4. Click **"Generate Token"** or use System User Token:
   - Go to **Business Settings** → **System Users**
   - Create a system user
   - Assign WhatsApp permissions
   - Generate a permanent token

### Step 5: Add Test Phone Number

1. In WhatsApp → API Setup
2. Under **"To"** field, click **"Manage phone number list"**
3. Add your phone number (must include country code)
4. Verify the number via WhatsApp code

### Step 6: Configure Your Application

Update your `.env` file with the credentials:

```env
# WhatsApp Business API Configuration
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_ACCESS_TOKEN=your-actual-access-token-here
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id-here

# Admin phone number (must include country code, no + or spaces)
ADMIN_PHONE=5511948580070
```

**Important**: 
- Phone number format: `5511948580070` (country code + number, no spaces or special characters)
- For Brazil: `55` + area code + number
- Example: `5511948580070` = +55 11 94858-0070

### Step 7: Test the Integration

#### Option 1: Using the Test Endpoint

Create a test script `test-whatsapp.ts`:

```typescript
import axios from 'axios';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const PHONE_NUMBER_ID = 'your-phone-number-id';
const ACCESS_TOKEN = 'your-access-token';
const TO_PHONE = '5511948580070'; // Your test number

async function testWhatsApp() {
  try {
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: TO_PHONE,
        type: 'text',
        text: {
          body: '🧪 Test message from UpCar-Aspiradores'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Message sent successfully:', response.data);
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testWhatsApp();
```

Run it:
```bash
npx tsx test-whatsapp.ts
```

#### Option 2: Using Your Application

Trigger a test notification through your app:

```bash
# Start your backend
cd packages/backend
npm run dev

# In another terminal, trigger a test notification
curl -X POST http://localhost:3001/api/test/notification \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}'
```

## 🔧 Production Setup

### 1. Verify Your Business

1. Go to **Business Settings** → **Security Center**
2. Complete business verification
3. This is required for production use

### 2. Get Production Access Token

1. Create a **System User**:
   - Go to Business Settings → Users → System Users
   - Click "Add" → Create system user
   - Assign role: Admin

2. Generate **Permanent Token**:
   - Select the system user
   - Click "Generate New Token"
   - Select your app
   - Select permissions: `whatsapp_business_messaging`
   - Copy and save the token securely

3. Update production `.env`:
```env
WHATSAPP_ACCESS_TOKEN=your-permanent-production-token
```

### 3. Add Production Phone Number

1. Go to WhatsApp → Phone Numbers
2. Click "Add Phone Number"
3. Choose:
   - **Option A**: Use your existing business number (requires verification)
   - **Option B**: Get a new number from Meta

### 4. Configure Webhooks (Optional - for message status)

1. Go to WhatsApp → Configuration
2. Click "Edit" on Webhook
3. Set:
   - **Callback URL**: `https://yourdomain.com/webhooks/whatsapp`
   - **Verify Token**: Create a random string
4. Subscribe to fields:
   - `messages`
   - `message_status`

## 📊 Testing Your Setup

### Test 1: Send Test Message

```bash
curl -X POST "https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5511948580070",
    "type": "text",
    "text": {
      "body": "Hello from UpCar-Aspiradores!"
    }
  }'
```

### Test 2: Trigger Maintenance Notification

Use your application to put a machine in maintenance mode and verify the notification is sent.

### Test 3: Check Notification Logs

```bash
# View notification statistics
curl http://localhost:3001/api/notifications/stats

# View recent notifications
curl http://localhost:3001/api/notifications/recent
```

## 🔍 Troubleshooting

### Error: "Invalid OAuth access token"
- **Solution**: Regenerate your access token
- Temporary tokens expire after 24 hours
- Use permanent system user tokens for production

### Error: "Recipient phone number not valid"
- **Solution**: Check phone number format
- Must include country code
- No spaces, dashes, or + symbol
- Example: `5511948580070` not `+55 11 94858-0070`

### Error: "Phone number not registered"
- **Solution**: Add the phone number to your test numbers list
- Go to WhatsApp → API Setup → Manage phone number list

### Error: "Rate limit exceeded"
- **Solution**: Your app has rate limiting built-in
- Default: 10 notifications per hour
- Adjust in `notificationService.ts`: `maxNotificationsPerHour`

### Messages not being sent
1. Check your `.env` configuration
2. Verify access token is valid
3. Check backend logs: `packages/backend/logs/`
4. Verify phone number is in test list (for development)

## 📱 Message Templates (Optional)

For production, you can create message templates:

1. Go to WhatsApp → Message Templates
2. Click "Create Template"
3. Design your template with variables
4. Submit for approval (usually takes 24 hours)

Example template:
```
Name: maintenance_alert
Category: UTILITY
Language: Portuguese (BR)

Body:
🔧 MANUTENÇÃO NECESSÁRIA

Máquina: {{1}}
Local: {{2}}
Motivo: {{3}}

Por favor, agende a manutenção o mais breve possível.
```

## 🔐 Security Best Practices

1. **Never commit tokens to Git**
   - Use `.env` files
   - Add `.env` to `.gitignore`

2. **Use System User Tokens for Production**
   - More secure than user access tokens
   - Don't expire
   - Can be revoked if compromised

3. **Rotate Tokens Regularly**
   - Generate new tokens every 90 days
   - Update in production environment

4. **Monitor Usage**
   - Check Meta Business Suite for usage stats
   - Set up alerts for unusual activity

## 📈 Rate Limits

### Development (Test Numbers)
- 1,000 messages per day
- 50 messages per hour per recipient

### Production (Verified Business)
- Tier 1: 1,000 unique recipients per 24 hours
- Tier 2: 10,000 unique recipients per 24 hours
- Tier 3: 100,000 unique recipients per 24 hours
- Unlimited: Request from Meta

## 🎯 Next Steps

1. ✅ Complete Meta App setup
2. ✅ Get your credentials
3. ✅ Update `.env` file
4. ✅ Test with temporary token
5. ✅ Add test phone numbers
6. ✅ Verify notifications work
7. ⏳ Complete business verification
8. ⏳ Get permanent production token
9. ⏳ Add production phone number
10. ⏳ Create message templates (optional)

## 📚 Additional Resources

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Getting Started Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Webhooks Setup](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)

## 💡 Current Implementation

Your application already has:
- ✅ WhatsApp service implementation
- ✅ Rate limiting (10 notifications/hour)
- ✅ Automatic retry for failed messages
- ✅ Notification tracking in database
- ✅ Real-time notification broadcasting
- ✅ Support for multiple notification types:
  - Maintenance required
  - Machine offline
  - System errors
  - Temperature alerts

## 🆘 Need Help?

If you encounter issues:
1. Check the [Meta Developer Community](https://developers.facebook.com/community/)
2. Review your app's error logs in Meta Business Suite
3. Check backend logs: `packages/backend/logs/`
4. Verify all environment variables are set correctly

---

**Status**: Ready for configuration
**Last Updated**: 2025-12-14
