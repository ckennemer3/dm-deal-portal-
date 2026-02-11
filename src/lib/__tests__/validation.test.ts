import { describe, it, expect } from 'vitest';
import {
  submitDealSchema,
  updateDealStatusSchema,
  sendMessageSchema,
  createUserSchema,
  updateDealFieldSchema,
  validateInput,
} from '../validation';

// === submitDealSchema ===

describe('submitDealSchema', () => {
  const validDeal = {
    deal_type: 'lease',
    vehicle_condition: 'new',
    vehicle_year: '2026',
    vehicle_make: 'BMW',
    vehicle_model: 'X5',
    vehicle_trim: 'xDrive40i',
    vehicle_mileage: '',
    msrp: '',
    invoice: '',
    jd_power_retail: '',
    jd_power_wholesale: '',
    net_cap_cost: '',
    total_amount_financed: '',
    monthly_payment: '750',
    deal_strengths: 'Strong income',
    has_trade_in: false,
    trade_in: { year: '', make: '', model: '', monthly_payment: '', lienholder: '', who_drives: '' },
    has_open_autos: false,
    num_open_autos: 1,
    open_autos: [],
    adding_business: false,
    business_legal_name: '',
    has_derogatory_credit: false,
    derogatory_credit_explanation: '',
    num_applicants: 1,
    applicants: [
      {
        first_name: 'John',
        last_name: 'Doe',
        experian_score: '750',
        has_alternate_bureau: false,
      },
    ],
  };

  it('accepts valid deal data', () => {
    const result = submitDealSchema.safeParse(validDeal);
    expect(result.success).toBe(true);
  });

  it('rejects missing deal_type', () => {
    const { deal_type, ...invalid } = validDeal;
    const result = submitDealSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid deal_type value', () => {
    const result = submitDealSchema.safeParse({ ...validDeal, deal_type: 'invalid_type' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid experian_score (too low)', () => {
    const invalid = {
      ...validDeal,
      applicants: [
        { ...validDeal.applicants[0], experian_score: '200' },
      ],
    };
    const result = submitDealSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid experian_score (too high)', () => {
    const invalid = {
      ...validDeal,
      applicants: [
        { ...validDeal.applicants[0], experian_score: '900' },
      ],
    };
    const result = submitDealSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects empty applicant first_name', () => {
    const invalid = {
      ...validDeal,
      applicants: [
        { ...validDeal.applicants[0], first_name: '' },
      ],
    };
    const result = submitDealSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects empty applicant last_name', () => {
    const invalid = {
      ...validDeal,
      applicants: [
        { ...validDeal.applicants[0], last_name: '' },
      ],
    };
    const result = submitDealSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects missing applicants array', () => {
    const { applicants, ...invalid } = validDeal;
    const result = submitDealSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('requires business legal name when adding_business is true', () => {
    const result = submitDealSchema.safeParse({
      ...validDeal,
      adding_business: true,
      business_legal_name: '',
    });
    expect(result.success).toBe(false);
  });

  it('requires derogatory credit explanation when has_derogatory_credit is true', () => {
    const result = submitDealSchema.safeParse({
      ...validDeal,
      has_derogatory_credit: true,
      derogatory_credit_explanation: '',
    });
    expect(result.success).toBe(false);
  });
});

// === updateDealStatusSchema ===

describe('updateDealStatusSchema', () => {
  it('accepts valid status change', () => {
    const result = updateDealStatusSchema.safeParse({
      dealId: '550e8400-e29b-41d4-a716-446655440000',
      newStatus: 'pending_manager_review',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID dealId', () => {
    const result = updateDealStatusSchema.safeParse({
      dealId: 'not-a-uuid',
      newStatus: 'pending_manager_review',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status value', () => {
    const result = updateDealStatusSchema.safeParse({
      dealId: '550e8400-e29b-41d4-a716-446655440000',
      newStatus: 'invalid_status',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid status values', () => {
    const validStatuses = [
      'pending',
      'pending_manager_review',
      'submitted_to_underwriting',
      'kicked_back_to_sales',
      'submitted_to_lender',
      'approved',
      'signed_and_delivered',
      'cancelled',
    ];
    for (const newStatus of validStatuses) {
      const result = updateDealStatusSchema.safeParse({
        dealId: '550e8400-e29b-41d4-a716-446655440000',
        newStatus,
      });
      expect(result.success).toBe(true);
    }
  });

  it('accepts optional notes', () => {
    const result = updateDealStatusSchema.safeParse({
      dealId: '550e8400-e29b-41d4-a716-446655440000',
      newStatus: 'pending_manager_review',
      notes: 'Approved with conditions',
    });
    expect(result.success).toBe(true);
  });
});

// === sendMessageSchema ===

describe('sendMessageSchema', () => {
  it('accepts valid message', () => {
    const result = sendMessageSchema.safeParse({
      dealId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'This is a valid message',
      messageType: 'note',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty content', () => {
    const result = sendMessageSchema.safeParse({
      dealId: '550e8400-e29b-41d4-a716-446655440000',
      content: '',
      messageType: 'note',
    });
    expect(result.success).toBe(false);
  });

  it('rejects content over 5000 characters', () => {
    const result = sendMessageSchema.safeParse({
      dealId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'a'.repeat(5001),
      messageType: 'note',
    });
    expect(result.success).toBe(false);
  });

  it('accepts content at exactly 5000 characters', () => {
    const result = sendMessageSchema.safeParse({
      dealId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'a'.repeat(5000),
      messageType: 'note',
    });
    expect(result.success).toBe(true);
  });

  it('accepts action_required message type', () => {
    const result = sendMessageSchema.safeParse({
      dealId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Please provide income docs',
      messageType: 'action_required',
    });
    expect(result.success).toBe(true);
  });
});

// === createUserSchema ===

describe('createUserSchema', () => {
  const validUser = {
    email: 'newuser@example.com',
    password: 'securePassword123',
    first_name: 'New',
    last_name: 'User',
    role: 'agent',
    team_id: null,
    primary_office_id: null,
  };

  it('accepts valid user data', () => {
    const result = createUserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = createUserSchema.safeParse({ ...validUser, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects password too short (under 8 chars)', () => {
    const result = createUserSchema.safeParse({ ...validUser, password: 'short' });
    expect(result.success).toBe(false);
  });

  it('accepts password at exactly 8 characters', () => {
    const result = createUserSchema.safeParse({ ...validUser, password: '12345678' });
    expect(result.success).toBe(true);
  });

  it('rejects empty first_name', () => {
    const result = createUserSchema.safeParse({ ...validUser, first_name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty last_name', () => {
    const result = createUserSchema.safeParse({ ...validUser, last_name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = createUserSchema.safeParse({ ...validUser, role: 'superadmin' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid roles', () => {
    const validRoles = ['agent', 'manager', 'underwriter', 'executive', 'administrator'];
    for (const role of validRoles) {
      const result = createUserSchema.safeParse({ ...validUser, role });
      expect(result.success).toBe(true);
    }
  });

  it('accepts UUID team_id', () => {
    const result = createUserSchema.safeParse({
      ...validUser,
      team_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });
});

// === updateDealFieldSchema ===

describe('updateDealFieldSchema', () => {
  it('accepts valid field update', () => {
    const result = updateDealFieldSchema.safeParse({
      dealId: '550e8400-e29b-41d4-a716-446655440000',
      fieldName: 'monthly_payment',
      oldValue: '700',
      newValue: '800',
    });
    expect(result.success).toBe(true);
  });

  it('rejects disallowed field name', () => {
    const result = updateDealFieldSchema.safeParse({
      dealId: '550e8400-e29b-41d4-a716-446655440000',
      fieldName: 'id',
      oldValue: 'old',
      newValue: 'new-id',
    });
    expect(result.success).toBe(false);
  });

  it('rejects status field (should use status transition)', () => {
    const result = updateDealFieldSchema.safeParse({
      dealId: '550e8400-e29b-41d4-a716-446655440000',
      fieldName: 'status',
      oldValue: 'pending',
      newValue: 'signed_and_delivered',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID dealId', () => {
    const result = updateDealFieldSchema.safeParse({
      dealId: 'invalid',
      fieldName: 'monthly_payment',
      oldValue: '500',
      newValue: '800',
    });
    expect(result.success).toBe(false);
  });

  it('accepts string value for text fields', () => {
    const result = updateDealFieldSchema.safeParse({
      dealId: '550e8400-e29b-41d4-a716-446655440000',
      fieldName: 'deal_strengths',
      oldValue: 'Original strengths',
      newValue: 'Updated strengths',
    });
    expect(result.success).toBe(true);
  });
});

// === validateInput ===

describe('validateInput', () => {
  it('returns parsed data on success', () => {
    const result = validateInput(sendMessageSchema, {
      dealId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Hello',
      messageType: 'note',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe('Hello');
    }
  });

  it('returns error string on failure', () => {
    const result = validateInput(sendMessageSchema, {
      dealId: '550e8400-e29b-41d4-a716-446655440000',
      content: '',
      messageType: 'note',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('returns error for completely invalid data', () => {
    const result = validateInput(createUserSchema, {});
    expect(result.success).toBe(false);
  });
});
