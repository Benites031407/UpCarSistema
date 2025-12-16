# 🔔 Configuração do Webhook Mercado Pago - UpCar-Aspiradores

## 🎯 Problema Resolvido

Quando um usuário paga um PIX, o Mercado Pago precisa notificar seu sistema automaticamente. Sem o webhook, o sistema não sabe que o pagamento foi confirmado.

## ✅ O que foi implementado

### 1. **Endpoint do Webhook**
```
POST /webhooks/mercadopago
```

**Funcionalidades:**
- ✅ Recebe notificações do Mercado Pago
- ✅ Verifica status do pagamento
- ✅ Confirma pagamento automaticamente
- ✅ Atualiza saldo do usuário
- ✅ Notifica usuário via WebSocket em tempo real
- ✅ Registra logs detalhados

### 2. **Notificação em Tempo Real**

Quando o pagamento é confirmado:
1. Sistema recebe webhook do MP
2. Verifica status do pagamento
3. Atualiza saldo do usuário
4. Envia notificação WebSocket para o frontend
5. Frontend atualiza automaticamente a tela

### 3. **Frontend WebSocket Listener**

✅ **Implementado em:**
- `packages/frontend/src/pages/AddCreditPage.tsx`
- `packages/frontend/src/pages/SubscriptionPage.tsx`

**Funcionalidades:**
- ✅ Escuta evento `payment-confirmed` via WebSocket
- ✅ Atualiza saldo do usuário automaticamente
- ✅ Fecha modal de PIX após confirmação
- ✅ Mostra mensagem de sucesso
- ✅ Indicador visual de "aguardando pagamento"

## 🔧 Configuração no Mercado Pago

### Passo 1: Acessar Configurações

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Selecione sua aplicação
3. Vá em **"Webhooks"** no menu lateral

### Passo 2: Configurar URL do Webhook

#### Para Desenvolvimento Local (Teste)

Você precisa expor seu localhost para a internet. Use uma dessas opções:

**Opção A: ngrok (Recomendado)**
```bash
# Instalar ngrok
# https://ngrok.com/download

# Expor porta 3001
ngrok http 3001

# Copiar a URL gerada (ex: https://abc123.ngrok.io)
```

**Opção B: localtunnel**
```bash
# Instalar
npm install -g localtunnel

# Expor porta 3001
lt --port 3001

# Copiar a URL gerada
```

**URL do Webhook para desenvolvimento:**
```
https://SEU-NGROK-URL.ngrok.io/webhooks/mercadopago
```

#### Para Produção

**URL do Webhook:**
```
https://seu-dominio.com/webhooks/mercadopago
```

### Passo 3: Configurar no Painel do MP

1. No painel de Webhooks, clique em **"Configurar notificações"**
2. Cole a URL do webhook
3. Selecione os eventos:
   - ✅ **Pagamentos** (payments)
   - ✅ **Atualizações de pagamento** (payment.updated)
4. Clique em **"Salvar"**

### Passo 4: Testar o Webhook

#### Teste 1: Verificar se está acessível
```bash
curl https://SEU-NGROK-URL.ngrok.io/webhooks/mercadopago/test
```

Resposta esperada:
```json
{
  "status": "ok",
  "message": "Webhook do Mercado Pago está configurado e funcionando",
  "timestamp": "2025-12-15T00:00:00.000Z"
}
```

#### Teste 2: Simular notificação
```bash
curl -X POST https://SEU-NGROK-URL.ngrok.io/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": {
      "id": "123456789"
    }
  }'
```

#### Teste 3: Fazer pagamento real

1. Adicione crédito como usuário
2. Gere o QR Code PIX
3. Pague com PIX (use app do banco ou PIX de teste)
4. Aguarde 2-5 segundos
5. A tela deve atualizar automaticamente!

## 📱 Como Funciona no Frontend

O frontend já está preparado para receber notificações WebSocket. Quando o pagamento é confirmado:

```typescript
// O WebSocket recebe:
{
  event: 'payment-confirmed',
  data: {
    transactionId: 'uuid',
    paymentId: '123456789',
    amount: 10.00,
    newBalance: 50.00,
    type: 'credit_added',
    timestamp: '2025-12-15T00:00:00.000Z'
  }
}
```

O frontend deve:
1. Atualizar o saldo exibido
2. Mostrar mensagem de sucesso
3. Redirecionar ou fechar modal de pagamento

## 🔍 Logs e Debugging

### Ver logs do webhook

Os logs aparecem no console do backend:

