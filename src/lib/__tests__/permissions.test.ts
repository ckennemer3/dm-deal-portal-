import { describe, it, expect } from 'vitest';
import {
  hasMinimumRole,
  canAccessAdminPanel,
  canAccessReporting,
  canSubmitDeals,
  canViewDeal,
  canEditDealFields,
  canTransitionStatus,
  getAvailableTransitions,
  canUploadDocuments,
  canDeleteDocuments,
  canSendMessage,
  canSendActionRequired,
  canClaimDeal,
  canApproveAndForward,
  canKickBackToSales,
} from '../permissions';
import type { User, Deal, DealStatus, UserRole } from '@/lib/types';

// === Mock Users ===

const mockAgent: User = {
  id: 'agent-1',
  email: 'agent@test.com',
  first_name: 'Agent',
  last_name: 'One',
  role: 'agent',
  team_id: 'team-1',
  primary_office_id: 'office-1',
  is_active: true,
  created_at: '',
  updated_at: '',
};

const mockManager: User = { ...mockAgent, id: 'manager-1', role: 'manager' };
const mockUnderwriter: User = { ...mockAgent, id: 'uw-1', role: 'underwriter' };
const mockExecutive: User = { ...mockAgent, id: 'exec-1', role: 'executive' };
const mockAdmin: User = { ...mockAgent, id: 'admin-1', role: 'administrator' };

// === Mock Deal ===

