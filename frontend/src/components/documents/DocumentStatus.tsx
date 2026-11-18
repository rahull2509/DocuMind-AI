import React from 'react';
import { DocumentStatus as StatusType } from '@/types/document';
import { CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';

interface DocumentStatusProps {
  status: StatusType;
}

export function DocumentStatusBadge({ status }: DocumentStatusProps) {
  switch (status) {
    case 'completed':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
          Ready
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
          <Loader2 className="w-3 h-3 mr-1 animate-spin text-blue-600" />
          Indexing
        </span>
      );
    case 'uploading':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 mr-1 text-amber-600" />
          Uploading
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-3 h-3 mr-1 text-red-600" />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 text-gray-700 border border-gray-200">
          {status}
        </span>
      );
  }
}
