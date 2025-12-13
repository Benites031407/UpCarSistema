# 🔢 Machine Code Validation

## Overview

Machine codes are now restricted to **numeric values only** with a **maximum length of 6 digits**. This ensures consistency and simplifies machine identification across the system.

---

## Validation Rules

### Format Requirements

- **Type:** Numbers only (0-9)
- **Length:** 1 to 6 digits
- **Examples:**
  - ✅ Valid: `1`, `42`, `123`, `1234`, `12345`, `123456`
  - ❌ Invalid: `ABC123`, `WASH001`, `12-34`, `1234567` (too long)

### Regular Expression

```regex
^[0-9]{1,6}$
```

---

## Implementation

### Frontend Validation

**Input Field:**
```tsx
<input
  type="text"
  value={formData.code}
  onChange={(e) => {
    // Remove non-digits and limit to 6 characters
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setFormData({ ...formData, code: value });
  }}
  pattern="[0-9]{1,6}"
  maxLength={6}
  placeholder="Ex: 123456"
  required
/>
```

**Features:**
- Automatically removes non-numeric characters as user types
- Limits input to 6 characters
- HTML5 pattern validation
- Helpful placeholder and description

### Backend Validation

**API Validation:**
```typescript
router.post('/machines', [
  body('code')
    .isString()
    .matches(/^[0-9]{1,6}$/)
    .withMessage('Code must be 1-6 digits only'),
  // ... other validations
]);
```

**Error Response:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "code",
      "message": "Code must be 1-6 digits only"
    }
  ]
}
```

### Database Constraint

**Schema:**
```sql
ALTER TABLE machines 
ALTER COLUMN code TYPE VARCHAR(6);

ALTER TABLE machines 
ADD CONSTRAINT machines_code_format_check 
CHECK (code ~ '^[0-9]{1,6}$');
```

**Benefits:**
- Enforces validation at database level
- Prevents invalid data even from direct SQL
- Reduces storage (VARCHAR(6) instead of VARCHAR(50))

---

## Migration

### Existing Machines

Machines with non-numeric codes were automatically updated:

```sql
-- Before migration
UPC001 → 000001
UPC034 → 000034

-- After migration
✅ All codes are numeric
✅ All codes are 6 digits or less
```

### Migration Script

```sql
-- File: 007_update_machine_code_constraint.sql

-- Update existing machines to numeric format
UPDATE machines SET code = '000001' WHERE code = 'UPC001';
UPDATE machines SET code = '000034' WHERE code = 'UPC034';

-- Add constraint
ALTER TABLE machines 
ADD CONSTRAINT machines_code_format_check 
CHECK (code ~ '^[0-9]{1,6}$');

-- Reduce column size
ALTER TABLE machines 
ALTER COLUMN code TYPE VARCHAR(6);
```

---

## Usage Examples

### Creating a Machine

**Valid Request:**
```bash
POST /api/admin/machines
Content-Type: application/json

{
  "code": "123456",
  "location": "Shopping Center",
  "controllerId": "pi-controller-01",
  ...
}
```

**Response:**
```json
{
  "id": "uuid",
  "code": "123456",
  "location": "Shopping Center",
  ...
}
```

### Invalid Requests

**Non-numeric code:**
```bash
{
  "code": "ABC123",
  ...
}
```
**Error:** `Code must be 1-6 digits only`

**Too long:**
```bash
{
  "code": "1234567",
  ...
}
```
**Error:** `Code must be 1-6 digits only`

**Empty:**
```bash
{
  "code": "",
  ...
}
```
**Error:** `Code must be 1-6 digits only`

---

## Code Formatting

### Leading Zeros

Leading zeros are **allowed** and **preserved**:

```
000001 → Valid (displays as "000001")
000034 → Valid (displays as "000034")
123456 → Valid (displays as "123456")
```

### Recommended Format

For consistency, consider using 6-digit codes with leading zeros:

```
Machine 1  → 000001
Machine 2  → 000002
Machine 10 → 000010
Machine 99 → 000099
```

**Benefits:**
- Consistent length
- Easy sorting
- Professional appearance
- Room for up to 999,999 machines

---

## QR Code Generation

Machine codes are used in QR code URLs:

```
Code: 123456
URL: https://upcar.com/machine/123456
QR Code: [Generated from URL]
```

**User Experience:**
- User scans QR code
- Redirected to: `/machine/123456`
- System looks up machine by code
- Activation page displayed

---

## Display

### Admin Dashboard

```
┌─────────────────────────────────┐
│ Código: 000001                  │
│ Local: Shopping Center          │
│ Status: Online                  │
└─────────────────────────────────┘
```

### User App

```
Aspirador #000001
Shopping Center - Piso 1
R$ 1,00/min
[Ativar Máquina]
```

### Reports

```
Relatório de Repasse
Máquina: 000001
Local: Shopping Center
Período: 01/12/2024 - 31/12/2024
```

---

## Validation Testing

### Test Cases

```typescript
// Valid codes
✅ "1"       → Pass
✅ "42"      → Pass
✅ "123"     → Pass
✅ "1234"    → Pass
✅ "12345"   → Pass
✅ "123456"  → Pass
✅ "000001"  → Pass

