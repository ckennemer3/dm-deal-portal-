'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserWithRelations, DealFormData } from '@/lib/types';
import { FORM_STEPS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { StepDealSetup } from './steps/step-deal-setup';
import { StepApplicantInfo } from './steps/step-applicant-info';
import { StepVehicleInfo } from './steps/step-vehicle-info';
import { StepTradeIn } from './steps/step-trade-in';
import { StepOpenAutos } from './steps/step-open-autos';
import { StepCredit } from './steps/step-credit';
import { StepDocuments } from './steps/step-documents';
import { submitDeal } from '@/app/dashboard/deals/new/actions';
import { uploadDocument } from '@/app/dashboard/deals/actions-documents';

// --- Per-step validation helpers (module scope to keep validateStep simple) ---

function validateDealSetup(formData: DealFormData, errors: Record<string, string>) {
  if (!formData.deal_type) errors.deal_type = 'Deal type is required';
}

function validateApplicantInfo(formData: DealFormData, errors: Record<string, string>) {
  formData.applicants.forEach((app, i) => {
    if (!app.first_name.trim()) errors[`applicant_${i}_first_name`] = 'Required';
    if (!app.last_name.trim()) errors[`applicant_${i}_last_name`] = 'Required';
  });
  if (formData.adding_business && !formData.business_legal_name.trim()) {
    errors.business_legal_name = 'Business name is required';
  }
}

function validateVehicleInfo(formData: DealFormData, errors: Record<string, string>) {
  if (!formData.vehicle_condition && formData.deal_type === 'lease') errors.vehicle_condition = 'Required';
  if (!formData.vehicle_year.trim()) errors.vehicle_year = 'Required';
  if (!formData.vehicle_make.trim()) errors.vehicle_make = 'Required';
  if (!formData.vehicle_model.trim()) errors.vehicle_model = 'Required';
  if (!formData.vehicle_trim.trim()) errors.vehicle_trim = 'Required';
  if (!formData.monthly_payment.trim()) errors.monthly_payment = 'Required';
}

function validateTradeIn(formData: DealFormData, errors: Record<string, string>) {
  if (formData.has_trade_in === null) { errors.has_trade_in = 'Required'; return; }
  if (!formData.has_trade_in) return;
  if (!formData.trade_in.year.trim()) errors.trade_in_year = 'Required';
  if (!formData.trade_in.make.trim()) errors.trade_in_make = 'Required';
  if (!formData.trade_in.model.trim()) errors.trade_in_model = 'Required';
  if (!formData.trade_in.monthly_payment.trim()) errors.trade_in_payment = 'Required';
  if (!formData.trade_in.lienholder.trim()) errors.trade_in_lienholder = 'Required';
  if (!formData.trade_in.who_drives.trim()) errors.trade_in_who_drives = 'Required';
}

function validateOpenAutos(formData: DealFormData, errors: Record<string, string>) {
  if (formData.has_open_autos === null) { errors.has_open_autos = 'Required'; return; }
  if (!formData.has_open_autos) return;
  formData.open_autos.forEach((auto, i) => {
    if (!auto.lienholder.trim()) errors[`auto_${i}_lienholder`] = 'Required';
    if (!auto.monthly_payment.trim()) errors[`auto_${i}_payment`] = 'Required';
    if (!auto.who_drives.trim()) errors[`auto_${i}_who_drives`] = 'Required';
  });
}

function validateCredit(formData: DealFormData, errors: Record<string, string>) {
  formData.applicants.forEach((app, i) => {
    if (!app.experian_score.trim()) errors[`applicant_${i}_score`] = 'Required';
  });
  if (!formData.deal_strengths.trim()) errors.deal_strengths = 'Required';
  if (formData.has_derogatory_credit === null) errors.has_derogatory_credit = 'Required';
  if (formData.has_derogatory_credit && !formData.derogatory_credit_explanation.trim()) {
    errors.derogatory_explanation = 'Required';
  }
}

const STEP_VALIDATORS: Record<number, (formData: DealFormData, errors: Record<string, string>) => void> = {
  1: validateDealSetup,
  2: validateApplicantInfo,
  3: validateVehicleInfo,
  4: validateTradeIn,
  5: validateOpenAutos,
  6: validateCredit,
};

interface DealFormWizardProps {
  user: UserWithRelations;
}

const initialFormData: DealFormData = {
  deal_type: '',
  num_applicants: 1,
  adding_business: false,
  applicants: [{ first_name: '', last_name: '', experian_score: '', has_alternate_bureau: false, alternate_bureau: '', alternate_score: '' }],
  business_legal_name: '',
  vehicle_condition: '',
  vehicle_year: '', vehicle_make: '', vehicle_model: '', vehicle_trim: '',
  vehicle_mileage: '', msrp: '', invoice: '',
  jd_power_retail: '', jd_power_wholesale: '',
  net_cap_cost: '', total_amount_financed: '', term: '', monthly_payment: '',
  has_trade_in: null,
  trade_in: { year: '', make: '', model: '', monthly_payment: '', lienholder: '', who_drives: '' },
  has_open_autos: null,
  num_open_autos: 1,
  open_autos: [{ lienholder: '', monthly_payment: '', who_drives: '' }],
  deal_strengths: '',
  has_derogatory_credit: null,
  derogatory_credit_explanation: '',
};

export function DealFormWizard({ user }: Readonly<DealFormWizardProps>) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<DealFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Document files — stored separately since File objects aren't serializable
  const [pendingFiles, setPendingFiles] = useState<Map<string, File>>(new Map());
  const [otherDocLabel, setOtherDocLabel] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const updateFormData = useCallback((updates: Partial<DealFormData>) => {
    setFormData(prev => {
      const next = { ...prev, ...updates };

      // Sync applicants array length
      if (updates.num_applicants !== undefined) {
        const count = updates.num_applicants;
        const current = prev.applicants;
        if (count > current.length) {
          next.applicants = [...current, ...new Array(count - current.length).fill(null).map(() => (
            { first_name: '', last_name: '', experian_score: '', has_alternate_bureau: false, alternate_bureau: '' as const, alternate_score: '' }
          ))];
        } else {
          next.applicants = current.slice(0, count);
        }
      }

      // Sync open autos array length
      if (updates.num_open_autos !== undefined) {
        const count = updates.num_open_autos;
        const current = prev.open_autos;
        if (count > current.length) {
          next.open_autos = [...current, ...new Array(count - current.length).fill(null).map(() => (
            { lienholder: '', monthly_payment: '', who_drives: '' }
          ))];
        } else {
          next.open_autos = current.slice(0, count);
        }
      }

      return next;
    });
    setErrors({});
  }, []);

  // Document file handlers
  const handleFileSelect = useCallback((docType: string, file: File) => {
    setPendingFiles(prev => {
      const next = new Map(prev);
      next.set(docType, file);
      return next;
    });
  }, []);

  const handleFileRemove = useCallback((docType: string) => {
    setPendingFiles(prev => {
      const next = new Map(prev);
      next.delete(docType);
      return next;
    });
  }, []);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    STEP_VALIDATORS[step]?.(formData, newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 7));
    }
  };

  const goBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      // Phase 1: Create the deal record
      const result = await submitDeal(formData);
      const dealId = result.dealId;

      // Phase 2: Upload all pending documents to the new deal
      const filesToUpload = Array.from(pendingFiles.entries());
      if (filesToUpload.length > 0) {
        setUploadProgress({ current: 0, total: filesToUpload.length });

        for (let i = 0; i < filesToUpload.length; i++) {
          const [docType, file] = filesToUpload[i];
          setUploadProgress({ current: i + 1, total: filesToUpload.length });

          try {
            const fd = new FormData();
            fd.append('file', file);
            if (docType === 'other' && otherDocLabel.trim()) {
              fd.append('customLabel', otherDocLabel.trim());
            }
            const uploadResult = await uploadDocument(dealId, docType, null, fd);
            if (!uploadResult.success) {
              console.error(`Failed to upload ${docType}:`, uploadResult.error);
            }
          } catch (uploadErr) {
            console.error(`Failed to upload ${docType}:`, uploadErr);
          }
        }
      }

      router.push(`/dashboard/deals/${dealId}?submitted=true`);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit deal');
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const stepComponents: Record<number, React.ReactNode> = {
    1: <StepDealSetup formData={formData} updateFormData={updateFormData} errors={errors} />,
    2: <StepApplicantInfo formData={formData} updateFormData={updateFormData} errors={errors} />,
    3: <StepVehicleInfo formData={formData} updateFormData={updateFormData} errors={errors} />,
    4: <StepTradeIn formData={formData} updateFormData={updateFormData} errors={errors} />,
    5: <StepOpenAutos formData={formData} updateFormData={updateFormData} errors={errors} />,
    6: <StepCredit formData={formData} updateFormData={updateFormData} errors={errors} />,
    7: <StepDocuments
         formData={formData}
         pendingFiles={pendingFiles}
         onFileSelect={handleFileSelect}
         onFileRemove={handleFileRemove}
         otherDocLabel={otherDocLabel}
         onOtherLabelChange={setOtherDocLabel}
       />,
  };

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <nav className="flex items-center gap-2">
        {FORM_STEPS.map((step) => {
          let stepBtnClass = 'bg-surface-200 text-surface-500';
          if (step.id === currentStep) stepBtnClass = 'bg-brand-600 text-white';
          else if (step.id < currentStep) stepBtnClass = 'bg-brand-100 text-brand-700 cursor-pointer';
          return (
          <div key={step.id} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => { if (step.id < currentStep) setCurrentStep(step.id); }}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-colors flex-shrink-0',
                stepBtnClass
              )}
            >
              {step.id < currentStep ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : step.id}
            </button>
            <span className={cn(
              'text-xs font-medium hidden md:block',
              step.id === currentStep ? 'text-brand-700' : 'text-surface-500'
            )}>
              {step.title}
            </span>
            {step.id < 7 && (
              <div className={cn(
                'flex-1 h-0.5',
                step.id < currentStep ? 'bg-brand-200' : 'bg-surface-200'
              )} />
            )}
          </div>
          );
        })}
      </nav>

      {/* Step content */}
      <div className="card p-6 min-h-[400px]">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-surface-900">
            Step {currentStep}: {FORM_STEPS[currentStep - 1].title}
          </h2>
          <p className="text-sm text-surface-500 mt-0.5">
            {FORM_STEPS[currentStep - 1].description}
          </p>
        </div>

        {stepComponents[currentStep]}

        {submitError && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {/* Upload progress indicator */}
        {uploadProgress && (
          <div className="mt-4 p-3 rounded-lg bg-brand-50 border border-brand-200">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-brand-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm text-brand-700">
                Uploading documents... {uploadProgress.current} of {uploadProgress.total}
              </p>
            </div>
            <div className="mt-2 w-full bg-brand-100 rounded-full h-1.5">
              <div
                className="bg-brand-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={goBack}
          disabled={currentStep === 1 || submitting}
        >
          Back
        </Button>
        <div className="flex items-center gap-3">
          {currentStep < 7 ? (
            <Button onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={submitting}>
              {uploadProgress ? 'Uploading Documents...' : 'Submit Deal'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
