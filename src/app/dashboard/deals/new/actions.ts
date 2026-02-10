'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { DealFormData } from '@/lib/types';

export async function submitDeal(formData: DealFormData) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error('Not authenticated');

  const { data: userProfile } = await supabase
    .from('users')
    .select('*, team:teams!users_team_id_fkey(manager_id)')
    .eq('id', authUser.id)
    .single();

  if (!userProfile) throw new Error('User profile not found');

  // Determine the manager: use team manager, or for admins without a team, self-assign
  let managerId = userProfile.team?.manager_id;
  if (!managerId) {
    if (userProfile.role === 'administrator') {
      managerId = authUser.id;
    } else {
      throw new Error('No manager assigned to your team. Please contact an administrator.');
    }
  }

  // Determine vehicle condition
  let vehicleCondition = formData.vehicle_condition;
  if (formData.deal_type === 're_lease' || formData.deal_type === 'retail_purchase' || formData.deal_type === 'lease_buyout') {
    vehicleCondition = 'used';
  }

  // Insert deal
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .insert({
      deal_type: formData.deal_type,
      status: 'submitted_to_manager',
      submitted_by: authUser.id,
      assigned_manager: managerId,
      num_applicants: formData.num_applicants,
      vehicle_condition: vehicleCondition,
      vehicle_year: formData.vehicle_year,
      vehicle_make: formData.vehicle_make,
      vehicle_model: formData.vehicle_model,
      vehicle_trim: formData.vehicle_trim,
      vehicle_mileage: formData.vehicle_mileage ? parseInt(formData.vehicle_mileage) : null,
      msrp: formData.msrp ? parseFloat(formData.msrp) : null,
      invoice: formData.invoice ? parseFloat(formData.invoice) : null,
      jd_power_retail: formData.jd_power_retail ? parseFloat(formData.jd_power_retail) : null,
      jd_power_wholesale: formData.jd_power_wholesale ? parseFloat(formData.jd_power_wholesale) : null,
      net_cap_cost: formData.net_cap_cost ? parseFloat(formData.net_cap_cost) : null,
      total_amount_financed: formData.total_amount_financed ? parseFloat(formData.total_amount_financed) : null,
      monthly_payment: parseFloat(formData.monthly_payment),
      has_trade_in: formData.has_trade_in === true,
      has_open_autos: formData.has_open_autos === true,
      has_business: formData.adding_business,
      business_legal_name: formData.adding_business ? formData.business_legal_name : null,
      deal_strengths: formData.deal_strengths,
      has_derogatory_credit: formData.has_derogatory_credit === true,
      derogatory_credit_explanation: formData.has_derogatory_credit ? formData.derogatory_credit_explanation : null,
    })
    .select()
    .single();

  if (dealError) throw new Error(dealError.message);

  // Insert applicants
  for (let i = 0; i < formData.num_applicants; i++) {
    const app = formData.applicants[i];
    await supabase.from('deal_applicants').insert({
      deal_id: deal.id,
      applicant_number: i + 1,
      first_name: app.first_name,
      last_name: app.last_name,
      experian_score: parseInt(app.experian_score),
      has_alternate_bureau: app.has_alternate_bureau,
      alternate_bureau: app.has_alternate_bureau ? app.alternate_bureau || null : null,
      alternate_score: app.has_alternate_bureau && app.alternate_score ? parseInt(app.alternate_score) : null,
    });
  }

  // Insert trade-in if applicable
  if (formData.has_trade_in) {
    await supabase.from('deal_trade_ins').insert({
      deal_id: deal.id,
      year: formData.trade_in.year,
      make: formData.trade_in.make,
      model: formData.trade_in.model,
      monthly_payment: parseFloat(formData.trade_in.monthly_payment),
      lienholder: formData.trade_in.lienholder,
      who_drives: formData.trade_in.who_drives,
    });
  }

  // Insert open autos if applicable
  if (formData.has_open_autos) {
    for (let i = 0; i < formData.num_open_autos; i++) {
      const auto = formData.open_autos[i];
      await supabase.from('deal_open_autos').insert({
        deal_id: deal.id,
        auto_number: i + 1,
        lienholder: auto.lienholder,
        monthly_payment: parseFloat(auto.monthly_payment),
        who_drives: auto.who_drives,
      });
    }
  }

  // Insert initial status history
  await supabase.from('deal_status_history').insert({
    deal_id: deal.id,
    from_status: null,
    to_status: 'submitted_to_manager',
    changed_by: authUser.id,
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/deals');
  return { dealId: deal.id, dealNumber: deal.deal_number };
}
