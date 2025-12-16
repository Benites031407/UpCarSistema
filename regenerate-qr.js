import pg from 'pg';
import QRCode from 'qrcode';

const { Pool } = pg;

const pool = new Pool({
  host: 'postgres',
  port: 5432,
  database: 'upcar_aspiradores',
  user: 'postgres',
  password: process.env.DB_PASSWORD,
});

const FRONTEND_URL = 'https://upaspiradores.com.br';

console.log('�� Regenerating QR Codes...');

const result = await pool.query('SELECT id, code, location FROM machines ORDER BY code');

console.log(`📦 Found ${result.rows.length} machines\n`);

for (const machine of result.rows) {
  const qrCodeUrl = `${FRONTEND_URL}/machine/${machine.code}`;
  const qrCodeSvg = await QRCode.toString(qrCodeUrl, { type: 'svg' });
  const qrCodeBase64 = Buffer.from(qrCodeSvg).toString('base64');
  
  await pool.query('UPDATE machines SET qr_code = $1 WHERE id = $2', [qrCodeBase64, machine.id]);
  console.log(`✅ ${machine.code} (${machine.location}) -> ${qrCodeUrl}`);
}

await pool.end();
console.log('\n✨ Done! All QR codes updated!');
