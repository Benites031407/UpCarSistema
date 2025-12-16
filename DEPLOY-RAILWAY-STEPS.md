# 🚂 Railway Deployment - Step by Step

## Current Status
✅ Railway account created
✅ GitHub repository connected
✅ Upstash Redis ready: `rediss://default:AUzoAAIncDFjMGU5MzU5NjlkNjk0ZTNmOTU0MTU4OGIzNjY1YWExY3AxMTk2ODg@superb-catfish-19688.upstash.io:6379`
✅ Database backup ready: `render-backup.sql`

---

## STEP 1: Configure Backend Service in Railway

1. **Go to your Railway project dashboard**
2. **Click on your backend service** (the one connected to GitHub)
3. **Go to Settings tab**
4. **Configure these settings:**

   - **Root Directory:** `packages/backend`
   - **Start Command:** `npx tsx src/index.ts`
   - **Watch Paths:** Leave empty or default

5. **Save changes**

---

## STEP 2: Add PostgreSQL Database

1. **In your Railway project, click "+ New"**
2. **Select "Database"**
3. **Choose "PostgreSQL"**
4. **Railway will create it automatically**
5. **Wait for it to provision (1-2 minutes)**

---

## STEP 3: Add Environment Variables to Backend

1. **Click on your backend service**
2. **Go to "Variables" tab**
3. **Click "Raw Editor"**
4. **Paste this (Railway will auto-fill database variables):**

```bash
# Environment
NODE_ENV=production

# Database (Railway auto-fills these from PostgreSQL service)
DATABASE_URL=${{Postgres.DATABASE_URL}}
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}

# Redis (Upstash)
REDIS_URL=rediss://default:AUzoAAIncDFjMGU5MzU5NjlkNjk0ZTNmOTU0MTU4OGIzNjY1YWExY3AxMTk2ODg@superb-catfish-19688.upstash.io:6379
REDIS_HOST=superb-catfish-19688.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=AUzoAAIncDFjMGU5MzU5NjlkNjk0ZTNmOTU0MTU4OGIzNjY1YWExY3AxMTk2ODg

# JWT
JWT_SECRET=prod-jwt-secret-upcar-aspiradores-2025-change-this-to-random-64-chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# URLs (update after Railway generates your URL)
FRONTEND_URL=https://upaspiradores.vercel.app
CORS_ORIGIN=https://upaspiradores.vercel.app

# Google OAuth (use your existing credentials)
GOOGLE_CLIENT_ID=392894325740-lqcu2kkjp7pr8sq1aknqh8lcdu4fnmkv.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=https://YOUR-RAILWAY-URL.up.railway.app/auth/google/callback

# Mercado Pago
PIX_ACCESS_TOKEN=APP_USR-8520764521265905-121318-44a1befb70f238036772901e8d9c8f87-486340107
PIX_GATEWAY_URL=https://api.mercadopago.com
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-8520764521265905-121318-44a1befb70f238036772901e8d9c8f87-486340107
MERCADO_PAGO_BASE_URL=https://api.mercadopago.com

# WhatsApp
WHATSAPP_ACCESS_TOKEN=EAALZCWU1ZAGZAMBQCXvEfHyk4ndjPSu8BcjZAcNCmZCc905wAHmShk5MWZBohUO3Iui9ZCB1qzaMUz4ldjW2NT0Etw9SzRmZABvJuH1M40bBIJ9q8gtqqS1Y9eL1JyB17OD1gFOyfZB73oYEQZAyhR441cB2pNP1ARClKxm6QztcfgS47Xg60LZA5V5Y0DleJ1JNcR0pvpFlo2fHl0YE0Ak6IyZClqfrKIush8x2vD90Eea3JruVm7wHRRifSpRBH7z8z2UvTEIFwUwsnw4ZCKV1VCZAK1Q7CA
WHATSAPP_PHONE_NUMBER_ID=901637906368897
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_VERSION=v18.0
WHATSAPP_BUSINESS_ACCOUNT_ID=901637906368897

# Email
RESEND_API_KEY=re_W3e7T1dr_Kj8nTo3G5gG57b1NdastuRsM
EMAIL_FROM=onboarding@resend.dev

# Admin
ADMIN_EMAIL=pedrobpfeitosa@gmail.com
ADMIN_PHONE=5511941330822
ADMIN_DOMAINS=railway.app

# Port (Railway sets this automatically)
PORT=3001

# MQTT (not needed for Railway deployment - IoT controllers connect directly)
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# Security
SECURITY_AUDIT_LEVEL=LOW
MAX_CONCURRENT_SESSIONS=50
SESSION_TIMEOUT_HOURS=24
INACTIVITY_TIMEOUT_HOURS=2
ENABLE_AUDIT_LOGGING=true
ENABLE_SESSION_SECURITY=true
ENABLE_IP_WHITELIST=false
REQUIRE_REAUTH_FOR_SENSITIVE=false

# Rate Limiting
API_RATE_LIMIT=1000000
AUTH_RATE_LIMIT=100000
PAYMENT_RATE_LIMIT=500000
ADMIN_RATE_LIMIT=500000
```

5. **Click "Save"**

---

## STEP 4: Deploy Backend

1. **Railway will automatically deploy after saving variables**
2. **Wait for deployment to complete (3-5 minutes)**
3. **Check deployment logs for errors**
4. **Once deployed, copy your Railway URL** (something like `https://upcar-backend-production-xxxx.up.railway.app`)

