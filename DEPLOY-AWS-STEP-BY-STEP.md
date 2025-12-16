# 🚀 Deploy AWS EC2 - Passo a Passo Completo

## 📋 Visão Geral

Deploy profissional na AWS usando EC2 com Docker, SSL, e infraestrutura completa.

**Tempo estimado:** 4-6 horas
**Custo mensal:** ~$30-50 USD (~R$ 150-250)

---

## 🎯 PASSO 1: Criar Conta AWS

### 1.1. Criar Conta

1. Acesse: https://aws.amazon.com/
2. Clique em "Criar uma conta da AWS"
3. Preencha:
   - Email
   - Senha
   - Nome da conta AWS
4. Informações de contato
5. Informações de pagamento (cartão de crédito)
6. Verificação de identidade (telefone)
7. Escolha plano: **Plano de suporte básico (gratuito)**

### 1.2. Fazer Login

1. Acesse: https://console.aws.amazon.com/
2. Login com suas credenciais
3. Você verá o AWS Management Console

---

## 🎯 PASSO 2: Criar Instância EC2

### 2.1. Acessar EC2

1. No AWS Console, busque por "EC2" na barra de pesquisa
2. Clique em "EC2"
3. Certifique-se de estar na região **São Paulo (sa-east-1)**
   - Canto superior direito, selecione "América do Sul (São Paulo)"

### 2.2. Lançar Instância

1. Clique em "Launch Instance" (Executar instância)
2. Configure:

**Nome e tags:**
- Nome: `upcar-aspiradores-production`

**Application and OS Images (AMI):**
- Escolha: **Ubuntu Server 22.04 LTS**
- Arquitetura: **64-bit (x86)**

**Instance type:**
- Escolha: **t3.medium** (2 vCPU, 4 GiB RAM)
- Ou **t3.small** (2 vCPU, 2 GiB RAM) se quiser economizar

**Key pair (login):**
- Clique em "Create new key pair"
- Nome: `upcar-key`
- Tipo: **RSA**
- Formato: **`.pem`** (para OpenSSH)
- Clique em "Create key pair"
- **IMPORTANTE:** Arquivo `upcar-key.pem` será baixado - GUARDE BEM!

**Network settings:**
- Clique em "Edit"
- VPC: deixe padrão
- Subnet: deixe padrão
- Auto-assign public IP: **Enable**
- Firewall (Security groups): **Create security group**
  - Nome: `upcar-security-group`
  - Descrição: `Security group for UpCar Aspiradores`
  - Regras de entrada (Inbound rules):
    - SSH (22) - Source: My IP (seu IP atual)
    - HTTP (80) - Source: Anywhere (0.0.0.0/0)
    - HTTPS (443) - Source: Anywhere (0.0.0.0/0)
    - Custom TCP (1883) - Source: Anywhere (0.0.0.0/0) - Para MQTT

**Configure storage:**
- Tamanho: **30 GiB** (ou mais se precisar)
- Tipo: **gp3** (SSD)

3. Clique em "Launch Instance"
4. Aguarde 1-2 minutos até a instância estar "Running"

### 2.3. Anotar Informações

1. Clique na instância criada
2. Anote:
   - **Instance ID:** i-xxxxxxxxx
   - **Public IPv4 address:** (exemplo: 18.231.123.45)
   - **Public IPv4 DNS:** (exemplo: ec2-18-231-123-45.sa-east-1.compute.amazonaws.com)

---

## 🎯 PASSO 3: Conectar ao Servidor

### 3.1. Preparar Chave SSH (Windows)

```powershell
# Mover chave para local seguro
Move-Item ~/Downloads/upcar-key.pem ~/.ssh/

# Ajustar permissões (PowerShell como Admin)
icacls "$env:USERPROFILE\.ssh\upcar-key.pem" /inheritance:r
icacls "$env:USERPROFILE\.ssh\upcar-key.pem" /grant:r "$env:USERNAME:R"
```

### 3.2. Conectar via SSH

```powershell
# Conectar
ssh -i ~/.ssh/upcar-key.pem ubuntu@SEU_IP_PUBLICO

# Exemplo:
ssh -i ~/.ssh/upcar-key.pem ubuntu@18.231.123.45

# Responda "yes" quando perguntar sobre fingerprint
```

