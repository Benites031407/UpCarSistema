import { PoolClient } from 'pg';
import { db } from '../database/connection.js';
import { Notification, CreateNotificationInput, UpdateNotificationInput } from '../models/types.js';
import { NotificationRepository } from './interfaces.js';
import { QueryOptions } from './base.js';

export class PostgresNotificationRepository implements NotificationRepository {
  private mapRowToNotification(row: any): Notification {
    return {
      id: row.id,
      type: row.type,
      machineId: row.machine_id,
      message: row.message,
      whatsappStatus: row.whatsapp_status,
      createdAt: row.created_at
    };
  }

  async findById(id: string): Promise<Notification | null> {
    const result = await db.query(
      'SELECT * FROM notifications WHERE id = $1',
      [id]
    );
    
    return result.rows.length > 0 ? this.mapRowToNotification(result.rows[0]) : null;
  }

  async findAll(limit = 50, offset = 0): Promise<Notification[]> {
    const result = await db.query(
      'SELECT * FROM notifications ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    return result.rows.map(this.mapRowToNotification);
  }

  async findByType(type: 'maintenance_required' | 'machine_offline' | 'system_error', options: QueryOptions = {}): Promise<Notification[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;
    
    const result = await db.query(
      `SELECT * FROM notifications WHERE type = $1 ORDER BY ${orderBy} ${orderDirection} LIMIT $2 OFFSET $3`,
      [type, limit, offset]
    );
    
    return result.rows.map(this.mapRowToNotification);
  }

  async findByMachineId(machineId: string, options: QueryOptions = {}): Promise<Notification[]> {
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;
    
    const result = await db.query(
      `SELECT * FROM notifications WHERE machine_id = $1 ORDER BY ${orderBy} ${orderDirection} LIMIT $2 OFFSET $3`,
      [machineId, limit, offset]
    );
    
    return result.rows.map(this.mapRowToNotification);
  }

  async findByWhatsappStatus(status: 'pending' | 'sent' | 'failed'): Promise<Notification[]> {
    const result = await db.query(
      'SELECT * FROM notifications WHERE whatsapp_status = $1 ORDER BY created_at DESC',
      [status]
    );
    
    return result.rows.map(this.mapRowToNotification);
  }

  async findPendingNotifications(): Promise<Notification[]> {
    return this.findByWhatsappStatus('pending');
  }

  async findRecent(limit = 50): Promise<Notification[]> {
    const result = await db.query(
      'SELECT * FROM notifications ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    
    return result.rows.map(this.mapRowToNotification);
  }

  async create(data: CreateNotificationInput, client?: PoolClient): Promise<Notification> {
    const executor = client || db;
    
    const result = await executor.query(
      `INSERT INTO notifications (type, machine_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        data.type,
        data.machineId,
        data.message
      ]
    );
    
    return this.mapRowToNotification(result.rows[0]);
  }

  async update(id: string, data: UpdateNotificationInput, client?: PoolClient): Promise<Notification | null> {
    const executor = client || db;
    
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.whatsappStatus !== undefined) {
      fields.push(`whatsapp_status = $${paramCount++}`);
      values.push(data.whatsappStatus);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    
    const result = await executor.query(
      `UPDATE notifications SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    return result.rows.length > 0 ? this.mapRowToNotification(result.rows[0]) : null;
  }

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const executor = client || db;
    
    const result = await executor.query(
      'DELETE FROM notifications WHERE id = $1',
      [id]
    );
    
    return result.rowCount > 0;
  }

  async updateWhatsappStatus(notificationId: string, status: 'pending' | 'sent' | 'failed', client?: PoolClient): Promise<Notification | null> {
    const executor = client || db;
    
    const result = await executor.query(
      'UPDATE notifications SET whatsapp_status = $1 WHERE id = $2 RETURNING *',
      [status, notificationId]
    );
    
    return result.rows.length > 0 ? this.mapRowToNotification(result.rows[0]) : null;
  }

  async markAsSent(notificationId: string, client?: PoolClient): Promise<Notification | null> {
    return this.updateWhatsappStatus(notificationId, 'sent', client);
  }

  async markAsFailed(notificationId: string, client?: PoolClient): Promise<Notification | null> {
    return this.updateWhatsappStatus(notificationId, 'failed', client);
  }
}