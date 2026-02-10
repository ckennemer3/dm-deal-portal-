import { cn } from '@/lib/utils';
import { DealStatus } from '@/lib/types';
import { DEAL_STATUS_CONFIG } from '@/lib/constants';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const variantClasses = {
  default: 'bg-surface-100 text-surface-700',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
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
