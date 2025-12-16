# 🚀 Guia Completo de Deploy para Produção - upaspiradores.com.br

## 📋 Visão Geral

Este guia detalha todos os passos necessários para colocar o sistema UpCar-Aspiradores em produção no domínio **upaspiradores.com.br**.

---

## 🎯 Pré-requisitos

### 1. Servidor/Hospedagem

Você precisa de um servidor com:

**Opções Recomendadas:**
- **AWS EC2** (t3.medium ou maior)
- **DigitalOcean Droplet** (4GB RAM ou mais)
- **Linode** (4GB RAM ou mais)
- **Azure VM** (B2s ou maior)
- **Google Cloud Compute Engine** (e2-medium ou maior)

**Especificações Mínimas:**
- 4 CPU cores
- 8GB RAM
- 100GB SSD
- Ubuntu 20.04 LTS ou 22.04 LTS
- IP público estático

### 2. Domínio

- ✅ Domínio **upaspiradores.com.br** registrado
- ✅ Acesso ao painel DNS do domínio

### 3. Contas e Credenciais

- [ ] Mercado Pago (credenciais de produção)
- [ ] WhatsApp Business API (token de produção)
- [ ] Google OAuth (credenciais de produção)
- [ ] Conta GitHub (para CI/CD - opcional)

---

## 📝 Passo a Passo Completo

### FASE 1: Preparação do Servidor

#### 1.1. Criar e Configurar Servidor

**Se usar AWS EC2:**
```bash
# 1. Criar instância EC2
# - AMI: Ubuntu 22.04 LTS
# - Tipo: t3.medium (2 vCPU, 4GB RAM) ou maior
# - Storage: 100GB gp3
# - Security Group: Portas 22, 80, 443, 1883 (MQTT)

# 2. Conectar via SSH
ssh -i sua-chave.pem ubuntu@seu-ip-publico
```

**Se usar DigitalOcean:**
```bash
# 1. Criar Droplet
# - Imagem: Ubuntu 22.04 LTS
# - Plano: Basic - 4GB RAM / 2 vCPUs
# - Datacenter: São Paulo (mais próximo)

# 2. Conectar via SSH
ssh root@seu-ip-publico
```

#### 1.2. Atualizar Sistema

```bash
# Atualizar pacotes
sudo apt update && sudo apt upgrade -y

# Instalar ferramentas essenciais
sudo apt install -y curl wget git vim ufw fail2ban
```

#### 1.3. Configurar Firewall

```bash
# Configurar UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 1883/tcp  # MQTT
sudo ufw enable
```

#### 1.4. Instalar Docker

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalação
docker --version
docker-compose --version

# Reiniciar sessão SSH para aplicar grupo docker
exit
# Conectar novamente
```

---

### FASE 2: Configuração do Domínio

#### 2.1. Configurar DNS

No painel DNS do seu domínio (Registro.br, GoDaddy, etc.):

```
Tipo    Nome                    Valor                   TTL
A       @                       SEU_IP_PUBLICO          3600
A       www                     SEU_IP_PUBLICO          3600
CNAME   api                     upaspiradores.com.br    3600
```

**Exemplo:**
```
A       @                       54.123.45.67            3600
A       www                     54.123.45.67            3600
CNAME   api                     upaspiradores.com.br    3600
```

#### 2.2. Verificar Propagação DNS

```bash
# Aguardar propagação (pode levar até 24h, geralmente 1-2h)
# Verificar:
nslookup upaspiradores.com.br
ping upaspiradores.com.br
```

---

### FASE 3: Clonar e Configurar Aplicação

#### 3.1. Clonar Repositório

```bash
# Criar diretório
sudo mkdir -p /opt/upcar-aspiradores
sudo chown $USER:$USER /opt/upcar-aspiradores
cd /opt/upcar-aspiradores

# Clonar repositório
git clone https://github.com/SEU_USUARIO/SEU_REPO.git .

# Ou se já tiver o código localmente, fazer upload via SCP:
# scp -r . usuario@servidor:/opt/upcar-aspiradores/
```

#### 3.2. Criar Arquivo de Ambiente de Produção

```bash
# Copiar exemplo
cp .env.prod.example .env.prod

