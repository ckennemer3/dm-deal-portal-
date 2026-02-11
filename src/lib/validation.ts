import { z } from 'zod';

// === Reusable Schemas ===

const uuidSchema = z.string().uuid('Must be a valid UUID');

const numericStringSchema = (min?: number, max?: number) => {
  let schema = z.string().refine((val) => !isNaN(Number(val)), {
    message: 'Must be a valid number',
  });
  if (min !== undefined) {
    schema = schema.refine((val) => Number(val) >= min, {
      message: `Must be at least ${min}`,
    });
  }
  if (max !== undefined) {
    schema = schema.refine((val) => Number(val) <= max, {
      message: `Must be at most ${max}`,
    });
  }
  return schema;
};

// === Deal Status & Type Enums ===

const dealTypeValues = ['lease', 'retail_purchase', 're_lease', 'lease_buyout'] as const;
const dealStatusValues = [
  'pending',
  'pending_manager_review',
  'submitted_to_underwriting',
  'kicked_back_to_sales',
  'submitted_to_lender',
  'approved',
  'signed_and_delivered',
  'cancelled',
] as const;
const userRoleValues = ['agent', 'manager', 'underwriter', 'executive', 'administrator'] as const;
const vehicleConditionValues = ['new', 'used', 'untitled_demo', ''] as const;

// === Applicant Schema ===

const applicantSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
  experian_score: numericStringSchema(300, 850),
  has_alternate_bureau: z.boolean(),
  alternate_bureau: z.enum(['equifax', 'transunion', '']).optional(),
  alternate_score: z.string().optional(),
});

// === Trade-In Schema ===

const tradeInSchema = z.object({
  year: z.string(),
  make: z.string(),
  model: z.string(),
  monthly_payment: z.string(),
  lienholder: z.string(),
  who_drives: z.string(),
});

// === Open Auto Schema ===

const openAutoSchema = z.object({
  lienholder: z.string(),
  monthly_payment: z.string(),
  who_drives: z.string(),
});

// === 1. Submit Deal Schema ===

export const submitDealSchema = z.object({
  deal_type: z.enum(dealTypeValues, { message: 'Invalid deal type' }),
  num_applicants: z.number().int().min(1).max(3),
  adding_business: z.boolean(),

  applicants: z.array(applicantSchema).min(1, 'At least one applicant is required'),

  business_legal_name: z.string(),

  vehicle_condition: z.enum(vehicleConditionValues),
  vehicle_year: z.string().regex(/^\d{4}$/, 'Vehicle year must be 4 digits'),
  vehicle_make: z.string().min(1, 'Vehicle make is required'),
  vehicle_model: z.string().min(1, 'Vehicle model is required'),
  vehicle_trim: z.string().min(1, 'Vehicle trim is required'),
  vehicle_mileage: z.string().optional(),

  msrp: z.string().optional(),
  invoice: z.string().optional(),
  jd_power_retail: z.string().optional(),
  jd_power_wholesale: z.string().optional(),
  net_cap_cost: z.string().optional(),
  total_amount_financed: z.string().optional(),

  term: z.string().optional().refine(
    (val) => !val || (!isNaN(Number(val)) && Number(val) > 0 && Number.isInteger(Number(val))),
    { message: 'Term must be a positive whole number' }
  ),
  monthly_payment: numericStringSchema(0.01),

  has_trade_in: z.boolean().nullable(),
  trade_in: tradeInSchema,

  has_open_autos: z.boolean().nullable(),
  num_open_autos: z.number().int().min(1).max(10),
  open_autos: z.array(openAutoSchema),

  deal_strengths: z.string().min(1, 'Deal strengths are required'),
  has_derogatory_credit: z.boolean().nullable(),
  derogatory_credit_explanation: z.string(),
}).refine(
  (data) => {
    if (data.adding_business && (!data.business_legal_name || data.business_legal_name.trim() === '')) {
      return false;
    }
    return true;
  },
  { message: 'Business legal name is required when adding a business', path: ['business_legal_name'] }
).refine(
  (data) => {
    if (data.has_derogatory_credit === true && (!data.derogatory_credit_explanation || data.derogatory_credit_explanation.trim() === '')) {
      return false;
    }
    return true;
  },
  { message: 'Derogatory credit explanation is required', path: ['derogatory_credit_explanation'] }
).refine(
  (data) => {
    if (data.has_trade_in === true) {
      const t = data.trade_in;
      return t.year.trim() !== '' &&
        t.make.trim() !== '' &&
        t.model.trim() !== '' &&
        t.monthly_payment.trim() !== '' &&
        t.lienholder.trim() !== '' &&
        t.who_drives.trim() !== '';
    }
    return true;
  },
  { message: 'All trade-in fields are required when trade-in is selected', path: ['trade_in'] }
);

// === 2. Update Deal Status Schema ===

export const updateDealStatusSchema = z.object({
  dealId: uuidSchema,
  newStatus: z.enum(dealStatusValues, { message: 'Invalid deal status' }),
  notes: z.string().max(2000, 'Notes must be 2000 characters or fewer').optional(),
});

// === 3. Send Message Schema ===

export const sendMessageSchema = z.object({
  dealId: uuidSchema,
  content: z.string().min(1, 'Message content is required').max(5000, 'Message must be 5000 characters or fewer'),
  messageType: z.enum(['note', 'action_required'], { message: 'Invalid message type' }),
});

// === 4. Create User Schema ===

export const createUserSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  role: z.enum(userRoleValues, { message: 'Invalid role' }),
  team_id: z.string().uuid().nullable(),
  primary_office_id: z.string().uuid().nullable(),
});

// === 5. Update User Schema ===

export const updateUserSchema = z.object({
  userId: uuidSchema,
  data: z.object({
    first_name: z.string().min(1).optional(),
    last_name: z.string().min(1).optional(),
    role: z.enum(userRoleValues).optional(),
    team_id: z.string().uuid().nullable().optional(),
    primary_office_id: z.string().uuid().nullable().optional(),
    is_active: z.boolean().optional(),
  }),
});

// === 6. Create Team Schema ===

export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  office_id: uuidSchema,
  manager_id: z.string().uuid().nullable(),
});

// === 7. Update Deal Field Schema ===

const editableDealFields = [
  'deal_type',
  'vehicle_condition',
  'vehicle_year',
  'vehicle_make',
  'vehicle_model',
  'vehicle_trim',
  'vehicle_mileage',
  'msrp',
  'invoice',
  'jd_power_retail',
  'jd_power_wholesale',
  'net_cap_cost',
  'total_amount_financed',
  'monthly_payment',
  'term',
  'deal_strengths',
  'derogatory_credit_explanation',
  'business_legal_name',
  'num_applicants',
] as const;

export const updateDealFieldSchema = z.object({
  dealId: uuidSchema,
  fieldName: z.enum(editableDealFields, { message: 'Field is not editable' }),
  oldValue: z.string(),
  newValue: z.string(),
});

// === 8. Claim Deal & Reassign Deal Schemas ===

export const claimDealSchema = z.object({
  dealId: uuidSchema,
});

export const reassignDealSchema = z.object({
  dealId: uuidSchema,
  newUnderwriterId: uuidSchema,
});

// === 9. Resolve Message Schema ===

export const resolveMessageSchema = z.object({
  messageId: uuidSchema,
});

// === Validation Helper ===

export function validateInput<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const issues = result.error.issues;
  const messages = issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });

  return { success: false, error: messages.join('; ') };
}
