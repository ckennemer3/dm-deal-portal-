'use client';

import { cn } from '@/lib/utils';

interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  label?: string;
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  direction?: 'horizontal' | 'vertical';
}

export function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  error,
  required,
  direction = 'horizontal',
}: Readonly<RadioGroupProps>) {
  return (
    <fieldset className="w-full">
      {label && (
        <legend className="label mb-2">
          {label}
          {required && <span className="text-status-danger ml-0.5">*</span>}
        </legend>
      )}
      <div className={cn(
        'flex gap-3',
        direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
      )}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all duration-150',
              value === option.value
                ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                : 'border-surface-300 hover:border-surface-400 hover:bg-surface-50'
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <div
              className={cn(
                'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                value === option.value ? 'border-brand-600' : 'border-surface-400'
              )}
            >
              {value === option.value && (
                <div className="w-2 h-2 rounded-full bg-brand-600" />
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-surface-900">{option.label}</span>
              {option.description && (
                <p className="text-xs text-surface-500 mt-0.5">{option.description}</p>
              )}
            </div>
          </label>
        ))}
      </div>
      {error && <p className="error-text">{error}</p>}
    </fieldset>
  );
}
