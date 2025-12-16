# 💰 Location Owner Quota (Cota) Feature

## Overview

The **Cota** (quota) feature allows admins to configure the revenue sharing percentage for each machine. This determines how much of the net revenue goes to the location owner (proprietário do local) versus the commercial point (ponto comercial).

---

## How It Works

### Revenue Distribution

For each machine, the revenue is split as follows:

```
Total Revenue (100%)
    ↓
Operational Fees (10%) → System costs
    ↓
Net Revenue (90%)
    ↓
    ├─→ Location Owner (Cota %) → Owner of the location
    └─→ Commercial Point (100 - Cota %) → UpCar/Machine operator
```

### Example Calculation

**Machine Configuration:**
- Location Owner Quota (Cota): **60%**
- Total Revenue: **R$ 1,000.00**

**Breakdown:**
```
Total Revenue:           R$ 1,000.00
Operational Fees (10%):  R$   100.00
─────────────────────────────────────
Net Revenue:             R$   900.00

Location Owner (60%):    R$   540.00
Commercial Point (40%):  R$   360.00
```

---

## Configuration

### Default Value

- **50%** - Equal split between location owner and commercial point

### Configurable Range

- **Minimum:** 0% (all revenue to commercial point)
- **Maximum:** 100% (all revenue to location owner)
- **Precision:** 0.01% (two decimal places)

### Setting the Quota

**Via Admin Dashboard:**

1. Go to **Admin Dashboard** → **Máquinas** tab
2. Click **"Editar"** on the machine you want to configure
3. Find the **"Cota do Proprietário (%)"** field
4. Enter the percentage (0-100)
5. Click **"Salvar"**

**Via API:**

```bash
PUT /api/admin/machines/:id
Content-Type: application/json
Authorization: Bearer <admin-token>

{
  "locationOwnerQuota": 60.00
}
```

**Via SQL:**

```sql
UPDATE machines 
SET location_owner_quota = 60.00 
WHERE code = 'WASH001';
```

---

## PDF Reports (Repasse)

The quota is automatically used when generating revenue sharing PDFs.

### Report Sections

**1. Machine Information**
- Machine code
- Location address
- Reference period

**2. Revenue Summary**
- Total revenue
- Operational fees
- Net revenue

**3. Repasse Calculation** (Uses the configured quota)
```
Ponto Comercial – Valor:        R$ XXX.XX  (100 - Cota)%
Ponto Comercial – Custódia:     R$ XXX.XX
Ponto Comercial – A Pagar:      R$ XXX.XX

Proprietário – Valor:           R$ XXX.XX  (Cota)%
Proprietário – Custódia:        R$ XXX.XX
Proprietário – A Pagar:         R$ XXX.XX
```

### Generating Reports

**Individual Machine Report:**
```bash
GET /api/admin/reports/export?type=machine&machineId=<uuid>&startDate=2024-01-01&endDate=2024-01-31
```

**All Machines (ZIP):**
```bash
GET /api/admin/reports/export-all?startDate=2024-01-01&endDate=2024-01-31
```

---

## Database Schema

### Migration

```sql
-- Migration: 006_add_location_owner_quota.sql
ALTER TABLE machines 
ADD COLUMN location_owner_quota DECIMAL(5,2) DEFAULT 50.00 NOT NULL
CHECK (location_owner_quota >= 0 AND location_owner_quota <= 100);
```

### Table Structure

```sql
CREATE TABLE machines (
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  location VARCHAR(255) NOT NULL,
  
  -- Revenue sharing
  location_owner_quota DECIMAL(5,2) DEFAULT 50.00 NOT NULL,
  
  -- Other fields...
  
  CONSTRAINT machines_quota_check 
    CHECK (location_owner_quota >= 0 AND location_owner_quota <= 100)
);
```

---

## API Reference

### Get Machine (includes quota)

```bash
GET /api/admin/machines/:id
```

**Response:**
```json
{
  "id": "uuid",
  "code": "WASH001",
  "location": "Shopping Center - Floor 1",
  "locationOwnerQuota": 60.00,
  "pricePerMinute": 1.00,
  ...
}
```

### Update Machine Quota

```bash
PUT /api/admin/machines/:id
Content-Type: application/json

{
  "locationOwnerQuota": 65.00
}
```

**Response:**
```json
{
  "machine": {
    "id": "uuid",
    "code": "WASH001",
    "locationOwnerQuota": 65.00,
    ...
  }
}
```

---

## Frontend Implementation

### Machine Registry Form

The admin form includes a new field:

```tsx
<div>
  <label>Cota do Proprietário (%)</label>
  <input
    type="number"
    step="0.01"
    min="0"
    max="100"
    value={formData.locationOwnerQuota}
    onChange={(e) => setFormData({ 
      ...formData, 
      locationOwnerQuota: Number(e.target.value) 
    })}
  />
  <p>Percentual da receita líquida para o proprietário do local (0-100%)</p>
</div>
```

### Machine Interface

```typescript
interface Machine {
  id: string;
  code: string;
  location: string;
  locationOwnerQuota: number; // 0-100
  // ... other fields
}
```

---

## Use Cases

### Scenario 1: Shopping Mall Partnership

**Situation:** Machine installed in a high-traffic shopping mall

**Configuration:**
- Location Owner Quota: **70%**
- Reasoning: High rent, premium location

**Result:**
- Mall owner receives 70% of net revenue
- UpCar receives 30% of net revenue

### Scenario 2: Small Business Partnership

**Situation:** Machine in a small laundromat

**Configuration:**
- Location Owner Quota: **40%**
- Reasoning: Lower traffic, UpCar provides more support

**Result:**
- Laundromat owner receives 40% of net revenue
- UpCar receives 60% of net revenue

