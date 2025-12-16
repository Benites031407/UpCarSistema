import { db } from './src/database/connection.js';

async function testSeed() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test connection
    const connected = await db.testConnection();
    console.log('✅ Database connected:', connected);
    
    if (!connected) {
      throw new Error('Database connection failed');
    }
    
    // Test simple query
    console.log('🔍 Testing simple query...');
    const result = await db.query('SELECT COUNT(*) as count FROM users');
    console.log('✅ Current user count:', result.rows[0].count);
    
    // Test user creation
    console.log('🔍 Testing user creation...');
    const userResult = await db.query(
      `INSERT INTO users (email, name, account_balance, subscription_status, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name`,
      ['test-seed@example.com', 'Test Seed User', 25.00, 'none', 'customer']
    );
    
    console.log('✅ Created user:', userResult.rows[0]);
    
    // Test machine creation
    console.log('🔍 Testing machine creation...');
    const machineResult = await db.query(
      `INSERT INTO machines (code, qr_code, location, controller_id, operating_hours_start, operating_hours_end, maintenance_interval)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, code, location`,
      ['TEST01', 'https://example.com/qr/TEST01', 'Test Location', 'test-controller', '08:00', '18:00', 100]
    );
    
    console.log('✅ Created machine:', machineResult.rows[0]);
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testSeed();