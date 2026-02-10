import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DealFormWizard } from '@/components/forms/deal-form-wizard';

export default async function NewDealPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/auth/login');

  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

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
