# 🎨 Deploy Rápido para Testes - Render.com (MAIS FÁCIL!)

## 🎯 Por que Render?

- ✅ **Mais fácil que Railway**
- ✅ **Tudo em um lugar** (Frontend + Backend + DB)
- ✅ **Free tier generoso**
- ✅ **PostgreSQL incluído**
- ✅ **SSL automático**
- ✅ **Deploy automático do GitHub**

**Tempo estimado: 20-30 minutos**

---

## 🚀 Passo a Passo

### 1. Criar Conta (2 min)

1. Acesse: https://render.com/
2. Click "Get Started"
3. Login com GitHub

---

### 2. Criar PostgreSQL (3 min)

1. No dashboard, click "New +"
2. Selecione "PostgreSQL"
3. Configure:
   - **Name:** `upcar-db`
   - **Database:** `upcar_aspiradores`
   - **User:** `upcar`
   - **Region:** Oregon (US West) - mais próximo
   - **Plan:** Free
4. Click "Create Database"
5. **Copie a "Internal Database URL"** (vamos usar depois)

---

### 3. Criar Redis (3 min)

1. Click "New +"
2. Selecione "Redis"
3. Configure:
   - **Name:** `upcar-redis`
   - **Region:** Oregon (US West)
   - **Plan:** Free (25MB)
4. Click "Create Redis"
5. **Copie a "Internal Redis URL"**

---

### 4. Deploy Backend (10 min)

1. Click "New +"
2. Selecione "Web Service"
3. Conecte seu repositório GitHub
4. Configure:

**Build & Deploy:**
```
Name: upcar-backend
Region: Oregon (US West)
Branch: main
Root Directory: packages/backend
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
```

**Environment Variables:**
```bash
NODE_ENV=production

# Database (colar URL copiada)
DATABASE_URL=postgresql://upcar:...@...render.com/upcar_aspiradores

# Ou separado:
DB_HOST=dpg-xxxxx.oregon-postgres.render.com
DB_PORT=5432
DB_NAME=upcar_aspiradores
DB_USER=upcar
DB_PASSWORD=xxxxx

# Redis (colar URL copiada)
REDIS_URL=redis://red-xxxxx.oregon-redis.render.com:6379

# Ou separado:
REDIS_HOST=red-xxxxx.oregon-redis.render.com
REDIS_PORT=6379

# MQTT (vamos usar público para teste)
MQTT_BROKER_URL=mqtt://test.mosquitto.org:1883

# Segurança
JWT_SECRET=GERAR_STRING_ALEATORIA_64_CARACTERES_AQUI
BCRYPT_ROUNDS=12

# URLs (atualizar depois)
FRONTEND_URL=https://upaspiradores.onrender.com
CORS_ORIGIN=https://upaspiradores.onrender.com

# Google OAuth
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_CALLBACK_URL=https://upcar-backend.onrender.com/auth/google/callback

# Mercado Pago
PIX_ACCESS_TOKEN=seu-token-mercado-pago
MERCADO_PAGO_ACCESS_TOKEN=seu-token-mercado-pago
MERCADO_PAGO_BASE_URL=https://api.mercadopago.com

# WhatsApp
WHATSAPP_ACCESS_TOKEN=seu-token-whatsapp
WHATSAPP_PHONE_NUMBER_ID=seu-phone-id
WHATSAPP_BUSINESS_ACCOUNT_ID=seu-business-id
WHATSAPP_API_VERSION=v18.0

PORT=3001
```

5. Click "Create Web Service"
6. Aguarde deploy (5-10 min)
7. **Copie a URL gerada** (ex: `https://upcar-backend.onrender.com`)

---

### 5. Deploy Frontend (10 min)

1. Click "New +"
2. Selecione "Static Site"
3. Conecte seu repositório GitHub
4. Configure:

**Build & Deploy:**
```
Name: upaspiradores
Region: Oregon (US West)
Branch: main
Root Directory: packages/frontend
Build Command: npm install && npm run build
Publish Directory: dist
```

**Environment Variables:**
```bash
VITE_API_URL=https://upcar-backend.onrender.com/api
```

5. Click "Create Static Site"
6. Aguarde deploy (3-5 min)
7. **URL gerada:** `https://upaspiradores.onrender.com`

---

### 6. Atualizar Configurações (5 min)