**Se der erro de permissão no Windows, use:**
```powershell
# Alternativa: usar WSL ou Git Bash
# Ou conectar via PuTTY (converter .pem para .ppk)
```

---

## 🎯 PASSO 4: Configurar Servidor

### 4.1. Atualizar Sistema

```bash
# Atualizar pacotes
sudo apt update && sudo apt upgrade -y

# Instalar ferramentas essenciais
sudo apt install -y curl wget git vim ufw fail2ban htop unzip
```

### 4.2. Configurar Firewall UFW

```bash
# Configurar UFW (além do Security Group da AWS)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 1883/tcp  # MQTT
sudo ufw enable

# Verificar
sudo ufw status
```

### 4.3. Instalar Docker

```bash
# Remover versões antigas
sudo apt remove docker docker-engine docker.io containerd runc

# Instalar dependências
sudo apt install -y ca-certificates curl gnupg lsb-release

# Adicionar chave GPG do Docker
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
sudo usermod -aG docker ubuntu

# Aplicar mudanças (relogar)
exit
```

### 4.4. Reconectar e Verificar Docker

```powershell
# Reconectar
ssh -i ~/.ssh/upcar-key.pem ubuntu@SEU_IP_PUBLICO
```

```bash
# Verificar Docker
docker --version
docker compose version

# Testar
docker run hello-world
```

---

## 🎯 PASSO 5: Configurar Domínio

### 5.1. Criar Elastic IP (IP Fixo)

**Por que?** Por padrão, o IP público da EC2 muda se você parar/iniciar a instância.

1. No AWS Console, vá em **EC2 > Elastic IPs**
2. Clique em "Allocate Elastic IP address"
3. Clique em "Allocate"
4. Selecione o IP alocado
5. Actions > Associate Elastic IP address
6. Selecione sua instância `upcar-aspiradores-production`
7. Clique em "Associate"
8. **Anote o novo IP público (Elastic IP)**

### 5.2. Configurar DNS no Registro.br

1. Acesse: https://registro.br/
2. Login
3. Meus Domínios > upaspiradores.com.br
4. Editar Zona DNS
5. Adicione/Edite:

```
Tipo    Nome    Dados                           TTL
A       @       SEU_ELASTIC_IP                  3600
A       www     SEU_ELASTIC_IP                  3600
A       api     SEU_ELASTIC_IP                  3600
```

**Exemplo:**
```
A       @       18.231.123.45                   3600
A       www     18.231.123.45                   3600
A       api     18.231.123.45                   3600
```

6. Salvar

### 5.3. Verificar Propagação DNS

```bash
# Aguardar 5-30 minutos
# Verificar:
nslookup upaspiradores.com.br
ping upaspiradores.com.br

# Deve retornar seu Elastic IP
```

---

## 🎯 PASSO 6: Enviar Código para Servidor

### 6.1. Criar Diretório

```bash
# No servidor
sudo mkdir -p /opt/upcar
sudo chown ubuntu:ubuntu /opt/upcar
cd /opt/upcar
```

### 6.2. Enviar Código (do seu PC)

**Opção A: Via Git**

```bash
# No servidor
cd /opt/upcar
git clone https://github.com/SEU_USUARIO/SEU_REPO.git .
```

**Opção B: Via SCP (do seu PC)**

```powershell
# No seu PC (PowerShell)
cd "C:\Users\Pedro\Arquivos\Trabalho\VScode\AI Projects\UpCarAspiradores"

# Criar arquivo tar (excluir node_modules)
tar --exclude=node_modules --exclude=.git -czf upcar.tar.gz .

# Enviar para servidor
scp -i ~/.ssh/upcar-key.pem upcar.tar.gz ubuntu@SEU_IP:/opt/upcar/
```

```bash
# No servidor, extrair
cd /opt/upcar
tar -xzf upcar.tar.gz
rm upcar.tar.gz
```

### 6.3. Enviar Backup do Banco

```powershell
# Do seu PC
scp -i ~/.ssh/upcar-key.pem render-backup.sql ubuntu@SEU_IP:/opt/upcar/
```

---

## 🎯 PASSO 7: Configurar Ambiente de Produção

### 7.1. Criar .env.prod

```bash
cd /opt/upcar
nano .env.prod
```

