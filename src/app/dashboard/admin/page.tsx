import { createClient } from '@/lib/supabase/server';
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
    .select('*, team:teams(*, office:offices(*)), office:offices(*)')
    .order('last_name');

  const { data: offices } = await supabase
    .from('offices')
    .select('*')
    .order('name');

  const { data: teams } = await supabase
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
