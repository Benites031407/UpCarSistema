# 🔧 Correção: Modo de Manutenção

## Problema Identificado

Quando uma máquina era colocada em modo de manutenção pelo admin, os usuários ainda conseguiam ativá-la através de outro dispositivo.

**Causa**: A máquina não estava sendo realmente atualizada para o status `maintenance` no banco de dados.

## ✅ Solução Implementada

### 1. **Novo Endpoint Dedicado**

Criado endpoint específico para colocar máquinas em manutenção:

```
PATCH /api/admin/machines/:id/set-maintenance
```

**Body:**
```json
{
  "reason": "Motivo da manutenção (opcional)"
}
```

**Resposta:**
```json
{
  "success": true,
  "machine": { ... },
  "message": "Máquina colocada em modo de manutenção"
}
```

### 2. **Funcionalidades do Endpoint**

O novo endpoint:
- ✅ Atualiza o status da máquina para `maintenance`
- ✅ Envia notificação WhatsApp para o administrador
- ✅ Registra o motivo da manutenção
- ✅ Faz broadcast da atualização via WebSocket
- ✅ Impede que usuários ativem a máquina

### 3. **Validação de Disponibilidade**

O sistema já tinha a validação correta em `machineService.checkMachineAvailability()`:

```typescript
// Check if machine is in maintenance mode
if (machine.status === 'maintenance') {
  return {
    available: false,
    reason: 'Machine is in maintenance mode',
    machine
  };
}
```

O problema era que o status não estava sendo atualizado corretamente.

## 🧪 Como Testar

### Teste 1: Colocar Máquina em Manutenção

```bash
# Obter token de admin
TOKEN="seu-token-admin"

# Colocar máquina em manutenção
curl -X PATCH http://localhost:3001/api/admin/machines/MACHINE_ID/set-maintenance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Limpeza programada"
  }'
```

### Teste 2: Verificar Status no Banco

```bash
psql -U postgres -d upcar_aspiradores -c "SELECT code, status FROM machines WHERE code = '305718';"
```

Deve mostrar: `status = maintenance`

### Teste 3: Tentar Ativar Como Usuário

```bash
# Tentar criar sessão (deve falhar)
curl -X POST http://localhost:3001/api/sessions \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "machineId": "MACHINE_ID",
    "duration": 5,
    "paymentMethod": "balance"
  }'
```

**Resposta esperada:**
```json
{
  "error": "Machine is in maintenance mode"
}
```

### Teste 4: Resetar Manutenção

```bash
# Resetar contador e voltar para online
curl -X PATCH http://localhost:3001/api/admin/machines/MACHINE_ID/reset-maintenance \
  -H "Authorization: Bearer $TOKEN"
```

## 📱 Notificação WhatsApp

Quando uma máquina é colocada em manutenção, o administrador recebe:

```
🔧 MANUTENÇÃO NECESSÁRIA

Máquina: 305718
Local: R. Príncipe Humberto, 450 - SBC
Motivo: Limpeza programada

Por favor, agende a manutenção o mais breve possível.
```

## 🔄 Endpoints Relacionados

### 1. Colocar em Manutenção
```
PATCH /api/admin/machines/:id/set-maintenance
Body: { "reason": "string" }
```

### 2. Resetar Manutenção
```
PATCH /api/admin/machines/:id/reset-maintenance
```
- Reseta contador de horas
- Volta status para `online`
- Remove override de manutenção

### 3. Toggle Override de Manutenção
```
PATCH /api/admin/machines/:id/maintenance-override
Body: { "override": boolean, "reason": "string" }
```
- Permite máquina operar mesmo precisando de manutenção
- Mostra aviso mas não bloqueia

### 4. Atualizar Máquina (Geral)
```
PUT /api/admin/machines/:id
Body: { "status": "online" | "offline" | "maintenance", ... }
```

## 🎯 Fluxo Correto

### Para Colocar em Manutenção:

1. **Admin acessa painel**
2. **Seleciona máquina**
3. **Clica em "Modo Manutenção"**
4. **Frontend chama:** `PATCH /api/admin/machines/:id/set-maintenance`
5. **Backend:**
   - Atualiza status para `maintenance`
   - Envia notificação WhatsApp
   - Faz broadcast via WebSocket
6. **Usuários não conseguem mais ativar a máquina**

### Para Sair da Manutenção:

1. **Admin completa manutenção**
2. **Clica em "Resetar Manutenção"**
3. **Frontend chama:** `PATCH /api/admin/machines/:id/reset-maintenance`
4. **Backend:**
   - Reseta contador de horas
   - Volta status para `online`
   - Faz broadcast via WebSocket
5. **Máquina volta a ficar disponível**

## 🐛 Debugging

### Verificar Status Atual
```sql
SELECT id, code, status, current_operating_hours, maintenance_interval
FROM machines
WHERE code = '305718';
```

### Ver Logs de Manutenção
```sql
SELECT * FROM maintenance_logs
WHERE machine_id = 'MACHINE_ID'
ORDER BY created_at DESC
LIMIT 10;
```

### Verificar Tentativas de Ativação
```sql
SELECT s.id, s.status, s.created_at, m.code, m.status as machine_status
FROM usage_sessions s
JOIN machines m ON s.machine_id = m.id
WHERE m.code = '305718'
ORDER BY s.created_at DESC
LIMIT 5;
```

## ✅ Checklist de Verificação

- [x] Endpoint `/set-maintenance` criado
- [x] Validação de manutenção em `checkMachineAvailability`
- [x] Notificação WhatsApp enviada
- [x] Broadcast WebSocket funcionando
- [x] Mensagens traduzidas para português
- [x] Teste manual realizado (máquina 305718)
- [ ] Frontend precisa usar o novo endpoint
- [ ] Testar com usuário real

## 📝 Próximos Passos

1. **Frontend**: Atualizar para usar o novo endpoint `/set-maintenance`
2. **Testes**: Adicionar testes automatizados
3. **Documentação**: Atualizar guia do admin
4. **UI**: Adicionar feedback visual quando máquina está em manutenção

## 🚨 Importante

- Máquinas em manutenção **não podem** ser ativadas por usuários
- Admin pode usar "override" para permitir uso temporário
- Notificações são enviadas automaticamente
- Status é sincronizado em tempo real via WebSocket

---

**Status**: ✅ Corrigido
**Data**: 2025-12-14
**Máquina Teste**: 305718 (atualmente em manutenção)
