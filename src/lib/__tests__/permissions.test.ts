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
  canKickBackToAgent,
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
  status: 'submitted_to_manager',
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

  it('agent does NOT have minimum role of underwriter', () => {
    expect(hasMinimumRole('agent', 'underwriter')).toBe(false);
  });

  it('agent does NOT have minimum role of executive', () => {
    expect(hasMinimumRole('agent', 'executive')).toBe(false);
  });

  it('agent does NOT have minimum role of administrator', () => {
    expect(hasMinimumRole('agent', 'administrator')).toBe(false);
  });

  it('manager has minimum role of agent', () => {
    expect(hasMinimumRole('manager', 'agent')).toBe(true);
  });

  it('manager has minimum role of manager', () => {
    expect(hasMinimumRole('manager', 'manager')).toBe(true);
  });

  it('manager does NOT have minimum role of underwriter', () => {
    expect(hasMinimumRole('manager', 'underwriter')).toBe(false);
  });

  it('underwriter has minimum role of agent', () => {
    expect(hasMinimumRole('underwriter', 'agent')).toBe(true);
  });

  it('underwriter has minimum role of manager', () => {
    expect(hasMinimumRole('underwriter', 'manager')).toBe(true);
  });

  it('underwriter has minimum role of underwriter', () => {
    expect(hasMinimumRole('underwriter', 'underwriter')).toBe(true);
  });

  it('underwriter does NOT have minimum role of executive', () => {
    expect(hasMinimumRole('underwriter', 'executive')).toBe(false);
  });

  it('executive has minimum role of all except administrator', () => {
    expect(hasMinimumRole('executive', 'agent')).toBe(true);
    expect(hasMinimumRole('executive', 'manager')).toBe(true);
    expect(hasMinimumRole('executive', 'underwriter')).toBe(true);
    expect(hasMinimumRole('executive', 'executive')).toBe(true);
    expect(hasMinimumRole('executive', 'administrator')).toBe(false);
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

  it('returns false for agent', () => {
    expect(canAccessAdminPanel('agent')).toBe(false);
  });

  it('returns false for manager', () => {
    expect(canAccessAdminPanel('manager')).toBe(false);
  });

  it('returns false for underwriter', () => {
    expect(canAccessAdminPanel('underwriter')).toBe(false);
  });

  it('returns false for executive', () => {
    expect(canAccessAdminPanel('executive')).toBe(false);
  });
});

// === canAccessReporting ===

describe('canAccessReporting', () => {
  it('returns true for executive', () => {
    expect(canAccessReporting('executive')).toBe(true);
  });

  it('returns true for administrator', () => {
    expect(canAccessReporting('administrator')).toBe(true);
  });

  it('returns false for agent', () => {
    expect(canAccessReporting('agent')).toBe(false);
  });

  it('returns false for manager', () => {
    expect(canAccessReporting('manager')).toBe(false);
  });

  it('returns false for underwriter', () => {
    expect(canAccessReporting('underwriter')).toBe(false);
  });
});

// === canSubmitDeals ===

