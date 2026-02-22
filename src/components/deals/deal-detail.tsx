'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserWithRelations, DealStatus, KickbackReason, AuditActionType, DocumentType } from '@/lib/types';
import { DEAL_TYPE_LABELS, VEHICLE_CONDITION_LABELS, DEAL_STATUS_CONFIG, DOCUMENT_TYPE_LABELS, KICKBACK_REASON_LABELS, AUDIT_ACTION_LABELS, MANAGER_RESPONSE_TIMER_CONFIG } from '@/lib/constants';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, Badge } from '@/components/ui/badge';
import { TimerBadge } from '@/components/ui/timer-badge';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { formatCurrency, formatDealAge, formatTimestamp, formatPercentage, calculateLTV, getLTVColor, getFullName } from '@/lib/utils';
import { canEditDealFields, canApproveAndForward, canKickBackToManager, canKickBackToSales, canClaimDeal, canReassignDeal, canSendMessage, canSendActionRequired, canUploadDocuments, canDeleteDocuments } from '@/lib/permissions';
import { updateDealStatus, claimDeal, reassignDeal, sendMessage, updateDealField, respondToKickback } from '@/app/dashboard/deals/[id]/actions';
import { uploadDocument, deleteDocument, getDocumentSignedUrl } from '@/app/dashboard/deals/actions-documents';
import { CommunicationThread } from './communication-thread';
import { DealAgeTimer } from '@/components/ui/deal-age-timer';
import { getTimerThresholdForStatus } from '@/lib/timer-utils';

interface DealDetailProps {
  deal: any;
  user: UserWithRelations;
  underwriters: { id: string; first_name: string; last_name: string }[];
  auditEntries?: any[];
  kickbackReasons?: any[];
  userLastViewedAt?: string | null;
}

// Friendly labels for field names used in inline editing and deal history
const FIELD_LABELS: Record<string, string> = {
  deal_type: 'Deal Type',
  vehicle_condition: 'Vehicle Condition',
  vehicle_year: 'Vehicle Year',
  vehicle_make: 'Vehicle Make',
  vehicle_model: 'Vehicle Model',
  vehicle_trim: 'Vehicle Trim',
  vehicle_mileage: 'Mileage',
  msrp: 'MSRP',
  invoice: 'Invoice',
  jd_power_retail: 'JD Power Retail',
  jd_power_wholesale: 'JD Power Wholesale',
  net_cap_cost: 'Net Cap Cost',
  total_amount_financed: 'Amount Financed',
  monthly_payment: 'Monthly Payment',
  term: 'Term (months)',
  deal_strengths: 'Deal Strengths',
  derogatory_credit_explanation: 'Derogatory Credit Explanation',
  business_legal_name: 'Business Legal Name',
  num_applicants: 'Number of Applicants',
};

// Fields that represent currency values
const CURRENCY_FIELDS = new Set([
  'msrp', 'invoice', 'jd_power_retail', 'jd_power_wholesale',
  'net_cap_cost', 'total_amount_financed', 'monthly_payment',
]);

function formatFieldValue(fieldName: string, value: string | number | null | undefined): string {
  if (value == null || value === '') return '—';
  const strVal = String(value);
  if (CURRENCY_FIELDS.has(fieldName)) {
    const num = parseFloat(strVal);
    return isNaN(num) ? strVal : formatCurrency(num);
  }
  if (fieldName === 'deal_type') {
    return DEAL_TYPE_LABELS[strVal as keyof typeof DEAL_TYPE_LABELS] || strVal;
  }
  if (fieldName === 'vehicle_condition') {
    return VEHICLE_CONDITION_LABELS[strVal as keyof typeof VEHICLE_CONDITION_LABELS] || strVal;
  }
  if (fieldName === 'vehicle_mileage') {
    const num = parseInt(strVal, 10);
    return isNaN(num) ? strVal : num.toLocaleString();
  }
  return strVal;
}

/** Color dot for Deal History entries based on action type */
function getActionColor(actionType: string): string {
  switch (actionType) {
    case 'status_changed':
    case 'deal_resubmitted':
      return 'bg-brand-400';
    case 'deal_kicked_back':
      return 'bg-orange-400';
    case 'deal_claimed':
    case 'deal_reassigned':
      return 'bg-purple-400';
    case 'document_uploaded':
    case 'document_replaced':
      return 'bg-emerald-400';
    case 'document_deleted':
      return 'bg-red-400';
    case 'message_sent':
    case 'action_required_resolved':
      return 'bg-sky-400';
    case 'field_changed':
      return 'bg-amber-400';
    case 'kickback_responded':
      return 'bg-orange-400';
    default:
      return 'bg-surface-400';
  }
}