const mockDeal: Deal = {
  id: 'deal-1',
  deal_number: 'DM-2026-00001',
  deal_type: 'lease',
  status: 'pending_manager_review',
  submitted_by: 'agent-1',
  assigned_manager: 'manager-1',
  assigned_underwriter: null,
  vehicle_condition: 'new',
  vehicle_year: '2026',
  vehicle_make: 'BMW',
  vehicle_model: 'X5',
  vehicle_trim: 'xDrive40i',
  vehicle_mileage: null,
  msrp: 65000,
  invoice: 60000,
  jd_power_retail: null,
  jd_power_wholesale: null,
  net_cap_cost: 55000,
  total_amount_financed: null,
  monthly_payment: 750,
  has_trade_in: false,
  has_open_autos: false,
  has_business: false,
  business_legal_name: null,
  deal_strengths: 'Strong income',
  has_derogatory_credit: false,
  derogatory_credit_explanation: null,
  num_applicants: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// === hasMinimumRole ===

describe('hasMinimumRole', () => {
  const roles: UserRole[] = ['agent', 'manager', 'underwriter', 'executive', 'administrator'];

  it('agent has minimum role of agent', () => {
    expect(hasMinimumRole('agent', 'agent')).toBe(true);
  });

  it('agent does NOT have minimum role of manager', () => {
    expect(hasMinimumRole('agent', 'manager')).toBe(false);
  });

  it('administrator has minimum role of every role', () => {
    for (const role of roles) {
      expect(hasMinimumRole('administrator', role)).toBe(true);
    }
  });
});

// === canAccessAdminPanel ===

describe('canAccessAdminPanel', () => {
  it('returns true only for administrator', () => {
    expect(canAccessAdminPanel('administrator')).toBe(true);
  });

  it('returns false for non-admin roles', () => {
    expect(canAccessAdminPanel('agent')).toBe(false);
    expect(canAccessAdminPanel('manager')).toBe(false);
    expect(canAccessAdminPanel('underwriter')).toBe(false);
    expect(canAccessAdminPanel('executive')).toBe(false);
  });
});

// === canAccessReporting ===

describe('canAccessReporting', () => {
  it('returns true for executive and administrator', () => {
    expect(canAccessReporting('executive')).toBe(true);
    expect(canAccessReporting('administrator')).toBe(true);
  });

  it('returns false for other roles', () => {
    expect(canAccessReporting('agent')).toBe(false);
    expect(canAccessReporting('manager')).toBe(false);
    expect(canAccessReporting('underwriter')).toBe(false);
  });
});

// === canSubmitDeals ===

describe('canSubmitDeals', () => {
  it('returns true for agent and administrator', () => {
    expect(canSubmitDeals('agent')).toBe(true);
    expect(canSubmitDeals('administrator')).toBe(true);
  });

  it('returns false for other roles', () => {
    expect(canSubmitDeals('manager')).toBe(false);
    expect(canSubmitDeals('underwriter')).toBe(false);
    expect(canSubmitDeals('executive')).toBe(false);
  });
});

// === canViewDeal ===

describe('canViewDeal', () => {
  it('agent can view their own deal', () => {
    expect(canViewDeal(mockAgent, mockDeal)).toBe(true);
  });

  it('agent cannot view another agent\'s deal', () => {
    const otherAgentDeal = { ...mockDeal, submitted_by: 'agent-2' };
    expect(canViewDeal(mockAgent, otherAgentDeal)).toBe(false);
  });

  it('manager, underwriter, executive, admin can view any deal', () => {
    expect(canViewDeal(mockManager, mockDeal)).toBe(true);
    expect(canViewDeal(mockUnderwriter, mockDeal)).toBe(true);
    expect(canViewDeal(mockExecutive, mockDeal)).toBe(true);
    expect(canViewDeal(mockAdmin, mockDeal)).toBe(true);
  });
});

// === canEditDealFields ===

describe('canEditDealFields', () => {
  describe('agent', () => {
    it('can edit own deal when kicked_back_to_sales', () => {
      const kickedDeal = { ...mockDeal, status: 'kicked_back_to_sales' as DealStatus };
      expect(canEditDealFields(mockAgent, kickedDeal)).toBe(true);
    });

    it('can edit own deal when pending', () => {
      const pendingDeal = { ...mockDeal, status: 'pending' as DealStatus };
      expect(canEditDealFields(mockAgent, pendingDeal)).toBe(true);
    });

    it('cannot edit own deal in pending_manager_review status', () => {
      expect(canEditDealFields(mockAgent, mockDeal)).toBe(false);
    });

    it('cannot edit another agent\'s kicked back deal', () => {
      const otherKickedDeal = {
        ...mockDeal,
        submitted_by: 'agent-2',
        status: 'kicked_back_to_sales' as DealStatus,
      };
      expect(canEditDealFields(mockAgent, otherKickedDeal)).toBe(false);
    });
  });

  describe('manager', () => {
    it('can edit deal in pending_manager_review', () => {
      expect(canEditDealFields(mockManager, mockDeal)).toBe(true);
    });

    it('cannot edit deal in submitted_to_underwriting', () => {
      const uwDeal = { ...mockDeal, status: 'submitted_to_underwriting' as DealStatus };
      expect(canEditDealFields(mockManager, uwDeal)).toBe(false);
    });

    it('cannot edit deal in signed_and_delivered status', () => {
      const completedDeal = { ...mockDeal, status: 'signed_and_delivered' as DealStatus };
      expect(canEditDealFields(mockManager, completedDeal)).toBe(false);
    });
  });

  describe('administrator', () => {
    it('can always edit deal fields regardless of status', () => {
      const statuses: DealStatus[] = [
        'pending',
        'pending_manager_review',
        'submitted_to_underwriting',
        'kicked_back_to_sales',
        'submitted_to_lender',
        'approved',
        'signed_and_delivered',
        'cancelled',
      ];
      for (const status of statuses) {
        const deal = { ...mockDeal, status };
        expect(canEditDealFields(mockAdmin, deal)).toBe(true);
      }
    });
  });

  describe('underwriter', () => {
    it('cannot edit deal fields', () => {
      expect(canEditDealFields(mockUnderwriter, mockDeal)).toBe(false);
    });
  });

  describe('executive', () => {
    it('cannot edit deal fields', () => {
      expect(canEditDealFields(mockExecutive, mockDeal)).toBe(false);
    });
  });
});

// === canTransitionStatus ===

describe('canTransitionStatus', () => {
  it('agent can transition pending -> pending_manager_review', () => {
    expect(canTransitionStatus('agent', 'pending', 'pending_manager_review')).toBe(true);
  });

  it('manager can transition pending_manager_review -> submitted_to_underwriting', () => {
    expect(canTransitionStatus('manager', 'pending_manager_review', 'submitted_to_underwriting')).toBe(true);
  });

  it('manager can transition pending_manager_review -> kicked_back_to_sales', () => {
    expect(canTransitionStatus('manager', 'pending_manager_review', 'kicked_back_to_sales')).toBe(true);
  });

  it('manager can transition pending_manager_review -> cancelled', () => {
    expect(canTransitionStatus('manager', 'pending_manager_review', 'cancelled')).toBe(true);
  });

  it('agent cannot transition pending_manager_review -> submitted_to_underwriting', () => {
    expect(canTransitionStatus('agent', 'pending_manager_review', 'submitted_to_underwriting')).toBe(false);
  });

  it('agent can transition kicked_back_to_sales -> pending_manager_review', () => {
    expect(canTransitionStatus('agent', 'kicked_back_to_sales', 'pending_manager_review')).toBe(true);
  });

  it('underwriter can transition submitted_to_underwriting -> submitted_to_lender', () => {
    expect(canTransitionStatus('underwriter', 'submitted_to_underwriting', 'submitted_to_lender')).toBe(true);
  });

  it('underwriter can transition submitted_to_underwriting -> kicked_back_to_sales', () => {
    expect(canTransitionStatus('underwriter', 'submitted_to_underwriting', 'kicked_back_to_sales')).toBe(true);
  });

  it('underwriter can transition submitted_to_lender -> approved', () => {
    expect(canTransitionStatus('underwriter', 'submitted_to_lender', 'approved')).toBe(true);
  });

  it('administrator can make any valid transition', () => {
    expect(canTransitionStatus('administrator', 'pending', 'pending_manager_review')).toBe(true);
    expect(canTransitionStatus('administrator', 'pending_manager_review', 'submitted_to_underwriting')).toBe(true);
    expect(canTransitionStatus('administrator', 'submitted_to_underwriting', 'submitted_to_lender')).toBe(true);
    expect(canTransitionStatus('administrator', 'submitted_to_lender', 'approved')).toBe(true);
    expect(canTransitionStatus('administrator', 'approved', 'signed_and_delivered')).toBe(true);
    expect(canTransitionStatus('administrator', 'kicked_back_to_sales', 'pending_manager_review')).toBe(true);
  });

  it('cannot transition to an invalid target status', () => {
    expect(canTransitionStatus('manager', 'pending_manager_review', 'signed_and_delivered')).toBe(false);
  });

  it('signed_and_delivered deals have no transitions', () => {
    expect(canTransitionStatus('administrator', 'signed_and_delivered', 'pending')).toBe(false);
  });

  it('cancelled deals have no transitions', () => {
    expect(canTransitionStatus('administrator', 'cancelled', 'pending')).toBe(false);
  });

  it('executive cannot make any transitions', () => {
    expect(canTransitionStatus('executive', 'pending_manager_review', 'submitted_to_underwriting')).toBe(false);
  });
});

// === getAvailableTransitions ===

describe('getAvailableTransitions', () => {
  it('agent gets [pending_manager_review] for pending', () => {
    expect(getAvailableTransitions('agent', 'pending')).toEqual(['pending_manager_review']);
  });

  it('manager gets [submitted_to_underwriting, kicked_back_to_sales, cancelled] for pending_manager_review', () => {
    expect(getAvailableTransitions('manager', 'pending_manager_review')).toEqual([
      'submitted_to_underwriting',
      'kicked_back_to_sales',
      'cancelled',
    ]);
  });

  it('underwriter gets [submitted_to_lender, kicked_back_to_sales, cancelled] for submitted_to_underwriting', () => {
    expect(getAvailableTransitions('underwriter', 'submitted_to_underwriting')).toEqual([
      'submitted_to_lender',
      'kicked_back_to_sales',
      'cancelled',
    ]);
  });

  it('underwriter gets [approved, kicked_back_to_sales, cancelled] for submitted_to_lender', () => {
    expect(getAvailableTransitions('underwriter', 'submitted_to_lender')).toEqual([
      'approved',
      'kicked_back_to_sales',
      'cancelled',
    ]);
  });

  it('agent gets [pending_manager_review, cancelled] for kicked_back_to_sales', () => {
    expect(getAvailableTransitions('agent', 'kicked_back_to_sales')).toEqual([
      'pending_manager_review',
      'cancelled',
    ]);
  });

  it('agent gets empty array for pending_manager_review (no permission)', () => {
    expect(getAvailableTransitions('agent', 'pending_manager_review')).toEqual([]);
  });

  it('executive gets empty array for any status', () => {
    expect(getAvailableTransitions('executive', 'pending_manager_review')).toEqual([]);
    expect(getAvailableTransitions('executive', 'submitted_to_underwriting')).toEqual([]);
  });

  it('returns empty array for signed_and_delivered status', () => {
    expect(getAvailableTransitions('administrator', 'signed_and_delivered')).toEqual([]);
  });

  it('returns empty array for cancelled status', () => {
    expect(getAvailableTransitions('administrator', 'cancelled')).toEqual([]);
  });
});

// === canUploadDocuments ===

describe('canUploadDocuments', () => {
  it('agent can upload documents on own deal', () => {
    expect(canUploadDocuments(mockAgent, mockDeal)).toBe(true);
  });

  it('agent cannot upload documents on another agent\'s deal', () => {
    const otherDeal = { ...mockDeal, submitted_by: 'agent-2' };
    expect(canUploadDocuments(mockAgent, otherDeal)).toBe(false);
  });

  it('manager can always upload documents', () => {
    expect(canUploadDocuments(mockManager, mockDeal)).toBe(true);
  });

  it('administrator can always upload documents', () => {
    expect(canUploadDocuments(mockAdmin, mockDeal)).toBe(true);
  });

  it('underwriter cannot upload documents', () => {
    expect(canUploadDocuments(mockUnderwriter, mockDeal)).toBe(false);
  });

  it('executive cannot upload documents', () => {
    expect(canUploadDocuments(mockExecutive, mockDeal)).toBe(false);
  });
});

// === canDeleteDocuments ===

describe('canDeleteDocuments', () => {
  it('manager can delete documents', () => {
    expect(canDeleteDocuments(mockManager, mockDeal)).toBe(true);
  });

  it('administrator can delete documents', () => {
    expect(canDeleteDocuments(mockAdmin, mockDeal)).toBe(true);
  });

  it('agent cannot delete documents', () => {
    expect(canDeleteDocuments(mockAgent, mockDeal)).toBe(false);
  });

  it('underwriter cannot delete documents', () => {
    expect(canDeleteDocuments(mockUnderwriter, mockDeal)).toBe(false);
  });

  it('executive cannot delete documents', () => {
    expect(canDeleteDocuments(mockExecutive, mockDeal)).toBe(false);
  });
});

// === canSendMessage ===

describe('canSendMessage', () => {
  it('agent can send message on own deal', () => {
    expect(canSendMessage(mockAgent, mockDeal)).toBe(true);
  });

  it('agent cannot send message on another agent\'s deal', () => {
    const otherDeal = { ...mockDeal, submitted_by: 'agent-2' };
    expect(canSendMessage(mockAgent, otherDeal)).toBe(false);
  });

  it('manager can always send messages', () => {
    expect(canSendMessage(mockManager, mockDeal)).toBe(true);
  });

  it('underwriter can always send messages', () => {
    expect(canSendMessage(mockUnderwriter, mockDeal)).toBe(true);
  });

  it('administrator can always send messages', () => {
    expect(canSendMessage(mockAdmin, mockDeal)).toBe(true);
  });

  it('executive cannot send messages', () => {
    expect(canSendMessage(mockExecutive, mockDeal)).toBe(false);
  });
});

// === canSendActionRequired ===

describe('canSendActionRequired', () => {
  it('manager can send action required', () => {
    expect(canSendActionRequired(mockManager, mockDeal)).toBe(true);
  });

  it('underwriter can send action required', () => {
    expect(canSendActionRequired(mockUnderwriter, mockDeal)).toBe(true);
  });

  it('administrator can send action required', () => {
    expect(canSendActionRequired(mockAdmin, mockDeal)).toBe(true);
  });

  it('agent cannot send action required', () => {
    expect(canSendActionRequired(mockAgent, mockDeal)).toBe(false);
  });

  it('executive cannot send action required', () => {
    expect(canSendActionRequired(mockExecutive, mockDeal)).toBe(false);
  });
});

// === canClaimDeal ===

describe('canClaimDeal', () => {
  it('underwriter can claim deal when submitted_to_underwriting and no assigned underwriter', () => {
    const uwDeal = { ...mockDeal, status: 'submitted_to_underwriting' as DealStatus, assigned_underwriter: null };
    expect(canClaimDeal(mockUnderwriter, uwDeal)).toBe(true);
  });

  it('underwriter cannot claim deal with assigned underwriter', () => {
    const assignedDeal = {
      ...mockDeal,
      status: 'submitted_to_underwriting' as DealStatus,
      assigned_underwriter: 'uw-2',
    };
    expect(canClaimDeal(mockUnderwriter, assignedDeal)).toBe(false);
  });

  it('underwriter cannot claim deal in wrong status', () => {
    const approvedDeal = { ...mockDeal, status: 'approved' as DealStatus };
    expect(canClaimDeal(mockUnderwriter, approvedDeal)).toBe(false);
  });

  it('manager cannot claim deal', () => {
    const uwDeal = { ...mockDeal, status: 'submitted_to_underwriting' as DealStatus };
    expect(canClaimDeal(mockManager, uwDeal)).toBe(false);
  });

  it('agent cannot claim deal', () => {
    const uwDeal = { ...mockDeal, status: 'submitted_to_underwriting' as DealStatus };
    expect(canClaimDeal(mockAgent, uwDeal)).toBe(false);
  });

  it('administrator cannot claim deal (must be underwriter)', () => {
    const uwDeal = { ...mockDeal, status: 'submitted_to_underwriting' as DealStatus };
    expect(canClaimDeal(mockAdmin, uwDeal)).toBe(false);
  });
});

// === canApproveAndForward ===

describe('canApproveAndForward', () => {
  it('manager can approve in pending_manager_review', () => {
    expect(canApproveAndForward(mockManager, mockDeal)).toBe(true);
  });

  it('manager cannot approve in submitted_to_underwriting', () => {
    const uwDeal = { ...mockDeal, status: 'submitted_to_underwriting' as DealStatus };
    expect(canApproveAndForward(mockManager, uwDeal)).toBe(false);
  });

  it('manager cannot approve in signed_and_delivered', () => {
    const completedDeal = { ...mockDeal, status: 'signed_and_delivered' as DealStatus };
    expect(canApproveAndForward(mockManager, completedDeal)).toBe(false);
  });

  it('administrator can approve in pending_manager_review', () => {
    expect(canApproveAndForward(mockAdmin, mockDeal)).toBe(true);
  });

  it('agent cannot approve and forward', () => {
    expect(canApproveAndForward(mockAgent, mockDeal)).toBe(false);
  });

  it('underwriter cannot approve and forward', () => {
    expect(canApproveAndForward(mockUnderwriter, mockDeal)).toBe(false);
  });

  it('executive cannot approve and forward', () => {
    expect(canApproveAndForward(mockExecutive, mockDeal)).toBe(false);
  });
});

// === canKickBackToSales ===

describe('canKickBackToSales', () => {
  it('manager can kick back in pending_manager_review', () => {
    expect(canKickBackToSales(mockManager, mockDeal)).toBe(true);
  });

  it('manager cannot kick back in submitted_to_underwriting', () => {
    const uwDeal = { ...mockDeal, status: 'submitted_to_underwriting' as DealStatus };
    expect(canKickBackToSales(mockManager, uwDeal)).toBe(false);
  });

  it('underwriter can kick back in submitted_to_underwriting', () => {
    const uwDeal = { ...mockDeal, status: 'submitted_to_underwriting' as DealStatus };
    expect(canKickBackToSales(mockUnderwriter, uwDeal)).toBe(true);
  });

  it('underwriter can kick back in submitted_to_lender', () => {
    const lenderDeal = { ...mockDeal, status: 'submitted_to_lender' as DealStatus };
    expect(canKickBackToSales(mockUnderwriter, lenderDeal)).toBe(true);
  });

  it('underwriter cannot kick back in approved', () => {
    const approvedDeal = { ...mockDeal, status: 'approved' as DealStatus };
    expect(canKickBackToSales(mockUnderwriter, approvedDeal)).toBe(false);
  });

  it('administrator can kick back in pending_manager_review', () => {
    expect(canKickBackToSales(mockAdmin, mockDeal)).toBe(true);
  });

  it('agent cannot kick back to sales', () => {
    expect(canKickBackToSales(mockAgent, mockDeal)).toBe(false);
  });

  it('executive cannot kick back to sales', () => {
    expect(canKickBackToSales(mockExecutive, mockDeal)).toBe(false);
  });
});
