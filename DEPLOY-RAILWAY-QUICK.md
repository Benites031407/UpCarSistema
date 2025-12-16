# 🚂 Deploy Rápido para Testes - Railway + Vercel

## 🎯 Objetivo

Colocar a aplicação na internet rapidamente para testar o webhook do Mercado Pago sem precisar de ngrok.

**Tempo estimado: 30-45 minutos**

---

## 📋 Arquitetura

```
Frontend (Vercel)          →  https://upaspiradores.vercel.app
Backend (Railway)          →  https://upaspiradores-api.up.railway.app
PostgreSQL (Railway)       →  Interno
Redis (Railway)            →  Interno
MQTT (Railway)             →  Interno
```

---

## PARTE 1: Deploy do Backend no Railway (20 min)

### 1.1. Criar Conta no Railway

1. Acesse: https://railway.app/
2. Clique em "Start a New Project"
3. Login com GitHub (recomendado)

### 1.2. Criar Novo Projeto

1. Click "New Project"
2. Selecione "Deploy from GitHub repo"
3. Conecte seu repositório
4. Selecione o repositório do projeto

### 1.3. Adicionar Serviços

**Adicionar PostgreSQL:**
1. Click "+ New"
2. Selecione "Database"
3. Escolha "PostgreSQL"
4. Railway criará automaticamente

**Adicionar Redis:**
1. Click "+ New"
2. Selecione "Database"
3. Escolha "Redis"
4. Railway criará automaticamente

**Adicionar MQTT (Eclipse Mosquitto):**
1. Click "+ New"
2. Selecione "Empty Service"
3. Nome: "mosquitto"
4. Em Settings > Deploy:
   - Docker Image: `eclipse-mosquitto:2`
   - Port: 1883

### 1.4. Configurar Backend Service

1. Click no serviço do backend
2. Vá em "Settings"
3. Configure:
   - **Root Directory:** `packages/backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

### 1.5. Configurar Variáveis de Ambiente

No serviço do backend, vá em "Variables" e adicione:

```bash
# Ambiente
NODE_ENV=production

# Railway fornece automaticamente (não precisa adicionar):
# DATABASE_URL (do PostgreSQL)
# REDIS_URL (do Redis)

# Mas precisamos extrair valores individuais:
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}

REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}

# MQTT (usar nome do serviço)
MQTT_BROKER_URL=mqtt://mosquitto:1883

# Segurança (GERAR NOVOS!)
JWT_SECRET=GERAR_STRING_ALEATORIA_64_CARACTERES
BCRYPT_ROUNDS=12

# URLs (atualizar depois que Railway gerar)
FRONTEND_URL=https://upaspiradores.vercel.app
CORS_ORIGIN=https://upaspiradores.vercel.app

# Google OAuth (usar credenciais de desenvolvimento ou criar novas)
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_CALLBACK_URL=https://SEU-BACKEND-URL.up.railway.app/auth/google/callback

# Mercado Pago (pode usar teste ou produção)
PIX_ACCESS_TOKEN=seu-token-mercado-pago
MERCADO_PAGO_ACCESS_TOKEN=seu-token-mercado-pago
MERCADO_PAGO_BASE_URL=https://api.mercadopago.com

# WhatsApp (pode usar teste)
WHATSAPP_ACCESS_TOKEN=seu-token-whatsapp
WHATSAPP_PHONE_NUMBER_ID=seu-phone-id
WHATSAPP_BUSINESS_ACCOUNT_ID=seu-business-id
WHATSAPP_API_VERSION=v18.0

# Port (Railway define automaticamente)
PORT=3001
```

### 1.6. Deploy

1. Railway fará deploy automaticamente
2. Aguarde o build completar (5-10 min)
3. Copie a URL gerada (ex: `https://upaspiradores-api.up.railway.app`)

### 1.7. Executar Migrações

No Railway CLI ou via Railway Dashboard:

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link ao projeto
railway link

# Executar migrações
railway run npm run db:migrate
```

**OU** adicione ao Build Command:
```bash
npm install && npm run build && npm run db:migrate
```

---

## PARTE 2: Deploy do Frontend no Vercel (10 min)

### 2.1. Criar Conta no Vercel

1. Acesse: https://vercel.com/
2. Login com GitHub

### 2.2. Importar Projeto

1. Click "Add New..." > "Project"
2. Selecione seu repositório
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `packages/frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### 2.3. Configurar Variáveis de Ambiente

Em "Environment Variables":

```bash
VITE_API_URL=https://SEU-BACKEND-URL.up.railway.app/api
```

**Substitua** `SEU-BACKEND-URL` pela URL do Railway.

### 2.4. Deploy

