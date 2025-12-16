# ✅ Checklist Rápido de Deploy - upaspiradores.com.br

## 📋 Resumo Executivo

Este é um checklist simplificado. Para instruções detalhadas, veja `DEPLOY-TO-PRODUCTION.md`.

---

## FASE 1: Servidor (30 min)

```bash
# 1. Criar servidor (AWS/DigitalOcean/etc)
# - Ubuntu 22.04 LTS
# - 4GB RAM mínimo
# - 100GB SSD

# 2. Conectar via SSH
ssh usuario@SEU_IP

# 3. Atualizar sistema
sudo apt update && sudo apt upgrade -y

# 4. Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 5. Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 6. Configurar firewall
sudo ufw allow 22,80,443,1883/tcp
sudo ufw enable
```

**Status:** [ ] Completo

---

## FASE 2: Domínio (15 min)

```bash
# 1. Configurar DNS (no painel do domínio)
A       @       SEU_IP_PUBLICO
A       www     SEU_IP_PUBLICO

# 2. Aguardar propagação (1-2 horas)
nslookup upaspiradores.com.br
```

**Status:** [ ] Completo

---

## FASE 3: SSL (20 min)

```bash
# 1. Instalar Certbot
sudo apt install -y certbot

# 2. Gerar certificado
sudo certbot certonly --standalone -d upaspiradores.com.br -d www.upaspiradores.com.br

# 3. Copiar certificados
mkdir -p /opt/upcar-aspiradores/ssl
sudo cp /etc/letsencrypt/live/upaspiradores.com.br/fullchain.pem /opt/upcar-aspiradores/ssl/cert.pem
sudo cp /etc/letsencrypt/live/upaspiradores.com.br/privkey.pem /opt/upcar-aspiradores/ssl/key.pem
sudo chown $USER:$USER /opt/upcar-aspiradores/ssl/*.pem
```

**Status:** [ ] Completo

---

## FASE 4: Código (30 min)

```bash
# 1. Clonar repositório
sudo mkdir -p /opt/upcar-aspiradores
sudo chown $USER:$USER /opt/upcar-aspiradores
cd /opt/upcar-aspiradores
git clone SEU_REPO .

# 2. Criar .env.prod
cp .env.prod.example .env.prod
nano .env.prod

# 3. Configurar variáveis essenciais:
NODE_ENV=production
DB_PASSWORD=SENHA_SEGURA_1
REDIS_PASSWORD=SENHA_SEGURA_2
JWT_SECRET=$(openssl rand -base64 64)
FRONTEND_URL=https://upaspiradores.com.br
CORS_ORIGIN=https://upaspiradores.com.br
VITE_API_URL=https://upaspiradores.com.br/api
GOOGLE_CLIENT_ID=SEU_CLIENT_ID_PRODUCAO
GOOGLE_CLIENT_SECRET=SEU_SECRET_PRODUCAO
GOOGLE_CALLBACK_URL=https://upaspiradores.com.br/auth/google/callback
PIX_ACCESS_TOKEN=SEU_TOKEN_MP_PRODUCAO
WHATSAPP_ACCESS_TOKEN=SEU_TOKEN_WA_PRODUCAO
```

**Status:** [ ] Completo

---

## FASE 5: Deploy (30 min)

```bash
# 1. Build e start
cd /opt/upcar-aspiradores
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 2. Verificar status
docker-compose -f docker-compose.prod.yml ps

# 3. Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# 4. Executar migrações
docker-compose -f docker-compose.prod.yml exec backend npm run db:migrate
```

**Status:** [ ] Completo

---

## FASE 6: Configurar Serviços (30 min)

### Google OAuth
1. https://console.cloud.google.com/
2. APIs & Services > Credentials
3. Adicionar URIs:
   - `https://upaspiradores.com.br`
   - `https://upaspiradores.com.br/auth/google/callback`

**Status:** [ ] Completo