**Cole este conteúdo (ajuste as senhas):**

```bash
# AMBIENTE
NODE_ENV=production

# BANCO DE DADOS
DB_HOST=postgres
DB_PORT=5432
DB_NAME=upcar_aspiradores
DB_USER=postgres
DB_PASSWORD=UpCar2025!Prod@DB#Secure

# REDIS
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=UpCar2025!Redis@Secure

# MQTT
MQTT_BROKER_URL=mqtt://mosquitto:1883
MQTT_USERNAME=upcar
MQTT_PASSWORD=UpCar2025!MQTT@Secure

# SEGURANÇA
JWT_SECRET=UpCar2025SecureJWTSecretKeyForProductionMustBe64CharsLongABC123
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
BCRYPT_SALT_ROUNDS=12

# URLS (AJUSTAR DEPOIS)
FRONTEND_URL=https://upaspiradores.com.br
CORS_ORIGIN=https://upaspiradores.com.br,https://www.upaspiradores.com.br
VITE_API_URL=https://upaspiradores.com.br/api

# GOOGLE OAUTH
GOOGLE_CLIENT_ID=392894325740-lqcu2kkjp7pr8sq1aknqh8lcdu4fnmkv.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=https://upaspiradores.com.br/auth/google/callback

# MERCADO PAGO
PIX_ACCESS_TOKEN=APP_USR-8520764521265905-121318-44a1befb70f238036772901e8d9c8f87-486340107
PIX_GATEWAY_URL=https://api.mercadopago.com
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-8520764521265905-121318-44a1befb70f238036772901e8d9c8f87-486340107
MERCADO_PAGO_BASE_URL=https://api.mercadopago.com

# WHATSAPP
WHATSAPP_ACCESS_TOKEN=EAALZCWU1ZAGZAMBQCXvEfHyk4ndjPSu8BcjZAcNCmZCc905wAHmShk5MWZBohUO3Iui9ZCB1qzaMUz4ldjW2NT0Etw9SzRmZABvJuH1M40bBIJ9q8gtqqS1Y9eL1JyB17OD1gFOyfZB73oYEQZAyhR441cB2pNP1ARClKxm6QztcfgS47Xg60LZA5V5Y0DleJ1JNcR0pvpFlo2fHl0YE0Ak6IyZClqfrKIush8x2vD90Eea3JruVm7wHRRifSpRBH7z8z2UvTEIFwUwsnw4ZCKV1VCZAK1Q7CA
WHATSAPP_PHONE_NUMBER_ID=901637906368897
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_VERSION=v18.0
WHATSAPP_BUSINESS_ACCOUNT_ID=901637906368897

# EMAIL
RESEND_API_KEY=re_W3e7T1dr_Kj8nTo3G5gG57b1NdastuRsM
EMAIL_FROM=onboarding@resend.dev

# ADMIN
ADMIN_EMAIL=pedrobpfeitosa@gmail.com
ADMIN_PHONE=5511941330822
ADMIN_DOMAINS=upaspiradores.com.br

# APLICAÇÃO
PORT=3001
LOG_LEVEL=info

# SEGURANÇA
SECURITY_AUDIT_LEVEL=MEDIUM
MAX_CONCURRENT_SESSIONS=50
SESSION_TIMEOUT_HOURS=24
INACTIVITY_TIMEOUT_HOURS=2
ENABLE_AUDIT_LOGGING=true
ENABLE_SESSION_SECURITY=true
ENABLE_IP_WHITELIST=false
REQUIRE_REAUTH_FOR_SENSITIVE=false

# RATE LIMITING
API_RATE_LIMIT=1000
AUTH_RATE_LIMIT=100
PAYMENT_RATE_LIMIT=50
ADMIN_RATE_LIMIT=500

# MONITORAMENTO
GRAFANA_ADMIN_PASSWORD=UpCar2025!Grafana@Admin
```

**Salvar:** Ctrl+O, Enter, Ctrl+X

### 7.2. Gerar Senhas Mais Seguras (Opcional)

```bash
# Gerar JWT Secret
openssl rand -base64 64

# Gerar senhas
openssl rand -base64 32

# Copiar e substituir no .env.prod
```

---

## 🎯 PASSO 8: Configurar SSL/HTTPS

