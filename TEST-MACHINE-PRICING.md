# Testing Machine Pricing Configuration

## Overview
Admins can now configure the price per minute and maximum usage duration for each machine.

## New Features Added

### Backend Changes
1. **Database Migration**: Added two new columns to the `machines` table:
   - `price_per_minute` (DECIMAL): Price charged per minute in BRL (default: 1.00, range: 0.01-100)
   - `max_duration_minutes` (INTEGER): Maximum allowed usage duration (default: 30, range: 1-120 minutes)

2. **API Updates**: 
   - POST `/api/admin/machines` - Now accepts `pricePerMinute` and `maxDurationMinutes`
   - PUT `/api/admin/machines/:id` - Can update pricing and duration settings
   - Validation ensures values are within acceptable ranges

3. **Type Definitions**: Updated Machine interface to include new fields

### Frontend Changes
1. **Machine Registry Form**: Added two new input fields:
   - **Preço por Minuto (R$)**: Number input with step 0.01, range 0.01-100
   - **Duração Máxima (minutos)**: Number input, range 1-120 minutes
   
2. **Form Behavior**:
   - Both fields are required when creating/editing machines
   - Default values: R$ 1.00 per minute, 30 minutes max duration
   - Fields are included in both create and edit operations
   - Helper text explains the purpose of each field

## Testing Steps

### 1. Create a New Machine with Custom Pricing
1. Navigate to Admin Dashboard → Registro de Máquinas
2. Click "Adicionar Nova Máquina"
3. Fill in the form:
   - Código da Máquina: (auto-generated)
   - Localização: "Test Location"
   - ID do Controlador: "TEST001"
   - Intervalo de Manutenção: 100
   - Horário de Início: 08:00
   - Horário de Término: 18:00
   - **Preço por Minuto (R$)**: 2.50
   - **Duração Máxima (minutos)**: 60
4. Click "Registrar Máquina"
5. Verify the machine appears in the list

### 2. Edit Existing Machine Pricing
1. Find a machine in the list
2. Click "Editar" button
3. Modify the pricing fields:
   - Change "Preço por Minuto" to 1.50
   - Change "Duração Máxima" to 45
4. Click "Atualizar Máquina"
5. Verify changes are saved

### 3. Verify Database
```sql
-- Check the new columns exist
SELECT code, location, price_per_minute, max_duration_minutes 
FROM machines;
```

### 4. API Testing
```bash
# Create machine with custom pricing
curl -X POST http://localhost:3001/api/admin/machines \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Test Location",
    "controllerId": "TEST002",
    "operatingHours": {
      "start": "08:00",
      "end": "18:00"
    },
    "maintenanceInterval": 100,
    "pricePerMinute": 3.00,
    "maxDurationMinutes": 90
  }'

# Update machine pricing
curl -X PUT http://localhost:3001/api/admin/machines/MACHINE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pricePerMinute": 2.00,
    "maxDurationMinutes": 60
  }'
```

## Expected Behavior

### Validation
- Price per minute must be between 0.01 and 100 BRL
- Max duration must be between 1 and 120 minutes
- Both fields are required when creating a machine
- Invalid values will show validation errors

### Default Values
- If not specified, price defaults to R$ 1.00 per minute
- If not specified, max duration defaults to 30 minutes

### User Impact
- These settings will affect how much users are charged
- The max duration will limit how long users can book a machine
- Existing machines will have default values applied by the migration

## Notes
- The migration automatically adds default values to existing machines
- All existing machines will have R$ 1.00/min and 30 min max duration
- Admins should review and update pricing for each machine as needed
- The pricing affects the cost calculation in the session creation flow
