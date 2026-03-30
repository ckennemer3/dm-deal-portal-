import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DealType, VehicleCondition } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// === Currency Formatting ===

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function parseCurrencyInput(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

export function formatCurrencyInput(value: string): string {
  const num = parseCurrencyInput(value);
  if (num === null) return value;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

// === Percentage / LTV ===

export function calculateLTV(numerator: number | null, denominator: number | null): number | null {
  if (!numerator || !denominator || denominator === 0) return null;
  return (numerator / denominator) * 100;
}

export function formatPercentage(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value.toFixed(1)}%`;
}

export function getLTVColor(ltv: number | null): string {
  if (ltv === null) return 'text-surface-500';
  if (ltv <= 100) return 'text-status-success';
  if (ltv <= 115) return 'text-status-warning';
  return 'text-status-danger';
}

// === Time Formatting ===

export function formatDealAge(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  return formatDuration(diffMs);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatTimestamp(timestamp);
}

// === Timer Urgency ===

export function getTimerUrgency(
  elapsedMs: number,
  greenMaxHours: number,
  yellowMaxHours: number
): 'green' | 'yellow' | 'red' {
  const elapsedHours = elapsedMs / 3600000;
  if (elapsedHours <= greenMaxHours) return 'green';
  if (elapsedHours <= yellowMaxHours) return 'yellow';
  return 'red';
}

export const URGENCY_COLORS = {
  green: 'text-status-success',
  yellow: 'text-status-warning',
  red: 'text-status-danger',
} as const;

export const URGENCY_BG_COLORS = {
  green: 'bg-green-50',
  yellow: 'bg-amber-50',
  red: 'bg-red-50',
} as const;

// === Document Naming ===

export function generateDocumentDisplayName(
  lastName: string,
  vehicleYear: string,
  vehicleMake: string,
  vehicleModel: string,
  vehicleTrim: string,
  documentType: string
): string {
  const vehicle = [vehicleYear, vehicleMake, vehicleModel, vehicleTrim].filter(Boolean).join(' ');
  return `${lastName} - ${vehicle} - ${documentType}`;
}

// === Deal Number Generation ===

export function generateDealNumber(sequenceNumber: number): string {
  const year = new Date().getFullYear();
  const padded = String(sequenceNumber).padStart(5, '0');
  return `DM-${year}-${padded}`;
}

// === Vehicle Condition Logic ===

export function getVehicleConditionOptions(dealType: DealType): VehicleCondition[] {
  switch (dealType) {
    case 'lease':
      return ['new', 'used', 'untitled_demo'];
    case 're_lease':
    case 'retail_purchase':
    case 'lease_buyout':
      return ['used'];
    default:
      return [];
  }
}

export function isVehicleConditionAutoSelected(dealType: DealType): boolean {
  return dealType !== 'lease';
}

export function getAutoSelectedVehicleCondition(dealType: DealType): VehicleCondition | null {
  switch (dealType) {
    case 're_lease':
    case 'retail_purchase':
    case 'lease_buyout':
      return 'used';
    default:
      return null;
  }
}

// === Value Fields Visibility ===

export function showMSRPFields(condition: VehicleCondition | ''): boolean {
  return condition === 'new' || condition === 'untitled_demo';
}

export function showJDPowerFields(condition: VehicleCondition | ''): boolean {
  return condition === 'used';
}

export function showNetCapCost(dealType: DealType | ''): boolean {
  return dealType === 'lease' || dealType === 're_lease';
}

export function showTotalAmountFinanced(dealType: DealType | ''): boolean {
  return dealType === 'retail_purchase' || dealType === 'lease_buyout';
}

export function showMileageField(condition: VehicleCondition | ''): boolean {
  return condition === 'used' || condition === 'untitled_demo';
}

// === Validation Helpers ===

export function isRequiredFieldEmpty(value: string | number | boolean | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// === Text Formatting ===

export function toTitleCase(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// === Misc ===

export function getInitials(firstName: string, lastName: string): string {
  return `${(firstName?.[0] || '').toUpperCase()}${(lastName?.[0] || '').toUpperCase()}`;
}

export function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Determine if a deal has unread activity for the current user.
 * Compares deal.last_activity_at against the user's last view timestamp.
 * Returns true if the deal has never been viewed or has activity newer than the last view.
 */
export function isDealUnread(
  deal: { id: string; last_activity_at?: string; updated_at?: string },
  dealViews: Record<string, string>
): boolean {
  const viewedAt = dealViews[deal.id];
  if (!viewedAt) return true;
  const lastActivity = deal.last_activity_at || deal.updated_at;
  if (!lastActivity) return false;
  return new Date(lastActivity) > new Date(viewedAt);
}
