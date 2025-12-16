# 🚀 Deploy Produção VPS - upaspiradores.com.br

## 📋 Visão Geral

Deploy profissional em VPS com Docker, SSL, monitoramento e backups automáticos.

**Tempo estimado:** 4-6 horas
**Custo mensal:** R$ 40-80 (VPS) + R$ 0 (domínio já registrado)

---

## 🎯 Escolha do Provedor VPS

### Recomendações para Brasil:

**1. Contabo (Melhor custo-benefício)**
- 4 vCPU, 8GB RAM, 200GB SSD
- Custo: ~R$ 40/mês
- Datacenter: Europa (latência ~200ms)
- Site: https://contabo.com/

**2. DigitalOcean (Mais confiável)**
- 2 vCPU, 4GB RAM, 80GB SSD
- Custo: $24/mês (~R$ 120)
- Datacenter: São Paulo
- Site: https://www.digitalocean.com/

**3. Vultr (Bom equilíbrio)**
- 2 vCPU, 4GB RAM, 80GB SSD
- Custo: $18/mês (~R$ 90)
- Datacenter: São Paulo
- Site: https://www.vultr.com/

**4. AWS Lightsail (Escalável)**
- 2 vCPU, 4GB RAM, 80GB SSD
- Custo: $20/mês (~R$ 100)
- Datacenter: São Paulo
- Site: https://aws.amazon.com/lightsail/

**Recomendação:** Contabo (melhor preço) ou DigitalOcean (melhor suporte)

---

## 📝 FASE 1: Criar e Configurar VPS

### 1.1. Criar VPS

**DigitalOcean:**
1. Criar conta em https://www.digitalocean.com/
2. Create > Droplets
3. Escolher:
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic - $24/mo (4GB RAM, 2 vCPUs)
   - **Datacenter:** São Paulo 1
   - **Authentication:** SSH Key (recomendado) ou Password
4. Create Droplet
5. Anotar IP público

**Contabo:**
1. Criar conta em https://contabo.com/
2. Order > VPS
3. Escolher:
   - **VPS M:** 4 vCPU, 8GB RAM, 200GB SSD
   - **Location:** Europe (melhor preço)
   - **Image:** Ubuntu 22.04
4. Complete order
5. Receber email com IP e credenciais

### 1.2. Conectar ao VPS

```powershell
# Windows PowerShell
ssh root@SEU_IP_PUBLICO

# Exemplo:
ssh root@143.198.123.45
```

### 1.3. Atualizar Sistema

```bash
# Atualizar pacotes
apt update && apt upgrade -y

# Instalar ferramentas essenciais
apt install -y curl wget git vim ufw fail2ban htop
```

### 1.4. Criar Usuário (Segurança)

```bash
# Criar usuário
adduser upcar
usermod -aG sudo upcar

# Copiar chave SSH (se usar)
mkdir -p /home/upcar/.ssh
cp ~/.ssh/authorized_keys /home/upcar/.ssh/
chown -R upcar:upcar /home/upcar/.ssh
chmod 700 /home/upcar/.ssh
chmod 600 /home/upcar/.ssh/authorized_keys

# Trocar para novo usuário
su - upcar
```

### 1.5. Configurar Firewall

```bash
# Configurar UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 1883/tcp  # MQTT (para Raspberry Pi)
sudo ufw enable

# Verificar
sudo ufw status
```

---

## 📝 FASE 2: Instalar Docker

### 2.1. Instalar Docker Engine

```bash
# Remover versões antigas
sudo apt remove docker docker-engine docker.io containerd runc

# Instalar dependências
sudo apt install -y ca-certificates curl gnupg lsb-release

# Adicionar chave GPG
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Adicionar repositório
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Aplicar mudanças (relogar)
exit
# Conectar novamente
ssh upcar@SEU_IP_PUBLICO
```

### 2.2. Verificar Instalação

```bash
# Verificar Docker
docker --version
docker compose version

# Testar
docker run hello-world
```

---

## 📝 FASE 3: Configurar Domínio e DNS

### 3.1. Configurar DNS no Registro.br

1. Acesse: https://registro.br/
2. Login com sua conta
3. Vá em "Meus Domínios" > upaspiradores.com.br
4. Clique em "Editar Zona"
5. Adicione/Edite registros:

```
Tipo    Nome    Dados                   TTL
A       @       SEU_IP_PUBLICO          3600
A       www     SEU_IP_PUBLICO          3600
A       api     SEU_IP_PUBLICO          3600
```

**Exemplo:**
```
A       @       143.198.123.45          3600
A       www     143.198.123.45          3600
A       api     143.198.123.45          3600
```

6. Salvar alterações

### 3.2. Verificar Propagação DNS

