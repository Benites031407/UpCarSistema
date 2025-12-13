# 📱 User-Facing Machine Code Updates

## Overview

Updated all user-facing interfaces to display numeric machine codes (1-6 digits) instead of alphanumeric codes like "ABC123".

---

## Changes Made

### 1. Home Page - Machine Code Input

**Before:**
```
Digite o código de 6 caracteres do aspirador
Placeholder: ABC123
Accepts: Letters and numbers
```

**After:**
```
Digite o código numérico do aspirador (até 6 dígitos)
Placeholder: 123456
Accepts: Numbers only (1-6 digits)
```

**Features:**
- Numeric keyboard on mobile devices (`inputMode="numeric"`)
- Automatically removes non-numeric characters
- Dynamic character counter: "3 dígitos" / "Digite apenas números"
- Button enabled as soon as user enters any digits
- Removed uppercase transformation

**Code:**
```tsx
<input
  type="text"
  inputMode="numeric"
  value={machineCode}
  onChange={(e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setMachineCode(value);
    setError('');
  }}
  placeholder="123456"
  maxLength={6}
/>
```

### 2. Account Page - Session History

**Before:**
```
Aspirador [last 6 chars of UUID]
Example: "Aspirador 7a3f2b"
```

**After:**
```
Aspirador #123456
Location: Shopping Center
Example: "Aspirador #000001"
```

**Features:**
- Shows actual machine code with # prefix
- Displays machine location below
- Falls back to UUID if code not available
- More informative session details

**Display:**
```
15 minutos • Aspirador #000001
12/12/2024 • Shopping Center • PIX
```

### 3. Backend - Session Data Enhancement

**Database Query:**
```sql
SELECT 
  us.*,
  m.code as machine_code,
  m.location as machine_location
FROM usage_sessions us
LEFT JOIN machines m ON us.machine_id = m.id
WHERE us.user_id = $1
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "machineId": "uuid",
      "machineCode": "000001",
      "machineLocation": "Shopping Center",
      "duration": 15,
      "cost": 15.00,
      "status": "completed"
    }
  ]
}
```

---

## User Experience Improvements

### Mobile Experience

**Numeric Keyboard:**
- `inputMode="numeric"` triggers numeric keyboard on mobile
- Faster input for users
- Reduces errors

**Visual Feedback:**
```
Empty: "Digite apenas números"
1 digit: "1 dígito"
3 digits: "3 dígitos"
6 digits: "6 dígitos"
```

### Clarity

**Old Format:**
- "ABC123" - Could be confusing
- Mixed case sensitivity
- Harder to communicate verbally

**New Format:**
- "123456" - Clear and simple
- No case sensitivity issues
- Easy to read and communicate

### Session History

**Enhanced Information:**
```
┌─────────────────────────────────────┐
│ 🔧 15 minutos • Aspirador #000001   │
│ 12/12/2024 • Shopping Center • PIX │
│                         R$ 15,00 ✓  │
└─────────────────────────────────────┘
```

**Benefits:**
- Know which machine was used
- See location for reference
- Better record keeping

---

## Examples

### Valid Machine Codes

```
1       → "Aspirador #1"
42      → "Aspirador #42"
123     → "Aspirador #123"
1234    → "Aspirador #1234"
12345   → "Aspirador #12345"
123456  → "Aspirador #123456"
000001  → "Aspirador #000001"
```

### User Flow

1. **User scans QR code or enters code manually**
   ```
   Input: 123456
   Display: "6 dígitos"
   Button: "Acessar Aspirador →"
   ```

2. **User activates machine**
   ```
   Machine: Aspirador #123456
   Location: Shopping Center
   Duration: 15 minutes
   ```

3. **User views history**
   ```
   15 minutos • Aspirador #123456
   12/12/2024 • Shopping Center • PIX
   R$ 15,00 ✓ Concluído
   ```

---

## Technical Details

### Frontend Types

