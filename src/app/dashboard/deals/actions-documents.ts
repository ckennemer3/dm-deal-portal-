'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import { DOCUMENT_TYPE_LABELS } from '@/lib/constants';
import type { DocumentType } from '@/lib/types';

export async function uploadDocument(
  dealId: string,
  documentType: string,
  applicantId: string | null,
  formData: FormData
): Promise<{ success: true; path: string } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const file = formData.get('file') as File;
  if (!file) return { success: false, error: 'No file provided' };

  // Validate file type
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX' };
  }

  // Max 10MB
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: 'File too large. Maximum size is 10MB.' };
  }

  // Generate storage path
  const ext = file.name.split('.').pop() || 'pdf';
  const timestamp = Date.now();
  const storagePath = `deals/${dealId}/${documentType}/${timestamp}.${ext}`;

  // Fetch deal data for dynamic document naming
  const { data: dealData } = await supabase
    .from('deals')
    .select(`
      vehicle_year,
      vehicle_model,
      applicants:deal_applicants(first_name, last_name, applicant_number)
    `)
    .eq('id', dealId)
    .single();

  // Build dynamic display name: "FirstName LastName - Year Model - DocType.ext"
  let dynamicDisplayName = file.name; // fallback to original
  if (dealData) {
    const primaryApplicant = dealData.applicants
      ?.sort((a: any, b: any) => a.applicant_number - b.applicant_number)
      ?.find((a: any) => a.applicant_number === 1);
    const applicantName = primaryApplicant
      ? `${primaryApplicant.first_name} ${primaryApplicant.last_name}`
      : 'Unknown';
    const vehicleInfo = `${dealData.vehicle_year || ''} ${dealData.vehicle_model || ''}`.trim();
    const docTypeLabel = DOCUMENT_TYPE_LABELS[documentType as DocumentType] || documentType;

    dynamicDisplayName = `${applicantName} - ${vehicleInfo} - ${docTypeLabel}.${ext}`;
  }

  // Upload to Supabase Storage
  const { error: storageError } = await supabase.storage
    .from('deal-documents')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (storageError) {
    logger.error('Document upload failed', new Error(storageError.message), {
      dealId,
      documentType,
      userId: user.id,
    });
    return { success: false, error: `Storage upload failed: ${storageError.message}` };
  }

  // Create document record
  const { error: dbError } = await supabase.from('deal_documents').insert({
    deal_id: dealId,
    document_type: documentType,
    applicant_id: applicantId,
    original_filename: file.name,
    storage_path: storagePath,
    display_name: dynamicDisplayName,
    uploaded_by: user.id,
  });

  if (dbError) {
    // Clean up the uploaded file
    await supabase.storage.from('deal-documents').remove([storagePath]);
    logger.error('Document record creation failed', new Error(dbError.message), {
      dealId,
      documentType,
      userId: user.id,
    });
    return { success: false, error: `Database record failed: ${dbError.message}` };
  }

  logger.trackAction('document_uploaded', {
    dealId,
    documentType,
    userId: user.id,
  });

  revalidatePath(`/dashboard/deals/${dealId}`);
  return { success: true, path: storagePath };
}

export async function deleteDocument(documentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get document record
  const { data: doc } = await supabase
    .from('deal_documents')
    .select('storage_path, deal_id')
    .eq('id', documentId)
    .single();

  if (!doc) throw new Error('Document not found');

  // Delete from storage
  await supabase.storage.from('deal-documents').remove([doc.storage_path]);

  // Delete record
  await supabase.from('deal_documents').delete().eq('id', documentId);

  revalidatePath(`/dashboard/deals/${doc.deal_id}`);
  return { success: true };
}

export async function getDocumentSignedUrl(storagePath: string, displayName?: string, mode: 'view' | 'download' = 'download') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const options = mode === 'download'
    ? { download: displayName || true }
    : {};

  const { data, error } = await supabase.storage
    .from('deal-documents')
    .createSignedUrl(storagePath, 3600, options);

  if (error) throw new Error(`Failed to generate ${mode} URL`);
  return { url: data.signedUrl };
}
