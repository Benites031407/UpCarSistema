# QR Code Regeneration Guide

## Overview
This guide explains how to regenerate QR codes for machines when machine codes are updated or QR codes need to be refreshed.

## QR Code Format
The system uses **base64-encoded SVG** format for QR codes:
- QR codes are generated as SVG strings
- The SVG is then base64-encoded before storing in the database
- Format in database: `PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA...`
- When decoded: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 37 37"...`

## When to Regenerate QR Codes
- Machine codes are changed (e.g., from 6 digits to 5 digits)
- QR codes are corrupted or missing
- Base URL changes (e.g., domain change)
- QR code format needs updating

## Regeneration Script

### Script Location
Create the script at: `/opt/upcar/update-qr-base64.mjs`

### Script Content
```javascript
import QRCode from 'qrcode';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'upcar_aspiradores',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function updateQRCodes() {
  // Update this array with the machine codes that need new QR codes
  const codes = ['48392', '75028', '19653', '84260', '30571'];
  const baseUrl = process.env.FRONTEND_URL || 'https://upaspiradores.com.br';
  
  console.log('Starting QR code regeneration (base64-encoded SVG)...');
  console.log('Base URL:', baseUrl);
  
  for (const code of codes) {
    try {
      const url = `${baseUrl}/machine/${code}`;
      console.log(`Generating QR code for: ${url}`);
      
      // Generate as SVG string
      const qrCodeSVG = await QRCode.toString(url, {
        type: 'svg',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      // Base64 encode the SVG
      const qrCodeBase64 = Buffer.from(qrCodeSVG).toString('base64');
      
      const result = await pool.query(
        'UPDATE machines SET qr_code = $1 WHERE code = $2 RETURNING code, location',
        [qrCodeBase64, code]
      );
      
      if (result.rowCount > 0) {
        console.log(`✓ Updated QR code for machine ${code} (${result.rows[0].location})`);
        console.log(`  Preview: ${qrCodeBase64.substring(0, 50)}...`);
      } else {
        console.log(`✗ Machine ${code} not found in database`);
      }
    } catch (error) {
      console.error(`✗ Failed to update machine ${code}:`, error.message);
    }
  }
  
  await pool.end();
  console.log('\nDone!');
}

updateQRCodes().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

## How to Use

### Step 1: Update Machine Codes (if needed)
If you're changing machine codes, update them first:

```bash
# SSH into the server
ssh -i ~/.ssh/upcar-key.pem ubuntu@56.125.203.232

# Connect to database
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d upcar_aspiradores

# Update codes (example: 6 digits to 5 digits)
UPDATE machines SET code = LEFT(code, 5) WHERE LENGTH(code) = 6;

# Verify
SELECT code, location FROM machines ORDER BY code;

# Exit
\q
```

### Step 2: Create the Regeneration Script
```bash
# On the server
cd /opt/upcar

# Create the script (paste the script content above)
cat > update-qr-base64.mjs << 'EOF'
[paste script content here]
EOF
```

### Step 3: Copy Script to Backend Container
```bash
# Copy the script into the backend container
docker cp /opt/upcar/update-qr-base64.mjs $(docker compose -f docker-compose.prod.yml ps -q backend):/app/update-qr-base64.mjs
```

### Step 4: Run the Script
```bash
# Execute the script inside the backend container
docker compose -f docker-compose.prod.yml exec -T backend node /app/update-qr-base64.mjs
```

### Step 5: Verify QR Codes
```bash
# Check that QR codes were updated
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d upcar_aspiradores -c "SELECT code, SUBSTRING(qr_code, 1, 50) as qr_preview FROM machines WHERE code IN ('48392', '75028', '19653', '84260', '30571');"
```

Expected output should show QR codes starting with `PHN2ZyB4bWxucz0i...`

### Step 6: Test in Admin Panel
1. Log into admin panel at https://upaspiradores.com.br/admin
2. Go to Machines section
3. Click on one of the updated machines
4. Verify the QR code displays correctly
5. Download and test scanning the QR code

## Troubleshooting

### QR Codes Not Displaying
**Problem**: QR codes show error in browser console

**Solution**: Check the format in database
```bash
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d upcar_aspiradores -c "SELECT code, SUBSTRING(qr_code, 1, 30) FROM machines WHERE code = '48392';"
```

Should start with `PHN2ZyB4bWxucz0i` (base64-encoded SVG)

If it starts with `data:image/png;base64,` or `<svg`, the format is wrong - regenerate using the correct script.

### Script Fails to Run
**Problem**: Module not found or connection errors

**Solution**: 
1. Ensure you're running inside the backend container
2. Check database connection environment variables
3. Verify qrcode and pg packages are installed

### Wrong QR Code URL
**Problem**: QR codes point to wrong domain

**Solution**: Update the `baseUrl` in the script:
```javascript
const baseUrl = 'https://upaspiradores.com.br'; // Update this
```

## Bulk Regeneration

To regenerate QR codes for ALL machines:

```bash
# Modify the script to get all machine codes from database
cat > /opt/upcar/regenerate-all-qr.mjs << 'EOF'
import QRCode from 'qrcode';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'upcar_aspiradores',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function regenerateAllQRCodes() {
  const baseUrl = process.env.FRONTEND_URL || 'https://upaspiradores.com.br';
  
  // Get all machine codes
  const result = await pool.query('SELECT code FROM machines ORDER BY code');
  const codes = result.rows.map(row => row.code);
  
  console.log(`Regenerating QR codes for ${codes.length} machines...`);
  
  for (const code of codes) {
    try {
      const url = `${baseUrl}/machine/${code}`;
      const qrCodeSVG = await QRCode.toString(url, {
        type: 'svg',
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      });
      
      const qrCodeBase64 = Buffer.from(qrCodeSVG).toString('base64');
      
      await pool.query(
        'UPDATE machines SET qr_code = $1 WHERE code = $2',
        [qrCodeBase64, code]
      );
      
      console.log(`✓ ${code}`);
    } catch (error) {
      console.error(`✗ ${code}: ${error.message}`);
    }
  }
  
  await pool.end();
  console.log('Done!');
}

regenerateAllQRCodes().catch(console.error);
EOF

# Run it
docker cp /opt/upcar/regenerate-all-qr.mjs $(docker compose -f docker-compose.prod.yml ps -q backend):/app/regenerate-all-qr.mjs
docker compose -f docker-compose.prod.yml exec -T backend node /app/regenerate-all-qr.mjs
```

## Recent Updates

### December 17, 2025
- Updated 5 machines from 6-digit to 5-digit codes:
  - 483920 → 48392 (Av. Portugal 1756 - Santo André)
  - 750280 → 75028 (Rua General Glicério, 737 - Santo André)
  - 196530 → 19653 (Guarucoop / Aeroporto - Guarulhos)
  - 842600 → 84260 (Av. São Luís 840 - Guarulhos)
  - 305710 → 30571 (R. Príncipe Humberto, 450 - SBC)
- Regenerated QR codes using base64-encoded SVG format
- All QR codes now working correctly in admin panel

## Notes
- QR codes are stored directly in the database (not as files)
- The qrcode npm package is already installed in the backend
- Always test QR codes after regeneration by scanning with a phone
- QR codes should redirect to: `https://upaspiradores.com.br/machine/[CODE]`
