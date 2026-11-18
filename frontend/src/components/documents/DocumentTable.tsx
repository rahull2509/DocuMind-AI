import React, { useState } from 'react';
import { Document } from '@/types/document';
import { DocumentStatusBadge } from './DocumentStatus';
import { formatFileSize, formatDate } from '@/lib/utils';
import { FileText, Trash2, Search, AlertCircle } from 'lucide-react';

interface DocumentTableProps {
  documents: Document[];
  loading: boolean;
  onDelete: (id: string) => Promise<void>;
}

export function DocumentTable({ documents, loading, onDelete }: DocumentTableProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const docsList = Array.isArray(documents) ? documents : [];
  const filtered = docsList.filter((doc) =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string, filename: string) => {
    if (confirm(`Are you sure you want to delete "${filename}"? All associated vectors will be purged from ChromaDB.`)) {
      try {
        setDeletingId(id);
        await onDelete(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by name..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>
        <div className="text-xs text-gray-500 font-medium ml-4">
          {docsList.length} {docsList.length === 1 ? 'document' : 'documents'}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F9FAFB] text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Document</th>
              <th className="py-3 px-4">Size</th>
              <th className="py-3 px-4">Pages</th>
              <th className="py-3 px-4">Indexed Chunks</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Uploaded</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-200 rounded w-48" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-200 rounded w-8" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-200 rounded w-12" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="h-4 bg-gray-200 rounded w-6 ml-auto" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <FileText className="w-8 h-8 text-gray-300" />
                    <p className="font-medium">No documents found</p>
                    <p className="text-[11px] text-gray-400">
                      {searchQuery
                        ? 'Try adjusting your search query'
                        : 'Upload a PDF above to begin asking questions.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-gray-900">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="truncate max-w-xs" title={doc.filename}>
                        {doc.filename}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                    {formatFileSize(doc.file_size)}
                  </td>
                  <td className="py-3.5 px-4 text-gray-500">
                    {doc.page_count !== null ? doc.page_count : '-'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-gray-600">
                    {doc.chunk_count}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <DocumentStatusBadge status={doc.status} />
                    {doc.error_message && (
                      <span
                        className="ml-1.5 inline-block text-red-500 hover:text-red-700 cursor-pointer"
                        title={doc.error_message}
                      >
                        <AlertCircle className="w-3.5 h-3.5 inline" />
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                    {formatDate(doc.created_at)}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleDelete(doc.id, doc.filename)}
                      disabled={deletingId === doc.id}
                      className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Delete document and associated vectors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
