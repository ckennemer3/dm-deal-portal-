import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminPanel } from '@/components/admin/admin-panel';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/auth/login');

  const { data: currentUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (!currentUser || currentUser.role !== 'administrator') {
    redirect('/dashboard');
  }

  const { data: users } = await supabase
    .from('users')
    .select('*, team:teams!users_team_id_fkey(*, office:offices(*)), office:offices(*)')
    .order('last_name');

  const { data: offices } = await supabase
    .from('offices')
    .select('*')
    .order('name');

  // Use admin client for teams query to bypass RLS — the users table has
  // restrictive SELECT policies that cause teams with NULL manager_id to be
  // silently excluded when joined via the regular RLS-enforced client.
  const adminClient = createAdminClient();
  const { data: teams } = await adminClient
    .from('teams')
    .select('*, office:offices(*), manager:users!teams_manager_id_fkey(id, first_name, last_name)')
    .order('name');

  return (
    <AdminPanel
      users={users || []}
      offices={offices || []}
      teams={teams || []}
    />
  );
}
