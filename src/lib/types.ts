// === User & Organization Types ===

export type UserRole = 'agent' | 'manager' | 'underwriter' | 'executive' | 'administrator';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  team_id: string | null;
  primary_office_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithRelations extends User {
  team?: Team | null;
  office?: Office | null;
}

export interface Office {
  id: string;
  name: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  office_id: string;
  manager_id: string | null;
  created_at: string;
  office?: Office;
  manager?: User | null;
}

// === Deal Types ===

export type DealType = 'lease' | 'retail_purchase' | 're_lease' | 'lease_buyout';

export type DealStatus =
  | 'pending'
  | 'pending_manager_review'
  | 'submitted_to_underwriting'
  | 'kicked_back_to_sales'
  | 'submitted_to_lender'
  | 'approved'
  | 'signed_and_delivered'
  | 'cancelled';

export type VehicleCondition = 'new' | 'used' | 'untitled_demo';

export interface Deal {
  id: string;
  deal_number: string;
  deal_type: DealType;
  status: DealStatus;
  submitted_by: string;
  assigned_manager: string;
  assigned_underwriter: string | null;
  vehicle_condition: VehicleCondition;
  vehicle_year: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_trim: string;
  vehicle_mileage: number | null;
  msrp: number | null;
  invoice: number | null;
  jd_power_retail: number | null;
  jd_power_wholesale: number | null;
  net_cap_cost: number | null;
  total_amount_financed: number | null;
  monthly_payment: number;
  has_trade_in: boolean;
  has_open_autos: boolean;
  has_business: boolean;
  business_legal_name: string | null;
  deal_strengths: string;
  has_derogatory_credit: boolean;
  derogatory_credit_explanation: string | null;
  num_applicants: number;
  created_at: string;
  updated_at: string;
}

export interface DealWithRelations extends Deal {
  submitter?: User;
  manager?: User;
  underwriter?: User | null;
  applicants?: DealApplicant[];
  trade_in?: DealTradeIn | null;
  open_autos?: DealOpenAuto[];
  documents?: DealDocument[];
  messages?: DealMessage[];
  status_history?: DealStatusHistory[];
}

export interface DealApplicant {
  id: string;
  deal_id: string;
  applicant_number: number;
  first_name: string;
  last_name: string;
  experian_score: number;
  has_alternate_bureau: boolean;
  alternate_bureau: 'equifax' | 'transunion' | null;
  alternate_score: number | null;
}

export interface DealTradeIn {
  id: string;
  deal_id: string;
  year: string;
  make: string;
  model: string;
  monthly_payment: number;
  lienholder: string;
  who_drives: string;
}

export interface DealOpenAuto {
  id: string;
  deal_id: string;
  auto_number: number;
  lienholder: string;
  monthly_payment: number;
  who_drives: string;
}

export type DocumentType =
  | 'cybercalc'
  | 'cyberretail'
  | 'credit_application'
  | 'credit_bureau'
  | 'jd_power_book_outs'
  | 'business_credit_app'
  | 'alternate_credit_bureau'
  | 'proof_of_income'
  | 'ipacket'
  | 'other';

export interface DealDocument {
  id: string;
  deal_id: string;
  document_type: DocumentType;
  applicant_id: string | null;
  original_filename: string;
  storage_path: string;
  display_name: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  replaced_by: string | null;
  replaced_at: string | null;
}

export type MessageType = 'note' | 'action_required';

export interface DealMessage {
  id: string;
  deal_id: string;
  sender_id: string;
  message_type: MessageType;
  content: string;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  sender?: User;
  views?: DealMessageView[];
}

export interface DealMessageView {
  id: string;
  message_id: string;
  viewed_by: string;
  viewed_at: string;
  viewer?: User;
}

export interface DealStatusHistory {
  id: string;
  deal_id: string;
  from_status: DealStatus | null;
  to_status: DealStatus;
  changed_by: string;
  changed_at: string;
  notes: string | null;
  changer?: User;
}

export interface DealFieldChange {
  id: string;
  deal_id: string;
  field_name: string;
  old_value: string;
  new_value: string;
  changed_by: string;
  changed_at: string;
  changer?: User;
}

export type AssignmentType = 'underwriter_claim' | 'reassignment';

export interface DealAssignment {
  id: string;
  deal_id: string;
  assigned_to: string;
  assigned_by: string | null;
  assignment_type: AssignmentType;
  assigned_at: string;
}

// === Form Types ===

export interface DealFormData {
  // Step 1: Deal Setup
  deal_type: DealType | '';
  num_applicants: number;
  adding_business: boolean;

  // Step 2: Applicant Information
  applicants: ApplicantFormData[];
  business_legal_name: string;

  // Step 3: Vehicle Information
  vehicle_condition: VehicleCondition | '';
  vehicle_year: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_trim: string;
  vehicle_mileage: string;
  msrp: string;
  invoice: string;
  jd_power_retail: string;
  jd_power_wholesale: string;
  net_cap_cost: string;
  total_amount_financed: string;
  monthly_payment: string;

  // Step 4: Trade-In
  has_trade_in: boolean | null;
  trade_in: TradeInFormData;

  // Step 5: Open Autos
  has_open_autos: boolean | null;
  num_open_autos: number;
  open_autos: OpenAutoFormData[];

  // Step 6: Credit
  deal_strengths: string;
  has_derogatory_credit: boolean | null;
  derogatory_credit_explanation: string;
}

export interface ApplicantFormData {
  first_name: string;
  last_name: string;
  experian_score: string;
  has_alternate_bureau: boolean;
  alternate_bureau: 'equifax' | 'transunion' | '';
  alternate_score: string;
}

export interface TradeInFormData {
  year: string;
  make: string;
  model: string;
  monthly_payment: string;
  lienholder: string;
  who_drives: string;
}

export interface OpenAutoFormData {
  lienholder: string;
  monthly_payment: string;
  who_drives: string;
}

// === Dashboard Types ===

export interface DealListItem {
  id: string;
  deal_number: string;
  deal_type: DealType;
  status: DealStatus;
  client_name: string;
  vehicle_summary: string;
  deal_age_seconds: number;
  pending_timer_seconds: number | null;
  has_action_items: boolean;
  unresolved_action_count: number;
  assigned_underwriter_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  deal_id: string;
  deal_number: string;
  client_name: string;
  type: 'kickback' | 'action_required' | 'new_submission' | 'unassigned';
  message?: string;
  created_at: string;
  urgency: 'green' | 'yellow' | 'red';
}

// === Reporting Types ===

export interface ResponseTimeMetric {
  label: string;
  avg_hours: number;
  median_hours: number;
  count: number;
}

export interface VolumeMetric {
  label: string;
  count: number;
  period: string;
}

export interface QualityMetric {
  label: string;
  value: number;
  unit: string;
}

// === Timer Config ===

export interface TimerThreshold {
  green_max_hours: number;
  yellow_max_hours: number;
}

export interface TimerConfig {
  manager_review: TimerThreshold;
  agent_response: TimerThreshold;
  underwriter_pickup: TimerThreshold;
  underwriter_review: TimerThreshold;
}
