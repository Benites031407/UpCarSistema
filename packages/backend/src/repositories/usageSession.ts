import { PoolClient } from 'pg';
import { db } from '../database/connection.js';
import { UsageSession, CreateUsageSessionInput, UpdateUsageSessionInput } from '../models/types.js';
import { UsageSessionRepository } from './interfaces.js';
import { QueryOptions, SearchOptions } from './base.js';

export class PostgresUsageSessionRepository implements UsageSessionRepository {
  private mapRowToUsageSession(row: any): UsageSession {
    return {
      id: row.id,
      userId: row.user_id,
      machineId: row.machine_id,
      duration: row.duration,
      cost: parseFloat(row.cost),
      paymentMethod: row.payment_method,
      paymentId: row.payment_id,
      status: row.status,
      startTime: row.start_time,
      endTime: row.end_time,
      createdAt: row.created_at
    };
  }

  async findById(id: string): Promise<UsageSession | null> {
    const result = await db.query(
      'SELECT * FROM usage_sessions WHERE id = $1',
      [id]
    );
    
    return result.rows.length > 0 ? this.mapRowToUsageSession(result.rows[0]) : null;
  }

  async findAll(limit = 50, offset = 0): Promise<UsageSession[]> {
    const result = await db.query(
      'SELECT * FROM usage_sessions ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    return result.rows.map(this.mapRowToUsageSession);
  }

  async findByUserId(userId: string, options: QueryOptions = {}): Promise<UsageSession[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;
    
    const result = await db.query(
      `SELECT 
        us.*,
        m.code as machine_code,
        m.location as machine_location
      FROM usage_sessions us
      LEFT JOIN machines m ON us.machine_id = m.id
      WHERE us.user_id = $1 
      ORDER BY us.${orderBy} ${orderDirection} 
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    
    return result.rows.map(row => ({
      ...this.mapRowToUsageSession(row),
      machineCode: row.machine_code,
      machineLocation: row.machine_location
    }));
  }

  async findByMachineId(machineId: string, options: QueryOptions = {}): Promise<UsageSession[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;
    
    const result = await db.query(
      `SELECT * FROM usage_sessions WHERE machine_id = $1 ORDER BY ${orderBy} ${orderDirection} LIMIT $2 OFFSET $3`,
      [machineId, limit, offset]
    );
    
    return result.rows.map(this.mapRowToUsageSession);
  }

  async findByStatus(status: 'pending' | 'active' | 'completed' | 'failed'): Promise<UsageSession[]> {
    const result = await db.query(
      'SELECT * FROM usage_sessions WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );
    
    return result.rows.map(this.mapRowToUsageSession);
  }

  async findActiveSession(machineId: string): Promise<UsageSession | null> {
    const result = await db.query(
      'SELECT * FROM usage_sessions WHERE machine_id = $1 AND status = $2',
      [machineId, 'active']
    );
    
    return result.rows.length > 0 ? this.mapRowToUsageSession(result.rows[0]) : null;
  }

  async findByPaymentId(paymentId: string): Promise<UsageSession | null> {
    const result = await db.query(
      'SELECT * FROM usage_sessions WHERE payment_id = $1',
      [paymentId]
    );
    
    return result.rows.length > 0 ? this.mapRowToUsageSession(result.rows[0]) : null;
  }

  async findUserDailyUsage(userId: string, date: Date): Promise<UsageSession[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const result = await db.query(
      'SELECT * FROM usage_sessions WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3',
      [userId, startOfDay, endOfDay]
    );
    
    return result.rows.map(this.mapRowToUsageSession);
  }

  async create(data: CreateUsageSessionInput, client?: PoolClient): Promise<UsageSession> {
    const executor = client || db;
    
    const result = await executor.query(
      `INSERT INTO usage_sessions (user_id, machine_id, duration, cost, payment_method, payment_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.userId,
        data.machineId,
        data.duration,
        data.cost,
        data.paymentMethod,
        data.paymentId
      ]
    );
    
    return this.mapRowToUsageSession(result.rows[0]);
  }

  async update(id: string, data: UpdateUsageSessionInput, client?: PoolClient): Promise<UsageSession | null> {
    const executor = client || db;
    
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
    if (data.startTime !== undefined) {
      fields.push(`start_time = $${paramCount++}`);
      values.push(data.startTime);
    }
    if (data.endTime !== undefined) {
      fields.push(`end_time = $${paramCount++}`);
      values.push(data.endTime);
    }
    if (data.paymentId !== undefined) {
      fields.push(`payment_id = $${paramCount++}`);
      values.push(data.paymentId);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    
    const result = await executor.query(
      `UPDATE usage_sessions SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    return result.rows.length > 0 ? this.mapRowToUsageSession(result.rows[0]) : null;
  }

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const executor = client || db;
    
    const result = await executor.query(
      'DELETE FROM usage_sessions WHERE id = $1',
      [id]
    );
    
    return result.rowCount > 0;
  }

  async updateStatus(sessionId: string, status: 'pending' | 'active' | 'completed' | 'failed', client?: PoolClient): Promise<UsageSession | null> {
    const executor = client || db;
    
    const result = await executor.query(
      'UPDATE usage_sessions SET status = $1 WHERE id = $2 RETURNING *',
      [status, sessionId]
    );
    
    return result.rows.length > 0 ? this.mapRowToUsageSession(result.rows[0]) : null;
  }

  async startSession(sessionId: string, startTime: Date, client?: PoolClient): Promise<UsageSession | null> {
    const executor = client || db;
    
    const result = await executor.query(
      'UPDATE usage_sessions SET status = $1, start_time = $2 WHERE id = $3 RETURNING *',
      ['active', startTime, sessionId]
    );
    
    return result.rows.length > 0 ? this.mapRowToUsageSession(result.rows[0]) : null;
  }

  async endSession(sessionId: string, endTime: Date, client?: PoolClient): Promise<UsageSession | null> {
    const executor = client || db;
    
    const result = await executor.query(
      'UPDATE usage_sessions SET status = $1, end_time = $2 WHERE id = $3 RETURNING *',
      ['completed', endTime, sessionId]
    );
    
    return result.rows.length > 0 ? this.mapRowToUsageSession(result.rows[0]) : null;
  }

  async findByDateRange(startDate: Date, endDate: Date, options: SearchOptions = {}): Promise<UsageSession[]> {
    const { limit = 100, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;
    
    const result = await db.query(
      `SELECT * FROM usage_sessions WHERE created_at >= $1 AND created_at <= $2 ORDER BY ${orderBy} ${orderDirection} LIMIT $3 OFFSET $4`,
      [startDate, endDate, limit, offset]
    );
    
    return result.rows.map(this.mapRowToUsageSession);
  }

  async findByUserIdAndDateRange(userId: string, startDate: Date, endDate: Date, options: SearchOptions = {}): Promise<UsageSession[]> {
    const { limit = 100, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;
    
    const result = await db.query(
      `SELECT * FROM usage_sessions WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3 ORDER BY ${orderBy} ${orderDirection} LIMIT $4 OFFSET $5`,
      [userId, startDate, endDate, limit, offset]
    );
    
    return result.rows.map(this.mapRowToUsageSession);
  }
}