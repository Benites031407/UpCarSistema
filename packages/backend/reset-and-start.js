import dotenv from 'dotenv';
import { DatabaseConnection } from './src/database/connection.ts';

// Load environment variables first
dotenv.config();

async function testAndStart() {
  console.log('🔄 Resetting database connection singleton...');
  console.log('📋 Current environment variables:');
  console.log('   DB_HOST:', process.env.DB_HOST);
  console.log('   DB_PORT:', process.env.DB_PORT);
  console.log('   DB_NAME:', process.env.DB_NAME);
  console.log('   DB_USER:', process.env.DB_USER);
  console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'undefined');

  // Reset the singleton to force recreation with new environment variables
  await DatabaseConnection.reset();

  console.log('✅ Database connection singleton reset');
  console.log('🧪 Testing new connection...');

  // Test the new connection
  const db = DatabaseConnection.getInstance();
  try {
    const connected = await db.testConnection();
    if (connected) {
      console.log('✅ Database connection test successful!');
      console.log('🚀 Starting server...');
      
      // Now start the main server
      await import('./src/index.ts');
    } else {
      console.error('❌ Database connection test failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
}

testAndStart();