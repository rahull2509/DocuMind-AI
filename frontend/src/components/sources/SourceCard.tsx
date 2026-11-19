import React, { useState } from 'react';
import { Source } from '@/types/chat';
import { FileText, ChevronDown, ChevronUp, Bookmark } from 'lucide-react';

interface SourceCardProps {
  source: Source;
  index: number;
}

export function SourceCard({ source }: SourceCardProps) {
  const [expanded, setExpanded] = useState<boolean>(false);

  // ChromaDB / SQLite cosine distance: distance ranges [0, 2], lower is more similar.
  // Similarity % = max(0, min(100, Math.round((1 - source.distance) * 100)))
  const relevance = Math.max(0, Math.min(100, Math.round((1 - (source.distance || 0)) * 100)));

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50/80 p-3 text-xs text-gray-700 transition-all hover:border-gray-300">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-2 truncate pr-2">
          <FileText className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <span className="font-medium text-gray-900 truncate" title={source.filename}>
            {source.filename}
          </span>
          <span className="bg-white border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap">
            p. {source.page_number}
          </span>
          {source.section_title && source.section_title !== 'General' && (
            <span
              className="bg-blue-50 border border-blue-200 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-sans truncate max-w-[130px] hidden sm:inline-flex items-center space-x-0.5"
              title={source.section_title}
            >
              <Bookmark className="w-2.5 h-2.5 mr-0.5 flex-shrink-0" />
              <span className="truncate">{source.section_title}</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className="text-[10px] text-gray-500 font-medium">
            {relevance}% match
          </span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>
      </div>

      <div className={`mt-2 text-gray-600 leading-relaxed font-sans ${expanded ? '' : 'line-clamp-2'}`}>
        {source.text}
      </div>
    </div>
  );
}
