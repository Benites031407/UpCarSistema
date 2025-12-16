import { db } from './dist/database/connection.js';

async function manualSeed() {
  try {
    console.log('🔍 Starting manual seed...');
    
    // Test connection
    const connected = await db.testConnection();
    console.log('✅ Database connected:', connected);
    
    if (!connected) {
      throw new Error('Database connection failed');
    }
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await db.query('DELETE FROM machines');
    await db.query('DELETE FROM users WHERE email LIKE \'%@machinerental.com\' OR email LIKE \'%@example.com\'');
    
    // Create admin user
    console.log('👤 Creating admin user...');
    const adminResult = await db.query(
      `INSERT INTO users (email, name, account_balance, subscription_status, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, account_balance`,
      ['admin@machinerental.com', 'System Administrator', 100.00, 'none', 'admin']
    );
    console.log('✅ Created admin:', adminResult.rows[0]);
    
    // Create customer user
    console.log('👤 Creating customer user...');
    const customerResult = await db.query(
      `INSERT INTO users (email, name, account_balance, subscription_status, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, account_balance`,
      ['customer@example.com', 'John Doe', 50.00, 'none', 'customer']
    );
    console.log('✅ Created customer:', customerResult.rows[0]);
    
    // Create machines
    console.log('🏭 Creating machines...');
    
    const machine1Result = await db.query(
      `INSERT INTO machines (code, qr_code, location, controller_id, operating_hours_start, operating_hours_end, maintenance_interval, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, code, location`,
      ['WASH001', 'https://example.com/qr/WASH001', 'Laundromat A - Floor 1', 'pi-controller-001', '08:00', '22:00', 100, 'online']
    );
    console.log('✅ Created machine 1:', machine1Result.rows[0]);
    
    const machine2Result = await db.query(
      `INSERT INTO machines (code, qr_code, location, controller_id, operating_hours_start, operating_hours_end, maintenance_interval, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, code, location`,
      ['WASH002', 'https://example.com/qr/WASH002', 'Laundromat A - Floor 2', 'pi-controller-002', '06:00', '23:00', 150, 'online']
    );
    console.log('✅ Created machine 2:', machine2Result.rows[0]);
    
    const machine3Result = await db.query(
      `INSERT INTO machines (code, qr_code, location, controller_id, operating_hours_start, operating_hours_end, maintenance_interval, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, code, location`,
      ['DRY001', 'https://example.com/qr/DRY001', 'Laundromat B - Main Floor', 'pi-controller-003', '07:00', '21:00', 120, 'online']
    );
    console.log('✅ Created machine 3:', machine3Result.rows[0]);
    
    console.log('🎉 Manual seeding completed successfully!');
    
    // Verify data
    console.log('🔍 Verifying created data...');
    const userCount = await db.query('SELECT COUNT(*) as count FROM users');
    const machineCount = await db.query('SELECT COUNT(*) as count FROM machines');
    
    console.log(`📊 Total users: ${userCount.rows[0].count}`);
    console.log(`📊 Total machines: ${machineCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Manual seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

manualSeed();