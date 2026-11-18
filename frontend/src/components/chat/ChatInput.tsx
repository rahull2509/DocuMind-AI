import React, { useState, useRef, useEffect } from 'react';
import { DocumentSelector } from '@/components/documents/DocumentSelector';
import { useDocuments } from '@/hooks/useDocuments';
import { useAppStore } from '@/store/app-store';
import { Document } from '@/types/document';
import { ArrowUp, Square, Paperclip, Plus, FileText, X, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  initialValue?: string;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  initialValue = '',
}: ChatInputProps) {
  const [input, setInput] = useState<string>(initialValue);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [justUploadedDocs, setJustUploadedDocs] = useState<Document[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { documents, upload, uploading, uploadProgress, refresh } = useDocuments();
  const { selectedDocumentIds, setSelectedDocumentIds, toggleDocumentId } = useAppStore();

  useEffect(() => {
    if (initialValue) {
      setInput(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  }, [input]);

  const allKnownDocs = [...justUploadedDocs, ...documents];
  const uniqueDocs = Array.from(new Map(allKnownDocs.map((d) => [d.id, d])).values());
  const activeGroundedDocs = uniqueDocs.filter((d) => selectedDocumentIds.includes(d.id));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || isStreaming || disabled) return;
    onSend(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setUploadError(null);

    // Validate type
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setUploadError('Only PDF documents are supported.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size (20MB)
    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(`File size exceeds 20 MB limit.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const doc = await upload(file);
      setJustUploadedDocs((prev) => [...prev.filter((d) => d.id !== doc.id), doc]);
      // Automatically lock as the active grounded source
      setSelectedDocumentIds([doc.id]);
      refresh();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Top Controls Row */}
      <div className="flex items-center justify-between mb-2 px-1">
        <DocumentSelector />
        <Link
          href="/documents"
          className="inline-flex items-center space-x-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
          title="Upload or manage documents"
        >
          <Paperclip className="w-3 h-3" />
          <span>Manage PDFs</span>
        </Link>
      </div>

      {/* Main Composer Box */}
      <div className="relative flex flex-col border border-gray-200 rounded-2xl bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all overflow-hidden">
        {/* Attached Grounded Documents Strip */}
        {(activeGroundedDocs.length > 0 || uploading) && (
          <div className="flex flex-wrap items-center gap-2 px-3 pt-2.5 pb-2 border-b border-gray-100 bg-gray-50/70">
            {activeGroundedDocs.map((doc) => (
              <div
                key={doc.id}
                className="inline-flex items-center space-x-2 bg-white border border-blue-200 text-blue-900 px-3 py-1.5 rounded-xl text-xs shadow-2xs group animate-in fade-in"
              >
                <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3 h-3" />
                </div>
                <div className="flex flex-col min-w-0 pr-1 text-left">
                  <span
                    className="font-semibold text-gray-900 truncate max-w-[220px]"
                    title={doc.original_filename || doc.filename}
                  >
                    {doc.original_filename || doc.filename}
                  </span>
                  <span className="text-[10px] text-blue-600 font-medium flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    <span>Grounded Source • {doc.chunk_count || 0} chunks</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleDocumentId(doc.id)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                  title="Remove document from grounded filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {uploading && (
              <div className="inline-flex items-center space-x-2 bg-blue-50/80 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-xl text-xs animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 flex-shrink-0" />
                <span className="font-medium">
                  {uploadProgress > 0 ? `Indexing PDF (${uploadProgress}%)...` : 'Vectorizing document...'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Text Input Row */}
        <div className="flex items-end p-2 pl-3">
          {/* Direct Document Upload (+) Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || disabled}
            className="w-8 h-8 mb-1 mr-1 rounded-xl bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer disabled:opacity-50"
            title="Upload document directly to ground this chat (+)"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <Plus className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>

          {/* Multiline Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeGroundedDocs.length > 0
                ? `Ask questions about ${activeGroundedDocs[0].original_filename || activeGroundedDocs[0].filename}...`
                : "Ask anything about your documents... (Shift + Enter for new line)"
            }
            disabled={disabled}
            rows={1}
            className="flex-1 py-1.5 px-3 resize-none bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none max-h-48 leading-relaxed"
          />

          {/* Send / Stop Action Button */}
          <div className="pb-0.5 pr-1">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer"
                title="Stop generating"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim() || disabled}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  input.trim() && !disabled
                    ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}
                title="Send message"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="text-red-500 hover:text-red-700 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Grounding Source Info Note */}
      <p className="text-[11px] text-gray-400 text-center mt-2">
        {activeGroundedDocs.length > 0 ? (
          <span>
            Grounded strictly in:{' '}
            <strong className="text-gray-600 font-medium">
              {activeGroundedDocs.map((d) => d.original_filename || d.filename).join(', ')}
            </strong>
          </span>
        ) : (
          'DocuMind AI answers are grounded strictly in your uploaded PDF knowledge base.'
        )}
      </p>
    </div>
  );
}