// Invalid codes
❌ "ABC123"  → Fail (contains letters)
❌ "12-34"   → Fail (contains hyphen)
❌ "1234567" → Fail (too long)
❌ ""        → Fail (empty)
❌ "WASH01"  → Fail (contains letters)
```

### Database Test

```sql
-- Should succeed
INSERT INTO machines (code, ...) VALUES ('123456', ...);

-- Should fail with constraint violation
INSERT INTO machines (code, ...) VALUES ('ABC123', ...);
-- ERROR: new row violates check constraint "machines_code_format_check"
```

---

## Best Practices

### For Admins

1. **Use Sequential Numbers**
   - Start from 000001
   - Increment for each new machine
   - Easy to track and manage

2. **Document Assignments**
   - Keep a record of which codes are assigned
   - Note location and installation date
   - Track decommissioned machines

3. **Reserve Ranges**
   - 000001-099999: Regular machines
   - 100000-199999: Test machines
   - 200000-299999: Special locations

### For Developers

1. **Always Validate**
   - Frontend: Immediate feedback
   - Backend: Security layer
   - Database: Final enforcement

2. **Handle Errors Gracefully**
   - Clear error messages
   - Suggest valid format
   - Don't expose internal details

3. **Test Edge Cases**
   - Minimum length (1 digit)
   - Maximum length (6 digits)
   - Leading zeros
   - Special characters

---

## Troubleshooting

### Code Not Accepted

**Problem:** Form rejects valid-looking code

**Check:**
1. Only numbers (no letters, spaces, or symbols)
2. Maximum 6 digits
3. Not empty

**Solution:**
```
Invalid: "WASH-001" → Valid: "001"
Invalid: "1234567"  → Valid: "123456"
Invalid: "ABC"      → Valid: "123"
```

### Database Error

**Problem:** `machines_code_format_check` constraint violation

**Cause:** Trying to insert non-numeric or too-long code

**Solution:**
```sql
-- Check current value
SELECT code FROM machines WHERE id = 'uuid';

-- Update to valid format
UPDATE machines SET code = '123456' WHERE id = 'uuid';
```

### Existing Machine Update

**Problem:** Can't update old machine with alphanumeric code

**Cause:** Code field is now read-only after creation

**Solution:**
- Codes cannot be changed after creation
- This prevents breaking QR codes and references
- Create new machine if code change is absolutely necessary

---

## API Reference

### Create Machine

```bash
POST /api/admin/machines
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "code": "123456",
  "location": "Shopping Center",
  "controllerId": "pi-controller-01",
  "operatingHours": {
    "start": "08:00",
    "end": "18:00"
  },
  "maintenanceInterval": 100
}
```

### Validation Errors

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "code",
      "value": "ABC123",
      "message": "Code must be 1-6 digits only",
      "location": "body"
    }
  ]
}
```

---

## Summary

✅ **Numeric only** - No letters or special characters  
✅ **1-6 digits** - Flexible length, maximum 6  
✅ **Frontend validation** - Immediate feedback  
✅ **Backend validation** - Security layer  
✅ **Database constraint** - Final enforcement  
✅ **Leading zeros** - Allowed and preserved  
✅ **Existing machines** - Automatically migrated  

The numeric-only format simplifies machine identification, improves data consistency, and provides a clean, professional appearance across the system.
