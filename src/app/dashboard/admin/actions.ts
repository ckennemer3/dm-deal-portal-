'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { UserRole } from '@/lib/types';

export async function createUser(formData: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  team_id: string | null;
  primary_office_id: string | null;
}) {
  const supabase = await createClient();

  // Verify admin
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error('Not authenticated');

  const { data: admin } = await supabase.from('users').select('role').eq('id', authUser.id).single();
  if (admin?.role !== 'administrator') throw new Error('Not authorized');

  // Create auth user via admin API — requires service_role key
  const adminClient = createAdminClient();
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true,
    user_metadata: {
      first_name: formData.first_name,
      last_name: formData.last_name,
    },
  });

  if (authError) throw new Error(authError.message);

  // Update the user record (created by trigger) with role and team
  // Use admin client here too so RLS doesn't block the update
  if (authData.user) {
    const { error: updateError } = await adminClient
      .from('users')
      .update({
        role: formData.role,
        team_id: formData.team_id,
        primary_office_id: formData.primary_office_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
      })
      .eq('id', authData.user.id);

    if (updateError) throw new Error(updateError.message);
  }

  revalidatePath('/admin');
  return { success: true };
}

export async function updateUser(
  userId: string,
  data: {
    first_name?: string;
    last_name?: string;
    role?: UserRole;
    team_id?: string | null;
    primary_office_id?: string | null;
    is_active?: boolean;
  }
) {
  const supabase = await createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error('Not authenticated');

  const { data: admin } = await supabase.from('users').select('role').eq('id', authUser.id).single();
  if (admin?.role !== 'administrator') throw new Error('Not authorized');

  const { error } = await supabase
    .from('users')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  revalidatePath('/admin');
  return { success: true };
}

export async function createTeam(data: { name: string; office_id: string; manager_id: string | null }) {
  const supabase = await createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error('Not authenticated');

  const { data: admin } = await supabase.from('users').select('role').eq('id', authUser.id).single();
  if (admin?.role !== 'administrator') throw new Error('Not authorized');

  const { error } = await supabase.from('teams').insert(data);
  if (error) throw new Error(error.message);

  revalidatePath('/admin');
  return { success: true };
}

export async function updateTeam(teamId: string, data: { name?: string; office_id?: string; manager_id?: string | null }) {
  const supabase = await createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error('Not authenticated');

  const { data: admin } = await supabase.from('users').select('role').eq('id', authUser.id).single();
  if (admin?.role !== 'administrator') throw new Error('Not authorized');

  const { error } = await supabase.from('teams').update(data).eq('id', teamId);
  if (error) throw new Error(error.message);

  revalidatePath('/admin');
  return { success: true };
}
