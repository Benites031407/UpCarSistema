# 🧪 Guia Rápido de Teste - Webhook Mercado Pago

## ✅ Status Atual

- ✅ Backend implementado e rodando
- ✅ Frontend implementado e rodando
- ✅ WebSocket funcionando
- ❌ Webhook URL não configurada no Mercado Pago (você precisa fazer isso)

## 🚀 Como Testar Agora

### Opção 1: Teste Local com ngrok (Recomendado)

#### Passo 1: Instalar ngrok

**Windows (PowerShell como Admin):**
```powershell
# Via Chocolatey
choco install ngrok

# Ou baixe manualmente de: https://ngrok.com/download
```

**Linux/Mac:**
```bash
# Via Homebrew
brew install ngrok

# Ou baixe manualmente de: https://ngrok.com/download
```

#### Passo 2: Expor o Backend

```bash
# Expor porta 3001 (backend)
ngrok http 3001
```

**Você verá algo assim:**
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3001
```

**Copie a URL:** `https://abc123.ngrok.io`

#### Passo 3: Configurar no Mercado Pago

1. **Acesse:** https://www.mercadopago.com.br/developers/panel/app

2. **Selecione sua aplicação**

3. **Vá em "Webhooks"** no menu lateral

4. **Clique em "Configurar notificações"**

5. **Cole a URL do webhook:**
   ```
   https://abc123.ngrok.io/webhooks/mercadopago
   ```

6. **Selecione o evento:** "Pagamentos"

7. **Salve**

#### Passo 4: Testar o Webhook

**Teste 1: Verificar se webhook está acessível**
```bash
curl https://abc123.ngrok.io/webhooks/mercadopago/test
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "message": "Webhook do Mercado Pago está configurado e funcionando",
  "timestamp": "2024-12-14T..."
}
```

**Teste 2: Fazer um pagamento de teste**

1. Abra a aplicação: http://localhost:3000
2. Faça login
3. Vá em "Adicionar Crédito"
4. Escolha um valor (ex: R$ 10)
5. Clique em "Pagar com PIX"
6. **Copie o código PIX**
7. Use uma conta de teste do Mercado Pago para pagar
8. **Observe a tela atualizar automaticamente!**

### Opção 2: Teste em Produção

Se você já tem o sistema em produção:

1. **Configure o webhook no MP:**
   ```
   https://seu-dominio.com/webhooks/mercadopago
   ```

2. **Faça um pagamento real**

3. **Observe a tela atualizar automaticamente**

## 🔍 Como Saber se Está Funcionando

### No Frontend (Navegador)

1. **Abra o Console do Navegador** (F12)

2. **Você verá logs como:**
   ```
   WebSocket connected: abc123
   Payment confirmed via WebSocket: {paymentId: "123", amount: 10, ...}
   ```

3. **Você verá:**
   - ✅ Indicador "Aguardando confirmação do pagamento..." (spinner amarelo)
   - ✅ Mensagem de sucesso quando pagar
   - ✅ Modal fecha automaticamente
   - ✅ Saldo atualizado

### No Backend (Terminal)

**Você verá logs como:**
```
info: Webhook do Mercado Pago recebido: {...}
info: Processando notificação de pagamento: 123456789
info: Status do pagamento 123456789: approved
info: Pagamento 123456789 confirmado com sucesso para usuário abc
info: Notificação WebSocket enviada para usuário abc
```

### No ngrok (Se estiver usando)

**Você verá requisições como:**
```
POST /webhooks/mercadopago  200 OK
```

## 🐛 Troubleshooting

### Problema: "Aguardando confirmação..." não some

**Possíveis causas:**
1. Webhook não configurado no MP
2. ngrok não está rodando
3. URL do webhook incorreta
4. Pagamento ainda não foi processado pelo MP

**Solução:**
- Verifique se ngrok está rodando
- Verifique se URL está correta no MP
- Aguarde 5-10 segundos após pagar
- Verifique logs do backend

### Problema: WebSocket não conecta

**Possíveis causas:**
1. Backend não está rodando
2. Frontend não está rodando
3. Porta 3001 bloqueada

**Solução:**
- Verifique se backend está rodando: http://localhost:3001/health
- Verifique se frontend está rodando: http://localhost:3000
- Verifique console do navegador para erros

### Problema: Webhook retorna erro 404

**Possíveis causas:**
1. URL incorreta
2. Backend não está rodando
3. Rota não registrada

**Solução:**
- Teste: `curl http://localhost:3001/webhooks/mercadopago/test`
- Deve retornar status "ok"
- Se não funcionar, reinicie o backend

## 📊 Contas de Teste do Mercado Pago

Para testar pagamentos sem usar dinheiro real:

1. **Acesse:** https://www.mercadopago.com.br/developers/pt/docs/your-integrations/test/accounts

2. **Crie contas de teste:**
   - Vendedor (sua aplicação)
   - Comprador (para fazer pagamentos)

3. **Use as credenciais de teste** no `.env`:
   ```
   PIX_ACCESS_TOKEN=TEST-123456789-...
   ```

## ✅ Checklist de Teste

- [ ] ngrok instalado e rodando
- [ ] URL do ngrok copiada
- [ ] Webhook configurado no Mercado Pago
- [ ] Backend rodando (porta 3001)
- [ ] Frontend rodando (porta 3000)
- [ ] Console do navegador aberto (F12)
- [ ] Fazer login na aplicação
- [ ] Ir em "Adicionar Crédito"
- [ ] Gerar PIX
- [ ] Ver indicador "Aguardando confirmação..."
- [ ] Pagar com conta de teste
- [ ] Ver mensagem de sucesso
- [ ] Ver modal fechar automaticamente
- [ ] Ver saldo atualizado

## 🎉 Sucesso!

Se você viu:
- ✅ Indicador "Aguardando confirmação..." apareceu
- ✅ Após pagar, mensagem de sucesso apareceu
- ✅ Modal fechou automaticamente
- ✅ Saldo foi atualizado

**Parabéns! O webhook está funcionando perfeitamente! 🎊**

## 📝 Próximos Passos

1. **Testar com pagamento real** (pequeno valor)
2. **Configurar webhook em produção**
3. **Monitorar logs por alguns dias**
4. **Adicionar validação de assinatura** (segurança extra)

## 🔗 Links Úteis

- [ngrok Download](https://ngrok.com/download)
- [Dashboard Mercado Pago](https://www.mercadopago.com.br/developers/panel/app)
- [Contas de Teste MP](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/test/accounts)
- [Documentação Webhooks](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)

---

**Dúvidas?** Verifique os logs do backend e do console do navegador!
