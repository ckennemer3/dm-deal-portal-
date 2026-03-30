'use client';

import { DealFormData } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { RadioGroup } from '@/components/ui/radio-group';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Card } from '@/components/ui/card';

interface StepProps {
  formData: DealFormData;
  updateFormData: (updates: Partial<DealFormData>) => void;
  errors: Record<string, string>;
}

export function StepTradeIn({ formData, updateFormData, errors }: StepProps) {
  const updateTradeIn = (field: string, value: string) => {
    updateFormData({ trade_in: { ...formData.trade_in, [field]: value } });
  };

  const hasTradeInValue = formData.has_trade_in === null ? '' : formData.has_trade_in ? 'yes' : 'no';

  return (
    <div className="space-y-6">
      <RadioGroup
        label="Is the client trading in a vehicle?"
        name="has_trade_in"
        required
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ]}
        value={hasTradeInValue}
        onChange={(value) => updateFormData({ has_trade_in: value === 'yes' })}
        error={errors.has_trade_in}
      />

      {formData.has_trade_in && (
        <Card padding="md" className="space-y-4 animate-slide-down">
          <div className="grid grid-cols-3 gap-4">
            <Input label="Year" required value={formData.trade_in.year}
              onChange={(e) => updateTradeIn('year', e.target.value)} error={errors.trade_in_year} />
            <Input label="Make" required value={formData.trade_in.make}
              onChange={(e) => updateTradeIn('make', e.target.value)} error={errors.trade_in_make} />
            <Input label="Model" required value={formData.trade_in.model}
              onChange={(e) => updateTradeIn('model', e.target.value)} error={errors.trade_in_model} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <CurrencyInput label="Monthly Payment" required value={formData.trade_in.monthly_payment}
              onChange={(v) => updateTradeIn('monthly_payment', v)} error={errors.trade_in_payment} />
            <Input label="Lienholder" required value={formData.trade_in.lienholder}
              onChange={(e) => updateTradeIn('lienholder', e.target.value)} error={errors.trade_in_lienholder} />
          </div>
          <Input label="Who Drives This Vehicle" required value={formData.trade_in.who_drives}
            onChange={(e) => updateTradeIn('who_drives', e.target.value)} error={errors.trade_in_who_drives} />
        </Card>
      )}
    </div>
  );
}
