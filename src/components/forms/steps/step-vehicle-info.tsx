'use client';

import { DealFormData, VehicleCondition } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { RadioGroup } from '@/components/ui/radio-group';
import { CurrencyInput } from '@/components/ui/currency-input';
import { getVehicleConditionOptions, isVehicleConditionAutoSelected, getAutoSelectedVehicleCondition, showMSRPFields, showJDPowerFields, showNetCapCost, showTotalAmountFinanced, showMileageField, calculateLTV, formatPercentage, getLTVColor } from '@/lib/utils';

interface StepProps {
  formData: DealFormData;
  updateFormData: (updates: Partial<DealFormData>) => void;
  errors: Record<string, string>;
}

export function StepVehicleInfo({ formData, updateFormData, errors }: StepProps) {
  const dealType = formData.deal_type;
  const conditionOptions = getVehicleConditionOptions(dealType as any);
  const autoSelected = isVehicleConditionAutoSelected(dealType as any);
  const condition = autoSelected ? (getAutoSelectedVehicleCondition(dealType as any) || '') : formData.vehicle_condition;

  // LTV calculations
  const msrp = parseFloat(formData.msrp) || null;
  const invoice = parseFloat(formData.invoice) || null;
  const jdRetail = parseFloat(formData.jd_power_retail) || null;
  const jdWholesale = parseFloat(formData.jd_power_wholesale) || null;
  const netCapCost = parseFloat(formData.net_cap_cost) || null;
  const totalFinanced = parseFloat(formData.total_amount_financed) || null;

  const numerator = showNetCapCost(dealType) ? netCapCost : totalFinanced;

  return (
    <div className="space-y-6">
      {/* Vehicle Condition */}
      {!autoSelected && conditionOptions.length > 0 && (
        <RadioGroup
          label="Vehicle Condition"
          name="vehicle_condition"
          required
          options={conditionOptions.map(c => ({ value: c, label: c === 'new' ? 'New' : c === 'used' ? 'Used' : 'Untitled Demo' }))}
          value={formData.vehicle_condition}
          onChange={(value) => updateFormData({ vehicle_condition: value as VehicleCondition })}
          error={errors.vehicle_condition}
        />
      )}

      {autoSelected && (
        <div className="p-3 rounded-lg bg-surface-100">
          <p className="text-sm text-surface-600">
            Vehicle condition: <span className="font-medium">Used</span> (auto-selected for this deal type)
          </p>
        </div>
      )}

      {/* Vehicle Details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Input label="Year" required value={formData.vehicle_year}
          onChange={(e) => updateFormData({ vehicle_year: e.target.value })} error={errors.vehicle_year} />
        <Input label="Make" required value={formData.vehicle_make}
          onChange={(e) => updateFormData({ vehicle_make: e.target.value })} error={errors.vehicle_make} />
        <Input label="Model" required value={formData.vehicle_model}
          onChange={(e) => updateFormData({ vehicle_model: e.target.value })} error={errors.vehicle_model} />
        <Input label="Trim" required value={formData.vehicle_trim}
          onChange={(e) => updateFormData({ vehicle_trim: e.target.value })} error={errors.vehicle_trim} />
      </div>

      {/* Mileage */}
      {showMileageField(condition as VehicleCondition) && (
        <Input label="Current Mileage" required type="number" value={formData.vehicle_mileage}
          onChange={(e) => updateFormData({ vehicle_mileage: e.target.value })} error={errors.vehicle_mileage}
          className="max-w-xs" />
      )}

      {/* Value Fields + LTV */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {showMSRPFields(condition as VehicleCondition) && (
            <>
              <CurrencyInput label="MSRP" required value={formData.msrp}
                onChange={(v) => updateFormData({ msrp: v })} error={errors.msrp} />
              <CurrencyInput label="Invoice" required value={formData.invoice}
                onChange={(v) => updateFormData({ invoice: v })} error={errors.invoice} />
            </>
          )}

          {showJDPowerFields(condition as VehicleCondition) && (
            <>
              <CurrencyInput label="JD Power Retail" required value={formData.jd_power_retail}
                onChange={(v) => updateFormData({ jd_power_retail: v })} error={errors.jd_power_retail} />
              <CurrencyInput label="JD Power Wholesale" required value={formData.jd_power_wholesale}
                onChange={(v) => updateFormData({ jd_power_wholesale: v })} error={errors.jd_power_wholesale} />
            </>
          )}

          {showNetCapCost(dealType) && (
            <CurrencyInput label="Net Cap Cost" required value={formData.net_cap_cost}
              onChange={(v) => updateFormData({ net_cap_cost: v })} error={errors.net_cap_cost} />
          )}

          {showTotalAmountFinanced(dealType) && (
            <CurrencyInput label="Total Amount Financed" required value={formData.total_amount_financed}
              onChange={(v) => updateFormData({ total_amount_financed: v })} error={errors.total_amount_financed} />
          )}

          <Input label="Term (months)" type="number" value={formData.term}
            onChange={(e) => updateFormData({ term: e.target.value })} error={errors.term}
            placeholder="e.g. 36, 48, 60, 72" className="max-w-xs" />

          <CurrencyInput label="Monthly Payment" required value={formData.monthly_payment}
            onChange={(v) => updateFormData({ monthly_payment: v })} error={errors.monthly_payment} />
        </div>

        {/* LTV Panel */}
        {numerator && (
          <div className="card p-4 h-fit">
            <h4 className="text-sm font-medium text-surface-700 mb-3">LTV Calculations</h4>
            <div className="space-y-2">
              {showMSRPFields(condition as VehicleCondition) && msrp && (
                <LTVRow label="LTV to MSRP" value={calculateLTV(numerator, msrp)} />
              )}
              {showMSRPFields(condition as VehicleCondition) && invoice && (
                <LTVRow label="LTV to Invoice" value={calculateLTV(numerator, invoice)} />
              )}
              {showJDPowerFields(condition as VehicleCondition) && jdRetail && (
                <LTVRow label="LTV to JD Retail" value={calculateLTV(numerator, jdRetail)} />
              )}
              {showJDPowerFields(condition as VehicleCondition) && jdWholesale && (
                <LTVRow label="LTV to JD Wholesale" value={calculateLTV(numerator, jdWholesale)} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LTVRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-surface-600">{label}</span>
      <span className={`text-sm font-semibold ${getLTVColor(value)}`}>
        {formatPercentage(value)}
      </span>
    </div>
  );
}
