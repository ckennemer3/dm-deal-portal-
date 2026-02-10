// === Storage Service Interface ===
// Abstract interface for file storage. Supabase Storage now, Azure Blob later.

export interface StorageServiceInterface {
  upload(bucket: string, path: string, file: File): Promise<{ path: string; error: string | null }>;
  download(bucket: string, path: string): Promise<{ data: Blob | null; error: string | null }>;
  getSignedUrl(bucket: string, path: string, expiresIn?: number): Promise<{ url: string | null; error: string | null }>;
  delete(bucket: string, paths: string[]): Promise<{ error: string | null }>;
  replace(bucket: string, path: string, file: File): Promise<{ path: string; error: string | null }>;
}

import { createClient } from '@/lib/supabase/client';

export class SupabaseStorageService implements StorageServiceInterface {
  private supabase = createClient();

  async upload(bucket: string, path: string, file: File) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) return { path: '', error: error.message };
    return { path: data.path, error: null };
  }

  async download(bucket: string, path: string) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .download(path);

    if (error) return { data: null, error: error.message };
    return { data, error: null };
  }

  async getSignedUrl(bucket: string, path: string, expiresIn: number = 3600) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) return { url: null, error: error.message };
    return { url: data.signedUrl, error: null };
  }

  async delete(bucket: string, paths: string[]) {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove(paths);

    if (error) return { error: error.message };
    return { error: null };
  }

  async replace(bucket: string, path: string, file: File) {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .update(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) return { path: '', error: error.message };
    return { path: data.path, error: null };
  }
}

export const storageService = new SupabaseStorageService();
