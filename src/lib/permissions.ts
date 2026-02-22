import { UserRole, DealStatus, Deal, User } from './types';
import { STATUS_TRANSITIONS } from './constants';

// === Role Hierarchy ===

const ROLE_HIERARCHY: Record<UserRole, number> = {
  agent: 1,
  manager: 2,
  general_manager: 3,
  underwriter: 4,
  executive: 5,
  administrator: 6,
};

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// === Page Access ===

export function canAccessAdminPanel(role: UserRole): boolean {
  return role === 'administrator';
}

export function canAccessReporting(role: UserRole): boolean {
  // All roles can access reporting (My Metrics tab is available to everyone)
  return true;
}

export function canSubmitDeals(role: UserRole): boolean {
  return role === 'agent' || role === 'administrator';
}

// === Reporting Permissions ===

/** Can view Manager Scorecard, Response Times, Approval Metrics, Volume tabs */
export function canViewFullReporting(role: UserRole): boolean {
  return ['manager', 'general_manager', 'executive', 'administrator'].includes(role);
}

/** Can view individual underwriter rankings and UW-internal metrics */
export function canViewUWInternals(role: UserRole): boolean {
  return role === 'executive' || role === 'administrator';
}

/** Can view reporting data across all offices (not scoped to own office) */
export function canViewAllOfficeReporting(role: UserRole): boolean {
  return ['general_manager', 'executive', 'administrator'].includes(role);
}

// === Deal Visibility ===

export function canViewDeal(user: User, deal: Deal): boolean {
  switch (user.role) {
    case 'agent':
      return deal.submitted_by === user.id;
    case 'manager':
      // Manager can see deals from their team (checked at query level)
      return true;
    case 'general_manager':
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
    case 'general_manager':
      return deal.status !== 'signed_and_delivered' && deal.status !== 'cancelled';
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
    case 'general_manager':
      return true;
    case 'administrator':
      return true;
    default:
      return false;
  }
}

export function canDeleteDocuments(user: User, deal: Deal): boolean {
  switch (user.role) {
    case 'agent':
      return deal.submitted_by === user.id;
    case 'manager':
    case 'general_manager':
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
    case 'general_manager':
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
    case 'general_manager':
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
    case 'general_manager':
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
  // Manager/GM can send to UW from initial review or after UW kicks it back
  return (
    (user.role === 'manager' || user.role === 'general_manager' || user.role === 'administrator') &&
    (deal.status === 'pending_manager_review' || deal.status === 'kicked_back_to_manager')
  );
}

export function canKickBackToManager(user: User, deal: Deal): boolean {
  // UW kicks back to manager (not directly to agent)
  if (user.role === 'underwriter' || user.role === 'administrator') {
    return deal.status === 'submitted_to_underwriting' || deal.status === 'submitted_to_lender';
  }
  return false;
}

export function canKickBackToSales(user: User, deal: Deal): boolean {
  // Manager/GM can kick back to agent from review or after UW kicked back to them
  if (user.role === 'manager' || user.role === 'general_manager' || user.role === 'administrator') {
    return deal.status === 'pending_manager_review' || deal.status === 'kicked_back_to_manager';
  }
  return false;
}