### Mercado Pago Webhook
1. https://www.mercadopago.com.br/developers/panel/app
2. Webhooks
3. Adicionar: `https://upaspiradores.com.br/webhooks/mercadopago`
4. Evento: Pagamentos

**Status:** [ ] Completo

### WhatsApp Business
1. https://developers.facebook.com/
2. Configurar webhook: `https://upaspiradores.com.br/webhooks/whatsapp`

**Status:** [ ] Completo

---

## FASE 7: Testes (30 min)

```bash
# 1. Health check
curl https://upaspiradores.com.br/health

# 2. Webhook test
curl https://upaspiradores.com.br/webhooks/mercadopago/test

# 3. Testar no navegador
# - Abrir https://upaspiradores.com.br
# - Fazer login
# - Adicionar crédito
# - Gerar PIX
# - Pagar (conta teste)
# - Verificar atualização automática
```

**Status:** [ ] Completo

---

## FASE 8: Backups (15 min)

```bash
# 1. Testar backup
cd /opt/upcar-aspiradores
./scripts/backup.sh

# 2. Configurar cron
crontab -e
# Adicionar:
0 3 * * * cd /opt/upcar-aspiradores && ./scripts/backup.sh >> /var/log/backup.log 2>&1
```

**Status:** [ ] Completo

---

## ✅ Verificação Final

### Infraestrutura
- [ ] Servidor rodando
- [ ] Docker instalado
- [ ] Firewall configurado
- [ ] DNS propagado

### SSL/Domínio
- [ ] Certificado SSL instalado
- [ ] HTTPS funcionando
- [ ] Redirecionamento HTTP→HTTPS

### Aplicação
- [ ] Containers rodando
- [ ] Logs sem erros
- [ ] Health check OK
- [ ] Frontend carregando

### Funcionalidades
- [ ] Login funcionando
- [ ] Pagamento PIX funcionando
- [ ] Webhook recebendo notificações
- [ ] WebSocket funcionando
- [ ] Ativação de máquina OK

### Segurança
- [ ] Senhas fortes
- [ ] SSL ativo
- [ ] Firewall ativo
- [ ] Backups configurados

---

## 🚨 Comandos Úteis

```bash
# Ver status
docker-compose -f docker-compose.prod.yml ps

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Reiniciar serviço
docker-compose -f docker-compose.prod.yml restart backend

# Reiniciar tudo
docker-compose -f docker-compose.prod.yml restart

# Parar tudo
docker-compose -f docker-compose.prod.yml down

# Backup manual
./scripts/backup.sh

# Health check
curl https://upaspiradores.com.br/health

# Webhook test
curl https://upaspiradores.com.br/webhooks/mercadopago/test
```

---

## 📊 Tempo Estimado Total

- **Mínimo:** 3 horas (se tudo correr bem)
- **Médio:** 4-5 horas (com alguns ajustes)
- **Máximo:** 6-8 horas (primeira vez + troubleshooting)

---

## 🎯 Próximos Passos Após Deploy

1. **Monitorar por 24h**
   - Verificar logs regularmente
   - Testar funcionalidades críticas
   - Monitorar recursos do servidor

2. **Configurar Alertas**
   - Grafana alerts
   - Email notifications
   - Slack/Discord webhooks

3. **Documentar**
   - Credenciais em local seguro
   - Procedimentos de emergência
   - Contatos importantes

4. **Otimizar**
   - Ajustar recursos conforme uso
   - Configurar CDN (se necessário)
   - Implementar cache adicional

---

## 📞 Em Caso de Problemas

1. **Ver logs:** `docker-compose -f docker-compose.prod.yml logs -f`
2. **Health check:** `curl https://upaspiradores.com.br/health`
3. **Reiniciar:** `docker-compose -f docker-compose.prod.yml restart`
4. **Consultar:** `DEPLOY-TO-PRODUCTION.md` (guia completo)

---

**Boa sorte! 🚀**
