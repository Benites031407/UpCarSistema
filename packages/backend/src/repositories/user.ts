import { PoolClient } from 'pg';
import { db } from '../database/connection.js';
import { User, CreateUserInput, UpdateUserInput } from '../models/types.js';
import { UserRepository } from './interfaces.js';

export class PostgresUserRepository implements UserRepository {
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      googleId: row.google_id,
      passwordHash: row.password_hash,
      accountBalance: parseFloat(row.account_balance),
      subscriptionStatus: row.subscription_status,
      subscriptionExpiry: row.subscription_expiry,
      lastDailyUse: row.last_daily_use,
      role: row.role || 'customer',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async findById(id: string): Promise<User | null> {
    const result = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    
    return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
  }

  async findAll(limit = 50, offset = 0): Promise<User[]> {
    const result = await db.query(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    return result.rows.map(this.mapRowToUser);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const result = await db.query(
      'SELECT * FROM users WHERE google_id = $1',
      [googleId]
    );
    
    return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
  }

  async create(data: CreateUserInput, client?: PoolClient): Promise<User> {
    const executor = client || db;
    
    const result = await executor.query(
      `INSERT INTO users (email, name, google_id, password_hash, account_balance, subscription_status, subscription_expiry, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.email,
        data.name,
        data.googleId,
        data.passwordHash,
        data.accountBalance || 0,
        data.subscriptionStatus || 'none',
        data.subscriptionExpiry,
        data.role || 'customer'
      ]
    );
    
    return this.mapRowToUser(result.rows[0]);
  }

  async update(id: string, data: UpdateUserInput, client?: PoolClient): Promise<User | null> {
    const executor = client || db;
    
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.accountBalance !== undefined) {
      fields.push(`account_balance = $${paramCount++}`);
      values.push(data.accountBalance);
    }
    if (data.subscriptionStatus !== undefined) {
      fields.push(`subscription_status = $${paramCount++}`);
      values.push(data.subscriptionStatus);
    }
    if (data.subscriptionExpiry !== undefined) {
      fields.push(`subscription_expiry = $${paramCount++}`);
      values.push(data.subscriptionExpiry);
    }
    if (data.lastDailyUse !== undefined) {
      fields.push(`last_daily_use = $${paramCount++}`);
      values.push(data.lastDailyUse);
    }
    if (data.role !== undefined) {
      fields.push(`role = $${paramCount++}`);
      values.push(data.role);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    
    const result = await executor.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
  }

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const executor = client || db;
    
    const result = await executor.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );
    
    return result.rowCount > 0;
  }

  async updateBalance(userId: string, amount: number, client?: PoolClient): Promise<User | null> {
    const executor = client || db;
    
    const result = await executor.query(
      'UPDATE users SET account_balance = account_balance + $1 WHERE id = $2 RETURNING *',
      [amount, userId]
    );
    
    return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
  }

  async deductBalance(userId: string, amount: number, client?: PoolClient): Promise<User | null> {
    const executor = client || db;
    
    const result = await executor.query(
      'UPDATE users SET account_balance = account_balance - $1 WHERE id = $2 AND account_balance >= $1 RETURNING *',
      [amount, userId]
    );
    
    return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
  }

  async findBySubscriptionStatus(status: 'active' | 'expired'): Promise<User[]> {
    const result = await db.query(
      'SELECT * FROM users WHERE subscription_status = $1',
      [status]
    );
    
    return result.rows.map(this.mapRowToUser);
  }

  async updateLastDailyUse(userId: string, date: Date, client?: PoolClient): Promise<User | null> {
    const executor = client || db;
    
    const result = await executor.query(
      'UPDATE users SET last_daily_use = $1 WHERE id = $2 RETURNING *',
      [date, userId]
    );
    
    return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
  }

  async searchByNameOrEmail(searchTerm: string): Promise<User[]> {
    const result = await db.query(
      'SELECT * FROM users WHERE name ILIKE $1 OR email ILIKE $1 ORDER BY created_at DESC',
      [`%${searchTerm}%`]
    );
    
    return result.rows.map(this.mapRowToUser);
  }
}