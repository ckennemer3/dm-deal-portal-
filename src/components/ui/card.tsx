import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ children, className, hover = false, padding = 'md' }: Readonly<CardProps>) {
  return (
    <div className={cn(hover ? 'card-hover' : 'card', paddingClasses[padding], className)}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, action, className }: Readonly<CardHeaderProps>) {
  return (
    <div className={cn('flex items-start justify-between', className)}>
      <div>
        <h3 className="text-base font-semibold text-surface-900">{title}</h3>
        {description && <p className="text-sm text-surface-500 mt-0.5">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  );
}
