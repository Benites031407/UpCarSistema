# Machine Information Feature

## Overview
Admins can now view detailed statistics and information about each machine by clicking the "Ver Informações" button in the Machine Registry.

## Features Added

### Backend
1. **New Endpoint**: `GET /api/admin/machines/:id/stats`
   - Returns comprehensive statistics for a specific machine
   - Includes usage data, revenue, maintenance info, energy consumption, and recent sessions

### Frontend
1. **MachineInfoModal Component**: A detailed modal displaying:
   - **Overview Cards**:
     - Total Activations
     - Total Revenue
     - Total Usage Time
   
   - **Usage Statistics**:
     - Average session duration
     - Utilization rate (percentage of available time used)
     - Average revenue per session
     - Price per minute
   
   - **Maintenance Information**:
     - Last cleaning date and days since
     - Current operating hours
     - Maintenance interval
     - Hours until next maintenance
     - Maintenance required alert
   
   - **Energy Consumption**:
     - Total kWh consumption
     - Average wattage (1200W for vacuum cleaners)
     - Estimated monthly cost (based on R$0.65/kWh)
   
   - **Usage by Day of Week**:
     - Visual bar chart showing sessions per day
     - Helps identify peak usage days
   
   - **Recent Sessions Table**:
     - Last 10 completed sessions
     - Shows user name, duration, cost, and date

2. **Updated MachineRegistryComponent**:
   - Added "Ver Informações" button (orange) for each machine
   - Opens the MachineInfoModal when clicked

## Data Displayed

### Machine Statistics Response
```json
{
  "machine": {
    "id": "uuid",
    "code": "ABC123",
    "location": "Location Name",
    "status": "online",
    "pricePerMinute": 1.50,
    "maxDurationMinutes": 60,
    "createdAt": "2025-01-01T00:00:00.000Z"
  },
  "usage": {
    "totalActivations": 150,
    "totalUsageMinutes": 2250,
    "totalUsageHours": 37.5,
    "averageSessionDuration": 15,
    "utilizationRate": 25.5
  },
  "revenue": {
    "totalRevenue": 3375.00,
    "averageRevenuePerSession": 22.50
  },
  "maintenance": {
    "currentOperatingHours": 35,
    "maintenanceInterval": 100,
    "hoursUntilMaintenance": 65,
    "lastCleaning": "2025-01-15T10:00:00.000Z",
    "daysSinceLastCleaning": 13,
    "maintenanceRequired": false
  },
  "energy": {
    "totalKwhConsumption": 45.0,
    "averageWattage": 1200,
    "estimatedMonthlyCost": 29.25
  },
  "recentSessions": [...],
  "usageByDay": [...]
}
```

## Calculations

### Utilization Rate
```
Operating Hours Per Day = (End Time - Start Time) in hours
Days in Operation = Days since machine creation
Total Available Hours = Operating Hours Per Day × Days in Operation
Utilization Rate = (Total Usage Hours / Total Available Hours) × 100
```

### Energy Consumption
```
Total Usage Hours = Total Usage Minutes / 60
Total Wattage Consumption = Average Wattage × Total Usage Hours
Total kWh Consumption = Total Wattage Consumption / 1000
Estimated Cost = Total kWh × R$0.65 (average electricity rate)
```

### Last Cleaning Date
Currently simulated based on maintenance resets. In production, this would be tracked through maintenance records.

## UI Design

### Modal Layout
- **Header**: Orange gradient with machine code
- **Overview Cards**: Three colored cards (blue, green, purple) for key metrics
- **Statistics Sections**: White cards with borders for organized information
- **Usage Chart**: Visual bar chart for day-of-week usage
- **Recent Sessions Table**: Scrollable table with latest activity
- **Footer**: Close button with orange gradient

### Color Scheme
- Primary: Orange (#f97316) - matches UpCar branding
- Success: Green - for revenue
- Info: Blue - for activations
- Warning: Purple - for time metrics
- Alert: Red - for maintenance warnings

## Testing

### Manual Testing Steps
1. Navigate to Admin Dashboard → Registro de Máquinas
2. Find any machine in the list
3. Click the "Ver Informações" button (orange button with info icon)
4. Verify the modal opens with all statistics
5. Check that all sections display correctly:
   - Overview cards show numbers
   - Usage statistics are calculated
   - Maintenance info is accurate
   - Energy consumption is displayed
   - Day-of-week chart renders
   - Recent sessions table shows data
6. Click "Fechar" to close the modal

### API Testing
```bash
# Get machine statistics
curl -X GET http://localhost:3001/api/admin/machines/MACHINE_ID/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Future Enhancements

1. **Real Maintenance Tracking**:
   - Add maintenance_logs table
   - Track actual cleaning dates and maintenance activities
   - Record maintenance performed by which admin

2. **Export Functionality**:
   - Export statistics to PDF
   - Export to Excel/CSV
   - Generate reports for specific date ranges

3. **Comparison View**:
   - Compare multiple machines side-by-side
   - Identify best and worst performing machines
   - Benchmark against averages

4. **Real-time Energy Monitoring**:
   - Integrate with IoT controllers for actual wattage readings
   - Track power consumption in real-time
   - Alert on unusual consumption patterns

5. **Predictive Maintenance**:
   - ML-based prediction of maintenance needs
   - Alert before issues occur
   - Optimize maintenance schedules

6. **Customer Feedback**:
   - Track customer ratings per machine
   - Identify machines with issues
   - Correlate feedback with maintenance

## Notes
- All monetary values are in BRL (Brazilian Real)
- Energy consumption is estimated based on average vacuum cleaner wattage (1200W)
- Electricity cost is estimated at R$0.65 per kWh (average Brazilian rate)
- Last cleaning date is currently simulated; implement proper maintenance tracking for production
- The modal is fully responsive and works on mobile devices