```typescript
interface UsageSession {
  id: string;
  machineId: string;
  machineCode?: string;      // NEW
  machineLocation?: string;  // NEW
  duration: number;
  cost: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}
```

### Backend Types

```typescript
export interface UsageSession {
  id: string;
  userId: string;
  machineId: string;
  duration: number;
  cost: number;
  paymentMethod: 'balance' | 'pix';
  status: 'pending' | 'active' | 'completed' | 'failed';
  createdAt: Date;
  machineCode?: string;      // NEW
  machineLocation?: string;  // NEW
}
```

### API Response

```json
GET /api/sessions/my-sessions

{
  "success": true,
  "sessions": [
    {
      "id": "session-uuid",
      "machineId": "machine-uuid",
      "machineCode": "000001",
      "machineLocation": "Shopping Center",
      "duration": 15,
      "cost": 15.00,
      "paymentMethod": "pix",
      "status": "completed",
      "createdAt": "2024-12-12T18:00:00Z"
    }
  ]
}
```

---

## Validation

### Input Validation

**Frontend:**
```typescript
// Remove non-digits and limit to 6
const value = e.target.value.replace(/\D/g, '').slice(0, 6);
```

**Backend:**
```typescript
// Validate format: 1-6 digits only
body('code').matches(/^[0-9]{1,6}$/)
```

**Database:**
```sql
-- Constraint ensures valid format
CHECK (code ~ '^[0-9]{1,6}$')
```

---

## Migration Notes

### Existing Sessions

- Old sessions without `machineCode` will fall back to showing last 6 chars of UUID
- New sessions automatically include machine code and location
- No data migration needed

### Backward Compatibility

```tsx
// Graceful fallback
<span>
  Aspirador #{session.machineCode || session.machineId.slice(-6)}
</span>
```

---

## Testing Checklist

### Home Page
- [ ] Input only accepts numbers
- [ ] Placeholder shows "123456"
- [ ] Character counter updates correctly
- [ ] Button enables with any input
- [ ] Mobile shows numeric keyboard
- [ ] Can submit with Enter key

### Account Page
- [ ] Sessions show machine code with #
- [ ] Location displays correctly
- [ ] Old sessions still display (fallback)
- [ ] Formatting is consistent

### API
- [ ] Sessions include machineCode
- [ ] Sessions include machineLocation
- [ ] Query performs efficiently
- [ ] No breaking changes

---

## User Communication

### Help Text

**Home Page:**
```
Digite o código numérico do aspirador (até 6 dígitos)
Exemplo: 123456
```

**Instructions:**
```
1. Escaneie o QR Code no aspirador
2. Digite o código no campo acima
3. Escolha a duração e forma de pagamento
```

### Error Messages

**Invalid Code:**
```
Código inválido. Use apenas números (1-6 dígitos).
```

**Machine Not Found:**
```
Aspirador não encontrado. Verifique o código e tente novamente.
```

---

## Benefits

### For Users

✅ **Simpler input** - Just numbers, no confusion  
✅ **Faster entry** - Numeric keyboard on mobile  
✅ **Better history** - See which machine and location  
✅ **Clear display** - "Aspirador #123456" is intuitive  

### For Business

✅ **Professional** - Clean, consistent numbering  
✅ **Scalable** - Up to 999,999 machines  
✅ **Trackable** - Easy to reference in support  
✅ **Flexible** - 1-6 digits allows growth  

### For Support

✅ **Easy communication** - "Use machine 123456"  
✅ **Quick lookup** - Numeric codes are searchable  
✅ **Clear records** - History shows machine and location  
✅ **Less confusion** - No case sensitivity issues  

---

## Summary

✅ **Home page** - Numeric input with mobile keyboard  
✅ **Session history** - Shows machine code and location  
✅ **Backend** - Enhanced query with machine details  
✅ **Validation** - Consistent 1-6 digit format  
✅ **Fallback** - Graceful handling of old data  
✅ **User experience** - Clearer, simpler, faster  

All user-facing interfaces now consistently display numeric machine codes, providing a cleaner and more professional experience.