### 8.1. Instalar Certbot

```bash
sudo apt install -y certbot
```

### 8.2. Gerar Certificados SSL

```bash
# Gerar certificado Let's Encrypt
sudo certbot certonly --standalone \
  -d upaspiradores.com.br \
  -d www.upaspiradores.com.br \
  --email pedrobpfeitosa@gmail.com \
  --agree-tos \
  --no-eff-email

# Aguardar conclusão
# Certificados salvos em: /etc/letsencrypt/live/upaspiradores.com.br/
```

### 8.3. Copiar Certificados

```bash
# Criar diretório SSL
mkdir -p /opt/upcar/ssl

# Copiar certificados
sudo cp /etc/letsencrypt/live/upaspiradores.com.br/fullchain.pem /opt/upcar/ssl/cert.pem
sudo cp /etc/letsencrypt/live/upaspiradores.com.br/privkey.pem /opt/upcar/ssl/key.pem

# Ajustar permissões
sudo chown ubuntu:ubuntu /opt/upcar/ssl/*.pem
chmod 600 /opt/upcar/ssl/*.pem
```

### 8.4. Configurar Renovação Automática

```bash
# Criar script de renovação
sudo nano /etc/cron.d/certbot-renew
```

**Cole:**
```bash
0 3 * * * root certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/upaspiradores.com.br/fullchain.pem /opt/upcar/ssl/cert.pem && cp /etc/letsencrypt/live/upaspiradores.com.br/privkey.pem /opt/upcar/ssl/key.pem && cd /opt/upcar && docker compose -f docker-compose.prod.yml restart nginx"
```

**Salvar:** Ctrl+O, Enter, Ctrl+X

---

## 🎯 PASSO 9: Configurar Nginx

### 9.1. Atualizar nginx.conf

```bash
cd /opt/upcar
nano nginx/nginx.conf
```

**Encontre e atualize `server_name`:**
```nginx
server {
    listen 443 ssl http2;
    server_name upaspiradores.com.br www.upaspiradores.com.br;
    
    # ... resto permanece igual
}

server {
    listen 80;
    server_name upaspiradores.com.br www.upaspiradores.com.br;
    return 301 https://$host$request_uri;
}
```

**Salvar:** Ctrl+O, Enter, Ctrl+X

---

## 🎯 PASSO 10: Deploy da Aplicação

### 10.1. Build e Start

```bash
cd /opt/upcar

# Build das imagens (pode demorar 5-10 minutos)
docker compose -f docker-compose.prod.yml build --no-cache

# Iniciar serviços
docker compose -f docker-compose.prod.yml up -d

# Verificar status
docker compose -f docker-compose.prod.yml ps
```

**Todos os serviços devem estar "Up"**

### 10.2. Ver Logs

```bash
# Ver logs em tempo real
docker compose -f docker-compose.prod.yml logs -f

# Ver logs específicos
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f nginx

# Ctrl+C para sair
```

### 10.3. Importar Banco de Dados

```bash
# Aguardar PostgreSQL iniciar (30 segundos)
sleep 30

# Importar backup
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres -d upcar_aspiradores < render-backup.sql

# Verificar importação
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d upcar_aspiradores -c "SELECT COUNT(*) FROM users;"

# Deve mostrar: count = 5
```

---

## 🎯 PASSO 11: Configurar Serviços Externos

### 11.1. Google OAuth

1. Acesse: https://console.cloud.google.com/
2. APIs & Services > Credentials
3. Edite seu OAuth 2.0 Client ID
4. **Authorized JavaScript origins:**
   ```
   https://upaspiradores.com.br
   https://www.upaspiradores.com.br
   ```
5. **Authorized redirect URIs:**
   ```
   https://upaspiradores.com.br/auth/google/callback
   ```
6. Save

### 11.2. Mercado Pago Webhook

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Selecione sua aplicação
3. Webhooks > Adicionar URL:
   ```
   https://upaspiradores.com.br/webhooks/mercadopago
   ```
4. Evento: **Pagamentos**
5. Salvar

### 11.3. WhatsApp Business API

1. Acesse: https://developers.facebook.com/
2. Sua aplicação WhatsApp
3. Configure webhook:
   ```
   https://upaspiradores.com.br/webhooks/whatsapp
   ```