```bash
# Aguardar 5-30 minutos
# Verificar:
nslookup upaspiradores.com.br
ping upaspiradores.com.br

# Deve retornar seu IP público
```

---

## 📝 FASE 4: Preparar Aplicação no Servidor

### 4.1. Criar Estrutura de Diretórios

```bash
# Criar diretório principal
sudo mkdir -p /opt/upcar
sudo chown $USER:$USER /opt/upcar
cd /opt/upcar
```

### 4.2. Enviar Código para Servidor

**Opção A: Via Git (Recomendado)**

```bash
# No servidor
cd /opt/upcar
git clone https://github.com/SEU_USUARIO/SEU_REPO.git .

# Se repositório privado, configurar SSH key ou token
```

**Opção B: Via SCP (do seu PC)**

```powershell
# No seu PC Windows (PowerShell)
cd "C:\Users\Pedro\Arquivos\Trabalho\VScode\AI Projects\UpCarAspiradores"

# Comprimir projeto (excluir node_modules)
tar -czf upcar.tar.gz --exclude=node_modules --exclude=.git .

# Enviar para servidor
scp upcar.tar.gz upcar@SEU_IP:/opt/upcar/

# No servidor, extrair
cd /opt/upcar
tar -xzf upcar.tar.gz
rm upcar.tar.gz
```

### 4.3. Criar Arquivo de Ambiente de Produção

```bash
cd /opt/upcar
nano .env.prod
```

**Conteúdo do `.env.prod`:**

```bash
# ============================================
# AMBIENTE
# ============================================
NODE_ENV=production

# ============================================
# BANCO DE DADOS
# ============================================
DB_HOST=postgres
DB_PORT=5432
DB_NAME=upcar_aspiradores
DB_USER=postgres
DB_PASSWORD=GERAR_SENHA_SEGURA_AQUI_123

# ============================================
# REDIS
# ============================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=GERAR_SENHA_REDIS_456

# ============================================
# MQTT
# ============================================
MQTT_BROKER_URL=mqtt://mosquitto:1883
MQTT_USERNAME=upcar
MQTT_PASSWORD=GERAR_SENHA_MQTT_789

# ============================================
# SEGURANÇA
# ============================================
JWT_SECRET=GERAR_STRING_64_CARACTERES
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
BCRYPT_SALT_ROUNDS=12

# ============================================
# URLS
# ============================================
FRONTEND_URL=https://upaspiradores.com.br
CORS_ORIGIN=https://upaspiradores.com.br,https://www.upaspiradores.com.br
VITE_API_URL=https://upaspiradores.com.br/api

# ============================================
# GOOGLE OAUTH
# ============================================
GOOGLE_CLIENT_ID=392894325740-lqcu2kkjp7pr8sq1aknqh8lcdu4fnmkv.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=https://upaspiradores.com.br/auth/google/callback

# ============================================
# MERCADO PAGO
# ============================================
PIX_ACCESS_TOKEN=APP_USR-8520764521265905-121318-44a1befb70f238036772901e8d9c8f87-486340107
PIX_GATEWAY_URL=https://api.mercadopago.com
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-8520764521265905-121318-44a1befb70f238036772901e8d9c8f87-486340107
MERCADO_PAGO_BASE_URL=https://api.mercadopago.com

# ============================================
# WHATSAPP
# ============================================
WHATSAPP_ACCESS_TOKEN=EAALZCWU1ZAGZAMBQCXvEfHyk4ndjPSu8BcjZAcNCmZCc905wAHmShk5MWZBohUO3Iui9ZCB1qzaMUz4ldjW2NT0Etw9SzRmZABvJuH1M40bBIJ9q8gtqqS1Y9eL1JyB17OD1gFOyfZB73oYEQZAyhR441cB2pNP1ARClKxm6QztcfgS47Xg60LZA5V5Y0DleJ1JNcR0pvpFlo2fHl0YE0Ak6IyZClqfrKIush8x2vD90Eea3JruVm7wHRRifSpRBH7z8z2UvTEIFwUwsnw4ZCKV1VCZAK1Q7CA
WHATSAPP_PHONE_NUMBER_ID=901637906368897
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_VERSION=v18.0
WHATSAPP_BUSINESS_ACCOUNT_ID=901637906368897

# ============================================
# EMAIL
# ============================================
RESEND_API_KEY=re_W3e7T1dr_Kj8nTo3G5gG57b1NdastuRsM
EMAIL_FROM=onboarding@resend.dev

# ============================================
# ADMIN
# ============================================
ADMIN_EMAIL=pedrobpfeitosa@gmail.com
ADMIN_PHONE=5511941330822
ADMIN_DOMAINS=upaspiradores.com.br

# ============================================
# APLICAÇÃO
# ============================================
PORT=3001
LOG_LEVEL=info

# ============================================
# SEGURANÇA
# ============================================
SECURITY_AUDIT_LEVEL=MEDIUM
MAX_CONCURRENT_SESSIONS=50
SESSION_TIMEOUT_HOURS=24
INACTIVITY_TIMEOUT_HOURS=2
ENABLE_AUDIT_LOGGING=true
ENABLE_SESSION_SECURITY=true
ENABLE_IP_WHITELIST=false
REQUIRE_REAUTH_FOR_SENSITIVE=false

# ============================================
# RATE LIMITING
# ============================================
API_RATE_LIMIT=1000
AUTH_RATE_LIMIT=100
PAYMENT_RATE_LIMIT=50
ADMIN_RATE_LIMIT=500

# ============================================
# MONITORAMENTO
# ============================================
GRAFANA_ADMIN_PASSWORD=GERAR_SENHA_GRAFANA
```

