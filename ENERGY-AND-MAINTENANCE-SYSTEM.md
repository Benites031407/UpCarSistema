# Energy Consumption and Maintenance Tracking System

## Overview
This document explains how energy consumption is calculated and how the maintenance/cleaning system works in the UpCar Aspiradores platform.

## Energy Consumption System

### Configuration
Each machine has two configurable energy-related fields:

1. **Power Consumption (Watts)**: The actual power rating of the vacuum cleaner
   - Default: 1200W (typical vacuum cleaner)
   - Range: 1-10,000 watts
   - Set by admin when creating/editing a machine

2. **kWh Rate (R$/kWh)**: The cost of electricity per kilowatt-hour
   - Default: R$0.65/kWh (average Brazilian rate)
   - Range: R$0.01-10.00/kWh
   - Can vary by location/contract

### How Total Consumption is Calculated

```
Total Usage Minutes = Sum of all completed session durations
Total Usage Hours = Total Usage Minutes / 60

Total Wattage Consumption = Power Consumption (W) × Total Usage Hours
Total kWh Consumption = Total Wattage Consumption / 1000

Total Energy Cost = Total kWh Consumption × kWh Rate
```

### Example Calculation
```
Machine: 1200W vacuum cleaner
kWh Rate: R$0.65/kWh
Total Usage: 150 sessions × 15 minutes average = 2,250 minutes = 37.5 hours

Calculation:
- Total Wattage = 1200W × 37.5h = 45,000 Wh
- Total kWh = 45,000 / 1000 = 45 kWh
- Total Cost = 45 kWh × R$0.65 = R$29.25
```

### Where Admins Set These Values

#### During Machine Creation:
1. Navigate to Admin Dashboard → Registro de Máquinas
2. Click "Adicionar Nova Máquina"
3. Fill in the form including:
   - **Consumo de Energia (Watts)**: Enter the machine's power rating
   - **Tarifa de Energia (R$/kWh)**: Enter the local electricity rate
4. Click "Registrar Máquina"

#### Editing Existing Machines:
1. Find the machine in the registry
2. Click "Editar"
3. Update the energy fields:
   - **Consumo de Energia (Watts)**
   - **Tarifa de Energia (R$/kWh)**
4. Click "Atualizar Máquina"

### Viewing Energy Statistics
Click "Ver Informações" on any machine to see:
- Total kWh consumed
- Machine's power rating
- Current kWh rate
- Total energy cost calculated

## Maintenance and Cleaning System

### Database Structure

#### Machines Table - New Fields:
- `power_consumption_watts`: Machine's power rating
- `kwh_rate`: Electricity cost per kWh
- `last_cleaning_date`: Timestamp of last cleaning
- `last_maintenance_date`: Timestamp of last maintenance (any type)

#### Maintenance Logs Table:
Tracks all maintenance activities with:
- `machine_id`: Which machine was serviced
- `type`: Type of maintenance (cleaning, repair, inspection, part_replacement, other)
- `performed_by`: Admin user who performed the maintenance
- `description`: Details about what was done
- `cost`: Cost of the maintenance
- `parts_replaced`: Array of parts that were replaced
- `next_maintenance_due`: When next maintenance is recommended
- `created_at`: When the maintenance was performed

### How Cleaning Works

#### Logging a Cleaning:
```bash
POST /api/admin/machines/:id/maintenance
{
  "type": "cleaning",
  "description": "Regular cleaning and filter replacement",
  "cost": 50.00,
  "partsReplaced": ["filter", "dust bag"]
}
```

#### What Happens When Cleaning is Logged:
1. **Creates Maintenance Log**: Records the cleaning activity
2. **Updates Machine**:
   - Sets `last_cleaning_date` to current timestamp
   - Sets `last_maintenance_date` to current timestamp
   - **Resets `current_operating_hours` to 0** (maintenance counter reset)
   - Sets machine status to 'online' (if it was in maintenance mode)

#### Automatic Effects:
- Machine's operating hours counter resets to 0
- "Days since last cleaning" calculation uses the actual cleaning date
- Maintenance required alert is cleared
- Machine becomes available for use again

### Maintenance Types

1. **Cleaning** (`cleaning`):
   - Regular cleaning and sanitization
   - Resets operating hours counter
   - Updates last cleaning date

2. **Repair** (`repair`):
   - Fixing broken components
   - Updates last maintenance date
   - Does NOT reset operating hours

3. **Inspection** (`inspection`):
   - Routine checks
   - Updates last maintenance date
   - Does NOT reset operating hours

