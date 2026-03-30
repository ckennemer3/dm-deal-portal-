'use client';

import { useState, forwardRef, InputHTMLAttributes, useCallback } from 'react';
import { cn, parseCurrencyInput } from '@/lib/utils';

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ label, error, value, onChange, id, className, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replaceAll(/\s+/g, '-');
    const [displayValue, setDisplayValue] = useState(value);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replaceAll(/[^0-9.]/g, '');
      setDisplayValue(raw);
      onChange(raw);
    }, [onChange]);

    const handleBlur = useCallback(() => {
      const num = parseCurrencyInput(displayValue);
      if (num !== null) {
        const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        setDisplayValue(formatted);
      }
    }, [displayValue]);

    const handleFocus = useCallback(() => {
      const num = parseCurrencyInput(displayValue);
      if (num !== null) {
        setDisplayValue(num.toString());
      }
    }, [displayValue]);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
            {props.required && <span className="text-status-danger ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">$</span>
          <input
            ref={ref}
            id={inputId}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            className={cn(
              'input-base pl-7',
              error && 'border-status-danger focus:ring-red-500/20 focus:border-status-danger',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
