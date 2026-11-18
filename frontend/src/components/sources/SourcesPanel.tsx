import React, { useState } from 'react';
import { Source } from '@/types/chat';
import { SourceCard } from './SourceCard';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface SourcesPanelProps {
  sources?: Source[];
}

export function SourcesPanel({ sources }: SourcesPanelProps) {
  const [open, setOpen] = useState<boolean>(true);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-gray-100">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 mb-2 transition-colors focus:outline-none"
      >
        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
        <span>Grounded Sources ({sources.length})</span>
        {open ? (
          <ChevronUp className="w-3 h-3 text-gray-400" />
        ) : (
          <ChevronDown className="w-3 h-3 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          {sources.map((source, idx) => (
            <SourceCard key={idx} source={source} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