```
info: Webhook do Mercado Pago recebido: { ... }
info: Processando notificação de pagamento: 123456789
info: Status do pagamento 123456789: { status: 'approved' }
info: Pagamento 123456789 confirmado com sucesso para usuário abc-123
info: Notificação WebSocket enviada para usuário abc-123
```

### Verificar se webhook foi chamado

```bash
# Ver últimas linhas do log
tail -f packages/backend/logs/combined.log | grep webhook
```

### Testar manualmente

Se o webhook não funcionar, você pode confirmar manualmente:

```bash
curl -X POST http://localhost:3001/api/payments/confirm/PAYMENT_ID \
  -H "Authorization: Bearer SEU_TOKEN"
```

## 🚨 Troubleshooting

### Problema: Webhook não é chamado

**Soluções:**
1. Verifique se a URL está correta no painel do MP
2. Verifique se o ngrok está rodando
3. Teste a URL manualmente com curl
4. Verifique os logs do Mercado Pago no painel

### Problema: Webhook é chamado mas não atualiza

**Soluções:**
1. Verifique os logs do backend
2. Verifique se o paymentId está correto
3. Verifique se a transação existe no banco
4. Verifique se o WebSocket está conectado

### Problema: Demora muito para atualizar

**Causas:**
- Mercado Pago pode demorar 2-10 segundos para enviar webhook
- Rede lenta
- Processamento do pagamento

**Solução:**
- Adicionar polling no frontend como fallback
- Verificar status a cada 3 segundos por 30 segundos

## 🔐 Segurança

### Validação de Assinatura (Opcional mas Recomendado)

O Mercado Pago envia um header `x-signature` para validar a autenticidade:

```typescript
// Adicionar no webhook
const signature = req.headers['x-signature'];
const requestId = req.headers['x-request-id'];

// Validar assinatura
// Documentação: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks#validar-origem-da-notificação
```

### Rate Limiting

O webhook já está protegido pelo rate limiting geral da aplicação.

## 📊 Monitoramento

### Métricas importantes

- Tempo de resposta do webhook
- Taxa de sucesso/falha
- Tempo entre pagamento e confirmação
- Número de webhooks recebidos

### Alertas recomendados

- ⚠️ Webhook com erro > 5% em 1 hora
- ⚠️ Nenhum webhook recebido em 24 horas (se houver pagamentos)
- ⚠️ Tempo de processamento > 10 segundos

## 🎯 Checklist de Configuração

### Desenvolvimento
- [x] Webhook implementado no backend
- [x] Rota registrada no servidor
- [ ] ngrok instalado e rodando
- [ ] URL do webhook configurada no MP
- [ ] Teste com pagamento real realizado
- [ ] Frontend atualiza automaticamente

### Produção
- [ ] Domínio configurado
- [ ] HTTPS ativo
- [ ] URL do webhook configurada no MP (produção)
- [ ] Validação de assinatura implementada
- [ ] Logs de monitoramento ativos
- [ ] Alertas configurados
- [ ] Teste em produção realizado

## 📚 Recursos

### Documentação Mercado Pago
- [Webhooks](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)
- [IPN (Instant Payment Notification)](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/ipn)
- [Validar origem](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks#validar-origem-da-notificação)

### Ferramentas
- [ngrok](https://ngrok.com/) - Expor localhost
- [localtunnel](https://localtunnel.github.io/www/) - Alternativa ao ngrok
- [webhook.site](https://webhook.site/) - Testar webhooks

## 🔄 Fluxo Completo

```
1. Usuário clica em "Adicionar Crédito"
   ↓
2. Frontend chama POST /api/payments/add-credit
   ↓
3. Backend cria pagamento PIX no Mercado Pago
   ↓
4. Frontend exibe QR Code
   ↓
5. Usuário paga com PIX
   ↓
6. Mercado Pago processa pagamento (2-10 segundos)
   ↓
7. Mercado Pago envia webhook para /webhooks/mercadopago
   ↓
8. Backend verifica status do pagamento
   ↓
9. Backend confirma pagamento e atualiza saldo
   ↓
10. Backend envia notificação WebSocket para frontend
   ↓
11. Frontend atualiza saldo e mostra mensagem de sucesso
   ↓
12. ✅ Crédito adicionado!
```

## 💡 Próximas Melhorias

1. **Polling como fallback**
   - Se webhook falhar, frontend verifica status a cada 3s

2. **Retry automático**
   - Se webhook falhar, tentar novamente

3. **Dashboard de webhooks**
   - Ver histórico de webhooks recebidos
   - Estatísticas de sucesso/falha

4. **Notificações push**
   - Notificar usuário via push notification

---

**Status**: ✅ Implementado
**Última atualização**: 2025-12-15
**Sistema**: UpCar-Aspiradores
