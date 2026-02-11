import { UserRole, DealStatus, Deal, User } from './types';
import { STATUS_TRANSITIONS } from './constants';

// === Role Hierarchy ===

const ROLE_HIERARCHY: Record<UserRole, number> = {
  agent: 1,
  manager: 2,
  underwriter: 3,
  executive: 4,
  administrator: 5,
};

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// === Page Access ===

export function canAccessAdminPanel(role: UserRole): boolean {
  return role === 'administrator';
}

export function canAccessReporting(role: UserRole): boolean {
  return role === 'executive' || role === 'administrator';
}

export function canSubmitDeals(role: UserRole): boolean {
  return role === 'agent' || role === 'administrator';
}

// === Deal Visibility ===

export function canViewDeal(user: User, deal: Deal): boolean {
  switch (user.role) {
    case 'agent':
      return deal.submitted_by === user.id;
    case 'manager':
      // Manager can see deals from their team (checked at query level)
      return true;
    case 'underwriter':
    case 'executive':
    case 'administrator':
      return true;
    default:
      return false;
  }
}

// === Deal Actions ===

export function canEditDealFields(user: User, deal: Deal): boolean {
  switch (user.role) {
    case 'agent':
      return deal.submitted_by === user.id &&
        (deal.status === 'kicked_back_to_sales' || deal.status === 'pending');
    case 'manager':
      return deal.status === 'pending_manager_review';
    case 'administrator':
      return true;
    default:
      return false;
  }
}

export function canTransitionStatus(
  userRole: UserRole,
  currentStatus: DealStatus,
  targetStatus: DealStatus
): boolean {
  const config = STATUS_TRANSITIONS[currentStatus];
  if (!config) return false;
  return config.next.includes(targetStatus) && config.roles.includes(userRole);
}

export function getAvailableTransitions(
  userRole: UserRole,
  currentStatus: DealStatus
): DealStatus[] {
  const config = STATUS_TRANSITIONS[currentStatus];
  if (!config) return [];
  if (!config.roles.includes(userRole)) return [];
  return config.next;
}

// === Document Actions ===

export function canUploadDocuments(user: User, deal: Deal): boolean {
  switch (user.role) {
    case 'agent':
      return deal.submitted_by === user.id;
    case 'manager':
      return true; // Managers can upload on deals in their scope
    case 'administrator':
      return true;
    default:
      return false;
  }
}

export function canDeleteDocuments(user: User, deal: Deal): boolean {
  switch (user.role) {
    case 'manager':
      return true;
    case 'administrator':
      return true;
    default:
      return false;
  }
}

export function canReplaceDocuments(user: User, deal: Deal): boolean {
  switch (user.role) {
    case 'agent':
      return deal.submitted_by === user.id;
    case 'manager':
    case 'administrator':
      return true;
    default:
      return false;
  }
}

// === Communication Rules ===

export function canSendMessage(user: User, deal: Deal): boolean {
  switch (user.role) {
    case 'agent':
      return deal.submitted_by === user.id;
    case 'manager':
    case 'underwriter':
    case 'administrator':
      return true;
    default:
      return false;
  }
}

export function canSendActionRequired(user: User, deal: Deal): boolean {
  switch (user.role) {
    case 'manager':
    case 'underwriter':
    case 'administrator':
      return true;
    default:
      return false;
  }
}

export function canResolveActionRequired(user: User, deal: Deal): boolean {
  // The recipient of the action required can resolve it
  return canSendMessage(user, deal);
}

// === Underwriter Actions ===

export function canClaimDeal(user: User, deal: Deal): boolean {
  return (
    user.role === 'underwriter' &&
    deal.status === 'submitted_to_underwriting' &&
    deal.assigned_underwriter === null
  );
}

export function canReassignDeal(user: User): boolean {
  return user.role === 'underwriter' || user.role === 'administrator';
}

// === Manager Actions ===

export function canApproveAndForward(user: User, deal: Deal): boolean {
  return (
    (user.role === 'manager' || user.role === 'administrator') &&
    deal.status === 'pending_manager_review'
  );
}

export function canKickBackToSales(user: User, deal: Deal): boolean {
  // Manager can kick back when reviewing; UW can kick back from underwriting or lender stages
  if (user.role === 'manager' || user.role === 'administrator') {
    return deal.status === 'pending_manager_review';
  }
  if (user.role === 'underwriter') {
    return deal.status === 'submitted_to_underwriting' || deal.status === 'submitted_to_lender';
  }
  return false;
}
