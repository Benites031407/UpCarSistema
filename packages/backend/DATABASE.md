# Database Setup and Usage

This document describes the database schema, models, and repository patterns implemented for the Machine Rental System.

## Database Schema

The system uses PostgreSQL with the following tables:

### Tables

1. **users** - Customer and admin accounts
2. **machines** - Registered machines with their configurations
3. **usage_sessions** - Individual machine usage sessions
4. **transactions** - Payment and credit transactions
5. **notifications** - System notifications for administrators

### Key Features

- UUID primary keys for all tables
- Proper foreign key relationships with cascading deletes
- Check constraints for data validation
- Indexes for performance optimization
- Automatic timestamp updates via triggers

## Setup Instructions

### 1. Environment Configuration

Copy the example environment file and configure your database settings:

```bash
cp .env.example .env
```

Update the database configuration in `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=machine_rental
DB_USER=postgres
DB_PASSWORD=your_password
```

### 2. Database Creation

Create the PostgreSQL database:

```sql
CREATE DATABASE machine_rental;
```

### 3. Run Migrations

Execute the database migrations to create all tables:

```bash
npm run db:migrate
```

### 4. Seed Initial Data (Optional)

Populate the database with sample data:

```bash
npm run db:seed
```

## Data Models

### User Model

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  googleId?: string;
  passwordHash?: string;
  accountBalance: number;
  subscriptionStatus: 'none' | 'active' | 'expired';
  subscriptionExpiry?: Date;
  lastDailyUse?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Machine Model

```typescript
interface Machine {
  id: string;
  code: string;
  qrCode: string;
  location: string;
  controllerId: string;
  status: 'online' | 'offline' | 'maintenance' | 'in_use';
  operatingHours: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  maintenanceInterval: number; // hours
  currentOperatingHours: number;
  temperature?: number;
  lastHeartbeat?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Usage Session Model

```typescript
interface UsageSession {
  id: string;
  userId: string;
  machineId: string;
  duration: number; // minutes
  cost: number;
  paymentMethod: 'balance' | 'pix';
  paymentId?: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  createdAt: Date;
}
```

## Repository Pattern

The system implements the Repository pattern for data access with the following structure:

### Base Repository Interface

```typescript
interface BaseRepository<T, CreateInput, UpdateInput> {
  findById(id: string): Promise<T | null>;
  findAll(limit?: number, offset?: number): Promise<T[]>;
  create(data: CreateInput, client?: PoolClient): Promise<T>;
  update(id: string, data: UpdateInput, client?: PoolClient): Promise<T | null>;
  delete(id: string, client?: PoolClient): Promise<boolean>;
}
```

### Repository Factory

Use the `RepositoryFactory` to get repository instances:

```typescript
import { RepositoryFactory } from './repositories/index.js';

const userRepo = RepositoryFactory.getUserRepository();
const machineRepo = RepositoryFactory.getMachineRepository();
```

### Example Usage

```typescript
// Create a new user
const newUser = await userRepo.create({
  email: 'user@example.com',
  name: 'John Doe',
  accountBalance: 50.00
});

// Find user by email
const user = await userRepo.findByEmail('user@example.com');

// Update user balance
await userRepo.updateBalance(user.id, 25.00);

// Create a machine
const machine = await machineRepo.create({
  code: 'WASH001',
  qrCode: 'https://example.com/qr/WASH001',
  location: 'Laundromat A',
  controllerId: 'pi-001',
  operatingHours: { start: '08:00', end: '18:00' },
  maintenanceInterval: 100
});
```

## Database Connection

The system uses a singleton database connection with connection pooling:

```typescript
import { db } from './database/connection.js';

// Test connection
const isConnected = await db.testConnection();

// Execute query
const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// Execute transaction
await db.transaction(async (client) => {
  await client.query('UPDATE users SET account_balance = account_balance - $1 WHERE id = $2', [amount, userId]);
  await client.query('INSERT INTO transactions (user_id, type, amount) VALUES ($1, $2, $3)', [userId, 'usage_payment', amount]);
});
```

## Migration System

The migration system tracks executed migrations and ensures they run only once:

### Adding New Migrations

1. Create a new SQL file in `src/database/migrations/`
2. Use sequential numbering: `002_add_new_feature.sql`
3. Add the migration to the migrations array in `migrate.ts`
4. Run `npm run db:migrate`

### Migration File Format

```sql
-- Description of the migration
-- Migration: 002_add_new_feature

ALTER TABLE machines ADD COLUMN new_field VARCHAR(255);

CREATE INDEX idx_machines_new_field ON machines(new_field);
```

## Testing

The database models and repositories include comprehensive tests:

```bash
# Run all tests
npm test

# Run specific test file
npm test src/models/types.test.ts
```

## Performance Considerations

- All foreign key columns have indexes
- Frequently queried columns have dedicated indexes
- Connection pooling is configured for optimal performance
- Transactions are used for data consistency

## Security Features

- Parameterized queries prevent SQL injection
- Check constraints validate data integrity
- Foreign key constraints maintain referential integrity
- Environment variables protect sensitive configuration