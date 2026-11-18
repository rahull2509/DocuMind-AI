'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store/app-store';
import { Sparkles, FileText, ArrowRight } from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  const { selectedDocumentIds, ollamaOnline, ollamaChecked } = useAppStore();

  const getPageTitle = () => {
    if (pathname.startsWith('/dashboard')) return 'Dashboard Overview';
    if (pathname.startsWith('/documents')) return 'Document Library';
    if (pathname.startsWith('/settings')) return 'Application Settings';
    if (pathname.startsWith('/chat')) return 'Chat Assistant';
    return 'DocuMind AI';
  };

  return (
    <header className="h-14 border-b border-[#E5E7EB] bg-white flex items-center justify-between px-6 select-none flex-shrink-0">
      <div className="flex items-center space-x-3 pl-8 md:pl-0">
        <h1 className="text-sm font-semibold text-gray-900 tracking-tight">
          {getPageTitle()}
        </h1>
        {selectedDocumentIds.length > 0 && pathname.startsWith('/chat') && (
          <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <FileText className="w-3 h-3" />
            <span>{selectedDocumentIds.length} doc filter</span>
          </span>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {ollamaChecked && !ollamaOnline && (
          <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
            ⚠️ Start Ollama (<code>ollama serve</code>)
          </div>
        )}
        <Link
          href="/documents"
          className="text-xs text-gray-500 hover:text-blue-600 transition-colors hidden sm:flex items-center space-x-1"
        >
          <span>PDF Library</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </header>
  );
}
