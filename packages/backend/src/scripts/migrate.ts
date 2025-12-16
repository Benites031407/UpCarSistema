import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from '../database/connection.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('migration');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Migration {
  id: number;
  name: string;
  filename: string;
}

const migrations: Migration[] = [
  { id: 1, name: 'initial_schema', filename: '001_initial_schema.sql' },
  { id: 2, name: 'add_user_roles', filename: '002_add_user_roles.sql' }
];

async function createMigrationsTable(): Promise<void> {
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  
  await db.query(query);
  logger.info('Migrations table created or already exists');
}

async function getExecutedMigrations(): Promise<number[]> {
  try {
    const result = await db.query('SELECT id FROM migrations ORDER BY id');
    return result.rows.map((row: any) => row.id);
  } catch (error) {
    // If migrations table doesn't exist, return empty array
    return [];
  }
}

async function executeMigration(migration: Migration): Promise<void> {
  const migrationPath = join(__dirname, '..', 'database', 'migrations', migration.filename);
  
  try {
    const sql = await readFile(migrationPath, 'utf-8');
    
    await db.transaction(async (client) => {
      // Execute the migration SQL
      await client.query(sql);
      
      // Record the migration as executed
      await client.query(
        'INSERT INTO migrations (id, name) VALUES ($1, $2)',
        [migration.id, migration.name]
      );
    });
    
    logger.info(`Migration ${migration.id} (${migration.name}) executed successfully`);
  } catch (error) {
    logger.error(`Failed to execute migration ${migration.id} (${migration.name})`, error);
    throw error;
  }
}

async function runMigrations(): Promise<void> {
  try {
    logger.info('Starting database migrations...');
    
    // Test database connection
    const connected = await db.testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    
    // Create migrations table if it doesn't exist
    await createMigrationsTable();
    
    // Get list of executed migrations
    const executedMigrations = await getExecutedMigrations();
    
    // Execute pending migrations
    for (const migration of migrations) {
      if (!executedMigrations.includes(migration.id)) {
        logger.info(`Executing migration ${migration.id}: ${migration.name}`);
        await executeMigration(migration);
      } else {
        logger.info(`Migration ${migration.id} (${migration.name}) already executed, skipping`);
      }
    }
    
    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed', error);
    process.exit(1);
  }
}

// Run migrations if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      logger.info('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration process failed', error);
      process.exit(1);
    });
}

export { runMigrations };