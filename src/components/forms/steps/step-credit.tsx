'use client';

import { DealFormData } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';

interface StepProps {
  formData: DealFormData;
  updateFormData: (updates: Partial<DealFormData>) => void;
  errors: Record<string, string>;
}

export function StepCredit({ formData, updateFormData, errors }: Readonly<StepProps>) {
  const updateApplicant = (index: number, field: string, value: any) => {
    const updated = [...formData.applicants];
    updated[index] = { ...updated[index], [field]: value };
    updateFormData({ applicants: updated });
  };

  let derogatoryValue = '';
  if (formData.has_derogatory_credit === true) derogatoryValue = 'yes';
  else if (formData.has_derogatory_credit === false) derogatoryValue = 'no';

  return (
    <div className="space-y-6">
      {/* Credit Scores Table */}
      <Card padding="md">
        <h3 className="font-medium text-surface-900 mb-4">Experian Credit Scores</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left text-xs font-medium text-surface-500 uppercase pb-2">Applicant</th>
                <th className="text-left text-xs font-medium text-surface-500 uppercase pb-2">Experian Score</th>
                <th className="text-left text-xs font-medium text-surface-500 uppercase pb-2">Higher Alternate?</th>
                <th className="text-left text-xs font-medium text-surface-500 uppercase pb-2">Bureau</th>
                <th className="text-left text-xs font-medium text-surface-500 uppercase pb-2">Alt Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {formData.applicants.map((app, idx) => (
                <tr key={`credit-${app.first_name}-${app.last_name}`}>
                  <td className="py-3 pr-4">
                    <span className="text-sm text-surface-900">
                      {app.first_name || 'Applicant'} {app.last_name || (idx + 1)}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <Input
                      type="number"
                      value={app.experian_score}
                      onChange={(e) => updateApplicant(idx, 'experian_score', e.target.value)}
                      error={errors[`applicant_${idx}_score`]}
                      placeholder="Score"
                      className="max-w-[120px]"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <input
                      type="checkbox"
                      checked={app.has_alternate_bureau}
                      onChange={(e) => updateApplicant(idx, 'has_alternate_bureau', e.target.checked)}
                      className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    {app.has_alternate_bureau && (
                      <Select
                        options={[
                          { value: 'equifax', label: 'Equifax' },
                          { value: 'transunion', label: 'TransUnion' },
                        ]}
                        value={app.alternate_bureau}
                        onChange={(e) => updateApplicant(idx, 'alternate_bureau', e.target.value)}
                        placeholder="Select"
                        className="max-w-[150px]"
                      />
                    )}
                  </td>
                  <td className="py-3">
                    {app.has_alternate_bureau && (
                      <Input
                        type="number"
                        value={app.alternate_score}
                        onChange={(e) => updateApplicant(idx, 'alternate_score', e.target.value)}
                        placeholder="Score"
                        className="max-w-[120px]"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Deal Strengths */}
      <Textarea
        label="Deal Strengths / Selling Points"
        required
        value={formData.deal_strengths}
        onChange={(e) => updateFormData({ deal_strengths: e.target.value })}
        error={errors.deal_strengths}
        placeholder="Tell us what we can't see on the credit file about your client to help sell the deal to the bank"
        rows={4}
      />

      {/* Derogatory Credit */}
      <RadioGroup
        label="Any Derogatory Credit in the file?"
        name="has_derogatory_credit"
        required
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ]}
        value={derogatoryValue}
        onChange={(value) => updateFormData({ has_derogatory_credit: value === 'yes' })}
        error={errors.has_derogatory_credit}
      />

      {formData.has_derogatory_credit && (
        <Textarea
          label="Explanation of Derogatory Credit"
          required
          value={formData.derogatory_credit_explanation}
          onChange={(e) => updateFormData({ derogatory_credit_explanation: e.target.value })}
          error={errors.derogatory_explanation}
          placeholder="Explain the derogatory credit on the file — include timelines of when it happened"
          rows={4}
          className="animate-slide-down"
        />
      )}
    </div>
  );
}
