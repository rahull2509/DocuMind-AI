import React, { useState, useRef, useEffect } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
import { useAppStore } from '@/store/app-store';
import { FileText, ChevronDown, Check, X } from 'lucide-react';

export function DocumentSelector() {
  const { documents } = useDocuments();
  const { selectedDocumentIds, toggleDocumentId, clearSelectedDocumentIds } = useAppStore();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const docsList = Array.isArray(documents) ? documents : [];
  const completedDocs = docsList.filter((d) => d.status === 'completed');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 focus:outline-none transition-colors"
        >
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span>
            {selectedDocumentIds.length === 0
              ? 'All Documents'
              : `${selectedDocumentIds.length} Document${selectedDocumentIds.length > 1 ? 's' : ''} Selected`}
          </span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>

        {selectedDocumentIds.length > 0 && (
          <button
            type="button"
            onClick={clearSelectedDocumentIds}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            title="Clear filter"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute bottom-full mb-1 left-0 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 max-h-56 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 flex justify-between items-center">
            <span>Filter Query Context</span>
            {selectedDocumentIds.length > 0 && (
              <button
                onClick={clearSelectedDocumentIds}
                className="text-blue-600 hover:underline capitalize"
              >
                Reset
              </button>
            )}
          </div>

          {completedDocs.length === 0 ? (
            <div className="px-3 py-3 text-xs text-gray-500 text-center">
              No completed documents yet.
            </div>
          ) : (
            completedDocs.map((doc) => {
              const isSelected = selectedDocumentIds.includes(doc.id);
              return (
                <button
                  key={doc.id}
                  onClick={() => toggleDocumentId(doc.id)}
                  className="w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50 text-left transition-colors cursor-pointer"
                >
                  <span className="truncate pr-2 text-gray-800" title={doc.filename}>
                    {doc.filename}
                  </span>
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