1. Click "Deploy"
2. Aguarde build (2-3 min)
3. Vercel gerará URL: `https://upaspiradores.vercel.app`

---

## PARTE 3: Atualizar Configurações (10 min)

### 3.1. Atualizar Backend com URL do Frontend

No Railway, atualize variáveis:

```bash
FRONTEND_URL=https://upaspiradores.vercel.app
CORS_ORIGIN=https://upaspiradores.vercel.app
```

### 3.2. Atualizar Google OAuth

1. https://console.cloud.google.com/
2. APIs & Services > Credentials
3. Adicionar URIs autorizados:
   ```
   https://upaspiradores.vercel.app
   https://SEU-BACKEND-URL.up.railway.app
   ```
4. Adicionar redirect URIs:
   ```
   https://SEU-BACKEND-URL.up.railway.app/auth/google/callback
   ```

### 3.3. Configurar Webhook Mercado Pago

1. https://www.mercadopago.com.br/developers/panel/app
2. Webhooks
3. Adicionar URL:
   ```
   https://SEU-BACKEND-URL.up.railway.app/webhooks/mercadopago
   ```
4. Evento: Pagamentos

### 3.4. Testar Webhook

```bash
curl https://SEU-BACKEND-URL.up.railway.app/webhooks/mercadopago/test
```

Deve retornar:
```json
{
  "status": "ok",
  "message": "Webhook do Mercado Pago está configurado e funcionando",
  "timestamp": "..."
}
```

---

## ✅ Verificação

### 1. Frontend
- [ ] Abrir: https://upaspiradores.vercel.app
- [ ] Página carrega
- [ ] Login funciona

### 2. Backend
- [ ] Health check: `curl https://SEU-BACKEND-URL.up.railway.app/health`
- [ ] Retorna status "healthy"

### 3. Webhook
- [ ] Teste: `curl https://SEU-BACKEND-URL.up.railway.app/webhooks/mercadopago/test`
- [ ] Retorna status "ok"

### 4. Pagamento PIX
- [ ] Fazer login
- [ ] Adicionar crédito
- [ ] Gerar PIX
- [ ] Pagar (conta teste)
- [ ] **Verificar se tela atualiza automaticamente!** 🎉

---

## 💰 Custos

### Railway (Free Tier)
- $5 de crédito grátis por mês
- Suficiente para testes
- Depois: ~$5-10/mês

### Vercel (Free Tier)
- 100% grátis para projetos pessoais
- Bandwidth ilimitado
- Deploy automático

**Total para testes: GRÁTIS** ✅

---

## 🚨 Limitações do Railway Free Tier

- 500 horas de execução/mês
- 1GB RAM por serviço
- 1GB storage
- Serviços dormem após inatividade (acordam em ~30s)

**Para produção real, considere upgrade ou usar servidor dedicado.**

---

## 🔄 Deploy Automático

Ambos Railway e Vercel fazem deploy automático quando você faz push no GitHub!

```bash
git add .
git commit -m "Update"
git push origin main
```

Railway e Vercel detectam e fazem deploy automaticamente! 🚀

---

## 📝 Comandos Úteis

### Railway CLI

```bash
# Ver logs
railway logs

# Executar comando
railway run npm run db:migrate

# Abrir dashboard
railway open

# Ver variáveis
railway variables
```

### Vercel CLI

```bash
# Instalar
npm i -g vercel

# Deploy manual
vercel

# Ver logs
vercel logs

# Ver deployments
vercel ls
```

---

## 🎯 Próximos Passos

Depois de testar e validar:

1. **Se funcionar bem:** Considere manter no Railway/Vercel
2. **Para produção séria:** Migre para servidor dedicado (VPS)
3. **Para escala:** Use AWS/GCP/Azure

---

## 🆘 Troubleshooting

### Backend não inicia no Railway

```bash
# Ver logs
railway logs

# Verificar variáveis
railway variables

# Verificar build
# No dashboard: Deployments > Ver logs
```

### Frontend não conecta ao backend

1. Verificar `VITE_API_URL` no Vercel
2. Verificar CORS no backend
3. Verificar se backend está rodando

### Webhook não funciona

1. Testar endpoint diretamente
2. Verificar logs do Railway
3. Verificar configuração no Mercado Pago

---

## ✨ Vantagens desta Abordagem

✅ **Rápido:** 30-45 minutos total
✅ **Grátis:** Free tier suficiente para testes
✅ **Fácil:** Interface visual, sem comandos complexos
✅ **Deploy automático:** Push no GitHub = deploy automático
✅ **HTTPS:** SSL automático
✅ **Webhook funciona:** URL pública real
✅ **Logs:** Fácil de debugar

---

**Boa sorte com o deploy! 🚀**