# Editar com suas credenciais
nano .env.prod
```

**Configurar `.env.prod`:**

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
DB_PASSWORD=SENHA_SUPER_SEGURA_AQUI_123!@#

# ============================================
# REDIS
# ============================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=SENHA_REDIS_SEGURA_456!@#

# ============================================
# MQTT
# ============================================
MQTT_BROKER_URL=mqtt://mosquitto:1883
MQTT_USERNAME=upcar
MQTT_PASSWORD=SENHA_MQTT_SEGURA_789!@#

# ============================================
# SEGURANÇA
# ============================================
JWT_SECRET=GERAR_STRING_ALEATORIA_64_CARACTERES_AQUI_USE_openssl_rand_base64_64
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# ============================================
# URLS
# ============================================
FRONTEND_URL=https://upaspiradores.com.br
CORS_ORIGIN=https://upaspiradores.com.br,https://www.upaspiradores.com.br
VITE_API_URL=https://upaspiradores.com.br/api

# ============================================
# GOOGLE OAUTH (PRODUÇÃO)
# ============================================
GOOGLE_CLIENT_ID=SEU_CLIENT_ID_PRODUCAO.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=SEU_CLIENT_SECRET_PRODUCAO
GOOGLE_CALLBACK_URL=https://upaspiradores.com.br/auth/google/callback

# ============================================
# MERCADO PAGO (PRODUÇÃO)
# ============================================
PIX_ACCESS_TOKEN=APP-SEU_TOKEN_PRODUCAO_MERCADO_PAGO
PIX_GATEWAY_URL=https://api.mercadopago.com
MERCADO_PAGO_ACCESS_TOKEN=APP-SEU_TOKEN_PRODUCAO_MERCADO_PAGO
MERCADO_PAGO_BASE_URL=https://api.mercadopago.com

# ============================================
# WHATSAPP BUSINESS API (PRODUÇÃO)
# ============================================
WHATSAPP_ACCESS_TOKEN=SEU_TOKEN_WHATSAPP_PRODUCAO
WHATSAPP_PHONE_NUMBER_ID=SEU_PHONE_NUMBER_ID
WHATSAPP_BUSINESS_ACCOUNT_ID=SEU_BUSINESS_ACCOUNT_ID
WHATSAPP_API_VERSION=v18.0

# ============================================
# MONITORAMENTO
# ============================================
GRAFANA_ADMIN_PASSWORD=SENHA_GRAFANA_SEGURA_ABC!@#
```

#### 3.3. Gerar Senhas Seguras

```bash
# Gerar JWT Secret (64 caracteres)
openssl rand -base64 64

# Gerar senhas aleatórias
openssl rand -base64 32

# Usar essas senhas no .env.prod
```

---

### FASE 4: Configurar SSL (HTTPS)

#### 4.1. Instalar Certbot

```bash
# Instalar Certbot
sudo apt install -y certbot

# Parar serviços temporariamente (se estiverem rodando)
sudo docker-compose -f docker-compose.prod.yml down
```

#### 4.2. Gerar Certificados SSL

```bash
# Gerar certificado Let's Encrypt
sudo certbot certonly --standalone -d upaspiradores.com.br -d www.upaspiradores.com.br

# Seguir instruções:
# - Informar email
# - Aceitar termos
# - Certificados serão salvos em: /etc/letsencrypt/live/upaspiradores.com.br/
```

#### 4.3. Copiar Certificados

```bash
# Criar diretório SSL
mkdir -p /opt/upcar-aspiradores/ssl

# Copiar certificados
sudo cp /etc/letsencrypt/live/upaspiradores.com.br/fullchain.pem /opt/upcar-aspiradores/ssl/cert.pem
sudo cp /etc/letsencrypt/live/upaspiradores.com.br/privkey.pem /opt/upcar-aspiradores/ssl/key.pem

# Ajustar permissões
sudo chown $USER:$USER /opt/upcar-aspiradores/ssl/*.pem
chmod 600 /opt/upcar-aspiradores/ssl/*.pem
```

#### 4.4. Configurar Renovação Automática

```bash
# Criar script de renovação
sudo nano /etc/cron.d/certbot-renew
```

**Adicionar:**
```bash
0 3 * * * root certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/upaspiradores.com.br/fullchain.pem /opt/upcar-aspiradores/ssl/cert.pem && cp /etc/letsencrypt/live/upaspiradores.com.br/privkey.pem /opt/upcar-aspiradores/ssl/key.pem && docker-compose -f /opt/upcar-aspiradores/docker-compose.prod.yml restart nginx"
```

---

### FASE 5: Configurar Nginx

#### 5.1. Atualizar Configuração do Nginx

```bash
# Editar nginx.conf
nano nginx/nginx.conf
```

**Atualizar `server_name`:**
```nginx
server {
    listen 443 ssl http2;
    server_name upaspiradores.com.br www.upaspiradores.com.br;
    
    # ... resto da configuração
}

server {
    listen 80;
    server_name upaspiradores.com.br www.upaspiradores.com.br;
    return 301 https://$server_name$request_uri;
}
```

