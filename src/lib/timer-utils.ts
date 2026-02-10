import { DealStatus, TimerThreshold } from './types';
import { DEFAULT_TIMER_CONFIG } from './constants';

/**
 * Returns the appropriate timer threshold for a given deal status.
 * Maps each active status to the corresponding timer configuration
 * (manager review, agent response, underwriter pickup, or underwriter review).
 */
export function getTimerThresholdForStatus(status: DealStatus): TimerThreshold {
  switch (status) {
    case 'submitted_to_manager':
    case 'manager_reviewing':
    case 'resubmitted_to_manager':
    case 'kicked_back_to_manager':
      return DEFAULT_TIMER_CONFIG.manager_review;

    case 'kicked_back_to_agent':
      return DEFAULT_TIMER_CONFIG.agent_response;

    case 'sent_to_underwriting':
      return DEFAULT_TIMER_CONFIG.underwriter_pickup;

    case 'underwriting_assigned':
    case 'underwriting_reviewing':
    case 'resubmitted_to_underwriting':
      return DEFAULT_TIMER_CONFIG.underwriter_review;

    // Terminal statuses — fall back to a generous default
    case 'completed':
    case 'cancelled':
    default:
      return { green_max_hours: 4, yellow_max_hours: 8 };
  }
}
