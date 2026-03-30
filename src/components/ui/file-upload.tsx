'use client';

import { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface FileUploadProps {
  label: string;
  required?: boolean;
  accept?: string;
  currentFile?: { name: string; url?: string } | null;
  onUpload: (file: File) => Promise<void>;
  onView?: () => void;
  onDownload?: () => void;
  onReplace?: (file: File) => Promise<void>;
  canReplace?: boolean;
  error?: string;
}

export function FileUpload({
  label,
  required,
  accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx',
  currentFile,
  onUpload,
  onView,
  onDownload,
  onReplace,
  canReplace = true,
  error,
}: Readonly<FileUploadProps>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      if (currentFile && onReplace) {
        await onReplace(file);
      } else {
        await onUpload(file);
      }
    } finally {
      setUploading(false);
    }
  }, [currentFile, onReplace, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <label className="label mb-0">
          {label}
          {required && <span className="text-status-danger ml-0.5">*</span>}
        </label>
        {currentFile && (
          <div className="flex items-center gap-1">
            {onView && (
              <button onClick={onView} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                View
              </button>
            )}
            {onDownload && (
              <>
                <span className="text-surface-300">|</span>
                <button onClick={onDownload} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                  Download
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {currentFile ? (
        <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-green-800 truncate">{currentFile.name}</span>
          </div>
          {canReplace && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => inputRef.current?.click()}
              loading={uploading}
            >
              Replace
            </Button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'w-full flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
            dragOver ? 'border-brand-500 bg-brand-50' : 'border-surface-300 hover:border-surface-400 hover:bg-surface-50',
            error && 'border-status-danger'
          )}
        >
          <svg className="w-8 h-8 text-surface-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-sm text-surface-600">
            {uploading ? 'Uploading...' : 'Drop file here or click to upload'}
          </span>
          <span className="text-xs text-surface-400 mt-1">PDF, JPG, PNG, DOC</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
