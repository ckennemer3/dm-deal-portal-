import { forwardRef, TextareaHTMLAttributes, useId } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    // useId guarantees uniqueness — label-derived ids collide when the same
    // label appears multiple times on a page.
    const autoId = useId();
    const textareaId = id || autoId;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="label">
            {label}
            {props.required && <span className="text-status-danger ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'input-base min-h-[100px] resize-y',
            error && 'border-status-danger focus:ring-red-500/20 focus:border-status-danger',
            className
          )}
          {...props}
        />
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
