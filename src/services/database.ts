// === Database Service ===
// Utility layer for database operations. Uses Supabase client now, portable to Azure SQL.

import { createClient } from '@/lib/supabase/client';

export class DatabaseService {
  private supabase = createClient();

  // Generic query helper
  async query<T>(table: string, options?: {
    select?: string;
    filters?: Record<string, unknown>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  }): Promise<T[]> {
    let query = this.supabase.from(table).select(options?.select || '*');

    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    if (options?.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
    }

    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.range(options.offset, options.offset + (options?.limit || 10) - 1);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as T[];
  }

  // Get single record
  async getById<T>(table: string, id: string, select?: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(table)
      .select(select || '*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as T;
  }

  // Insert record
  async insert<T>(table: string, record: Partial<T>): Promise<T> {
    const { data, error } = await this.supabase
      .from(table)
      .insert(record)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as T;
  }

  // Update record
  async update<T>(table: string, id: string, updates: Partial<T>): Promise<T> {
    const { data, error } = await this.supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as T;
  }

  // Delete record
  async delete(table: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  // Raw RPC call (for stored procedures / functions)
  async rpc<T>(functionName: string, params?: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.supabase.rpc(functionName, params);
    if (error) throw new Error(error.message);
    return data as T;
  }
}

export const databaseService = new DatabaseService();