---

## 🎯 PASSO 12: Testes Finais

### 12.1. Health Check

```bash
# Testar backend
curl https://upaspiradores.com.br/health

# Deve retornar JSON com status "healthy"
```

### 12.2. Testar Webhook

```bash
curl https://upaspiradores.com.br/webhooks/mercadopago/test

# Deve retornar: {"status":"ok",...}
```

### 12.3. Testar Frontend

**No seu navegador:**
1. Abra: https://upaspiradores.com.br
2. Verifique se carrega
3. Teste login com Google
4. Teste adicionar crédito
5. Gere PIX e teste pagamento

---

## 🎯 PASSO 13: Configurar Backups

### 13.1. Criar Script de Backup

```bash
# Criar diretório
sudo mkdir -p /backups
sudo chown ubuntu:ubuntu /backups

# Criar script
nano /opt/upcar/backup.sh
```

**Cole:**
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

### 13.2. Configurar Cron

```bash
# Editar crontab
crontab -e

# Escolha editor (nano = 1)
# Adicione no final:
0 3 * * * /opt/upcar/backup.sh >> /var/log/backup.log 2>&1
```

**Salvar:** Ctrl+O, Enter, Ctrl+X

### 13.3. Testar Backup

```bash
# Executar manualmente
/opt/upcar/backup.sh

# Verificar
ls -lh /backups/
```

---

## ✅ CHECKLIST FINAL

### AWS
- [ ] Conta AWS criada
- [ ] Instância EC2 criada (t3.medium)
- [ ] Security Group configurado
- [ ] Elastic IP alocado e associado
- [ ] Chave SSH salva

### Servidor
- [ ] SSH funcionando
- [ ] Sistema atualizado
- [ ] Docker instalado
- [ ] Firewall (UFW) configurado

### Domínio e SSL
- [ ] DNS configurado no Registro.br
- [ ] DNS propagado
- [ ] Certificado SSL instalado
- [ ] HTTPS funcionando

### Aplicação
- [ ] Código no servidor
- [ ] .env.prod configurado
- [ ] Containers rodando
- [ ] Banco de dados importado
- [ ] Logs sem erros

### Serviços Externos
- [ ] Google OAuth configurado
- [ ] Webhook Mercado Pago configurado
- [ ] WhatsApp configurado

### Testes
- [ ] Health check OK
- [ ] Webhook OK
- [ ] Frontend carregando
- [ ] Login funcionando
- [ ] Pagamento funcionando

### Manutenção
- [ ] Backups automáticos configurados
- [ ] Renovação SSL automática

---

## 🚨 Comandos Úteis AWS

### Gerenciar Containers

```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs -f

# Reiniciar serviço específico
docker compose -f docker-compose.prod.yml restart backend

# Parar tudo
docker compose -f docker-compose.prod.yml down

# Iniciar tudo
docker compose -f docker-compose.prod.yml up -d

# Ver status
docker compose -f docker-compose.prod.yml ps

# Ver uso de recursos
docker stats
```

### Monitorar Servidor

```bash
# Ver uso de CPU/RAM
htop

# Ver uso de disco
df -h

# Ver uso de memória
free -h

# Ver logs do sistema
sudo journalctl -f
```

### Limpar Recursos

```bash
# Limpar Docker
docker system prune -a

# Limpar logs antigos
sudo journalctl --vacuum-time=7d
```

---

## 💰 Custos AWS

### Instância EC2 t3.medium
- **Custo:** ~$0.0416/hora
- **Mensal:** ~$30 USD (~R$ 150)

### Elastic IP
- **Grátis** enquanto associado a instância rodando
- **$0.005/hora** se não associado

### Armazenamento (30 GB)
- **Custo:** ~$3/mês

### Transferência de Dados
- **Primeiros 100 GB/mês:** Grátis
- **Depois:** $0.15/GB

**Total estimado:** $30-50/mês (~R$ 150-250)

---

## 🎉 Pronto!

Sua aplicação está rodando em produção na AWS!

**URL:** https://upaspiradores.com.br

**Próximos passos:**
1. Monitorar logs diariamente
2. Verificar backups semanalmente
3. Atualizar sistema mensalmente
4. Configurar CloudWatch para alertas (opcional)

Boa sorte! 🚀
