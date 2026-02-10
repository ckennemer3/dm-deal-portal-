import { User, UserRole, UserWithRelations } from '@/lib/types';

// === Auth Service Interface ===
// Abstract interface for authentication. Supabase implementation now, Azure AD later.

export interface AuthServiceInterface {
  getCurrentUser(): Promise<UserWithRelations | null>;
  signIn(email: string, password: string): Promise<{ user: UserWithRelations | null; error: string | null }>;
  signUp(email: string, password: string, metadata: { first_name: string; last_name: string }): Promise<{ user: UserWithRelations | null; error: string | null }>;
  signOut(): Promise<void>;
  getUserById(id: string): Promise<UserWithRelations | null>;
  updateUserRole(userId: string, role: UserRole): Promise<void>;
  updateUserProfile(userId: string, data: Partial<User>): Promise<void>;
  listUsers(filters?: { role?: UserRole; team_id?: string; office_id?: string; is_active?: boolean }): Promise<UserWithRelations[]>;
}

// === Supabase Implementation ===

import { createClient } from '@/lib/supabase/client';

export class SupabaseAuthService implements AuthServiceInterface {
  private supabase = createClient();

  async getCurrentUser(): Promise<UserWithRelations | null> {
    const { data: { user: authUser } } = await this.supabase.auth.getUser();
    if (!authUser) return null;

    const { data, error } = await this.supabase
      .from('users')
      .select(`
        *,
        team:teams(*, office:offices(*)),
        office:offices(*)
      `)
      .eq('id', authUser.id)
      .single();

    if (error || !data) return null;
    return data as UserWithRelations;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { user: null, error: error.message };

    const user = await this.getCurrentUser();
    return { user, error: null };
  }

  async signUp(email: string, password: string, metadata: { first_name: string; last_name: string }) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) return { user: null, error: error.message };

    const user = await this.getCurrentUser();
    return { user, error: null };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  async getUserById(id: string): Promise<UserWithRelations | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select(`
        *,
        team:teams(*, office:offices(*)),
        office:offices(*)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as UserWithRelations;
  }

  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw new Error(error.message);
  }

  async updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw new Error(error.message);
  }

  async listUsers(filters?: { role?: UserRole; team_id?: string; office_id?: string; is_active?: boolean }): Promise<UserWithRelations[]> {
    let query = this.supabase
      .from('users')
      .select(`
        *,
        team:teams(*, office:offices(*)),
        office:offices(*)
      `)
      .order('last_name');

    if (filters?.role) query = query.eq('role', filters.role);
    if (filters?.team_id) query = query.eq('team_id', filters.team_id);
    if (filters?.office_id) query = query.eq('primary_office_id', filters.office_id);
    if (filters?.is_active !== undefined) query = query.eq('is_active', filters.is_active);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as UserWithRelations[];
  }
}

// Singleton export
export const authService = new SupabaseAuthService();