### Scenario 3: UpCar-Owned Location

**Situation:** Machine in UpCar's own facility

**Configuration:**
- Location Owner Quota: **0%**
- Reasoning: No external location owner

**Result:**
- All net revenue goes to UpCar

### Scenario 4: Equal Partnership

**Situation:** Standard partnership agreement

**Configuration:**
- Location Owner Quota: **50%** (default)
- Reasoning: Fair 50/50 split

**Result:**
- Equal distribution of net revenue

---

## Business Logic

### Calculation Flow

```typescript
// 1. Get machine configuration
const machine = await getMachine(machineId);
const locationOwnerQuotaPercent = machine.locationOwnerQuota; // e.g., 60.00

// 2. Convert to decimal
const locationOwnerQuota = locationOwnerQuotaPercent / 100; // 0.60
const commercialPointQuota = 1 - locationOwnerQuota; // 0.40

// 3. Calculate revenue
const totalRevenue = 1000.00;
const operationalFees = totalRevenue * 0.10; // 100.00
const netRevenue = totalRevenue - operationalFees; // 900.00

// 4. Split revenue
const ownerValue = netRevenue * locationOwnerQuota; // 540.00
const commercialPointValue = netRevenue * commercialPointQuota; // 360.00
```

### Backend Implementation

```typescript
// packages/backend/src/repositories/reports.ts
const locationOwnerQuotaPercent = parseFloat(machine.location_owner_quota) || 50.00;
const locationOwnerQuota = locationOwnerQuotaPercent / 100;
const commercialPointQuota = 1 - locationOwnerQuota;

const quotas = {
  commercialPoint: commercialPointQuota,
  owner: locationOwnerQuota,
  operationalFees: 0.10,
};

const ownerValue = netRevenue * quotas.owner;
const commercialPointValue = netRevenue * quotas.commercialPoint;
```

---

## Validation

### Input Validation

**Frontend:**
```typescript
// HTML5 validation
<input
  type="number"
  min="0"
  max="100"
  step="0.01"
  required
/>
```

**Backend:**
```typescript
// Database constraint
CHECK (location_owner_quota >= 0 AND location_owner_quota <= 100)
```

### Error Handling

**Invalid quota (< 0 or > 100):**
```json
{
  "error": "Location owner quota must be between 0 and 100"
}
```

**Missing quota (uses default):**
```typescript
locationOwnerQuota: row.location_owner_quota || 50.00
```

---

## Migration Guide

### For Existing Machines

All existing machines automatically receive the default quota of **50%**.

**To update existing machines:**

```sql
-- Set specific quota for a machine
UPDATE machines 
SET location_owner_quota = 60.00 
WHERE code = 'WASH001';

-- Set quota for all machines in a location
UPDATE machines 
SET location_owner_quota = 70.00 
WHERE location LIKE '%Shopping Center%';

-- Set quota for multiple machines
UPDATE machines 
SET location_owner_quota = 55.00 
WHERE code IN ('WASH001', 'WASH002', 'WASH003');
```

---

## Reporting & Analytics

### View Quota Distribution

```sql
SELECT 
  code,
  location,
  location_owner_quota,
  CASE 
    WHEN location_owner_quota < 40 THEN 'Low (UpCar favored)'
    WHEN location_owner_quota BETWEEN 40 AND 60 THEN 'Balanced'
    ELSE 'High (Owner favored)'
  END as quota_category
FROM machines
ORDER BY location_owner_quota DESC;
```

### Average Quota by Location Type

```sql
SELECT 
  CASE 
    WHEN location LIKE '%Shopping%' THEN 'Shopping Mall'
    WHEN location LIKE '%Laundromat%' THEN 'Laundromat'
    ELSE 'Other'
  END as location_type,
  AVG(location_owner_quota) as avg_quota,
  COUNT(*) as machine_count
FROM machines
GROUP BY location_type;
```

---

## Best Practices

### Setting Quotas

1. **Consider Location Value**
   - High-traffic areas → Higher quota for owner
   - Low-traffic areas → Lower quota for owner

2. **Factor in Costs**
   - High rent → Higher quota for owner
   - UpCar provides maintenance → Lower quota for owner

3. **Market Competition**
   - Competitive locations → Higher quota to attract partners
   - Exclusive locations → Lower quota acceptable

4. **Document Agreements**
   - Always document the agreed quota in contracts
   - Review and adjust periodically

### Transparency

- Share PDF reports with location owners monthly
- Clearly show the quota percentage in reports
- Explain the calculation methodology

### Regular Review

- Review quotas quarterly
- Adjust based on performance
- Renegotiate if circumstances change

---

## Troubleshooting

### Quota Not Showing in PDF

**Check:**
1. Database has the quota value
2. Backend is reading the field correctly
3. PDF generator is using machine's quota

```sql
SELECT code, location_owner_quota FROM machines WHERE code = 'WASH001';
```

### Incorrect Calculations

**Verify:**
1. Quota is stored as percentage (0-100), not decimal (0-1)
2. Conversion happens in backend: `quota / 100`
3. Net revenue calculation excludes operational fees

### Default Quota Not Applied

**Solution:**
```sql
-- Set default for machines with NULL quota
UPDATE machines 
SET location_owner_quota = 50.00 
WHERE location_owner_quota IS NULL;
```

---

## Summary

✅ **Flexible revenue sharing** - Configure per machine  
✅ **Easy to use** - Simple percentage input (0-100%)  
✅ **Automatic calculations** - Used in PDF reports  
✅ **Database validated** - Constraints ensure valid values  
✅ **Default value** - 50% for fair partnerships  
✅ **Transparent** - Clear breakdown in reports  

The quota system provides flexibility to create custom partnership agreements while maintaining clear, automated revenue distribution calculations.
