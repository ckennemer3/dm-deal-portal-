'use client';

import { DealFormData, DealType, DocumentType } from '@/lib/types';
import { REQUIRED_DOCUMENTS, OPTIONAL_DOCUMENTS, DOCUMENT_TYPE_LABELS } from '@/lib/constants';
import { FileUpload } from '@/components/ui/file-upload';
import { Card } from '@/components/ui/card';

interface StepDocumentsProps {
  formData: DealFormData;
  pendingFiles: Map<string, File>;
  onFileSelect: (docType: string, file: File) => void;
  onFileRemove: (docType: string) => void;
  otherDocLabel?: string;
  onOtherLabelChange?: (label: string) => void;
}

export function StepDocuments({ formData, pendingFiles, onFileSelect, onFileRemove, otherDocLabel = '', onOtherLabelChange }: Readonly<StepDocumentsProps>) {
  const dealType = formData.deal_type;
  const condition = formData.vehicle_condition;

  if (!dealType) return <p className="text-surface-500">Select a deal type first.</p>;

  // Get required documents
  let requiredDocs: DocumentType[] = [...(REQUIRED_DOCUMENTS[dealType] || [])];

  // Add JD Power if lease + used vehicle
  if (dealType === 'lease' && condition === 'used' && !requiredDocs.includes('jd_power_book_outs')) {
    requiredDocs.push('jd_power_book_outs');
  }

  // Add business credit app if needed
  if (formData.adding_business) {
    requiredDocs.push('business_credit_app');
  }

  const handleUpload = async (docType: string, file: File) => {
    onFileSelect(docType, file);
  };

  const getFileInfo = (docType: string): { name: string } | null => {
    const file = pendingFiles.get(docType);
    return file ? { name: file.name } : null;
  };

  return (
    <div className="space-y-6">
      {/* Required Documents */}
      <Card padding="md">
        <h3 className="font-medium text-surface-900 mb-4">Required Documents</h3>
        <div className="space-y-4">
          {requiredDocs.map((docType) => (
            <FileUpload
              key={docType}
              label={DOCUMENT_TYPE_LABELS[docType]}
              required
              currentFile={getFileInfo(docType)}
              onUpload={(file) => handleUpload(docType, file)}
            />
          ))}
        </div>
      </Card>

      {/* Alternate Credit Bureau (per applicant) */}
      {formData.applicants.some(a => a.has_alternate_bureau) && (
        <Card padding="md">
          <h3 className="font-medium text-surface-900 mb-4">Alternate Credit Bureau Documents</h3>
          <div className="space-y-4">
            {formData.applicants.map((app, i) =>
              app.has_alternate_bureau ? (
                <FileUpload
                  key={`alt_bureau_${i}`}
                  label={`Alternate Credit Bureau — ${app.first_name} ${app.last_name}`}
                  required
                  currentFile={getFileInfo(`alternate_credit_bureau_${i}`)}
                  onUpload={(file) => handleUpload(`alternate_credit_bureau_${i}`, file)}
                />
              ) : null
            )}
          </div>
        </Card>
      )}

      {/* Optional Documents */}
      <Card padding="md">
        <h3 className="font-medium text-surface-900 mb-4">Optional Documents</h3>
        <div className="space-y-4">
          {OPTIONAL_DOCUMENTS.map((docType) => (
            <div key={docType}>
              {docType === 'other' && (
                <input
                  type="text"
                  value={otherDocLabel}
                  onChange={(e) => onOtherLabelChange?.(e.target.value.slice(0, 50))}
                  maxLength={50}
                  placeholder="Describe the document (max 50 chars)"
                  className="input text-sm py-1.5 mb-2"
                />
              )}
              <FileUpload
                label={docType === 'other' && otherDocLabel.trim() ? otherDocLabel : DOCUMENT_TYPE_LABELS[docType]}
                currentFile={getFileInfo(docType)}
                onUpload={(file) => handleUpload(docType, file)}
              />
            </div>
          ))}
        </div>
      </Card>

      <p className="text-xs text-surface-400">
        Documents can also be uploaded after submission from the deal detail page.
      </p>
    </div>
  );
}