4. **Part Replacement** (`part_replacement`):
   - Replacing worn parts
   - Updates last maintenance date
   - Can reset operating hours if major service

5. **Other** (`other`):
   - Any other maintenance activity
   - Updates last maintenance date

### API Endpoints

#### Log Maintenance
```bash
POST /api/admin/machines/:id/maintenance
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "type": "cleaning",
  "description": "Monthly deep cleaning",
  "cost": 75.50,
  "partsReplaced": ["filter", "brush roll"]
}
```

#### Get Maintenance History
```bash
GET /api/admin/machines/:id/maintenance
Authorization: Bearer <admin_token>
```

Response:
```json
[
  {
    "id": "uuid",
    "type": "cleaning",
    "performedBy": "Admin Name",
    "description": "Monthly deep cleaning",
    "cost": 75.50,
    "partsReplaced": ["filter", "brush roll"],
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
]
```

### Viewing Maintenance Information

In the "Ver Informações" modal, admins can see:

#### Maintenance Section:
- **Última Limpeza**: Date and time of last cleaning
- **Dias desde última limpeza**: Days elapsed since cleaning
- **Horas de Operação**: Current operating hours
- **Intervalo de Manutenção**: Hours between required maintenance
- **Horas até Manutenção**: Hours remaining until maintenance needed
- **Alert**: Red warning if maintenance is required

#### Maintenance Logs Section:
- List of all maintenance activities
- Type, description, cost, parts replaced
- Date performed
- Chronological history

### Maintenance Workflow

1. **Machine Reaches Maintenance Threshold**:
   - `current_operating_hours >= maintenance_interval`
   - Machine shows "Manutenção Necessária" alert
   - Admin is notified

2. **Admin Performs Maintenance**:
   - Physical cleaning/repair of the machine
   - Admin logs the activity via API or future UI

3. **System Updates**:
   - Records maintenance log
   - Updates last cleaning/maintenance dates
   - Resets operating hours (for cleaning)
   - Machine returns to service

4. **Tracking**:
   - All activities are logged
   - History is preserved
   - Costs are tracked
   - Parts inventory can be monitored

### Future Enhancements

1. **UI for Logging Maintenance**:
   - Add "Registrar Manutenção" button in machine info modal
   - Form to select type, add description, cost, parts
   - Immediate update of machine status

2. **Maintenance Scheduling**:
   - Set `next_maintenance_due` dates
   - Automatic reminders
   - Calendar view of scheduled maintenance

3. **Parts Inventory**:
   - Track parts used
   - Alert when parts are low
   - Automatic reorder suggestions

4. **Maintenance Reports**:
   - Monthly maintenance costs
   - Most common issues
   - Machine reliability metrics
   - Cost per machine analysis

5. **Predictive Maintenance**:
   - ML-based failure prediction
   - Optimize maintenance schedules
   - Reduce downtime

## Benefits

### Energy Tracking:
- **Accurate Costs**: Real power consumption data
- **Location-Specific**: Different electricity rates per location
- **Profitability Analysis**: Compare energy costs vs revenue
- **Optimization**: Identify high-consumption machines

### Maintenance Tracking:
- **Complete History**: All maintenance activities logged
- **Cost Control**: Track maintenance expenses
- **Compliance**: Proof of regular maintenance
- **Reliability**: Identify problematic machines
- **Planning**: Schedule maintenance proactively

## Testing

### Test Energy Configuration:
1. Create a machine with custom power (e.g., 1500W)
2. Set custom kWh rate (e.g., R$0.75/kWh)
3. Complete some sessions
4. View machine info to see calculated consumption

### Test Maintenance Logging:
```bash
# Log a cleaning
curl -X POST http://localhost:3001/api/admin/machines/MACHINE_ID/maintenance \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "cleaning",
    "description": "Test cleaning",
    "cost": 50.00
  }'

# View maintenance history
curl -X GET http://localhost:3001/api/admin/machines/MACHINE_ID/maintenance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Verify Cleaning Effects:
1. Note machine's current operating hours
2. Log a cleaning via API
3. Check machine info - operating hours should be 0
4. Last cleaning date should be updated
5. Maintenance required alert should be cleared

## Notes

- Energy consumption is calculated based on actual usage time
- Power ratings should match the machine's specifications
- kWh rates should reflect actual electricity costs
- Cleaning automatically resets the maintenance counter
- All maintenance activities are permanently logged
- Costs are tracked for accounting purposes
- The system supports multiple maintenance types for flexibility
