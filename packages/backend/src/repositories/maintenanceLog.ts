import { PoolClient } from 'pg';
import { db } from '../database/connection.js';
import { MaintenanceLog, CreateMaintenanceLogInput } from '../models/types.js';

export class PostgresMaintenanceLogRepository {
  private mapRowToMaintenanceLog(row: any): MaintenanceLog {
    return {
      id: row.id,
      machineId: row.machine_id,
      type: row.type,
      performedBy: row.performed_by,
      description: row.description,
      cost: row.cost ? parseFloat(row.cost) : undefined,
      partsReplaced: row.parts_replaced,
      nextMaintenanceDue: row.next_maintenance_due,
      createdAt: row.created_at,
    };
  }

  async create(data: CreateMaintenanceLogInput, client?: PoolClient): Promise<MaintenanceLog> {
    const executor = client || db;
    
    const result = await executor.query(
      `INSERT INTO maintenance_logs (machine_id, type, performed_by, description, cost, parts_replaced, next_maintenance_due)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.machineId,
        data.type,
        data.performedBy || null,
        data.description || null,
        data.cost || null,
        data.partsReplaced || null,
        data.nextMaintenanceDue || null,
      ]
    );
    
    return this.mapRowToMaintenanceLog(result.rows[0]);
  }

  async findByMachineId(machineId: string): Promise<MaintenanceLog[]> {
    const result = await db.query(
      'SELECT * FROM maintenance_logs WHERE machine_id = $1 ORDER BY created_at DESC',
      [machineId]
    );
    
    return result.rows.map(this.mapRowToMaintenanceLog);
  }

  async findByMachineIdAndType(machineId: string, type: string): Promise<MaintenanceLog[]> {
    const result = await db.query(
      'SELECT * FROM maintenance_logs WHERE machine_id = $1 AND type = $2 ORDER BY created_at DESC',
      [machineId, type]
    );
    
    return result.rows.map(this.mapRowToMaintenanceLog);
  }

  async findLatestByMachineIdAndType(machineId: string, type: string): Promise<MaintenanceLog | null> {
    const result = await db.query(
      'SELECT * FROM maintenance_logs WHERE machine_id = $1 AND type = $2 ORDER BY created_at DESC LIMIT 1',
      [machineId, type]
    );
    
    return result.rows.length > 0 ? this.mapRowToMaintenanceLog(result.rows[0]) : null;
  }

  async findAll(limit = 50, offset = 0): Promise<MaintenanceLog[]> {
    const result = await db.query(
      'SELECT * FROM maintenance_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    return result.rows.map(this.mapRowToMaintenanceLog);
  }

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const executor = client || db;
    
    const result = await executor.query(
      'DELETE FROM maintenance_logs WHERE id = $1',
      [id]
    );
    
    return result.rowCount > 0;
  }
}
