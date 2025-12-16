import { PoolClient } from 'pg';
import { db } from '../database/connection.js';
import { Transaction, CreateTransactionInput, UpdateTransactionInput } from '../models/types.js';
import { TransactionRepository } from './interfaces.js';
import { QueryOptions, SearchOptions } from './base.js';

export class PostgresTransactionRepository implements TransactionRepository {
  private mapRowToTransaction(row: any): Transaction {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      amount: parseFloat(row.amount),
      paymentMethod: row.payment_method,
      paymentId: row.payment_id,
      status: row.status,
      createdAt: row.created_at
    };
  }

  async findById(id: string): Promise<Transaction | null> {
    const result = await db.query(
      'SELECT * FROM transactions WHERE id = $1',
      [id]
    );
    
    return result.rows.length > 0 ? this.mapRowToTransaction(result.rows[0]) : null;
  }

  async findAll(limit = 50, offset = 0): Promise<Transaction[]> {
    const result = await db.query(
      'SELECT * FROM transactions ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    return result.rows.map(this.mapRowToTransaction);
  }

  async findByUserId(userId: string, options: QueryOptions = {}): Promise<Transaction[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;
    
    const result = await db.query(
      `SELECT * FROM transactions WHERE user_id = $1 ORDER BY ${orderBy} ${orderDirection} LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    
    return result.rows.map(this.mapRowToTransaction);
  }

  async findByType(type: 'credit_added' | 'usage_payment' | 'subscription_payment', options: QueryOptions = {}): Promise<Transaction[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;
    
    const result = await db.query(
      `SELECT * FROM transactions WHERE type = $1 ORDER BY ${orderBy} ${orderDirection} LIMIT $2 OFFSET $3`,
      [type, limit, offset]
    );
    
    return result.rows.map(this.mapRowToTransaction);
  }

  async findByStatus(status: 'pending' | 'completed' | 'failed'): Promise<Transaction[]> {
    const result = await db.query(
      'SELECT * FROM transactions WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );
    
    return result.rows.map(this.mapRowToTransaction);
  }

  async findByPaymentId(paymentId: string): Promise<Transaction | null> {
    const result = await db.query(
      'SELECT * FROM transactions WHERE payment_id = $1',
      [paymentId]
    );
    
    return result.rows.length > 0 ? this.mapRowToTransaction(result.rows[0]) : null;
  }

  async create(data: CreateTransactionInput, client?: PoolClient): Promise<Transaction> {
    const executor = client || db;
    
    const result = await executor.query(
      `INSERT INTO transactions (user_id, type, amount, payment_method, payment_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.userId,
        data.type,
        data.amount,
        data.paymentMethod,
        data.paymentId
      ]
    );
    
    return this.mapRowToTransaction(result.rows[0]);
  }

  async update(id: string, data: UpdateTransactionInput, client?: PoolClient): Promise<Transaction | null> {
    const executor = client || db;
    
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(data.status);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    
    const result = await executor.query(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    return result.rows.length > 0 ? this.mapRowToTransaction(result.rows[0]) : null;
  }

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const executor = client || db;
    
    const result = await executor.query(
      'DELETE FROM transactions WHERE id = $1',
      [id]
    );
    
    return result.rowCount > 0;
  }

  async updateStatus(transactionId: string, status: 'pending' | 'completed' | 'failed', client?: PoolClient): Promise<Transaction | null> {
    const executor = client || db;
    
    const result = await executor.query(
      'UPDATE transactions SET status = $1 WHERE id = $2 RETURNING *',
      [status, transactionId]
    );
    
    return result.rows.length > 0 ? this.mapRowToTransaction(result.rows[0]) : null;
  }

  async findByDateRange(startDate: Date, endDate: Date, options: SearchOptions = {}): Promise<Transaction[]> {
    const { limit = 100, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;
    
    const result = await db.query(
      `SELECT * FROM transactions WHERE created_at >= $1 AND created_at <= $2 ORDER BY ${orderBy} ${orderDirection} LIMIT $3 OFFSET $4`,
      [startDate, endDate, limit, offset]
    );
    
    return result.rows.map(this.mapRowToTransaction);
  }

  async getTotalRevenue(startDate?: Date, endDate?: Date): Promise<number> {
    let query = 'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = $1';
    const params: any[] = ['completed'];
    
    if (startDate) {
      query += ' AND created_at >= $2';
      params.push(startDate);
    }
    
    if (endDate) {
      query += startDate ? ' AND created_at <= $3' : ' AND created_at <= $2';
      params.push(endDate);
    }
    
    const result = await db.query(query, params);
    return parseFloat(result.rows[0].total);
  }

  async getRevenueByMachine(startDate?: Date, endDate?: Date): Promise<Array<{ machineId: string; revenue: number }>> {
    let query = `
      SELECT us.machine_id, COALESCE(SUM(t.amount), 0) as revenue
      FROM transactions t
      JOIN usage_sessions us ON t.user_id = us.user_id AND t.type = 'usage_payment'
      WHERE t.status = 'completed'
    `;
    const params: any[] = [];
    let paramCount = 1;
    
    if (startDate) {
      query += ` AND t.created_at >= $${paramCount++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND t.created_at <= $${paramCount++}`;
      params.push(endDate);
    }
    
    query += ' GROUP BY us.machine_id ORDER BY revenue DESC';
    
    const result = await db.query(query, params);
    return result.rows.map((row: any) => ({
      machineId: row.machine_id,
      revenue: parseFloat(row.revenue)
    }));
  }
}