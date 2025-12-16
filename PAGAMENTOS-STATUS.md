# 💳 Status da Implementação de Pagamentos - UpCar-Aspiradores

## 📊 Situação Atual

### ✅ **O que está implementado:**

#### 1. **PIX (Mercado Pago)**
- ✅ Criação de pagamentos PIX
- ✅ Geração de QR Code
- ✅ Código PIX Copia e Cola
- ✅ Verificação de status de pagamento
- ✅ Confirmação de pagamento (webhook)
- ✅ Integração completa com Mercado Pago API
- ✅ Retry automático em caso de falha
- ✅ Circuit breaker para resiliência
- ✅ Fallback em caso de indisponibilidade

#### 2. **Pagamento com Saldo**
- ✅ Dedução de saldo da conta
- ✅ Transações registradas
- ✅ Histórico de transações

#### 3. **Pagamento Misto (Saldo + PIX)**
- ✅ Usa saldo disponível primeiro
- ✅ Complementa com PIX se necessário
- ✅ Transações separadas para cada parte

#### 4. **Assinatura Mensal**
- ✅ Pagamento via PIX (R$ 59,90/mês)
- ✅ Ativação automática após confirmação
- ✅ Controle de expiração

#### 5. **Adição de Créditos**
- ✅ Via PIX
- ✅ Atualização automática do saldo

### ❌ **O que NÃO está implementado:**

#### 1. **Cartão de Crédito**
- ❌ Processamento de cartão de crédito
- ❌ Tokenização de cartão
- ❌ Pagamento recorrente com cartão
- ❌ Salvamento de cartões

## 🔧 Implementação Atual - Detalhes Técnicos

### Arquivos Principais

```
packages/backend/src/
├── services/
│   └── paymentService.ts          # Serviço principal de pagamentos
├── routes/
│   └── payments.ts                # Endpoints de pagamento
└── .env                           # Configuração
```

### Configuração Atual (.env)

```env
# PIX Payment Configuration
PIX_GATEWAY_URL=https://api.mercadopago.com
PIX_ACCESS_TOKEN=TEST-8520764521265905-121318-...
```

### Endpoints Disponíveis

| Endpoint | Método | Descrição | Status |
|----------|--------|-----------|--------|
| `/api/payments/analyze` | POST | Analisa opções de pagamento | ✅ |
| `/api/payments/balance` | POST | Paga com saldo | ✅ |
| `/api/payments/pix` | POST | Cria pagamento PIX | ✅ |
| `/api/payments/mixed` | POST | Pagamento misto | ✅ |
| `/api/payments/add-credit` | POST | Adiciona crédito | ✅ |
| `/api/payments/subscription` | POST | Assinatura mensal | ✅ |
| `/api/payments/status/:id` | GET | Verifica status PIX | ✅ |
| `/api/payments/confirm/:id` | POST | Confirma pagamento | ✅ |
| `/api/payments/history` | GET | Histórico | ✅ |
| `/api/payments/card` | POST | Pagamento com cartão | ❌ |

## 💳 Como Adicionar Cartão de Crédito

### Opção 1: Mercado Pago (Recomendado)

O Mercado Pago já suporta cartão de crédito na mesma API!

#### Vantagens:
- ✅ Mesma integração que PIX
- ✅ Já temos o access token
- ✅ PCI compliance gerenciado pelo MP
- ✅ Tokenização automática
- ✅ Suporte a parcelamento
- ✅ Antifraude incluído

#### Implementação:

**1. Adicionar método no PaymentService:**

```typescript
// packages/backend/src/services/paymentService.ts

export interface CreditCardPaymentRequest {
  amount: number;
  description: string;
  cardToken: string; // Token gerado pelo frontend
  installments?: number; // Número de parcelas
  payerEmail: string;
  externalReference?: string;
}

async createCreditCardPayment(
  request: CreditCardPaymentRequest
): Promise<PIXPaymentResponse> {
  if (!this.mercadoPagoAccessToken) {
    throw new ExternalServiceError('Payment Gateway', 'Payment gateway not configured');
  }

  const paymentData = {
    transaction_amount: request.amount,
    description: request.description,
    payment_method_id: 'credit_card', // ou 'debit_card'
    token: request.cardToken,
    installments: request.installments || 1,
    payer: {
      email: request.payerEmail
    },
    external_reference: request.externalReference
  };

  const response = await axios.post(
    `${this.mercadoPagoBaseUrl}/v1/payments`,
    paymentData,
    {
      headers: {
        'Authorization': `Bearer ${this.mercadoPagoAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4()
      }
    }
  );

  return {
    id: response.data.id.toString(),
    status: this.mapMercadoPagoStatus(response.data.status),
    // Cartão é aprovado instantaneamente ou rejeitado
  };
}
```

**2. Adicionar endpoint:**

```typescript
// packages/backend/src/routes/payments.ts

router.post('/card',
  authenticateToken,
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Valor inválido'),
    body('cardToken').isString().withMessage('Token do cartão é obrigatório'),
    body('installments').optional().isInt({ min: 1, max: 12 }),
  ],
  async (req: express.Request, res: express.Response) => {
    try {
      const { amount, cardToken, installments, description } = req.body;
      const userId = (req as any).user.id;
      const user = await userRepository.findById(userId);

      const payment = await paymentService.createCreditCardPayment({
        amount,
        cardToken,
        installments,
        description: description || 'Pagamento UpCar-Aspiradores',
        payerEmail: user!.email,
        externalReference: `card_${userId}_${Date.now()}`
      });

      res.json({
        success: true,
        payment
      });
    } catch (error) {
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Falha no pagamento com cartão' 
      });
    }
  }
);
```

**3. Frontend - Tokenização do Cartão:**

```typescript
// Instalar SDK do Mercado Pago
// npm install @mercadopago/sdk-react

