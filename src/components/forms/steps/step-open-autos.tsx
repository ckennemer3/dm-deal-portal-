'use client';

import { DealFormData } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { RadioGroup } from '@/components/ui/radio-group';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Card } from '@/components/ui/card';

interface StepProps {
  formData: DealFormData;
  updateFormData: (updates: Partial<DealFormData>) => void;
  errors: Record<string, string>;
}

export function StepOpenAutos({ formData, updateFormData, errors }: StepProps) {
  const updateAuto = (index: number, field: string, value: string) => {
    const updated = [...formData.open_autos];
    updated[index] = { ...updated[index], [field]: value };
    updateFormData({ open_autos: updated });
  };

  const hasOpenAutosValue = formData.has_open_autos === null ? '' : formData.has_open_autos ? 'yes' : 'no';

  return (
    <div className="space-y-6">
      <RadioGroup
        label="Are there other open autos on the credit?"
        name="has_open_autos"
        required
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ]}
        value={hasOpenAutosValue}
        onChange={(value) => updateFormData({ has_open_autos: value === 'yes' })}
        error={errors.has_open_autos}
      />

      {formData.has_open_autos && (
        <div className="space-y-4 animate-slide-down">
          <Select
            label="How many other open autos?"
            options={Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
            value={String(formData.num_open_autos)}
            onChange={(e) => updateFormData({ num_open_autos: Number.parseInt(e.target.value) })}
            className="max-w-[200px]"
          />

          {formData.open_autos.map((auto, i) => (
            <Card key={`open-auto-${i}`} padding="md" className="space-y-4">
              <h4 className="font-medium text-surface-900">Open Auto {i + 1}</h4>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Lienholder" required value={auto.lienholder}
                  onChange={(e) => updateAuto(i, 'lienholder', e.target.value)}
                  error={errors[`auto_${i}_lienholder`]} />
                <CurrencyInput label="Monthly Payment" required value={auto.monthly_payment}
                  onChange={(v) => updateAuto(i, 'monthly_payment', v)}
                  error={errors[`auto_${i}_payment`]} />
              </div>
              <Input label="Who Drives This Vehicle" required value={auto.who_drives}
                onChange={(e) => updateAuto(i, 'who_drives', e.target.value)}
                error={errors[`auto_${i}_who_drives`]} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
