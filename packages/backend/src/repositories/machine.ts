import { PoolClient } from 'pg';
import { db } from '../database/connection.js';
import { Machine, CreateMachineInput, UpdateMachineInput } from '../models/types.js';
import { MachineRepository } from './interfaces.js';

export class PostgresMachineRepository implements MachineRepository {
  private mapRowToMachine(row: any): Machine {
    return {
      id: row.id,
      code: row.code,
      qrCode: row.qr_code,
      location: row.location,
      controllerId: row.controller_id,
      status: row.status,
      operatingHours: {
        start: row.operating_hours_start,
        end: row.operating_hours_end
      },
      maintenanceInterval: row.maintenance_interval,
      currentOperatingHours: row.current_operating_hours,
      pricePerMinute: row.price_per_minute ? parseFloat(row.price_per_minute) : 1.00,
      maxDurationMinutes: row.max_duration_minutes || 30,
      powerConsumptionWatts: row.power_consumption_watts || 1200,
      kwhRate: row.kwh_rate ? parseFloat(row.kwh_rate) : 0.65,
      lastCleaningDate: row.last_cleaning_date,
      lastMaintenanceDate: row.last_maintenance_date,
      temperature: row.temperature ? parseFloat(row.temperature) : undefined,
      lastHeartbeat: row.last_heartbeat,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async findById(id: string): Promise<Machine | null> {
    const result = await db.query(
      'SELECT * FROM machines WHERE id = $1',
      [id]
    );
    
    return result.rows.length > 0 ? this.mapRowToMachine(result.rows[0]) : null;
  }

  async findAll(limit = 50, offset = 0): Promise<Machine[]> {
    const result = await db.query(
      'SELECT * FROM machines ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    return result.rows.map(this.mapRowToMachine);
  }

  async findByCode(code: string): Promise<Machine | null> {
    const result = await db.query(
      'SELECT * FROM machines WHERE code = $1',
      [code]
    );
    
    return result.rows.length > 0 ? this.mapRowToMachine(result.rows[0]) : null;
  }

  async findByControllerId(controllerId: string): Promise<Machine | null> {
    const result = await db.query(
      'SELECT * FROM machines WHERE controller_id = $1',
      [controllerId]
    );
    
    return result.rows.length > 0 ? this.mapRowToMachine(result.rows[0]) : null;
  }

  async findByStatus(status: 'online' | 'offline' | 'maintenance' | 'in_use'): Promise<Machine[]> {
    const result = await db.query(
      'SELECT * FROM machines WHERE status = $1',
      [status]
    );
    
    return result.rows.map(this.mapRowToMachine);
  }

  async create(data: CreateMachineInput, client?: PoolClient): Promise<Machine> {
    const executor = client || db;
    
    const result = await executor.query(
      `INSERT INTO machines (code, qr_code, location, controller_id, operating_hours_start, operating_hours_end, maintenance_interval, price_per_minute, max_duration_minutes, power_consumption_watts, kwh_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.code,
        data.qrCode,
        data.location,
        data.controllerId,
        data.operatingHours.start,
        data.operatingHours.end,
        data.maintenanceInterval,
        data.pricePerMinute || 1.00,
        data.maxDurationMinutes || 30,
        data.powerConsumptionWatts || 1200,
        data.kwhRate || 0.65
      ]
    );
    
    return this.mapRowToMachine(result.rows[0]);
  }

  async update(id: string, data: UpdateMachineInput, client?: PoolClient): Promise<Machine | null> {
    const executor = client || db;
    
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.location !== undefined) {
      fields.push(`location = $${paramCount++}`);
      values.push(data.location);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
    if (data.qrCode !== undefined) {
      fields.push(`qr_code = $${paramCount++}`);
      values.push(data.qrCode);
    }
    if (data.operatingHours !== undefined) {
      fields.push(`operating_hours_start = $${paramCount++}`);
      values.push(data.operatingHours.start);
      fields.push(`operating_hours_end = $${paramCount++}`);
      values.push(data.operatingHours.end);
    }
    if (data.maintenanceInterval !== undefined) {
      fields.push(`maintenance_interval = $${paramCount++}`);
      values.push(data.maintenanceInterval);
    }
    if (data.currentOperatingHours !== undefined) {
      fields.push(`current_operating_hours = $${paramCount++}`);
      values.push(data.currentOperatingHours);
    }
    if (data.temperature !== undefined) {
      fields.push(`temperature = $${paramCount++}`);
      values.push(data.temperature);
    }
    if (data.lastHeartbeat !== undefined) {
      fields.push(`last_heartbeat = $${paramCount++}`);
      values.push(data.lastHeartbeat);
    }
    if (data.pricePerMinute !== undefined) {
      fields.push(`price_per_minute = $${paramCount++}`);
      values.push(data.pricePerMinute);
    }
    if (data.maxDurationMinutes !== undefined) {
      fields.push(`max_duration_minutes = $${paramCount++}`);
      values.push(data.maxDurationMinutes);
    }
    if (data.powerConsumptionWatts !== undefined) {
      fields.push(`power_consumption_watts = $${paramCount++}`);
      values.push(data.powerConsumptionWatts);
    }
    if (data.kwhRate !== undefined) {
      fields.push(`kwh_rate = $${paramCount++}`);
      values.push(data.kwhRate);
    }
    if (data.lastCleaningDate !== undefined) {
      fields.push(`last_cleaning_date = $${paramCount++}`);
      values.push(data.lastCleaningDate);
    }
    if (data.lastMaintenanceDate !== undefined) {
      fields.push(`last_maintenance_date = $${paramCount++}`);
      values.push(data.lastMaintenanceDate);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    
    const result = await executor.query(
      `UPDATE machines SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    return result.rows.length > 0 ? this.mapRowToMachine(result.rows[0]) : null;
  }

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const executor = client || db;
    
    const result = await executor.query(
      'DELETE FROM machines WHERE id = $1',
      [id]
    );
    
    return result.rowCount > 0;
  }

  async updateStatus(machineId: string, status: 'online' | 'offline' | 'maintenance' | 'in_use', client?: PoolClient): Promise<Machine | null> {
    const executor = client || db;
    
    const result = await executor.query(
      'UPDATE machines SET status = $1 WHERE id = $2 RETURNING *',
      [status, machineId]
    );
    
    return result.rows.length > 0 ? this.mapRowToMachine(result.rows[0]) : null;
  }

  async updateHeartbeat(machineId: string, timestamp: Date, client?: PoolClient): Promise<Machine | null> {
    const executor = client || db;
    
    const result = await executor.query(
      'UPDATE machines SET last_heartbeat = $1 WHERE id = $2 RETURNING *',
      [timestamp, machineId]
    );
    
    return result.rows.length > 0 ? this.mapRowToMachine(result.rows[0]) : null;
  }

  async updateTemperature(machineId: string, temperature: number, client?: PoolClient): Promise<Machine | null> {
    const executor = client || db;
    
    const result = await executor.query(
      'UPDATE machines SET temperature = $1 WHERE id = $2 RETURNING *',
      [temperature, machineId]
    );
    
    return result.rows.length > 0 ? this.mapRowToMachine(result.rows[0]) : null;
  }

  async incrementOperatingHours(machineId: string, hours: number, client?: PoolClient): Promise<Machine | null> {
    const executor = client || db;
    
    const result = await executor.query(
      'UPDATE machines SET current_operating_hours = current_operating_hours + $1 WHERE id = $2 RETURNING *',
      [hours, machineId]
    );
    
    return result.rows.length > 0 ? this.mapRowToMachine(result.rows[0]) : null;
  }

  async findMaintenanceRequired(): Promise<Machine[]> {
    const result = await db.query(
      'SELECT * FROM machines WHERE current_operating_hours >= maintenance_interval AND status != $1',
      ['maintenance']
    );
    
    return result.rows.map(this.mapRowToMachine);
  }

  async findByLocation(location: string): Promise<Machine[]> {
    const result = await db.query(
      'SELECT * FROM machines WHERE location ILIKE $1',
      [`%${location}%`]
    );
    
    return result.rows.map(this.mapRowToMachine);
  }
}
