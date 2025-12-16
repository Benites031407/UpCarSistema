# 🔄 Renomeação do Sistema: Machine Rental → UpCar-Aspiradores

## Resumo

O sistema foi renomeado de "Machine Rental System" para "UpCar-Aspiradores" em todos os arquivos e configurações.

## 📋 Mudanças Realizadas

### 1. **Nomes de Pacotes**
| Antes | Depois |
|-------|--------|
| `machine-rental-system` | `upcar-aspiradores` |
| `@machine-rental/frontend` | `@upcar-aspiradores/frontend` |
| `@machine-rental/backend` | `@upcar-aspiradores/backend` |
| `@machine-rental/iot-controller` | `@upcar-aspiradores/iot-controller` |

**Arquivos atualizados:**
- `package.json` (raiz)
- `packages/frontend/package.json`
- `packages/backend/package.json`
- `packages/iot-controller/package.json`

### 2. **Banco de Dados**
| Antes | Depois |
|-------|--------|
| `machine_rental` | `upcar_aspiradores` |
| `machine_rental_test` | `upcar_aspiradores_test` |

**Arquivos atualizados:**
- `packages/backend/.env`
- `.env.prod.example`
- `.github/workflows/deploy.yml`
- `RASPBERRY-PI-SETUP.md`

### 3. **Configurações Redis**
| Antes | Depois |
|-------|--------|
| `machine_rental:` | `upcar_aspiradores:` |

**Arquivo:** `.env.prod.example`

### 4. **JWT Configuration**
| Antes | Depois |
|-------|--------|
| `machine-rental-system` | `upcar-aspiradores` |
| `machine-rental-users` | `upcar-aspiradores-users` |

**Arquivo:** `.env.prod.example`

### 5. **MQTT Client ID**
| Antes | Depois |
|-------|--------|
| `machine-rental-backend` | `upcar-aspiradores-backend` |

**Arquivo:** `.env.prod.example`

### 6. **Health Check Service Name**
| Antes | Depois |
|-------|--------|
| `machine-rental-backend` | `upcar-aspiradores-backend` |

**Arquivo:** `packages/backend/src/index.ts`

### 7. **Mensagens WhatsApp**
| Antes | Depois |
|-------|--------|
| `Test message from Machine Rental System` | `Mensagem de teste do UpCar-Aspiradores` |
| `Machine Rental System is ready` | `Sistema UpCar-Aspiradores está pronto` |

**Arquivos atualizados:**
- `test-whatsapp.ts`
- `test-whatsapp-curl.sh`
- `setup-whatsapp.sh`
- `setup-whatsapp.ps1`
- `WHATSAPP-API-SETUP.md`

### 8. **Documentação**
| Antes | Depois |
|-------|--------|
| `Machine Rental System` | `UpCar-Aspiradores` |

**Arquivos atualizados:**
- `WHATSAPP-API-SETUP.md`
- `.env.prod.example`
- `.github/workflows/deploy.yml`

### 9. **Testes Frontend**
| Antes | Depois |
|-------|--------|
| `expect(screen.getByText('Machine Rental'))` | `expect(screen.getByText('UpCar Aspiradores'))` |

**Arquivo:** `packages/frontend/src/App.test.tsx`

### 10. **Email Configuration**
| Antes | Depois |
|-------|--------|
| `Machine Rental System <noreply@...>` | `UpCar Aspiradores <noreply@...>` |

**Arquivo:** `.env.prod.example`

## ⚠️ AÇÃO NECESSÁRIA: Migração do Banco de Dados

O nome do banco de dados foi alterado de `machine_rental` para `upcar_aspiradores`. Você precisa:

### Opção 1: Renomear o Banco Existente (Recomendado)

```sql
-- Conectar ao PostgreSQL como superusuário
psql -U postgres

-- Desconectar todos os usuários do banco antigo
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'machine_rental'
  AND pid <> pg_backend_pid();

-- Renomear o banco de dados
ALTER DATABASE machine_rental RENAME TO upcar_aspiradores;

-- Verificar
\l
```

### Opção 2: Criar Novo Banco e Migrar Dados

```bash
# Fazer backup do banco antigo
pg_dump -U postgres machine_rental > backup_machine_rental.sql

# Criar novo banco
createdb -U postgres upcar_aspiradores

# Restaurar dados
psql -U postgres upcar_aspiradores < backup_machine_rental.sql
```

### Opção 3: Apenas Criar Novo Banco (Desenvolvimento)

```bash
# Se você está em desenvolvimento e não precisa dos dados antigos
createdb -U postgres upcar_aspiradores

# Rodar migrations
cd packages/backend
npm run db:migrate
npm run db:seed
```

## 🔄 Reiniciar Serviços

Após a migração do banco de dados, reinicie os serviços:

```bash
# Parar serviços atuais
# (Os processos em execução serão reiniciados automaticamente pelo tsx watch)

# Ou reiniciar manualmente
cd packages/backend
npm run dev

cd packages/frontend
npm run dev
```

## ✅ Verificação

### 1. Verificar Health Check
```bash
curl http://localhost:3001/health
```

Resposta esperada:
```json
{
  "status": "healthy",
  "service": "upcar-aspiradores-backend",
  ...
}
```

### 2. Verificar Banco de Dados
```bash
psql -U postgres -l | grep upcar
```

Deve mostrar: `upcar_aspiradores`

### 3. Verificar WhatsApp
```bash
npx tsx test-whatsapp.ts
```

Mensagem esperada: "Mensagem de teste do UpCar-Aspiradores"

### 4. Verificar Frontend
Abra http://localhost:3000 e verifique se o nome "UpCar Aspiradores" aparece corretamente.

## 📊 Estatísticas

- **Arquivos modificados**: 15+
- **Nomes de pacotes atualizados**: 4
- **Configurações de banco atualizadas**: 4
- **Mensagens traduzidas**: 10+
- **Testes atualizados**: 2+

## 🎯 Checklist de Migração

- [x] Atualizar nomes de pacotes
- [x] Atualizar configurações de banco de dados
- [x] Atualizar mensagens WhatsApp
- [x] Atualizar health check
- [x] Atualizar documentação
- [x] Atualizar testes
- [ ] **Migrar banco de dados** (VOCÊ PRECISA FAZER ISSO)
- [ ] Reiniciar serviços
- [ ] Verificar funcionamento
- [ ] Atualizar produção (quando aplicável)

## 🚨 Importante

1. **Banco de Dados**: O backend não vai iniciar corretamente até você renomear/criar o banco `upcar_aspiradores`

2. **Workspaces**: Os nomes dos workspaces mudaram. Se você tiver problemas, rode:
   ```bash
   npm install
   ```

3. **Cache**: Limpe o cache se necessário:
   ```bash
   rm -rf node_modules
   rm -rf packages/*/node_modules
   npm install
   ```

4. **Produção**: Quando for fazer deploy em produção:
   - Faça backup do banco antes
   - Atualize as variáveis de ambiente
   - Teste em staging primeiro

## 📝 Próximos Passos

1. Execute a migração do banco de dados (escolha uma das opções acima)
2. Reinicie os serviços
3. Teste todas as funcionalidades
4. Atualize qualquer documentação adicional
5. Comunique a mudança para a equipe

---

**Status**: ✅ Renomeação completa (aguardando migração do banco)
**Data**: 2025-12-14
**Sistema**: UpCar-Aspiradores