#### 6.1. Atualizar Backend

No serviço backend, vá em "Environment" e atualize:

```bash
FRONTEND_URL=https://upaspiradores.onrender.com
CORS_ORIGIN=https://upaspiradores.onrender.com
```

Click "Save Changes" (vai fazer redeploy automático)

#### 6.2. Executar Migrações

No backend, vá em "Shell" e execute:

```bash
npm run db:migrate
```

**OU** adicione ao Build Command:
```bash
npm install && npm run build && npm run db:migrate
```

---

### 7. Configurar Serviços Externos (5 min)

#### Google OAuth

1. https://console.cloud.google.com/
2. APIs & Services > Credentials
3. Adicionar URIs:
   ```
   https://upaspiradores.onrender.com
   https://upcar-backend.onrender.com/auth/google/callback
   ```

#### Mercado Pago Webhook

1. https://www.mercadopago.com.br/developers/panel/app
2. Webhooks
3. Adicionar:
   ```
   https://upcar-backend.onrender.com/webhooks/mercadopago
   ```

---

## ✅ Testar

### 1. Health Check

```bash
curl https://upcar-backend.onrender.com/health
```

### 2. Webhook Test

```bash
curl https://upcar-backend.onrender.com/webhooks/mercadopago/test
```

### 3. Frontend

Abrir: https://upaspiradores.onrender.com

### 4. Pagamento PIX

1. Fazer login
2. Adicionar crédito
3. Gerar PIX
4. Pagar (conta teste)
5. **Verificar atualização automática!** 🎉

---

## 💰 Custos

### Render Free Tier

**PostgreSQL:**
- 1GB storage
- Expira após 90 dias (pode renovar grátis)

**Redis:**
- 25MB
- Sem expiração

**Web Service (Backend):**
- 750 horas/mês
- Dorme após 15 min de inatividade
- Acorda em ~30s

**Static Site (Frontend):**
- 100GB bandwidth/mês
- CDN global
- Sem sleep

**Total: GRÁTIS para testes!** ✅

---

## 🎯 Vantagens do Render

✅ **Mais simples** que Railway
✅ **Tudo integrado** (DB, Redis, Backend, Frontend)
✅ **Free tier generoso**
✅ **SSL automático**
✅ **Deploy automático** do GitHub
✅ **Shell integrado** para comandos
✅ **Logs em tempo real**
✅ **Sem cartão de crédito** necessário

---

## 🚨 Limitação Importante

**Free tier dorme após 15 min de inatividade.**

Primeira requisição após sleep demora ~30s para acordar.

**Solução:**
- Para testes: OK
- Para produção: Upgrade para $7/mês (sem sleep)

---

## 🔄 Deploy Automático

Render detecta push no GitHub e faz deploy automático!

```bash
git add .
git commit -m "Update"
git push origin main
```

Render faz deploy automaticamente! 🚀

---

## 📊 Comparação

| Feature | Render | Railway | Vercel+Railway |
|---------|--------|---------|----------------|
| Facilidade | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Tudo em um | ✅ | ✅ | ❌ |
| Free tier | ✅ | ✅ | ✅ |
| PostgreSQL | ✅ Incluído | ✅ Incluído | ❌ |
| Redis | ✅ Incluído | ✅ Incluído | ❌ |
| Sleep | 15 min | Sim | Frontend não |
| Setup time | 20-30 min | 30-45 min | 30-45 min |

**Recomendação: Use Render!** 🎨

---

## 🆘 Troubleshooting

### Backend não inicia

1. Ver logs: Dashboard > Backend > Logs
2. Verificar variáveis: Environment
3. Verificar build: Events

### Frontend não conecta

1. Verificar `VITE_API_URL`
2. Verificar CORS no backend
3. Aguardar backend acordar (se estava dormindo)

### Banco de dados não conecta

1. Verificar `DATABASE_URL`
2. Usar "Internal Database URL" (não External)
3. Verificar se PostgreSQL está rodando

---

## 🎉 Pronto!

Sua aplicação está na internet em:

- **Frontend:** https://upaspiradores.onrender.com
- **Backend:** https://upcar-backend.onrender.com
- **Webhook:** https://upcar-backend.onrender.com/webhooks/mercadopago

**Webhook do Mercado Pago funcionando!** 🎊

---

**Boa sorte! 🚀**
