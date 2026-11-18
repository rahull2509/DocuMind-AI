'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useDocuments } from '@/hooks/useDocuments';
import { DocumentUploader } from '@/components/documents/DocumentUploader';
import { DocumentTable } from '@/components/documents/DocumentTable';
import { FileText, RefreshCw } from 'lucide-react';

export default function DocumentsPage() {
  const {
    documents,
    loading,
    uploading,
    uploadProgress,
    upload,
    removeDocument,
    refresh,
  } = useDocuments();

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Knowledge Base</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Document Library
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Upload multiple PDF documents to extract text, generate embeddings, and index into ChromaDB.
            </p>
          </div>

          <button
            onClick={() => refresh()}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-xs transition-colors self-start sm:self-auto cursor-pointer disabled:opacity-50"
            title="Refresh documents list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Uploader Section */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Upload Document
          </h2>
          <DocumentUploader
            onUpload={upload}
            uploading={uploading}
            uploadProgress={uploadProgress}
          />
        </div>

        {/* Document List Section */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            All Documents ({Array.isArray(documents) ? documents.length : 0})
          </h2>
          <DocumentTable
            documents={Array.isArray(documents) ? documents : []}
            loading={loading}
            onDelete={removeDocument}
          />
        </div>
      </div>
    </AppShell>
  );
}
