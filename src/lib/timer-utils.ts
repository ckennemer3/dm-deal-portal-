import { DealStatus, TimerThreshold } from './types';
import { DEFAULT_TIMER_CONFIG } from './constants';

/**
 * Returns the appropriate timer threshold for a given deal status.
 * Maps each active status to the corresponding timer configuration
 * (manager review, agent response, underwriter pickup, or underwriter review).
 */
export function getTimerThresholdForStatus(status: DealStatus): TimerThreshold {
  switch (status) {
    case 'pending_manager_review':
      return DEFAULT_TIMER_CONFIG.manager_review;

    case 'kicked_back_to_sales':
      return DEFAULT_TIMER_CONFIG.agent_response;

    case 'submitted_to_underwriting':
      return DEFAULT_TIMER_CONFIG.underwriter_pickup;

    case 'submitted_to_lender':
      return DEFAULT_TIMER_CONFIG.underwriter_review;

    // Pending, approved, terminal statuses — generous default
    case 'pending':
    case 'approved':
    case 'signed_and_delivered':
    case 'cancelled':
    default:
      return { green_max_hours: 4, yellow_max_hours: 8 };
  }
}
