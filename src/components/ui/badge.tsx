import { cn } from '@/lib/utils';
import { DealStatus } from '@/lib/types';
import { DEAL_STATUS_CONFIG } from '@/lib/constants';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const variantClasses = {
  default: 'bg-surface-200 text-surface-700',
  success: 'bg-emerald-100 text-emerald-900',
  warning: 'bg-amber-100 text-amber-900',
  danger: 'bg-red-100 text-red-900',
  info: 'bg-brand-100 text-brand-800',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('badge', variantClasses[variant], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: DealStatus; className?: string }) {
  const config = DEAL_STATUS_CONFIG[status];
  return (
    <span className={cn('badge', config.bgColor, config.color, className)}>
      {config.label}
    </span>
  );
}
