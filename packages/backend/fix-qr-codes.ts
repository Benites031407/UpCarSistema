import QRCode from 'qrcode';
import { db } from './src/database/connection.js';

async function fixQRCodes() {
  try {
    console.log('Fetching machines without proper QR codes...');
    
    const result = await db.query(
      `SELECT id, code FROM machines WHERE LENGTH(qr_code) < 100`
    );
    
    console.log(`Found ${result.rows.length} machines to fix`);
    
    for (const machine of result.rows) {
      console.log(`Generating QR code for ${machine.code}...`);
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const qrData = `${frontendUrl}/machine/${machine.code}`;
      
      // Generate QR code as SVG
      const qrCodeSvg = await QRCode.toString(qrData, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Convert to base64
      const qrCodeBase64 = Buffer.from(qrCodeSvg).toString('base64');
      
      // Update database
      await db.query(
        'UPDATE machines SET qr_code = $1 WHERE id = $2',
        [qrCodeBase64, machine.id]
      );
      
      console.log(`✓ Updated QR code for ${machine.code}`);
    }
    
    console.log('\nAll QR codes fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing QR codes:', error);
    process.exit(1);
  }
}

fixQRCodes();
