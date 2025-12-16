import { db } from './src/database/connection.js';

async function createMockData() {
  try {
    console.log('Creating mock data for analytics...');

    // Get existing users and machines
    const usersResult = await db.query('SELECT id FROM users WHERE role = $1 LIMIT 5', ['customer']);
    const machinesResult = await db.query('SELECT id FROM machines LIMIT 3');

    if (usersResult.rows.length === 0 || machinesResult.rows.length === 0) {
      console.log('No users or machines found. Please ensure you have users and machines in the database.');
      process.exit(1);
    }

    const userIds = usersResult.rows.map((row: any) => row.id);
    const machineIds = machinesResult.rows.map((row: any) => row.id);

    console.log(`Found ${userIds.length} users and ${machineIds.length} machines`);

    // Generate sessions for the last 30 days
    const today = new Date();
    const sessionsToCreate = 50;

    for (let i = 0; i < sessionsToCreate; i++) {
      // Random date within last 30 days
      const daysAgo = Math.floor(Math.random() * 30);
      const sessionDate = new Date(today);
      sessionDate.setDate(sessionDate.getDate() - daysAgo);
      
      // Random time of day (6 AM to 10 PM)
      const hour = 6 + Math.floor(Math.random() * 16);
      sessionDate.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

      // Random user and machine
      const userId = userIds[Math.floor(Math.random() * userIds.length)];
      const machineId = machineIds[Math.floor(Math.random() * machineIds.length)];

      // Random duration (5-30 minutes)
      const duration = 5 + Math.floor(Math.random() * 26);
      
      // Cost calculation (R$ 2.00 per minute)
      const cost = duration * 2.0;

      // Random payment method
      const paymentMethod = Math.random() > 0.5 ? 'balance' : 'pix';

      // Start and end times
      const startTime = new Date(sessionDate);
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

      // Create session
      await db.query(`
        INSERT INTO usage_sessions 
        (user_id, machine_id, duration, cost, payment_method, status, start_time, end_time, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        userId,
        machineId,
        duration,
        cost,
        paymentMethod,
        'completed',
        startTime,
        endTime,
        sessionDate
      ]);

      // Create corresponding transaction
      await db.query(`
        INSERT INTO transactions 
        (user_id, type, amount, payment_method, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        'usage_payment',
        cost,
        paymentMethod,
        'completed',
        sessionDate
      ]);

      if ((i + 1) % 10 === 0) {
        console.log(`Created ${i + 1}/${sessionsToCreate} sessions...`);
      }
    }

    console.log('✅ Mock data created successfully!');
    console.log(`Created ${sessionsToCreate} completed sessions with transactions`);
    
    // Show summary
    const revenueResult = await db.query(`
      SELECT SUM(cost) as total_revenue, COUNT(*) as total_sessions
      FROM usage_sessions
      WHERE status = 'completed'
    `);
    
    console.log('\n📊 Summary:');
    console.log(`Total Revenue: R$ ${parseFloat(revenueResult.rows[0].total_revenue).toFixed(2)}`);
    console.log(`Total Sessions: ${revenueResult.rows[0].total_sessions}`);

    process.exit(0);
  } catch (error) {
    console.error('Error creating mock data:', error);
    process.exit(1);
  }
}

createMockData();
