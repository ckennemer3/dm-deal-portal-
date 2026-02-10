import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/auth/login');
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select(`
      *,
      team:teams!users_team_id_fkey(*, office:offices(*)),
      office:offices!users_primary_office_id_fkey(*)
    `)
    .eq('id', authUser.id)
    .single();

  if (!userProfile) {
    console.error('Failed to load user profile:', profileError);
    // Sign out to break potential redirect loop
    await supabase.auth.signOut();
    redirect('/auth/login');
  }

  return <DashboardShell user={userProfile}>{children}</DashboardShell>;
}
