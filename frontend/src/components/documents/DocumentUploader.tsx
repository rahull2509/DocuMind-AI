import React, { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';

interface DocumentUploaderProps {
  onUpload: (file: File) => Promise<unknown>;
  uploading: boolean;
  uploadProgress: number;
}

export function DocumentUploader({
  onUpload,
  uploading,
  uploadProgress,
}: DocumentUploaderProps) {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const validateAndUpload = async (file: File) => {
    setError(null);
    setSuccess(null);

    // Validate type
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setError('Only PDF documents are supported.');
      return;
    }

    // Validate size (20MB)
    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File size (${formatFileSize(file.size)}) exceeds the 20 MB limit.`);
      return;
    }

    try {
      await onUpload(file);
      setSuccess(`Successfully uploaded and indexed "${file.name}".`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      validateAndUpload(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndUpload(files[0]);
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-gray-50/50'
        } ${uploading ? 'opacity-70 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            ) : (
              <UploadCloud className="w-6 h-6 text-blue-600" />
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900">
              {uploading ? 'Processing document...' : 'Click or drag PDF here to upload'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supports standard PDFs up to 20 MB. Text will be extracted, chunked, and vectorized locally.
            </p>
          </div>

          {uploading && (
            <div className="w-full max-w-xs mt-3">
              <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                <span>Indexing in ChromaDB...</span>
                <span>{uploadProgress > 0 ? `${uploadProgress}%` : 'Reading'}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(uploadProgress, 25)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}