import { CardPayment } from '@mercadopago/sdk-react';

// Componente de pagamento
<CardPayment
  initialization={{
    amount: 10.00,
  }}
  onSubmit={async (formData) => {
    // formData contém o token do cartão
    const response = await fetch('/api/payments/card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount: 10.00,
        cardToken: formData.token,
        installments: formData.installments
      })
    });
    
    const result = await response.json();
    // Processar resultado
  }}
/>
```

### Opção 2: Outras Gateways

#### Stripe
- ✅ Muito popular
- ✅ Ótima documentação
- ❌ Mais caro que MP
- ❌ Precisa de nova integração

#### PagSeguro
- ✅ Brasileiro
- ✅ Suporte local
- ❌ API menos moderna
- ❌ Precisa de nova integração

## 📋 Checklist de Implementação - Cartão de Crédito

### Backend

- [ ] Adicionar interface `CreditCardPaymentRequest`
- [ ] Implementar método `createCreditCardPayment()` no `PaymentService`
- [ ] Adicionar endpoint `POST /api/payments/card`
- [ ] Adicionar validações de cartão
- [ ] Implementar tratamento de erros específicos de cartão
- [ ] Adicionar testes unitários
- [ ] Adicionar testes de integração
- [ ] Documentar API

### Frontend

- [ ] Instalar SDK do Mercado Pago (`@mercadopago/sdk-react`)
- [ ] Criar componente de formulário de cartão
- [ ] Implementar tokenização segura
- [ ] Adicionar seleção de parcelas
- [ ] Implementar feedback de erro
- [ ] Adicionar loading states
- [ ] Testar fluxo completo

### Configuração

- [ ] Obter credenciais de produção do Mercado Pago
- [ ] Configurar webhook para notificações
- [ ] Testar em ambiente de sandbox
- [ ] Configurar limites de transação
- [ ] Configurar retry policies

### Segurança

- [ ] Nunca armazenar dados de cartão no backend
- [ ] Usar apenas tokens do MP
- [ ] Implementar rate limiting
- [ ] Adicionar logs de auditoria
- [ ] Configurar alertas de fraude

## 🚀 Próximos Passos Recomendados

### Fase 1: Preparação (1-2 dias)
1. Estudar documentação do Mercado Pago para cartões
2. Criar conta de desenvolvedor (se ainda não tiver)
3. Obter credenciais de teste
4. Testar API em Postman/Insomnia

### Fase 2: Backend (2-3 dias)
1. Implementar `createCreditCardPayment()`
2. Adicionar endpoint `/api/payments/card`
3. Adicionar validações
4. Escrever testes
5. Testar com tokens de teste do MP

### Fase 3: Frontend (3-4 dias)
1. Instalar SDK do Mercado Pago
2. Criar componente de formulário
3. Implementar tokenização
4. Integrar com backend
5. Adicionar tratamento de erros
6. Testar fluxo completo

### Fase 4: Testes e Deploy (2-3 dias)
1. Testes end-to-end
2. Testes de segurança
3. Testes de performance
4. Deploy em staging
5. Testes com cartões reais (sandbox)
6. Deploy em produção

**Total estimado: 8-12 dias**

## 📚 Recursos Úteis

### Documentação Mercado Pago

- [API de Pagamentos](https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post)
- [Cartões de Crédito](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-configuration/card/integrate-via-cardform)
- [SDK React](https://www.mercadopago.com.br/developers/pt/docs/sdks-library/client-side/sdk-react)
- [Tokenização](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-configuration/card/integrate-via-cardform)
- [Webhooks](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)

### Cartões de Teste

```
Mastercard aprovado: 5031 4332 1540 6351
Visa aprovado: 4509 9535 6623 3704
CVV: 123
Validade: 11/25
Nome: APRO (aprovado) ou OTHE (rejeitado)
```

## 💰 Custos

### Mercado Pago - Taxas

| Método | Taxa |
|--------|------|
| PIX | 0,99% |
| Cartão de Crédito | 4,99% + R$ 0,39 |
| Cartão de Débito | 3,99% + R$ 0,39 |
| Boleto | R$ 3,49 |

### Comparação

| Gateway | PIX | Cartão Crédito | Cartão Débito |
|---------|-----|----------------|---------------|
| Mercado Pago | 0,99% | 4,99% | 3,99% |
| PagSeguro | 0,99% | 4,99% | 3,99% |
| Stripe | N/A | 3,99% + R$ 0,39 | N/A |

## 🎯 Recomendação

**Usar Mercado Pago para cartão de crédito** porque:

1. ✅ Já temos a integração PIX funcionando
2. ✅ Mesma API, mesmas credenciais
3. ✅ Menos código para manter
4. ✅ Taxas competitivas
5. ✅ Suporte brasileiro
6. ✅ PCI compliance gerenciado
7. ✅ SDK React pronto

**Esforço estimado:** 8-12 dias de desenvolvimento

**Complexidade:** Média (já temos 70% do código necessário)

---

**Status**: ✅ PIX implementado | ❌ Cartão pendente
**Última atualização**: 2025-12-14
**Sistema**: UpCar-Aspiradores
