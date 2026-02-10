'use client';

import { DealFormData } from '@/lib/types';
import { RadioGroup } from '@/components/ui/radio-group';
import { Select } from '@/components/ui/select';

interface StepProps {
  formData: DealFormData;
  updateFormData: (updates: Partial<DealFormData>) => void;
  errors: Record<string, string>;
}

export function StepDealSetup({ formData, updateFormData, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <RadioGroup
        label="Deal Type"
        name="deal_type"
        required
        options={[
          { value: 'lease', label: 'Lease' },
          { value: 'retail_purchase', label: 'Retail Purchase' },
          { value: 're_lease', label: 'Re-Lease' },
          { value: 'lease_buyout', label: 'Lease Buy-out' },
        ]}
        value={formData.deal_type}
        onChange={(value) => updateFormData({ deal_type: value as any })}
        error={errors.deal_type}
      />

      <div className="flex items-end gap-6">
        <Select
          label="Number of Applicants"
          required
          options={[
            { value: '1', label: '1' },
            { value: '2', label: '2' },
            { value: '3', label: '3' },
          ]}
          value={String(formData.num_applicants)}
          onChange={(e) => updateFormData({ num_applicants: parseInt(e.target.value) })}
          className="max-w-[200px]"
        />

        <RadioGroup
          label="Adding a Business?"
          name="adding_business"
          options={[
            { value: 'no', label: 'No' },
            { value: 'yes', label: 'Yes' },
          ]}
          value={formData.adding_business ? 'yes' : 'no'}
          onChange={(value) => updateFormData({ adding_business: value === 'yes' })}
        />
      </div>
    </div>
  );
}
