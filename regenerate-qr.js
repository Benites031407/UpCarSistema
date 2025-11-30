const QRCode = require('qrcode');
const { Client } = require('pg');

async function regenerateQRCodes() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'machine_rental',
    user: 'postgres',
    password: 'banana'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const result = await client.query(
      `SELECT id, code FROM machines WHERE LENGTH(qr_code) < 100`
    );

    console.log(`Found ${result.rows.length} machines to fix\n`);

    for (const machine of result.rows) {
      console.log(`Generating QR code for ${machine.code}...`);

      const qrData = `http://localhost:3000/machine/${machine.code}`;
      const qrCodeSvg = await QRCode.toString(qrData, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const qrCodeBase64 = Buffer.from(qrCodeSvg).toString('base64');

      await client.query(
        'UPDATE machines SET qr_code = $1 WHERE id = $2',
        [qrCodeBase64, machine.id]
      );

      console.log(`✓ Updated QR code for ${machine.code}`);
    }

    console.log('\n✅ All QR codes regenerated successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

regenerateQRCodes();