---

## STEP 5: Import Database Backup

**Option A: Using Railway CLI (Recommended)**

```powershell
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Import database
$env:PGPASSWORD="${{Postgres.PGPASSWORD}}"; Get-Content render-backup.sql | railway run psql -h ${{Postgres.PGHOST}} -U ${{Postgres.PGUSER}} -d ${{Postgres.PGDATABASE}}
```

**Option B: Using Railway Dashboard**

1. Go to PostgreSQL service in Railway
2. Click "Data" tab
3. Click "Query"
4. Copy contents of `render-backup.sql` and paste
5. Execute

**Option C: Using pgAdmin or DBeaver**

1. Get connection details from Railway PostgreSQL service
2. Connect using your favorite PostgreSQL client
3. Import `render-backup.sql`

---

## STEP 6: Update Environment Variables with Railway URL

1. **Copy your Railway backend URL** (from Step 4)
2. **Update these variables in Railway:**
   - `GOOGLE_CALLBACK_URL=https://YOUR-RAILWAY-URL.up.railway.app/auth/google/callback`

3. **Update Google OAuth Console:**
   - Go to: https://console.cloud.google.com/
   - APIs & Services > Credentials
   - Add authorized redirect URI: `https://YOUR-RAILWAY-URL.up.railway.app/auth/google/callback`

---

## STEP 7: Test Backend

```powershell
# Test health endpoint
curl https://YOUR-RAILWAY-URL.up.railway.app/health

# Should return:
# {
#   "status": "healthy",
#   "service": "upcar-aspiradores-backend",
#   "database": "upcar_aspiradores",
#   "redis": "connected",
#   "mqtt": "connected",
#   "websocket": "initialized"
# }

# Test webhook endpoint
curl https://YOUR-RAILWAY-URL.up.railway.app/webhooks/mercadopago/test

# Should return:
# {
#   "status": "ok",
#   "message": "Webhook do Mercado Pago está configurado e funcionando"
# }
```

---

## STEP 8: Deploy Frontend to Vercel

1. **Go to: https://vercel.com/**
2. **Click "Add New..." > "Project"**
3. **Import your GitHub repository**
4. **Configure:**
   - Framework Preset: **Vite**
   - Root Directory: **packages/frontend**
   - Build Command: **npm run build**
   - Output Directory: **dist**

5. **Add Environment Variable:**
   ```
   VITE_API_URL=https://YOUR-RAILWAY-URL.up.railway.app/api
   ```

6. **Click "Deploy"**
7. **Wait 2-3 minutes**
8. **Copy your Vercel URL** (something like `https://upaspiradores.vercel.app`)

---

## STEP 9: Update Backend with Frontend URL

1. **Go back to Railway**
2. **Update these variables:**
   ```
   FRONTEND_URL=https://upaspiradores.vercel.app
   CORS_ORIGIN=https://upaspiradores.vercel.app
   ```

3. **Railway will redeploy automatically**

---

## STEP 10: Configure Mercado Pago Webhook

1. **Go to: https://www.mercadopago.com.br/developers/panel/app**
2. **Select your application**
3. **Go to "Webhooks"**
4. **Add new webhook:**
   - URL: `https://YOUR-RAILWAY-URL.up.railway.app/webhooks/mercadopago`
   - Events: **Pagamentos**

5. **Save**

---

## STEP 11: Test Complete Flow

1. **Open frontend:** `https://upaspiradores.vercel.app`
2. **Login with Google**
3. **Go to "Adicionar Crédito"**
4. **Generate PIX payment**
5. **Pay using Mercado Pago test account**
6. **Verify screen updates automatically!** 🎉

---

## ✅ Checklist

- [ ] Backend service configured in Railway
- [ ] PostgreSQL database added
- [ ] Environment variables added
- [ ] Backend deployed successfully
- [ ] Database backup imported
- [ ] Backend health check passes
- [ ] Frontend deployed to Vercel
- [ ] Frontend connects to backend
- [ ] Google OAuth updated
- [ ] Mercado Pago webhook configured
- [ ] Payment flow tested

---

## 🆘 Troubleshooting

### Backend won't start
- Check Railway logs: Click service > "Deployments" > Latest deployment > "View Logs"
- Verify all environment variables are set
- Check database connection

### Database import fails
- Use Railway CLI method (most reliable)
- Check PostgreSQL service is running
- Verify connection details

### Frontend can't connect to backend
- Verify `VITE_API_URL` in Vercel
- Check CORS settings in Railway
- Test backend health endpoint directly

### Webhook not working
- Test webhook endpoint directly
- Check Railway logs for errors
- Verify Mercado Pago webhook configuration

---

## 💰 Costs

- **Railway Free Tier:** $5 credit/month (enough for testing)
- **Vercel Free Tier:** 100% free
- **Upstash Redis Free Tier:** 10,000 commands/day

**Total for testing: FREE** ✅

---

## 🚀 Next Steps After Testing

If everything works:
1. Consider Railway Pro plan ($5-10/month) for production
2. Or migrate to VPS for better control
3. Set up custom domain (upaspiradores.com.br)
4. Configure SSL certificates
5. Set up monitoring and alerts

---

**Good luck! 🎉**
