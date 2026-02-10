import { DealStatus, DealType, DocumentType, UserRole, VehicleCondition, TimerConfig } from './types';

// === Role Display Names ===
export const ROLE_LABELS: Record<UserRole, string> = {
  agent: 'Agent',
  manager: 'Manager',
  underwriter: 'Underwriter',
  executive: 'Executive',
  administrator: 'Administrator',
};

// === Deal Type Labels ===
export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  lease: 'Lease',
  retail_purchase: 'Retail Purchase',
  re_lease: 'Re-Lease',
  lease_buyout: 'Lease Buy-out',
};

// === Deal Status Labels & Colors ===
export const DEAL_STATUS_CONFIG: Record<DealStatus, { label: string; color: string; bgColor: string }> = {
  submitted_to_manager: { label: 'Submitted to Manager', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  manager_reviewing: { label: 'Manager Reviewing', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  sent_to_underwriting: { label: 'Sent to Underwriting', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  underwriting_assigned: { label: 'Underwriting Assigned', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  underwriting_reviewing: { label: 'Underwriting Reviewing', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  kicked_back_to_manager: { label: 'Kicked Back to Manager', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  kicked_back_to_agent: { label: 'Kicked Back to Agent', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  resubmitted_to_manager: { label: 'Resubmitted to Manager', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  resubmitted_to_underwriting: { label: 'Resubmitted to Underwriting', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-50' },
  cancelled: { label: 'Cancelled', color: 'text-surface-600', bgColor: 'bg-surface-100' },
};

// === Vehicle Condition Labels ===
export const VEHICLE_CONDITION_LABELS: Record<VehicleCondition, string> = {
  new: 'New',
  used: 'Used',
  untitled_demo: 'Untitled Demo',
};

// === Document Type Labels ===
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  cybercalc: 'Cybercalc',
  cyberretail: 'Cyberretail',
  credit_application: 'Credit Application',
  credit_bureau: 'Credit Bureau',
  jd_power_book_outs: 'JD Power Book Outs',
  business_credit_app: 'Business Credit Application',
  alternate_credit_bureau: 'Alternate Credit Bureau',
  proof_of_income: 'Proof of Income',
  ipacket: 'iPacket',
  other: 'Other',
};

// === Required Documents by Deal Type ===
export const REQUIRED_DOCUMENTS: Record<DealType, DocumentType[]> = {
  lease: ['cybercalc', 'credit_application', 'credit_bureau'],
  re_lease: ['cybercalc', 'credit_application', 'credit_bureau', 'jd_power_book_outs'],
  retail_purchase: ['cyberretail', 'credit_application', 'credit_bureau', 'jd_power_book_outs'],
  lease_buyout: ['cyberretail', 'credit_application', 'credit_bureau', 'jd_power_book_outs'],
};

// JD Power required only for used vehicles on lease deals
export const CONDITIONAL_DOCUMENTS = {
  jd_power_used_lease: 'jd_power_book_outs' as DocumentType,
  business_credit_app: 'business_credit_app' as DocumentType,
  alternate_credit_bureau: 'alternate_credit_bureau' as DocumentType,
};

// === Optional Documents (always visible) ===
export const OPTIONAL_DOCUMENTS: DocumentType[] = ['proof_of_income', 'ipacket', 'other'];

// === Office Configuration ===
export const OFFICES = [
  { name: 'Fort Worth', teamCount: 4 },
  { name: 'Dallas', teamCount: 4 },
  { name: 'Houston', teamCount: 3 },
  { name: 'Austin', teamCount: 1 },
  { name: 'DLR', teamCount: 2 },
  { name: 'Four Stars Ford', teamCount: 1 },
  { name: 'Four Stars Auto Ranch', teamCount: 1 },
  { name: 'Four Stars Toyota', teamCount: 1 },
  { name: 'Four Stars Nissan', teamCount: 1 },
] as const;

// === Status Transitions (who can make which transitions) ===
export const STATUS_TRANSITIONS: Record<DealStatus, { next: DealStatus[]; roles: UserRole[] }> = {
  submitted_to_manager: {
    next: ['manager_reviewing'],
    roles: ['manager', 'administrator'],
  },
  manager_reviewing: {
    next: ['sent_to_underwriting', 'kicked_back_to_agent', 'cancelled'],
    roles: ['manager', 'administrator'],
  },
  sent_to_underwriting: {
    next: ['underwriting_assigned'],
    roles: ['underwriter', 'administrator'],
  },
  underwriting_assigned: {
    next: ['underwriting_reviewing'],
    roles: ['underwriter', 'administrator'],
  },
  underwriting_reviewing: {
    next: ['kicked_back_to_manager', 'completed'],
    roles: ['underwriter', 'administrator'],
  },
  kicked_back_to_manager: {
    next: ['kicked_back_to_agent', 'resubmitted_to_underwriting', 'cancelled'],
    roles: ['manager', 'administrator'],
  },
  kicked_back_to_agent: {
    next: ['resubmitted_to_manager'],
    roles: ['agent', 'administrator'],
  },
  resubmitted_to_manager: {
    next: ['sent_to_underwriting', 'kicked_back_to_agent', 'resubmitted_to_underwriting', 'cancelled'],
    roles: ['manager', 'administrator'],
  },
  resubmitted_to_underwriting: {
    next: ['underwriting_reviewing', 'kicked_back_to_manager', 'completed'],
    roles: ['underwriter', 'administrator'],
  },
  completed: {
    next: [],
    roles: [],
  },
  cancelled: {
    next: [],
    roles: [],
  },
};

// === Default Timer Thresholds (hours) ===
export const DEFAULT_TIMER_CONFIG: TimerConfig = {
  manager_review: { green_max_hours: 2, yellow_max_hours: 4 },
  agent_response: { green_max_hours: 4, yellow_max_hours: 8 },
  underwriter_pickup: { green_max_hours: 1, yellow_max_hours: 2 },
  underwriter_review: { green_max_hours: 4, yellow_max_hours: 8 },
};

// === Form Steps ===
export const FORM_STEPS = [
  { id: 1, title: 'Deal Setup', description: 'Choose deal type and applicant count' },
  { id: 2, title: 'Applicant Info', description: 'Enter applicant details' },
  { id: 3, title: 'Vehicle Info', description: 'Vehicle details and pricing' },
  { id: 4, title: 'Trade-In', description: 'Trade-in vehicle details' },
  { id: 5, title: 'Open Autos', description: 'Other vehicles on credit' },
  { id: 6, title: 'Credit & Strengths', description: 'Credit scores and deal strengths' },
  { id: 7, title: 'Documents', description: 'Upload required documents' },
] as const;

// === Portal Modules ===
export const PORTAL_MODULES = [
  {
    id: 'underwriting',
    title: 'Submit Deal for Underwriting Approval',
    description: 'Submit a new deal through the structured approval workflow',
    icon: 'ClipboardDocumentCheck',
    href: '/deals/new',
    available: true,
  },
  {
    id: 'finance_printing',
    title: 'Submit Deal to Finance for Printing',
    description: 'Send approved deals to the finance team for document preparation',
    icon: 'PrinterIcon',
    href: '#',
    available: false,
  },
  {
    id: 'wire_request',
    title: 'Submit Wire Request',
    description: 'Submit wire transfer requests for deal funding',
    icon: 'BanknotesIcon',
    href: '#',
    available: false,
  },
] as const;
