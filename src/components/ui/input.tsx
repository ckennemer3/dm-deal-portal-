import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replaceAll(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
            {props.required && <span className="text-status-danger ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'input-base',
            error && 'border-status-danger focus:ring-red-500/20 focus:border-status-danger',
            className
          )}
          {...props}
        />
        {error && <p className="error-text">{error}</p>}
        {hint && !error && <p className="text-sm text-surface-500 mt-1">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
