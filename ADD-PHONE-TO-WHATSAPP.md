# 📱 Add Phone Number to WhatsApp Test List

## Problem
The WhatsApp API accepts the messages (returns 200 OK) but you don't receive them because your phone number is not in the allowed test recipients list.

## Solution: Add Your Phone to Test List

### Step 1: Go to Meta Developer Console
1. Open [developers.facebook.com](https://developers.facebook.com/)
2. Click **"My Apps"**
3. Select your app (the one with WhatsApp)

### Step 2: Navigate to WhatsApp Settings
1. In the left sidebar, find **"WhatsApp"**
2. Click **"Getting Started"** or **"API Setup"**

### Step 3: Add Phone Number to Test Recipients
1. Look for the section **"To"** or **"Send messages to"**
2. You'll see a field that says **"Manage phone number list"** or **"Add recipient phone number"**
3. Click **"Manage phone number list"** or the **"+"** button

### Step 4: Add Your Number
1. Enter your phone number: **+55 11 94133-0822**
2. Format: Include country code with + symbol
3. Click **"Send Code"** or **"Add"**

### Step 5: Verify Your Number
1. You'll receive a verification code via WhatsApp
2. Enter the code in the Meta Console
3. Click **"Verify"**

### Step 6: Test Again
Once verified, run the test again:
```bash
npx tsx test-whatsapp.ts
```

## Visual Guide

```
Meta Developer Console
└── My Apps
    └── [Your App Name]
        └── WhatsApp
            └── API Setup
                └── "To" section
                    └── "Manage phone number list" ← Click here
                        └── Add: +5511941330822
                        └── Verify with code
```

## Alternative: Check Current Test Numbers

1. In Meta Console → WhatsApp → API Setup
2. Look for **"Phone numbers"** section
3. You should see a list of allowed test numbers
4. If your number (5511941330822) is not there, add it

## Important Notes

- ⚠️ **Development Mode**: Your app is in development mode, so only numbers in the test list can receive messages
- ✅ **Production Mode**: Once your business is verified, you can send to any number
- 📱 **Format**: Use international format with + when adding: `+5511941330822`
- 🔢 **Limit**: You can add up to 5 test numbers in development mode

## After Adding the Number

The test showed success because:
- ✅ Your credentials are correct
- ✅ The API accepted the request
- ✅ The message was queued

But you didn't receive it because:
- ❌ Your number is not in the test recipients list

Once you add and verify your number, messages will arrive immediately!

## Quick Checklist

- [ ] Go to developers.facebook.com
- [ ] Open your app
- [ ] Navigate to WhatsApp → API Setup
- [ ] Click "Manage phone number list"
- [ ] Add +5511941330822
- [ ] Verify with code received on WhatsApp
- [ ] Run test again: `npx tsx test-whatsapp.ts`
- [ ] Check phone for messages

## Need Help Finding It?

If you can't find the "Manage phone number list" option:

1. **Option A**: Look for "To" field in API Setup
   - There should be a dropdown or link next to it

2. **Option B**: Check "Phone Numbers" tab
   - WhatsApp → Phone Numbers → Add phone number

3. **Option C**: Look in "Configuration"
   - WhatsApp → Configuration → Test numbers

## Screenshot Locations

The option is usually in one of these places:
- WhatsApp → **API Setup** → To field → "Manage phone number list"
- WhatsApp → **Getting Started** → Step 5 → "Add recipient"
- WhatsApp → **Configuration** → "Test phone numbers"

---

**Your number to add**: `+5511941330822`

Once added and verified, run: `npx tsx test-whatsapp.ts`