### 4.4. Gerar Senhas Seguras

```bash
# Gerar JWT Secret (64 caracteres)
openssl rand -base64 64

# Gerar senhas (32 caracteres)
openssl rand -base64 32

# Copiar e colar no .env.prod
```

---

## 📝 FASE 5: Configurar SSL/HTTPS

### 5.1. Instalar Certbot

```bash
# Instalar Certbot
sudo apt install -y certbot
```

### 5.2. Gerar Certificados SSL

```bash
# Gerar certificado Let's Encrypt
sudo certbot certonly --standalone \
  -d upaspiradores.com.br \
  -d www.upaspiradores.com.br \
  --email pedrobpfeitosa@gmail.com \
  --agree-tos \
  --no-eff-email

# Certificados salvos em:
# /etc/letsencrypt/live/upaspiradores.com.br/fullchain.pem
# /etc/letsencrypt/live/upaspiradores.com.br/privkey.pem
```

### 5.3. Copiar Certificados

```bash
# Criar diretório SSL
mkdir -p /opt/upcar/ssl

# Copiar certificados
sudo cp /etc/letsencrypt/live/upaspiradores.com.br/fullchain.pem /opt/upcar/ssl/cert.pem
sudo cp /etc/letsencrypt/live/upaspiradores.com.br/privkey.pem /opt/upcar/ssl/key.pem

# Ajustar permissões
sudo chown $USER:$USER /opt/upcar/ssl/*.pem
chmod 600 /opt/upcar/ssl/*.pem
```

### 5.4. Configurar Renovação Automática

```bash
# Criar script de renovação
sudo nano /etc/cron.d/certbot-renew
```

**Adicionar:**
```bash
0 3 * * * root certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/upaspiradores.com.br/fullchain.pem /opt/upcar/ssl/cert.pem && cp /etc/letsencrypt/live/upaspiradores.com.br/privkey.pem /opt/upcar/ssl/key.pem && cd /opt/upcar && docker compose -f docker-compose.prod.yml restart nginx"
```

---

## 📝 FASE 6: Configurar Nginx

### 6.1. Atualizar Configuração do Nginx

```bash
cd /opt/upcar
nano nginx/nginx.conf
```

**Atualizar `server_name` para seu domínio:**
```nginx
server {
    listen 443 ssl http2;
    server_name upaspiradores.com.br www.upaspiradores.com.br;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # ... resto da configuração permanece igual
}

server {
    listen 80;
    server_name upaspiradores.com.br www.upaspiradores.com.br;
    return 301 https://$host$request_uri;
}
```

---

## 📝 FASE 7: Importar Banco de Dados

### 7.1. Enviar Backup para Servidor

**Do seu PC:**
```powershell
# Comprimir backup
gzip render-backup.sql

# Enviar para servidor
scp render-backup.sql.gz upcar@SEU_IP:/opt/upcar/
```

**No servidor:**
```bash
cd /opt/upcar
gunzip render-backup.sql.gz
```

---

## 📝 FASE 8: Deploy da Aplicação

### 8.1. Build e Start dos Containers

```bash
cd /opt/upcar

# Build das imagens
docker compose -f docker-compose.prod.yml build --no-cache

# Iniciar serviços
docker compose -f docker-compose.prod.yml up -d

# Verificar status
docker compose -f docker-compose.prod.yml ps
```

### 8.2. Importar Banco de Dados

```bash
# Aguardar PostgreSQL iniciar (30 segundos)
sleep 30

# Importar backup
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres -d upcar_aspiradores < render-backup.sql

# Verificar importação
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d upcar_aspiradores -c "SELECT COUNT(*) FROM users;"
```

### 8.3. Verificar Logs

```bash
# Ver logs de todos os serviços
docker compose -f docker-compose.prod.yml logs -f

# Ver logs específicos
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f nginx
```

