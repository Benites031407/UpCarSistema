import { PoolClient } from 'pg';

export interface BaseRepository<T, CreateInput, UpdateInput> {
  findById(id: string): Promise<T | null>;
  findAll(limit?: number, offset?: number): Promise<T[]>;
  create(data: CreateInput, client?: PoolClient): Promise<T>;
  update(id: string, data: UpdateInput, client?: PoolClient): Promise<T | null>;
  delete(id: string, client?: PoolClient): Promise<boolean>;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface SearchOptions extends QueryOptions {
  filters?: Record<string, any>;
}