describe('canSubmitDeals', () => {
  it('returns true for agent', () => {
    expect(canSubmitDeals('agent')).toBe(true);
  });

  it('returns true for administrator', () => {
    expect(canSubmitDeals('administrator')).toBe(true);
  });

  it('returns false for manager', () => {
    expect(canSubmitDeals('manager')).toBe(false);
  });

  it('returns false for underwriter', () => {
    expect(canSubmitDeals('underwriter')).toBe(false);
  });

  it('returns false for executive', () => {
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

  it('manager can view any deal', () => {
    expect(canViewDeal(mockManager, mockDeal)).toBe(true);
  });

  it('underwriter can view any deal', () => {
    expect(canViewDeal(mockUnderwriter, mockDeal)).toBe(true);
  });

  it('executive can view any deal', () => {
    expect(canViewDeal(mockExecutive, mockDeal)).toBe(true);
  });

  it('administrator can view any deal', () => {
    expect(canViewDeal(mockAdmin, mockDeal)).toBe(true);
  });
});

// === canEditDealFields ===

describe('canEditDealFields', () => {
  describe('agent', () => {
    it('can edit own deal when kicked_back_to_agent', () => {
      const kickedDeal = { ...mockDeal, status: 'kicked_back_to_agent' as DealStatus };
      expect(canEditDealFields(mockAgent, kickedDeal)).toBe(true);
    });

    it('cannot edit own deal in submitted_to_manager status', () => {
      expect(canEditDealFields(mockAgent, mockDeal)).toBe(false);
    });

    it('cannot edit another agent\'s kicked back deal', () => {
      const otherKickedDeal = {
        ...mockDeal,
        submitted_by: 'agent-2',
        status: 'kicked_back_to_agent' as DealStatus,
      };
      expect(canEditDealFields(mockAgent, otherKickedDeal)).toBe(false);
    });
  });

  describe('manager', () => {
    it('can edit deal in submitted_to_manager', () => {
      expect(canEditDealFields(mockManager, mockDeal)).toBe(true);
    });

    it('can edit deal in manager_reviewing', () => {
      const reviewingDeal = { ...mockDeal, status: 'manager_reviewing' as DealStatus };
      expect(canEditDealFields(mockManager, reviewingDeal)).toBe(true);
    });

    it('can edit deal in kicked_back_to_manager', () => {
      const kickedDeal = { ...mockDeal, status: 'kicked_back_to_manager' as DealStatus };
      expect(canEditDealFields(mockManager, kickedDeal)).toBe(true);
    });

    it('can edit deal in resubmitted_to_manager', () => {
      const resubDeal = { ...mockDeal, status: 'resubmitted_to_manager' as DealStatus };
      expect(canEditDealFields(mockManager, resubDeal)).toBe(true);
    });

    it('cannot edit deal in sent_to_underwriting', () => {
      const uwDeal = { ...mockDeal, status: 'sent_to_underwriting' as DealStatus };
      expect(canEditDealFields(mockManager, uwDeal)).toBe(false);
    });

    it('cannot edit deal in completed status', () => {
      const completedDeal = { ...mockDeal, status: 'completed' as DealStatus };
      expect(canEditDealFields(mockManager, completedDeal)).toBe(false);
    });
  });

  describe('administrator', () => {
    it('can always edit deal fields regardless of status', () => {
      const statuses: DealStatus[] = [
        'submitted_to_manager',
        'manager_reviewing',
        'sent_to_underwriting',
        'underwriting_assigned',
        'underwriting_reviewing',
        'kicked_back_to_manager',
        'kicked_back_to_agent',
        'resubmitted_to_manager',
        'resubmitted_to_underwriting',
        'completed',
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
  it('manager can transition submitted_to_manager -> manager_reviewing', () => {
    expect(canTransitionStatus('manager', 'submitted_to_manager', 'manager_reviewing')).toBe(true);
  });

  it('manager can transition manager_reviewing -> sent_to_underwriting', () => {
    expect(canTransitionStatus('manager', 'manager_reviewing', 'sent_to_underwriting')).toBe(true);
  });

  it('manager can transition manager_reviewing -> kicked_back_to_agent', () => {
    expect(canTransitionStatus('manager', 'manager_reviewing', 'kicked_back_to_agent')).toBe(true);
  });

  it('manager can transition manager_reviewing -> cancelled', () => {
    expect(canTransitionStatus('manager', 'manager_reviewing', 'cancelled')).toBe(true);
  });

  it('agent cannot transition submitted_to_manager -> manager_reviewing', () => {
    expect(canTransitionStatus('agent', 'submitted_to_manager', 'manager_reviewing')).toBe(false);
  });

  it('agent can transition kicked_back_to_agent -> resubmitted_to_manager', () => {
    expect(canTransitionStatus('agent', 'kicked_back_to_agent', 'resubmitted_to_manager')).toBe(true);
  });

  it('underwriter can transition sent_to_underwriting -> underwriting_assigned', () => {
    expect(canTransitionStatus('underwriter', 'sent_to_underwriting', 'underwriting_assigned')).toBe(true);
  });

  it('underwriter can transition underwriting_reviewing -> completed', () => {
    expect(canTransitionStatus('underwriter', 'underwriting_reviewing', 'completed')).toBe(true);
  });

  it('underwriter can transition underwriting_reviewing -> kicked_back_to_manager', () => {
    expect(canTransitionStatus('underwriter', 'underwriting_reviewing', 'kicked_back_to_manager')).toBe(true);
  });

  it('administrator can make any valid transition', () => {
    expect(canTransitionStatus('administrator', 'submitted_to_manager', 'manager_reviewing')).toBe(true);
    expect(canTransitionStatus('administrator', 'manager_reviewing', 'sent_to_underwriting')).toBe(true);
    expect(canTransitionStatus('administrator', 'sent_to_underwriting', 'underwriting_assigned')).toBe(true);
    expect(canTransitionStatus('administrator', 'underwriting_reviewing', 'completed')).toBe(true);
    expect(canTransitionStatus('administrator', 'kicked_back_to_agent', 'resubmitted_to_manager')).toBe(true);
  });

  it('cannot transition to an invalid target status', () => {
    expect(canTransitionStatus('manager', 'submitted_to_manager', 'completed')).toBe(false);
  });

  it('completed deals have no transitions', () => {
    expect(canTransitionStatus('administrator', 'completed', 'submitted_to_manager')).toBe(false);
  });

  it('cancelled deals have no transitions', () => {
    expect(canTransitionStatus('administrator', 'cancelled', 'submitted_to_manager')).toBe(false);
  });

  it('executive cannot make any transitions', () => {
    expect(canTransitionStatus('executive', 'submitted_to_manager', 'manager_reviewing')).toBe(false);
    expect(canTransitionStatus('executive', 'manager_reviewing', 'sent_to_underwriting')).toBe(false);
  });
});

// === getAvailableTransitions ===

describe('getAvailableTransitions', () => {
  it('manager gets [manager_reviewing] for submitted_to_manager', () => {
    expect(getAvailableTransitions('manager', 'submitted_to_manager')).toEqual(['manager_reviewing']);
  });

  it('manager gets [sent_to_underwriting, kicked_back_to_agent, cancelled] for manager_reviewing', () => {
    expect(getAvailableTransitions('manager', 'manager_reviewing')).toEqual([
      'sent_to_underwriting',
      'kicked_back_to_agent',
      'cancelled',
    ]);
  });

  it('underwriter gets [underwriting_assigned] for sent_to_underwriting', () => {
    expect(getAvailableTransitions('underwriter', 'sent_to_underwriting')).toEqual([
      'underwriting_assigned',
    ]);
  });

  it('underwriter gets [underwriting_reviewing] for underwriting_assigned', () => {
    expect(getAvailableTransitions('underwriter', 'underwriting_assigned')).toEqual([
      'underwriting_reviewing',
    ]);
  });

  it('underwriter gets [kicked_back_to_manager, completed] for underwriting_reviewing', () => {
    expect(getAvailableTransitions('underwriter', 'underwriting_reviewing')).toEqual([
      'kicked_back_to_manager',
      'completed',
    ]);
  });

  it('agent gets [resubmitted_to_manager] for kicked_back_to_agent', () => {
    expect(getAvailableTransitions('agent', 'kicked_back_to_agent')).toEqual([
      'resubmitted_to_manager',
    ]);
  });

  it('agent gets empty array for submitted_to_manager (no permission)', () => {
    expect(getAvailableTransitions('agent', 'submitted_to_manager')).toEqual([]);
  });

  it('executive gets empty array for any status', () => {
    expect(getAvailableTransitions('executive', 'submitted_to_manager')).toEqual([]);
    expect(getAvailableTransitions('executive', 'manager_reviewing')).toEqual([]);
  });

  it('returns empty array for completed status', () => {
    expect(getAvailableTransitions('administrator', 'completed')).toEqual([]);
  });

  it('returns empty array for cancelled status', () => {
    expect(getAvailableTransitions('administrator', 'cancelled')).toEqual([]);
  });

  it('manager gets correct options for kicked_back_to_manager', () => {
    expect(getAvailableTransitions('manager', 'kicked_back_to_manager')).toEqual([
      'kicked_back_to_agent',
      'resubmitted_to_underwriting',
      'cancelled',
    ]);
  });

  it('manager gets correct options for resubmitted_to_manager', () => {
    expect(getAvailableTransitions('manager', 'resubmitted_to_manager')).toEqual([
      'sent_to_underwriting',
      'kicked_back_to_agent',
      'resubmitted_to_underwriting',
      'cancelled',
    ]);
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
  it('underwriter can claim deal when sent_to_underwriting and no assigned underwriter', () => {
    const uwDeal = { ...mockDeal, status: 'sent_to_underwriting' as DealStatus, assigned_underwriter: null };
    expect(canClaimDeal(mockUnderwriter, uwDeal)).toBe(true);
  });

  it('underwriter cannot claim deal with assigned underwriter', () => {
    const assignedDeal = {
      ...mockDeal,
      status: 'sent_to_underwriting' as DealStatus,
      assigned_underwriter: 'uw-2',
    };
    expect(canClaimDeal(mockUnderwriter, assignedDeal)).toBe(false);
  });

  it('underwriter cannot claim deal in wrong status', () => {
    const reviewingDeal = { ...mockDeal, status: 'underwriting_reviewing' as DealStatus };
    expect(canClaimDeal(mockUnderwriter, reviewingDeal)).toBe(false);
  });

  it('manager cannot claim deal', () => {
    const uwDeal = { ...mockDeal, status: 'sent_to_underwriting' as DealStatus };
    expect(canClaimDeal(mockManager, uwDeal)).toBe(false);
  });

  it('agent cannot claim deal', () => {
    const uwDeal = { ...mockDeal, status: 'sent_to_underwriting' as DealStatus };
    expect(canClaimDeal(mockAgent, uwDeal)).toBe(false);
  });

  it('administrator cannot claim deal (must be underwriter)', () => {
    const uwDeal = { ...mockDeal, status: 'sent_to_underwriting' as DealStatus };
    expect(canClaimDeal(mockAdmin, uwDeal)).toBe(false);
  });
});

// === canApproveAndForward ===

describe('canApproveAndForward', () => {
  it('manager can approve in submitted_to_manager', () => {
    expect(canApproveAndForward(mockManager, mockDeal)).toBe(true);
  });

  it('manager can approve in manager_reviewing', () => {
    const reviewingDeal = { ...mockDeal, status: 'manager_reviewing' as DealStatus };
    expect(canApproveAndForward(mockManager, reviewingDeal)).toBe(true);
  });

  it('manager can approve in resubmitted_to_manager', () => {
    const resubDeal = { ...mockDeal, status: 'resubmitted_to_manager' as DealStatus };
    expect(canApproveAndForward(mockManager, resubDeal)).toBe(true);
  });

  it('manager cannot approve in sent_to_underwriting', () => {
    const uwDeal = { ...mockDeal, status: 'sent_to_underwriting' as DealStatus };
    expect(canApproveAndForward(mockManager, uwDeal)).toBe(false);
  });

  it('manager cannot approve in completed', () => {
    const completedDeal = { ...mockDeal, status: 'completed' as DealStatus };
    expect(canApproveAndForward(mockManager, completedDeal)).toBe(false);
  });

  it('administrator can approve in valid statuses', () => {
    expect(canApproveAndForward(mockAdmin, mockDeal)).toBe(true);
    const reviewingDeal = { ...mockDeal, status: 'manager_reviewing' as DealStatus };
    expect(canApproveAndForward(mockAdmin, reviewingDeal)).toBe(true);
    const resubDeal = { ...mockDeal, status: 'resubmitted_to_manager' as DealStatus };
    expect(canApproveAndForward(mockAdmin, resubDeal)).toBe(true);
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

// === canKickBackToAgent ===

describe('canKickBackToAgent', () => {
  it('manager can kick back in submitted_to_manager', () => {
    expect(canKickBackToAgent(mockManager, mockDeal)).toBe(true);
  });

  it('manager can kick back in manager_reviewing', () => {
    const reviewingDeal = { ...mockDeal, status: 'manager_reviewing' as DealStatus };
    expect(canKickBackToAgent(mockManager, reviewingDeal)).toBe(true);
  });

  it('manager can kick back in kicked_back_to_manager', () => {
    const kickedDeal = { ...mockDeal, status: 'kicked_back_to_manager' as DealStatus };
    expect(canKickBackToAgent(mockManager, kickedDeal)).toBe(true);
  });

  it('manager can kick back in resubmitted_to_manager', () => {
    const resubDeal = { ...mockDeal, status: 'resubmitted_to_manager' as DealStatus };
    expect(canKickBackToAgent(mockManager, resubDeal)).toBe(true);
  });

  it('manager cannot kick back in sent_to_underwriting', () => {
    const uwDeal = { ...mockDeal, status: 'sent_to_underwriting' as DealStatus };
    expect(canKickBackToAgent(mockManager, uwDeal)).toBe(false);
  });

  it('manager cannot kick back in completed', () => {
    const completedDeal = { ...mockDeal, status: 'completed' as DealStatus };
    expect(canKickBackToAgent(mockManager, completedDeal)).toBe(false);
  });

  it('administrator can kick back in valid statuses', () => {
    expect(canKickBackToAgent(mockAdmin, mockDeal)).toBe(true);
    const kickedDeal = { ...mockDeal, status: 'kicked_back_to_manager' as DealStatus };
    expect(canKickBackToAgent(mockAdmin, kickedDeal)).toBe(true);
  });

  it('agent cannot kick back to agent', () => {
    expect(canKickBackToAgent(mockAgent, mockDeal)).toBe(false);
  });

  it('underwriter cannot kick back to agent', () => {
    expect(canKickBackToAgent(mockUnderwriter, mockDeal)).toBe(false);
  });

  it('executive cannot kick back to agent', () => {
    expect(canKickBackToAgent(mockExecutive, mockDeal)).toBe(false);
  });
});
