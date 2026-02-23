import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DealFormWizard } from '@/components/forms/deal-form-wizard';

export default async function NewDealPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/auth/login');

  // Try full query with office FK join first
  let { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select(`
      *,
      team:teams!users_team_id_fkey(*, office:offices(*)),
      office:offices!users_primary_office_id_fkey(*)
    `)
    .eq('id', authUser.id)
    .single();

  // Fallback: if query fails (e.g. corrupted primary_office_id), retry without office FK join
  if (profileError && !userProfile) {
    console.warn('New deal page profile query failed, retrying without office join:', profileError.message);
    ({ data: userProfile } = await supabase
      .from('users')
      .select('*, team:teams!users_team_id_fkey(*, office:offices(*))')
      .eq('id', authUser.id)
      .single());
  }

  if (!userProfile || (userProfile.role !== 'agent' && userProfile.role !== 'administrator')) {
    redirect('/dashboard');
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Submit Deal for Underwriting</h1>
        <p className="text-surface-500 mt-1">Fill out the form below to submit a new deal for approval.</p>
      </div>
      <DealFormWizard user={userProfile} />
    </div>
  );
}