---

## 📝 FASE 9: Configurar Serviços Externos

### 9.1. Google OAuth

1. Acesse: https://console.cloud.google.com/
2. APIs & Services > Credentials
3. Edite OAuth 2.0 Client ID
4. Adicione URIs autorizados:
   ```
   https://upaspiradores.com.br
   https://www.upaspiradores.com.br
   ```
5. Adicione redirect URIs:
   ```
   https://upaspiradores.com.br/auth/google/callback
   ```
6. Salvar

### 9.2. Mercado Pago Webhook

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Selecione sua aplicação
3. Webhooks > Adicionar URL:
   ```
   https://upaspiradores.com.br/webhooks/mercadopago
   ```
4. Evento: **Pagamentos**
5. Salvar

### 9.3. WhatsApp Business API

1. Acesse: https://developers.facebook.com/
2. Sua aplicação WhatsApp
3. Configure webhook:
   ```
   https://upaspiradores.com.br/webhooks/whatsapp
   ```

---

## 📝 FASE 10: Testes

### 10.1. Health Check

```bash
# Testar backend
curl https://upaspiradores.com.br/health

# Deve retornar:
# {
#   "status": "healthy",
#   "service": "upcar-aspiradores-backend",
#   "database": "upcar_aspiradores",
#   "redis": "connected",
#   "mqtt": "connected",
#   "websocket": "initialized"
# }
```

### 10.2. Testar Webhook

```bash
curl https://upaspiradores.com.br/webhooks/mercadopago/test

# Deve retornar:
# {
#   "status": "ok",
#   "message": "Webhook do Mercado Pago está configurado e funcionando"
# }
```

### 10.3. Testar Frontend

1. Abra: https://upaspiradores.com.br
2. Verifique se carrega
3. Teste login
4. Teste adicionar crédito
5. Teste pagamento PIX

---

## 📝 FASE 11: Backups Automáticos

### 11.1. Criar Diretório de Backups

```bash
sudo mkdir -p /backups
sudo chown $USER:$USER /backups
```

### 11.2. Criar Script de Backup

```bash
nano /opt/upcar/backup.sh
```

**Conteúdo:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Backup PostgreSQL
docker compose -f /opt/upcar/docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres upcar_aspiradores | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup concluído: $BACKUP_DIR/db_$DATE.sql.gz"
```

```bash
# Tornar executável
chmod +x /opt/upcar/backup.sh
```

### 11.3. Configurar Cron

```bash
# Editar crontab
crontab -e

# Adicionar (backup diário às 3h)
0 3 * * * /opt/upcar/backup.sh >> /var/log/backup.log 2>&1
```

---

## ✅ Checklist Final

### Infraestrutura
- [ ] VPS criado e configurado
- [ ] Firewall (UFW) ativo
- [ ] Docker instalado
- [ ] Fail2ban ativo

### Domínio e SSL
- [ ] DNS configurado
- [ ] SSL instalado
- [ ] HTTPS funcionando
- [ ] Renovação automática configurada

### Aplicação
- [ ] Código no servidor
- [ ] `.env.prod` configurado
- [ ] Containers rodando
- [ ] Banco importado
- [ ] Logs sem erros

### Serviços Externos
- [ ] Google OAuth configurado
- [ ] Webhook Mercado Pago configurado
- [ ] WhatsApp configurado

### Testes
- [ ] Health check OK
- [ ] Frontend carregando
- [ ] Login funcionando
- [ ] Pagamento funcionando
- [ ] Webhook funcionando

### Segurança e Manutenção
- [ ] Senhas fortes
- [ ] Firewall ativo
- [ ] SSL ativo
- [ ] Backups automáticos

---

## 🚨 Comandos Úteis

```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs -f

# Reiniciar serviços
docker compose -f docker-compose.prod.yml restart

# Parar tudo
docker compose -f docker-compose.prod.yml down

# Iniciar tudo
docker compose -f docker-compose.prod.yml up -d

# Ver status
docker compose -f docker-compose.prod.yml ps

# Limpar recursos
docker system prune -a

# Ver uso de recursos
htop
df -h
free -h
```

---

## 💰 Custos Mensais

- **VPS Contabo:** ~R$ 40/mês
- **VPS DigitalOcean:** ~R$ 120/mês
- **Domínio:** R$ 40/ano (já pago)
- **SSL:** Grátis (Let's Encrypt)

**Total:** R$ 40-120/mês

---

## 🎉 Pronto!

Sua aplicação está rodando em produção em **https://upaspiradores.com.br**!

**Próximos passos:**
1. Monitorar logs diariamente
2. Verificar backups semanalmente
3. Atualizar sistema mensalmente
4. Escalar conforme necessário

Boa sorte! 🚀