---

### FASE 6: Deploy da Aplicação

#### 6.1. Build e Start dos Containers

```bash
cd /opt/upcar-aspiradores

# Build das imagens
docker-compose -f docker-compose.prod.yml build --no-cache

# Iniciar serviços
docker-compose -f docker-compose.prod.yml up -d

# Verificar status
docker-compose -f docker-compose.prod.yml ps
```

#### 6.2. Verificar Logs

```bash
# Ver logs de todos os serviços
docker-compose -f docker-compose.prod.yml logs -f

# Ver logs específicos
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

#### 6.3. Executar Migrações do Banco

```bash
# Executar migrações
docker-compose -f docker-compose.prod.yml exec backend npm run db:migrate

# Verificar banco de dados
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d upcar_aspiradores -c "\dt"
```

---

### FASE 7: Configurar Serviços Externos

#### 7.1. Configurar Google OAuth

1. Acesse: https://console.cloud.google.com/
2. Vá em "APIs & Services" > "Credentials"
3. Edite seu OAuth 2.0 Client ID
4. Adicione URIs autorizados:
   ```
   https://upaspiradores.com.br
   https://www.upaspiradores.com.br
   ```
5. Adicione URIs de redirecionamento:
   ```
   https://upaspiradores.com.br/auth/google/callback
   ```

#### 7.2. Configurar Webhook Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Selecione sua aplicação
3. Vá em "Webhooks"
4. Adicione URL:
   ```
   https://upaspiradores.com.br/webhooks/mercadopago
   ```
5. Selecione evento: "Pagamentos"
6. Salve

#### 7.3. Testar Webhook

```bash
# Testar endpoint
curl https://upaspiradores.com.br/webhooks/mercadopago/test

# Deve retornar:
# {"status":"ok","message":"Webhook do Mercado Pago está configurado e funcionando","timestamp":"..."}
```

#### 7.4. Configurar WhatsApp Business API

1. Acesse: https://developers.facebook.com/
2. Vá em sua aplicação WhatsApp
3. Configure webhook URL:
   ```
   https://upaspiradores.com.br/webhooks/whatsapp
   ```
4. Adicione número de telefone à lista de testes

---

### FASE 8: Verificação e Testes

#### 8.1. Health Checks

```bash
# Backend health
curl https://upaspiradores.com.br/health

# Deve retornar:
# {
#   "status": "healthy",
#   "services": {
#     "database": {"status": "healthy"},
#     "redis": {"status": "healthy"},
#     "mqtt": {"status": "healthy"},
#     "websocket": {"status": "healthy"}
#   }
# }
```

#### 8.2. Testar Frontend

1. Abra: https://upaspiradores.com.br
2. Verifique se carrega corretamente
3. Teste login
4. Teste navegação

#### 8.3. Testar Funcionalidades Críticas

**Teste 1: Registro de Usuário**
- Criar nova conta
- Verificar email (se configurado)
- Fazer login

**Teste 2: Adicionar Crédito**
- Ir em "Adicionar Crédito"
- Gerar PIX
- Pagar com conta de teste
- Verificar se saldo atualiza automaticamente

**Teste 3: Ativar Máquina**
- Escanear QR code de teste
- Verificar ativação
- Verificar WebSocket funcionando

**Teste 4: Modo Manutenção (Admin)**
- Login como admin
- Colocar máquina em manutenção
- Verificar se usuários não conseguem acessar

---

### FASE 9: Configurar Backups Automáticos

#### 9.1. Criar Script de Backup

```bash
# Criar diretório de backups
sudo mkdir -p /backups
sudo chown $USER:$USER /backups

# O script já existe em scripts/backup.sh
chmod +x scripts/backup.sh
```

#### 9.2. Configurar Cron para Backups Diários

```bash
# Editar crontab
crontab -e

# Adicionar linha (backup diário às 3h da manhã):
0 3 * * * cd /opt/upcar-aspiradores && ./scripts/backup.sh >> /var/log/backup.log 2>&1
```

#### 9.3. Testar Backup

```bash
# Executar backup manualmente
cd /opt/upcar-aspiradores
./scripts/backup.sh