/** Merged Deal History section — replaces old Deal History + Audit Log */
function DealHistory({ entries }: { entries: any[] }) {
  const [showAll, setShowAll] = useState(false);
  const INITIAL_LIMIT = 20;
  const displayEntries = showAll ? entries : entries.slice(0, INITIAL_LIMIT);
  const hasMore = entries.length > INITIAL_LIMIT;

  return (
    <Card padding="md">
      <CardHeader title={`Deal History (${entries.length})`} />
      <div className="mt-4 space-y-1">
        {entries.length === 0 ? (
          <p className="text-sm text-surface-500">No history yet.</p>
        ) : (
          <>
            {displayEntries.map((entry) => {
              const userName = entry.user
                ? `${entry.user.first_name} ${entry.user.last_name}`
                : 'System';
              const actionLabel = AUDIT_ACTION_LABELS[entry.action_type as AuditActionType] || entry.action_type;

              return (
                <div key={entry.id} className="flex items-start gap-3 py-1.5 border-b border-surface-50 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getActionColor(entry.action_type)}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-surface-700">{userName}</span>
                      <span className="text-xs text-surface-400">{actionLabel}</span>
                    </div>
                    <p className="text-xs text-surface-600">{entry.description}</p>
                    <p className="text-xs text-surface-400">{formatTimestamp(entry.created_at)}</p>
                  </div>
                </div>
              );
            })}
            {hasMore && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium mt-2"
              >
                {showAll ? 'Show recent' : `Show all history (${entries.length})`}
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

// Inline editable field component
function EditableField({
  fieldName,
  label,
  value,
  dealId,
  canEdit,
  onSaved,
  type = 'text',
  sectionEditing = false,
}: {
  fieldName: string;
  label: string;
  value: string | number | null | undefined;
  dealId: string;
  canEdit: boolean;
  onSaved: () => void;
  type?: 'text' | 'currency' | 'number' | 'textarea';
  sectionEditing?: boolean;
}) {
  const [localEditing, setLocalEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const displayValue = formatFieldValue(fieldName, value);
  const rawValue = value != null ? String(value) : '';

  // When section editing turns on, initialize edit value
  const isEditing = localEditing || (sectionEditing && canEdit);

  const startEdit = () => {
    setEditValue(rawValue);
    setLocalEditing(true);
    setDirty(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setLocalEditing(false);
    setEditValue('');
    setDirty(false);
  };

  const saveEdit = async () => {
    const trimmed = editValue.trim();
    if (trimmed === rawValue) {
      setLocalEditing(false);
      setDirty(false);
      return;
    }
    setSaving(true);
    try {
      await updateDealField(dealId, fieldName, rawValue, trimmed);
      setLocalEditing(false);
      setDirty(false);
      onSaved();
    } catch {
      // Keep editing mode open on error
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === 'Escape' && !sectionEditing) {
      cancelEdit();
    }
  };

  const handleChange = (val: string) => {
    setEditValue(val);
    setDirty(val.trim() !== rawValue);
  };

  if (isEditing) {
    // Use the current editValue if user has typed, otherwise initialize from raw
    const currentVal = (localEditing || dirty) ? editValue : rawValue;
    return (
      <div>
        <span className="text-surface-500 text-xs">{label}</span>
        <div className="mt-0.5 flex items-center gap-1.5">
          {type === 'textarea' ? (
            <textarea
              ref={inputRef as React.Ref<HTMLTextAreaElement>}
              value={currentVal}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className="input-base text-sm flex-1"
            />
          ) : (
            <input
              ref={inputRef as React.Ref<HTMLInputElement>}
              type={type === 'currency' || type === 'number' ? 'number' : 'text'}
              value={currentVal}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (!dirty && !localEditing) { setEditValue(rawValue); setLocalEditing(true); } }}
              step={type === 'currency' ? '0.01' : undefined}
              className="input-base text-sm flex-1"
            />
          )}
          {dirty && (
            <button
              onClick={saveEdit}
              disabled={saving}
              className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 px-2 py-1 rounded disabled:opacity-50 flex-shrink-0"
            >
              {saving ? '...' : 'Save'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      <span className="text-surface-500">{label}:</span>
      <span className="font-medium ml-2">{displayValue}</span>
      {canEdit && (
        <button
          onClick={startEdit}
          className="ml-2 text-xs text-brand-600 hover:text-brand-700 opacity-0 group-hover:opacity-100 transition-opacity"
          title={`Edit ${label}`}
        >
          <svg className="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Edit button for card headers — pencil icon toggles section editing
function SectionEditButton({ editing, onClick }: { editing: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-medium px-2.5 py-1 rounded transition-colors ${
        editing
          ? 'text-brand-700 bg-brand-50 hover:bg-brand-100'
          : 'text-surface-400 hover:text-brand-600 hover:bg-surface-50'
      }`}
      title={editing ? 'Done editing' : 'Edit section'}
    >
      {editing ? 'Done' : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      )}
    </button>
  );
}


export function DealDetail({ deal, user, underwriters, auditEntries = [], kickbackReasons = [], userLastViewedAt }: DealDetailProps) {
  const router = useRouter();
  const [showKickbackModal, setShowKickbackModal] = useState(false);
  const [kickbackMessage, setKickbackMessage] = useState('');
  const [kickbackReason, setKickbackReason] = useState<KickbackReason | ''>('');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignTo, setReassignTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<string>('other');
  const [customDocLabel, setCustomDocLabel] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Section-level editing state
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [editingStrengths, setEditingStrengths] = useState(false);

  // Kickback banner state
  const [kickbackResponseText, setKickbackResponseText] = useState('');
  const [submittingKickbackResponse, setSubmittingKickbackResponse] = useState(false);

  const primaryApplicant = deal.applicants?.find((a: any) => a.applicant_number === 1);
  const clientName = primaryApplicant ? getFullName(primaryApplicant.first_name, primaryApplicant.last_name) : 'Unknown';
  const vehicleSummary = `${deal.vehicle_year} ${deal.vehicle_make} ${deal.vehicle_model} ${deal.vehicle_trim}`;

  const isActiveDeal = deal.status !== 'signed_and_delivered' && deal.status !== 'cancelled';
  const canEdit = canEditDealFields(user, deal);

  // Use the most recent status history entry timestamp, or fall back to updated_at / created_at
  const lastStatusChange = deal.status_history?.length
    ? deal.status_history.sort((a: any, b: any) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())[0].changed_at
    : deal.updated_at || deal.created_at;

  const refreshPage = useCallback(() => router.refresh(), [router]);

  // ---- Kickback Banner Logic ----
  // Only show banner for the most recent unresolved kickback
  const latestKickback = kickbackReasons.length > 0 ? kickbackReasons[0] : null;

  const kickbackBannerMode: 'recipient_needs_response' | 'kicker_first_view_response' | false = (() => {
    if (!latestKickback) return false;

    const isKickedBackStatus = deal.status === 'kicked_back_to_manager' || deal.status === 'kicked_back_to_sales';
    const isRecipient = latestKickback.kicked_to_user_id === user.id;
    const isKicker = latestKickback.kicked_by_user_id === user.id;

    // Case 1: Recipient sees unresolved kickback while deal is in kicked_back status
    if (isKickedBackStatus && isRecipient && !latestKickback.is_resolved) {
      return 'recipient_needs_response';
    }

    // Case 2: Kicker sees the response on first view after it was submitted
    if (isKicker && latestKickback.is_resolved && latestKickback.responded_at) {
      const respondedAt = new Date(latestKickback.responded_at).getTime();
      const lastViewed = userLastViewedAt ? new Date(userLastViewedAt).getTime() : 0;
      if (respondedAt > lastViewed) {
        return 'kicker_first_view_response';
      }
    }

    return false;
  })();

  const handleKickbackResponse = async () => {
    if (!latestKickback || !kickbackResponseText.trim()) return;
    setSubmittingKickbackResponse(true);
    try {
      await respondToKickback(latestKickback.id, kickbackResponseText);
      setKickbackResponseText('');
      router.refresh();
    } finally {
      setSubmittingKickbackResponse(false);
    }
  };

  // ---- Determine if the deal has been sent to underwriting (for history logging threshold) ----
  const POST_UNDERWRITING_STATUSES: DealStatus[] = [
    'submitted_to_underwriting', 'kicked_back_to_manager',
    'kicked_back_to_sales', 'submitted_to_lender',
    'approved', 'signed_and_delivered', 'cancelled',
  ];
  // We consider the deal "post-underwriting" if it has ever been sent to underwriting
  const hasBeenSentToUnderwriting = deal.status_history?.some(
    (h: any) => POST_UNDERWRITING_STATUSES.includes(h.to_status)
  ) || POST_UNDERWRITING_STATUSES.includes(deal.status);

  const handleApproveForward = async () => {
    setLoading(true);
    try {
      await updateDealStatus(deal.id, 'submitted_to_underwriting', 'Approved and forwarded to underwriting');
      router.refresh();
    } finally { setLoading(false); }
  };

  const handleKickback = async () => {
    if (!kickbackReason) return;
    if (!kickbackMessage.trim()) return;
    setLoading(true);
    try {
      // UW kicks back to manager; Manager kicks back to sales agent
      const targetStatus = (user.role === 'underwriter')
        ? 'kicked_back_to_manager' as const
        : 'kicked_back_to_sales' as const;
      const reasonLabel = KICKBACK_REASON_LABELS[kickbackReason as KickbackReason];
      const notes = `${reasonLabel}: ${kickbackMessage}`;
      await updateDealStatus(deal.id, targetStatus, notes, {
        kickbackReason: kickbackReason as KickbackReason,
        kickbackExplanation: kickbackMessage,
      });
      await sendMessage(deal.id, notes, 'action_required');
      setShowKickbackModal(false);
      setKickbackMessage('');
      setKickbackReason('');
      router.refresh();
    } finally { setLoading(false); }
  };

  const handleClaim = async () => {
    setLoading(true);
    try {
      await claimDeal(deal.id);
      router.refresh();
    } finally { setLoading(false); }
  };

  const handleReassign = async () => {
    if (!reassignTo) return;
    setLoading(true);
    try {
      await reassignDeal(deal.id, reassignTo);
      setShowReassignModal(false);
      router.refresh();
    } finally { setLoading(false); }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await updateDealStatus(deal.id, 'signed_and_delivered', 'Deal signed and delivered');
      router.refresh();
    } finally { setLoading(false); }
  };

  const handleResubmit = async () => {
    setLoading(true);
    try {
      await updateDealStatus(deal.id, 'pending_manager_review', 'Resubmitted to manager');
      router.refresh();
    } finally { setLoading(false); }
  };

  const handleSubmitToLender = async () => {
    setLoading(true);
    try {
      await updateDealStatus(deal.id, 'submitted_to_lender', 'Submitted to lender');
      router.refresh();
    } finally { setLoading(false); }
  };

  const handleMarkApproved = async () => {
    setLoading(true);
    try {
      await updateDealStatus(deal.id, 'approved', 'Deal approved by lender');
      router.refresh();
    } finally { setLoading(false); }
  };

  const handleDocumentUpload = async (file: File) => {
    setUploadingDoc(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (uploadDocType === 'other' && customDocLabel.trim()) {
        fd.append('customLabel', customDocLabel.trim());
      }
      const result = await uploadDocument(deal.id, uploadDocType, null, fd);
      if (!result.success) {
        setUploadError(result.error);
        return;
      }
      setCustomDocLabel('');
      router.refresh();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDocumentView = async (storagePath: string) => {
    try {
      const { url } = await getDocumentSignedUrl(storagePath, undefined, 'view');
      window.open(url, '_blank');
    } catch {
      // Silently fail — could show a toast in future
    }
  };

  const handleDocumentDownload = async (storagePath: string, displayName?: string) => {
    try {
      const { url } = await getDocumentSignedUrl(storagePath, displayName, 'download');
      window.open(url, '_blank');
    } catch {
      // Silently fail — could show a toast in future
    }
  };

  const handleDocumentDelete = async (documentId: string) => {
    try {
      await deleteDocument(documentId);
      router.refresh();
    } catch {
      // Silently fail
    }
  };

  return (
    <div className="space-y-6">
      {/* Kickback Banner — Recipient needs to respond */}
      {kickbackBannerMode === 'recipient_needs_response' && latestKickback && (
        <div className="rounded-lg border-2 border-orange-300 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-orange-900">Deal Kicked Back</h3>
              <p className="text-sm text-orange-800 mt-1">
                <span className="font-medium">Reason:</span>{' '}
                {KICKBACK_REASON_LABELS[latestKickback.reason_category as KickbackReason] || latestKickback.reason_category}
              </p>
              {latestKickback.reason_detail && (
                <p className="text-sm text-orange-700 mt-1">{latestKickback.reason_detail}</p>
              )}
              <p className="text-xs text-orange-600 mt-1">
                From {latestKickback.kicker ? `${latestKickback.kicker.first_name} ${latestKickback.kicker.last_name}` : 'Unknown'}{' '}
                &mdash; {formatTimestamp(latestKickback.created_at)}
              </p>
              <div className="mt-3">
                <textarea
                  value={kickbackResponseText}
                  onChange={(e) => setKickbackResponseText(e.target.value)}
                  placeholder="Type your response to this kickback..."
                  rows={3}
                  className="input-base text-sm w-full"
                />
                <div className="mt-2">
                  <Button
                    size="sm"
                    onClick={handleKickbackResponse}
                    loading={submittingKickbackResponse}
                    disabled={!kickbackResponseText.trim()}
                  >
                    Submit Response
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kickback Banner — Kicker sees the response (first view) */}
      {kickbackBannerMode === 'kicker_first_view_response' && latestKickback && (
        <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900">Kickback Response Received</h3>
              <div className="mt-2 space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-blue-800">Your kickback:</span>
                  <p className="text-blue-700 mt-0.5">
                    {KICKBACK_REASON_LABELS[latestKickback.reason_category as KickbackReason] || latestKickback.reason_category}
                    {latestKickback.reason_detail && ` — ${latestKickback.reason_detail}`}
                  </p>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-blue-800">
                    Response from {latestKickback.responder ? `${latestKickback.responder.first_name} ${latestKickback.responder.last_name}` : 'Unknown'}:
                  </span>
                  <p className="text-blue-700 mt-0.5">{latestKickback.response_text}</p>
                </div>
                <p className="text-xs text-blue-500">
                  Responded {formatTimestamp(latestKickback.responded_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-surface-900">{deal.deal_number}</h1>
            <StatusBadge status={deal.status} />
            {isActiveDeal && (
              <TimerBadge
                startTime={lastStatusChange}
                thresholds={getTimerThresholdForStatus(deal.status)}
                size="md"
                showLabel
              />
            )}
          </div>
          <p className="text-surface-500">
            {clientName} &mdash; {vehicleSummary} &mdash; {DEAL_TYPE_LABELS[deal.deal_type as keyof typeof DEAL_TYPE_LABELS]}
          </p>
          <p className="text-xs text-surface-400 mt-1">
            Submitted {formatTimestamp(deal.created_at)}
          </p>
          {/* Prominent Timers */}
          {isActiveDeal && (
            <div className="flex items-center gap-3 mt-3">
              <DealAgeTimer startTime={deal.created_at} label="Deal Age" size="lg" />
              {deal.latest_action_required_at && (
                <DealAgeTimer
                  startTime={deal.latest_action_required_at}
                  label="Action Request"
                  size="lg"
                  thresholds={{
                    green_max_hours: MANAGER_RESPONSE_TIMER_CONFIG.green_max_minutes / 60,
                    yellow_max_hours: MANAGER_RESPONSE_TIMER_CONFIG.yellow_max_minutes / 60,
                  }}
                />
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Action Buttons based on role and status */}

          {/* Manager: Approve & Send to UW (from initial review or UW kickback) */}
          {canApproveAndForward(user, deal) && (
            <Button onClick={handleApproveForward} loading={loading}>
              {deal.status === 'kicked_back_to_manager' ? 'Resubmit to Underwriting' : 'Approve & Send to Underwriting'}
            </Button>
          )}

          {/* Manager: Kick back to sales agent */}
          {canKickBackToSales(user, deal) && (
            <Button variant="secondary" onClick={() => setShowKickbackModal(true)}>Kick Back to Sales</Button>
          )}

          {/* UW: Kick back to manager */}
          {canKickBackToManager(user, deal) && (
            <Button variant="secondary" onClick={() => setShowKickbackModal(true)}>Kick Back to Manager</Button>
          )}

          {/* UW: Claim unclaimed deal */}
          {canClaimDeal(user, deal) && (
            <Button onClick={handleClaim} loading={loading}>Accept Deal</Button>
          )}

          {/* UW: Submit to lender or mark approved */}
          {user.role === 'underwriter' && deal.assigned_underwriter === user.id && (
            <>
              {deal.status === 'submitted_to_underwriting' && (
                <Button onClick={handleSubmitToLender} loading={loading}>Submit to Lender</Button>
              )}
              {deal.status === 'submitted_to_lender' && (
                <Button onClick={handleMarkApproved} loading={loading}>Mark Approved</Button>
              )}
              <Button variant="ghost" onClick={() => setShowReassignModal(true)}>Reassign</Button>
            </>
          )}

          {/* Anyone: Mark approved deals as signed & delivered */}
          {deal.status === 'approved' && (user.role === 'agent' || user.role === 'manager' || user.role === 'underwriter' || user.role === 'administrator') && (
            <Button onClick={handleComplete} loading={loading}>Mark Signed & Delivered</Button>
          )}

          {/* Agent: Resubmit from kickback */}
          {user.role === 'agent' && deal.status === 'kicked_back_to_sales' && (
            <Button onClick={handleResubmit} loading={loading}>Resubmit to Manager</Button>
          )}
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Deal Info */}
        <div className="lg:col-span-3 space-y-4">
          {/* Applicants */}
          <Card padding="md">
            <CardHeader title="Applicant Information" />
            <div className="mt-4 space-y-3">
              {deal.applicants?.sort((a: any, b: any) => a.applicant_number - b.applicant_number).map((app: any) => (
                <div key={app.id} className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-surface-900">
                      {app.first_name} {app.last_name}
                      {app.applicant_number === 1 && <span className="text-xs text-surface-400 ml-2">(Primary)</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-surface-600">Experian: {app.experian_score}</p>
                    {app.has_alternate_bureau && (
                      <p className="text-xs text-surface-500">{app.alternate_bureau}: {app.alternate_score}</p>
                    )}
                  </div>
                </div>
              ))}
              {deal.has_business && deal.business_legal_name && (
                <div className="pt-2 text-sm">
                  <EditableField
                    fieldName="business_legal_name"
                    label="Business"
                    value={deal.business_legal_name}
                    dealId={deal.id}
                    canEdit={canEdit}
                    onSaved={refreshPage}
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Vehicle */}
          <Card padding="md">
            <CardHeader
              title="Vehicle Information"
              action={canEdit ? <SectionEditButton editing={editingVehicle} onClick={() => setEditingVehicle(!editingVehicle)} /> : undefined}
            />
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <EditableField fieldName="vehicle_condition" label="Condition" value={deal.vehicle_condition} dealId={deal.id} canEdit={canEdit} onSaved={refreshPage} sectionEditing={editingVehicle} />
              <EditableField fieldName="vehicle_year" label="Year" value={deal.vehicle_year} dealId={deal.id} canEdit={canEdit} onSaved={refreshPage} sectionEditing={editingVehicle} />
              <EditableField fieldName="vehicle_make" label="Make" value={deal.vehicle_make} dealId={deal.id} canEdit={canEdit} onSaved={refreshPage} sectionEditing={editingVehicle} />
              <EditableField fieldName="vehicle_model" label="Model" value={deal.vehicle_model} dealId={deal.id} canEdit={canEdit} onSaved={refreshPage} sectionEditing={editingVehicle} />
              <EditableField fieldName="vehicle_trim" label="Trim" value={deal.vehicle_trim} dealId={deal.id} canEdit={canEdit} onSaved={refreshPage} sectionEditing={editingVehicle} />
              {(deal.vehicle_mileage != null || editingVehicle) && (
                <EditableField fieldName="vehicle_mileage" label="Mileage" value={deal.vehicle_mileage} dealId={deal.id} canEdit={canEdit} onSaved={refreshPage} type="number" sectionEditing={editingVehicle} />
              )}
              {(deal.msrp != null || editingVehicle) && (
                <EditableField fieldName="msrp" label="MSRP" value={deal.msrp} dealId={deal.id} canEdit={canEdit} onSaved={refreshPage} type="currency" sectionEditing={editingVehicle} />
              )}
              {(deal.invoice != null || editingVehicle) && (
                <EditableField fieldName="invoice" label="Invoice" value={deal.invoice} dealId={deal.id} canEdit={canEdit} onSaved={refreshPage} type="currency" sectionEditing={editingVehicle} />
              )}
              {(deal.jd_power_retail != null || editingVehicle) && (
                <EditableField fieldName="jd_power_retail" label="JD Retail" value={deal.jd_power_retail} dealId={deal.id} canEdit={canEdit} onSaved={refreshPage} type="currency" sectionEditing={editingVehicle} />
              )}
              {(deal.jd_power_wholesale != null || editingVehicle) && (
                <EditableField fieldName="jd_power_wholesale" label="JD Wholesale" value={deal.jd_power_wholesale} dealId={deal.id} canEdit={canEdit} onSaved={refreshPage} type="currency" sectionEditing={editingVehicle} />
              )}
              {(deal.net_cap_cost != null || editingVehicle) && (
                <EditableField fieldName="net_cap_cost" label="Net Cap Cost" value={deal.net_cap_cost} dealId={deal.id} canEdit={canEdit} onSaved={refreshPage} type="currency" sectionEditing={editingVehicle} />
              )}
              {(deal.total_amount_financed != null || editingVehicle) && (
                <EditableField fieldName="total_amount_financed" label="Amount Financed" value={deal.total_amount_financed} dealId={deal.id} canEdit={canEdit} onSaved={refreshPage} type="currency" sectionEditing={editingVehicle} />
              )}
              {(deal.term != null || editingVehicle) && (
                <EditableField fieldName="term" label="Term (months)" value={deal.term} dealId={deal.id} canEdit={canEdit} onSaved={refreshPage} type="text" sectionEditing={editingVehicle} />
              )}
              <EditableField fieldName="monthly_payment" label="Monthly Payment" value={deal.monthly_payment} dealId={deal.id} canEdit={canEdit} onSaved={refreshPage} type="currency" sectionEditing={editingVehicle} />
            </div>

            {/* LTV Calculations */}
            {(() => {
              const isLease = deal.deal_type === 'lease' || deal.deal_type === 're_lease';
              const numerator = isLease ? deal.net_cap_cost : deal.total_amount_financed;
              const isUsed = deal.vehicle_condition === 'used';
              const retailDenom = isUsed ? deal.jd_power_retail : deal.msrp;
              const wholesaleDenom = isUsed ? deal.jd_power_wholesale : deal.invoice;
              const retailLTV = calculateLTV(numerator, retailDenom);
              const wholesaleLTV = calculateLTV(numerator, wholesaleDenom);

              if (!numerator) return null;

              return (
                <div className="mt-4 pt-4 border-t border-surface-100">
                  <h4 className="text-sm font-medium text-surface-700 mb-3">LTV Calculations</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-surface-500">{isUsed ? 'JD Retail' : 'MSRP'} LTV</span>
                      <span className={`text-sm font-semibold ${getLTVColor(retailLTV)}`}>
                        {formatPercentage(retailLTV)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-surface-500">{isUsed ? 'JD Wholesale' : 'Invoice'} LTV</span>
                      <span className={`text-sm font-semibold ${getLTVColor(wholesaleLTV)}`}>
                        {formatPercentage(wholesaleLTV)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </Card>

          {/* Trade-In */}
          {deal.has_trade_in && deal.trade_in?.[0] && (
            <Card padding="md">
              <CardHeader title="Trade-In Vehicle" />
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-surface-500">Vehicle:</span> <span className="font-medium ml-2">{deal.trade_in[0].year} {deal.trade_in[0].make} {deal.trade_in[0].model}</span></div>
                <div><span className="text-surface-500">Payment:</span> <span className="font-medium ml-2">{formatCurrency(deal.trade_in[0].monthly_payment)}</span></div>
                <div><span className="text-surface-500">Lienholder:</span> <span className="font-medium ml-2">{deal.trade_in[0].lienholder}</span></div>
                <div><span className="text-surface-500">Driver:</span> <span className="font-medium ml-2">{deal.trade_in[0].who_drives}</span></div>
              </div>
            </Card>
          )}

          {/* Open Autos */}
          {deal.has_open_autos && deal.open_autos?.length > 0 && (
            <Card padding="md">
              <CardHeader title={`Open Autos (${deal.open_autos.length})`} />
              <div className="mt-4 divide-y divide-surface-100">
                {deal.open_autos.sort((a: any, b: any) => a.auto_number - b.auto_number).map((auto: any) => (
                  <div key={auto.id} className="py-2 grid grid-cols-3 gap-4 text-sm">
                    <div><span className="text-surface-500">Lienholder:</span> <span className="font-medium ml-1">{auto.lienholder}</span></div>
                    <div><span className="text-surface-500">Payment:</span> <span className="font-medium ml-1">{formatCurrency(auto.monthly_payment)}</span></div>
                    <div><span className="text-surface-500">Driver:</span> <span className="font-medium ml-1">{auto.who_drives}</span></div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Deal Strengths */}
          <Card padding="md">
            <CardHeader
              title="Deal Strengths & Credit"
              action={canEdit ? <SectionEditButton editing={editingStrengths} onClick={() => setEditingStrengths(!editingStrengths)} /> : undefined}
            />
            <div className="mt-4 space-y-4 text-sm">
              <EditableField
                fieldName="deal_strengths"
                label="Selling Points"
                value={deal.deal_strengths}
                dealId={deal.id}
                canEdit={canEdit}
                onSaved={refreshPage}
                type="textarea"
                sectionEditing={editingStrengths}
              />
              {(deal.has_derogatory_credit && deal.derogatory_credit_explanation) && (
                <EditableField
                  fieldName="derogatory_credit_explanation"
                  label="Derogatory Credit Explanation"
                  value={deal.derogatory_credit_explanation}
                  dealId={deal.id}
                  canEdit={canEdit}
                  onSaved={refreshPage}
                  type="textarea"
                  sectionEditing={editingStrengths}
                />
              )}
            </div>
          </Card>

          {/* Deal History (merged from audit log) */}
          <DealHistory entries={auditEntries} />
        </div>

        {/* Right: Documents & Communication */}
        <div className="lg:col-span-2 space-y-4">
          {/* Documents */}
          <Card padding="md">
            <CardHeader title="Documents" />
            <div className="mt-4 space-y-2">
              {!deal.documents || deal.documents.length === 0 ? (
                <p className="text-sm text-surface-500">No documents uploaded yet.</p>
              ) : (
                deal.documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
                    <p className="text-sm font-medium text-surface-900 min-w-0 flex-1">
                      {doc.document_type === 'other' && doc.description
                        ? doc.description
                        : (DOCUMENT_TYPE_LABELS[doc.document_type as DocumentType] || doc.document_type)}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <button
                        onClick={() => handleDocumentView(doc.storage_path)}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDocumentDownload(doc.storage_path, doc.display_name)}
                        className="text-xs text-surface-500 hover:text-surface-700 font-medium"
                      >
                        Download
                      </button>
                      {canDeleteDocuments(user, deal) && (
                        <button
                          onClick={() => handleDocumentDelete(doc.id)}
                          className="text-xs text-surface-400 hover:text-status-danger font-medium"
                          title="Remove document"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Upload section — agents (own deals), managers, admins */}
            {isActiveDeal && canUploadDocuments(user, deal) && (
              <div className="mt-4 pt-4 border-t border-surface-100">
                <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-surface-500 mb-1 block">Document Type</label>
                    <select
                      value={uploadDocType}
                      onChange={(e) => { setUploadDocType(e.target.value); setCustomDocLabel(''); }}
                      className="input text-sm py-1.5"
                    >
                      {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    loading={uploadingDoc}
                  >
                    Upload
                  </Button>
                </div>
                {uploadDocType === 'other' && (
                  <div>
                    <label className="text-xs font-medium text-surface-500 mb-1 block">Description (max 50 chars)</label>
                    <input
                      type="text"
                      value={customDocLabel}
                      onChange={(e) => setCustomDocLabel(e.target.value.slice(0, 50))}
                      maxLength={50}
                      placeholder="e.g., Bank Statement, Pay Stubs..."
                      className="input text-sm py-1.5"
                    />
                  </div>
                )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDocumentUpload(file);
                    e.target.value = '';
                  }}
                />
                {uploadError && <p className="text-xs text-status-danger mt-1">{uploadError}</p>}
              </div>
            )}
          </Card>

          {/* People */}
          <Card padding="md">
            <CardHeader title="People" />
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-500">Submitted by</span>
                <span className="font-medium">{deal.submitter?.first_name} {deal.submitter?.last_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Manager</span>
                <span className="font-medium">{deal.manager?.first_name} {deal.manager?.last_name}</span>
              </div>
              {deal.underwriter && user.role !== 'agent' && (
                <div className="flex justify-between">
                  <span className="text-surface-500">Underwriter</span>
                  <span className="font-medium">{deal.underwriter?.first_name} {deal.underwriter?.last_name}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Communication */}
          <CommunicationThread
            dealId={deal.id}
            messages={deal.messages || []}
            user={user}
            canSend={canSendMessage(user, deal)}
            canSendAction={canSendActionRequired(user, deal)}
          />
        </div>
      </div>

      {/* Latest Comment — visible to all roles */}
      {(() => {
        const sorted = [...(deal.messages || [])].sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const latest = sorted[0];
        if (!latest) return null;
        const senderName = latest.sender
          ? `${latest.sender.first_name} ${latest.sender.last_name}`
          : 'Unknown';
        const isAction = latest.message_type === 'action_required';
        return (
          <div className={`rounded-lg px-4 py-3 text-sm ${
            isAction
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-surface-50 border border-surface-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-surface-700 text-xs uppercase tracking-wide">Latest Note</span>
              {isAction && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Response Requested</span>
              )}
              <span className="text-xs text-surface-400 ml-auto">{senderName} &mdash; {formatTimestamp(latest.created_at)}</span>
            </div>
            <p className="text-surface-700">{latest.content}</p>
          </div>
        );
      })()}

      {/* Kickback Modal */}
      <Modal
        isOpen={showKickbackModal}
        onClose={() => { setShowKickbackModal(false); setKickbackReason(''); setKickbackMessage(''); }}
        title={user.role === 'underwriter' ? 'Kick Back to Manager' : 'Kick Back to Sales'}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowKickbackModal(false); setKickbackReason(''); setKickbackMessage(''); }}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => handleKickback()}
              loading={loading}
              disabled={!kickbackReason || !kickbackMessage.trim()}
            >
              Send Kickback
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">
              Reason <span className="text-status-danger">*</span>
            </label>
            <select
              value={kickbackReason}
              onChange={(e) => setKickbackReason(e.target.value as KickbackReason | '')}
              className="input text-sm w-full"
            >
              <option value="">Select a reason...</option>
              {Object.entries(KICKBACK_REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <Textarea
            label="Explanation"
            required
            value={kickbackMessage}
            onChange={(e) => setKickbackMessage(e.target.value)}
            placeholder={kickbackReason === 'other' ? 'Describe the issue...' : 'Provide details about what needs to be addressed...'}
            rows={4}
          />
        </div>
      </Modal>

      {/* Reassign Modal */}
      <Modal
        isOpen={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        title="Reassign Deal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowReassignModal(false)}>Cancel</Button>
            <Button onClick={handleReassign} loading={loading}>Reassign</Button>
          </>
        }
      >
        <Select
          label="Assign to Underwriter"
          options={underwriters.map(u => ({ value: u.id, label: getFullName(u.first_name, u.last_name) }))}
          value={reassignTo}
          onChange={(e) => setReassignTo(e.target.value)}
          placeholder="Select an underwriter"
        />
      </Modal>
    </div>
  );
}
