import dotenv from 'dotenv';
import { DatabaseConnection } from './src/database/connection.ts';

// Load environment variables
dotenv.config();

console.log('Resetting database connection...');
DatabaseConnection.reset();

console.log('Testing new connection with:');
console.log('Host:', process.env.DB_HOST);
console.log('Port:', process.env.DB_PORT);
console.log('Database:', process.env.DB_NAME);
console.log('User:', process.env.DB_USER);
console.log('Password:', process.env.DB_PASSWORD ? '***' : 'undefined');

const db = DatabaseConnection.getInstance();

async function testConnection() {
  try {
    console.log('Attempting to connect...');
    const result = await db.testConnection();
    console.log('Connection test result:', result);
    
    if (result) {
      console.log('✅ Database connection successful!');
    } else {
      console.log('❌ Database connection failed');
    }
    
    await db.close();
  } catch (error) {
    console.error('Connection failed:', error.message);
    console.error('Error code:', error.code);
    process.exit(1);
  }
}

testConnection();