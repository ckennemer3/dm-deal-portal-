'use client';

import { DealFormData } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface StepProps {
  formData: DealFormData;
  updateFormData: (updates: Partial<DealFormData>) => void;
  errors: Record<string, string>;
}

export function StepApplicantInfo({ formData, updateFormData, errors }: Readonly<StepProps>) {
  const updateApplicant = (index: number, field: string, value: string) => {
    const updated = [...formData.applicants];
    updated[index] = { ...updated[index], [field]: value };
    updateFormData({ applicants: updated });
  };

  return (
    <div className="space-y-6">
      {formData.applicants.map((app, i) => (
        <Card key={`applicant-${i}`} padding="md" className="space-y-4">
          <h3 className="font-medium text-surface-900">
            Applicant {i + 1} {i === 0 && '(Primary)'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              required
              value={app.first_name}
              onChange={(e) => updateApplicant(i, 'first_name', e.target.value)}
              error={errors[`applicant_${i}_first_name`]}
            />
            <Input
              label="Last Name"
              required
              value={app.last_name}
              onChange={(e) => updateApplicant(i, 'last_name', e.target.value)}
              error={errors[`applicant_${i}_last_name`]}
            />
          </div>
        </Card>
      ))}

      {formData.adding_business && (
        <Card padding="md" className="space-y-4">
          <h3 className="font-medium text-surface-900">Business Information</h3>
          <Input
            label="Business Legal Name"
            required
            value={formData.business_legal_name}
            onChange={(e) => updateFormData({ business_legal_name: e.target.value })}
            error={errors.business_legal_name}
          />
        </Card>
      )}
    </div>
  );
}
