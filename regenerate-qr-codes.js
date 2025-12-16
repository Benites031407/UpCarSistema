const { Pool } = require('pg');
const QRCode = require('qrcode');
require('dotenv').config({ path: '.env.prod' });

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'upcar_aspiradores',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://upaspiradores.com.br';

async function regenerateQRCodes() {
  console.log('🔄 Regenerating QR Codes...');
  console.log(`📍 Frontend URL: ${FRONTEND_URL}`);
  console.log('');

  try {
    const result = await pool.query('SELECT id, code, location FROM machines ORDER BY code');
    const machines = result.rows;

    console.log(`📦 Found ${machines.length} machines`);
    console.log('');

    let updated = 0;
    let failed = 0;

    for (const machine of machines) {
      try {
        const qrCodeUrl = `${FRONTEND_URL}/machine/${machine.code}`;
        
        const qrCodeSvg = await QRCode.toString(qrCodeUrl, { 
          type: 'svg',
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        const qrCodeBase64 = Buffer.from(qrCodeSvg).toString('base64');
        
        await pool.query(
          'UPDATE machines SET qr_code = $1, updated_at = NOW() WHERE id = $2',
          [qrCodeBase64, machine.id]
        );
        
        console.log(`✅ ${machine.code} - ${machine.location}`);
        console.log(`   URL: ${qrCodeUrl}`);
        updated++;
      } catch (error) {
        console.error(`❌ Failed to update ${machine.code}:`, error.message);
        failed++;
      }
    }

    console.log('');
    console.log('📊 Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📦 Total: ${machines.length}`);
    console.log('');
    console.log('✨ Done!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

regenerateQRCodes().catch(console.error);
