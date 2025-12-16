import bcrypt from 'bcryptjs';
import { db } from './src/database/connection.js';

async function createAdmin() {
  const password = 'Admin123!';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const query = `
    INSERT INTO users (email, name, password_hash, account_balance, subscription_status, role)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (email) DO UPDATE 
    SET password_hash = $3, role = $6
    RETURNING id, email, name, role;
  `;
  
  const result = await db.query(query, [
    'admin@test.com',
    'Admin User',
    hashedPassword,
    100.00,
    'none',
    'admin'
  ]);
  
  console.log('Admin user created:', result.rows[0]);
  
  // Also create a regular user
  const userPassword = 'User123!';
  const hashedUserPassword = await bcrypt.hash(userPassword, 10);
  
  const userResult = await db.query(query, [
    'user@demo.com',
    'Demo User',
    hashedUserPassword,
    50.00,
    'none',
    'customer'
  ]);
  
  console.log('Demo user created:', userResult.rows[0]);
  
  process.exit(0);
}

createAdmin().catch(console.error);