# Verificar se backup foi criado
ls -lh /backups/
```

---

### FASE 10: Monitoramento

#### 10.1. Acessar Grafana

1. Abra: https://upaspiradores.com.br:3000
2. Login: admin / senha-do-env
3. Importar dashboards (se necessário)

#### 10.2. Configurar Alertas

No Grafana:
1. Criar alertas para:
   - CPU > 80%
   - RAM > 90%
   - Disco > 85%
   - Serviços offline
   - Erros no backend

---

### FASE 11: Otimizações de Produção

#### 11.1. Configurar Swap (se necessário)

```bash
# Criar arquivo swap de 4GB
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Tornar permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### 11.2. Otimizar Docker

```bash
# Limpar recursos não utilizados
docker system prune -a -f

# Configurar log rotation
sudo nano /etc/docker/daemon.json
```

**Adicionar:**
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```bash
# Reiniciar Docker
sudo systemctl restart docker
```

---

## ✅ Checklist Final de Produção

### Infraestrutura
- [ ] Servidor criado e configurado
- [ ] Firewall configurado (UFW)
- [ ] Docker e Docker Compose instalados
- [ ] Fail2ban configurado
- [ ] Swap configurado (se necessário)

### Domínio e SSL
- [ ] DNS configurado apontando para servidor
- [ ] Certificado SSL instalado
- [ ] HTTPS funcionando
- [ ] Renovação automática configurada
- [ ] Redirecionamento HTTP → HTTPS funcionando

### Aplicação
- [ ] Código clonado/enviado para servidor
- [ ] `.env.prod` configurado com credenciais de produção
- [ ] Senhas fortes geradas
- [ ] Containers buildados e rodando
- [ ] Migrações do banco executadas
- [ ] Logs sem erros críticos

### Serviços Externos
- [ ] Google OAuth configurado para produção
- [ ] Webhook Mercado Pago configurado
- [ ] WhatsApp Business API configurado
- [ ] Todos os tokens de produção atualizados

### Testes
- [ ] Health checks passando
- [ ] Frontend carregando
- [ ] Login funcionando
- [ ] Pagamento PIX funcionando
- [ ] Webhook recebendo notificações
- [ ] WebSocket funcionando
- [ ] Ativação de máquina funcionando

### Segurança
- [ ] Senhas fortes em todos os serviços
- [ ] JWT secret único e seguro
- [ ] Firewall configurado
- [ ] SSL/TLS ativo
- [ ] Fail2ban ativo
- [ ] Backups configurados

### Monitoramento
- [ ] Grafana acessível
- [ ] Dashboards configurados
- [ ] Alertas configurados
- [ ] Logs sendo coletados
- [ ] Backups automáticos funcionando

---

## 🚨 Troubleshooting Comum

### Problema: Containers não iniciam

```bash
# Ver logs
docker-compose -f docker-compose.prod.yml logs

# Verificar recursos
free -h
df -h

# Reiniciar serviços
docker-compose -f docker-compose.prod.yml restart
```

### Problema: SSL não funciona

```bash
# Verificar certificados
sudo certbot certificates

# Renovar manualmente
sudo certbot renew --force-renewal

# Copiar novamente
sudo cp /etc/letsencrypt/live/upaspiradores.com.br/fullchain.pem /opt/upcar-aspiradores/ssl/cert.pem
sudo cp /etc/letsencrypt/live/upaspiradores.com.br/privkey.pem /opt/upcar-aspiradores/ssl/key.pem
```

### Problema: Banco de dados não conecta

```bash
# Verificar se postgres está rodando
docker-compose -f docker-compose.prod.yml ps postgres

# Ver logs do postgres
docker-compose -f docker-compose.prod.yml logs postgres

# Conectar manualmente
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres
```

### Problema: Webhook não recebe notificações

```bash
# Testar endpoint
curl https://upaspiradores.com.br/webhooks/mercadopago/test

# Ver logs do backend
docker-compose -f docker-compose.prod.yml logs -f backend | grep webhook

# Verificar firewall
sudo ufw status
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs: `docker-compose -f docker-compose.prod.yml logs`
2. Verifique o health check: `curl https://upaspiradores.com.br/health`
3. Verifique recursos do servidor: `htop`, `df -h`, `free -h`
4. Consulte a documentação específica de cada serviço

---

## 🎉 Conclusão

Após seguir todos esses passos, sua aplicação estará rodando em produção em **https://upaspiradores.com.br** com:

- ✅ HTTPS seguro
- ✅ Webhook Mercado Pago funcionando
- ✅ Pagamentos PIX automáticos
- ✅ WebSocket em tempo real
- ✅ Backups automáticos
- ✅ Monitoramento ativo
- ✅ Alta disponibilidade

**Tempo estimado total: 4-6 horas** (dependendo da experiência)

Boa sorte com o deploy! 🚀
