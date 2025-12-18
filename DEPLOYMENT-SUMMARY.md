# Deployment Summary - December 17, 2025

## Changes to Deploy

### Frontend Changes
1. **Background Animations** - Added animated circles to all user-facing pages
   - HomePage.tsx
   - MachineActivationPage.tsx
   - AddCreditPage.tsx
   - HistoryPage.tsx
   - SettingsPage.tsx
   - SubscriptionPage.tsx
   - AccountPage.tsx
   - PrivacyPolicyPage.tsx
   - TermsAndConditionsPage.tsx

2. **Button Color Update** - "Iniciar Aspirador" button now matches "Acessar Aspirador" (solid orange)
   - MachineActivationPage.tsx

3. **Subscription Button** - Hidden temporarily (commented out)
   - HomePage.tsx
   - MachineActivationPage.tsx

4. **PIX Payment Flow** - Improved balance update and redirect
   - AddCreditPage.tsx - Auto-refresh balance and redirect to homepage after payment confirmation
   - Shows "waiting for payment" message when modal is closed

5. **QR Code Login Flow** - Auto-redirect to login
   - MachineActivationPage.tsx - Automatically redirects unauthenticated users to login page

6. **Admin Panel Improvements**
   - MachineRegistryComponent.tsx:
     - Added download loading modal for repasse reports
     - Reorganized form fields (grouped by category)
     - Changed "Localização" to "Endereço"
     - Updated machine code to 5 digits
   - MachineInfoModal.tsx:
     - Fixed "Horas até Manutenção" display (1 decimal place)

### Backend Changes
1. **WhatsApp Notifications** - Fully configured and active
   - .env - Updated with WhatsApp credentials:
     - ADMIN_PHONE=+5511941330822
     - WHATSAPP_ACCESS_TOKEN=(configured)
     - WHATSAPP_PHONE_NUMBER_ID=901637906368897
   - Notifications trigger on:
     - Machine goes offline (90+ seconds without heartbeat)
     - Machine enters maintenance mode

### Files Modified

**Frontend:**
- packages/frontend/src/pages/HomePage.tsx
- packages/frontend/src/pages/MachineActivationPage.tsx
- packages/frontend/src/pages/AddCreditPage.tsx
- packages/frontend/src/pages/HistoryPage.tsx
- packages/frontend/src/pages/SettingsPage.tsx
- packages/frontend/src/pages/SubscriptionPage.tsx
- packages/frontend/src/pages/AccountPage.tsx
- packages/frontend/src/pages/PrivacyPolicyPage.tsx
- packages/frontend/src/pages/TermsAndConditionsPage.tsx
- packages/frontend/src/components/admin/MachineRegistryComponent.tsx
- packages/frontend/src/components/admin/MachineInfoModal.tsx

**Backend:**
- packages/backend/.env

## Deployment Steps

### 1. Copy Changes to Deployment Directory
```powershell
# Navigate to UpCarAspiradores directory
cd C:\Users\Pedro\Arquivos\Trabalho\VScode\AI Projects\UpCarAspiradores

# Copy modified files to UpCarAspiradores_server
Copy-Item -Path "packages\frontend\src\pages\*" -Destination "..\UpCarAspiradores_server\packages\frontend\src\pages\" -Force
Copy-Item -Path "packages\frontend\src\components\admin\*" -Destination "..\UpCarAspiradores_server\packages\frontend\src\components\admin\" -Force
Copy-Item -Path "packages\backend\.env" -Destination "..\UpCarAspiradores_server\packages\backend\.env" -Force
```

### 2. Commit and Push to GitHub
```powershell
cd ..\UpCarAspiradores_server

git add .
git commit -m "Deploy: UI improvements, WhatsApp notifications, and bug fixes"
git push origin main
```

### 3. Deploy to AWS Server
```powershell
# SSH into AWS server
ssh -i ~/.ssh/upcar-key.pem ubuntu@56.125.203.232

# On the server:
cd /opt/upcar
git pull origin main

# Rebuild and restart containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f --tail=50
```

### 4. Verify Deployment
- Visit https://upaspiradores.com.br
- Test QR code flow (should auto-redirect to login)
- Test PIX payment (balance should update automatically)
- Check admin panel (download report modal, form organization)
- Verify WhatsApp notifications are configured (check backend logs)

## Important Notes

### WhatsApp Notifications
- **CRITICAL**: The WhatsApp credentials in the local `.env` file need to be added to the production server
- After pulling changes, update `/opt/upcar/packages/backend/.env` on the server with:
  ```
  WHATSAPP_ACCESS_TOKEN=EAALZCWU1ZAGZAMBQKxZBlvTOZCXvrnGWAneQlyvwGJ4asIMHZBr8tWslkNunEjUJXHjJ1NoUhkocBqwFpDgUuF7k2zZAzmIK6WF14vNZAooMZBkPW7jLkbLjuVIzplXT1xiVsVAXsZABZBDKNkwZBxnnmlLXHKLFKT9eWWa1M2wtAbL1h6xUjCZAMassOWQFAUZCCxzZAxVxiUV05G8ZB5z60TdX9IX76xyUFwRtJLHupfSO0G0dw5qZCovK4rmVtaT1ytR2hqpof1Wp8uh3FSnI1tHHYZBIVckHSNggZDZD
  WHATSAPP_PHONE_NUMBER_ID=901637906368897
  ADMIN_PHONE=+5511941330822
  ```

### Database Changes
- No database migrations needed for this deployment
- Machine codes are already 5 digits in production

## Rollback Plan
If issues occur:
```bash
# On server
cd /opt/upcar
git log --oneline -5  # Find previous commit
git reset --hard <previous-commit-hash>
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

## Testing Checklist
- [ ] Homepage loads with animations
- [ ] QR code scan redirects to login
- [ ] Login redirects back to machine page
- [ ] PIX payment updates balance automatically
- [ ] Admin panel form is organized
- [ ] Download report shows loading modal
- [ ] Machine info shows maintenance hours with 1 decimal
- [ ] WhatsApp notifications work (test by marking machine offline)
