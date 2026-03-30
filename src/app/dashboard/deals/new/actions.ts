'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { DealFormData } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Builds the flat insert payload for the deals table, converting string form
 * values to the correct numeric types and applying conditional defaults.
 */
function buildDealInsertData(
  formData: DealFormData,
  authUserId: string,
  managerId: string,
  vehicleCondition: string | null
) {
  return {
    deal_type: formData.deal_type,
    status: 'pending_manager_review' as const,
    submitted_by: authUserId,
    assigned_manager: managerId,
    num_applicants: formData.num_applicants,
    vehicle_condition: vehicleCondition,
    vehicle_year: formData.vehicle_year,
    vehicle_make: formData.vehicle_make,
    vehicle_model: formData.vehicle_model,
    vehicle_trim: formData.vehicle_trim,
    vehicle_mileage: formData.vehicle_mileage ? Number.parseInt(formData.vehicle_mileage) : null,
    msrp: formData.msrp ? Number.parseFloat(formData.msrp) : null,
    invoice: formData.invoice ? Number.parseFloat(formData.invoice) : null,
    jd_power_retail: formData.jd_power_retail ? Number.parseFloat(formData.jd_power_retail) : null,
    jd_power_wholesale: formData.jd_power_wholesale ? Number.parseFloat(formData.jd_power_wholesale) : null,
    net_cap_cost: formData.net_cap_cost ? Number.parseFloat(formData.net_cap_cost) : null,
    total_amount_financed: formData.total_amount_financed ? Number.parseFloat(formData.total_amount_financed) : null,
    monthly_payment: Number.parseFloat(formData.monthly_payment),
    term: formData.term ? Number.parseInt(formData.term) : null,
    has_trade_in: formData.has_trade_in === true,
    has_open_autos: formData.has_open_autos === true,
    has_business: formData.adding_business,
    business_legal_name: formData.adding_business ? formData.business_legal_name : null,
    deal_strengths: formData.deal_strengths,
    has_derogatory_credit: formData.has_derogatory_credit === true,
    derogatory_credit_explanation: formData.has_derogatory_credit ? formData.derogatory_credit_explanation : null,
  };
}

/**
 * Inserts deal_applicants rows for each applicant in the form data.
 */
async function insertApplicants(
  supabase: SupabaseClient,
  dealId: string,
  applicants: DealFormData['applicants'],
  numApplicants: number
) {
  for (let i = 0; i < numApplicants; i++) {
    const app = applicants[i];
    await supabase.from('deal_applicants').insert({
      deal_id: dealId,
      applicant_number: i + 1,
      first_name: app.first_name,
      last_name: app.last_name,
      experian_score: Number.parseInt(app.experian_score),
      has_alternate_bureau: app.has_alternate_bureau,
      alternate_bureau: app.has_alternate_bureau ? app.alternate_bureau || null : null,
      alternate_score: app.has_alternate_bureau && app.alternate_score ? Number.parseInt(app.alternate_score) : null,
    });
  }
}

/**
 * Inserts a deal_trade_ins row for the given deal.
 */
async function insertTradeIn(
  supabase: SupabaseClient,
  dealId: string,
  tradeIn: DealFormData['trade_in']
) {
  await supabase.from('deal_trade_ins').insert({
    deal_id: dealId,
    year: tradeIn.year,
    make: tradeIn.make,
    model: tradeIn.model,
    monthly_payment: Number.parseFloat(tradeIn.monthly_payment),
    lienholder: tradeIn.lienholder,
    who_drives: tradeIn.who_drives,
  });
}

/**
 * Inserts deal_open_autos rows for each open auto in the form data.
 */
async function insertOpenAutos(
  supabase: SupabaseClient,
  dealId: string,
  openAutos: DealFormData['open_autos'],
  numOpenAutos: number
) {
  for (let i = 0; i < numOpenAutos; i++) {
    const auto = openAutos[i];
    await supabase.from('deal_open_autos').insert({
      deal_id: dealId,
      auto_number: i + 1,
      lienholder: auto.lienholder,
      monthly_payment: Number.parseFloat(auto.monthly_payment),
      who_drives: auto.who_drives,
    });
  }
}

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

  // Determine vehicle condition — used deal types always set condition to 'used'
  const USED_DEAL_TYPES = ['re_lease', 'retail_purchase', 'lease_buyout'];
  const vehicleCondition = USED_DEAL_TYPES.includes(formData.deal_type) ? 'used' : formData.vehicle_condition;

  // Insert deal
  const insertData = buildDealInsertData(formData, authUser.id, managerId, vehicleCondition);
  const { data: deal, error: dealError } = await supabase.from('deals').insert(insertData).select().single();
  if (dealError) throw new Error(dealError.message);

  // Insert applicants
  await insertApplicants(supabase, deal.id, formData.applicants, formData.num_applicants);

  // Insert trade-in if applicable
  if (formData.has_trade_in) {
    await insertTradeIn(supabase, deal.id, formData.trade_in);
  }

  // Insert open autos if applicable
  if (formData.has_open_autos) {
    await insertOpenAutos(supabase, deal.id, formData.open_autos, formData.num_open_autos);
  }

  // Insert initial status history
  await supabase.from('deal_status_history').insert({
    deal_id: deal.id,
    from_status: null,
    to_status: 'pending_manager_review',
    changed_by: authUser.id,
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/deals');
  return { dealId: deal.id, dealNumber: deal.deal_number };
}
