'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store/app-store';
import { useConversations } from '@/hooks/useConversations';
import { getHealth } from '@/services/chat.service';
import { FileText, MessageSquare } from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  const {
    selectedDocumentIds,
    ollamaOnline,
    ollamaChecked,
    setOllamaOnline,
    activeConversationTitle,
    activeConversationId,
    user,
    setIsAuthModalOpen,
  } = useAppStore();
  const { conversations } = useConversations();

  // Poll health every 15s to keep navbar status live
  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      try {
        const res = await getHealth();
        if (isMounted) setOllamaOnline(res.ollama_online);
      } catch {
        if (isMounted) setOllamaOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [setOllamaOnline]);

  const getPageTitle = () => {
    if (pathname.startsWith('/dashboard')) return 'Dashboard Overview';
    if (pathname.startsWith('/documents')) return 'Document Library';
    if (pathname.startsWith('/settings')) return 'Application Settings';
    if (pathname.startsWith('/chat')) {
      if (activeConversationTitle && activeConversationTitle !== 'New Conversation') {
        return activeConversationTitle;
      }
      const idMatch = pathname.match(/\/chat\/([a-zA-Z0-9_-]+)/);
      const targetId = idMatch ? idMatch[1] : activeConversationId;
      if (targetId && Array.isArray(conversations)) {
        const found = conversations.find((c) => c.id === targetId);
        if (found && found.title && found.title !== 'New Conversation') {
          return found.title;
        }
      }
      return 'New Chat';
    }
    return 'DocuMind AI';
  };

  const isChat = pathname.startsWith('/chat');
  const title = getPageTitle();

  return (
    <header className="h-14 border-b border-[#E5E7EB] bg-white flex items-center justify-between px-6 select-none flex-shrink-0">
      <div className="flex items-center space-x-3 pl-8 md:pl-0 min-w-0">
        {isChat && (
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hidden sm:flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
        )}
        <h1
          className="text-sm font-semibold text-gray-900 tracking-tight truncate max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl"
          title={title}
        >
          {title}
        </h1>
        {selectedDocumentIds.length > 0 && isChat && (
          <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
            <FileText className="w-3 h-3" />
            <span>{selectedDocumentIds.length} doc filter</span>
          </span>
        )}
      </div>

      {/* Right side: Ollama status indicator & Auth */}
      <div className="flex items-center space-x-3 flex-shrink-0">
        {ollamaOnline ? (
          <div
            className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium shadow-xs"
            title="Local Ollama instance is active and ready"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-mono text-[11px]">Ollama Online</span>
          </div>
        ) : (
          <div
            className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium shadow-xs"
            title="Ollama is offline. Run 'ollama serve' in terminal."
          >
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            <span className="font-mono text-[11px]">Ollama Offline</span>
          </div>
        )}

        {!user && (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-3.5 py-1 rounded-full bg-[#F3F3F3] hover:bg-[#E5E5E5] text-gray-800 border border-gray-200 text-xs font-medium transition-colors shadow-xs cursor-pointer"
          >
            Log in
          </button>
        )}
      </div>
    </header>
  );
}
