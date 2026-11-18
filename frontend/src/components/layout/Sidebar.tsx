'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useConversations } from '@/hooks/useConversations';
import { useAppStore } from '@/store/app-store';
import { ConversationList } from '@/components/chat/ConversationList';
import { getHealth } from '@/services/chat.service';
import {
  Sparkles,
  Plus,
  LayoutDashboard,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Activity,
  Menu,
  X,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { conversations, remove, create } = useConversations();
  const {
    sidebarOpen,
    toggleSidebar,
    activeConversationId,
    ollamaOnline,
    setOllamaOnline,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Poll health every 30s
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
    const interval = setInterval(check, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [setOllamaOnline]);

  const handleNewChat = async () => {
    try {
      const newConv = await create('New Conversation');
      router.push(`/chat/${newConv.id}`);
      setMobileOpen(false);
    } catch {
      router.push('/chat');
      setMobileOpen(false);
    }
  };

  const navLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Documents', href: '/documents', icon: FileText },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Trigger Button */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl bg-white border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-40 flex flex-col bg-[#F9FAFB] border-r border-[#E5E7EB] transition-all duration-300 select-none ${
          sidebarOpen ? 'w-[260px]' : 'w-[68px]'
        } ${mobileOpen ? 'translate-x-0 !w-[260px]' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div
          className={`h-14 flex items-center border-b border-[#E5E7EB] transition-all flex-shrink-0 ${
            sidebarOpen || mobileOpen ? 'justify-between px-4' : 'justify-center px-0'
          }`}
        >
          {sidebarOpen || mobileOpen ? (
            <>
              <Link
                href="/dashboard"
                className="flex items-center truncate"
                onClick={() => setMobileOpen(false)}
              >
                <span className="font-bold text-base text-[#202123] tracking-tight">
                  DocuMind <span className="text-[#2563EB]">AI</span>
                </span>
              </Link>

              <button
                onClick={toggleSidebar}
                className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={toggleSidebar}
              className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center flex-shrink-0 shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
              title="Expand sidebar"
            >
              <Sparkles className="w-4 h-4 fill-white text-white" />
            </button>
          )}
        </div>

        {/* New Chat Button */}
        <div className="p-3 flex justify-center flex-shrink-0">
          <button
            onClick={handleNewChat}
            className={`flex items-center justify-center rounded-xl font-medium text-xs transition-all shadow-xs cursor-pointer ${
              sidebarOpen || mobileOpen
                ? 'w-full bg-white border border-[#E5E7EB] text-[#202123] hover:border-blue-300 hover:text-blue-600 px-3 py-2.5 space-x-2'
                : 'w-10 h-10 bg-white border border-[#E5E7EB] text-[#202123] hover:border-blue-400 hover:text-blue-600 p-0'
            }`}
            title="Start new chat"
          >
            <Plus className="w-4 h-4 text-[#2563EB] flex-shrink-0" />
            {(sidebarOpen || mobileOpen) && <span>New Chat</span>}
          </button>
        </div>

        {/* Search Conversations (When expanded) */}
        {(sidebarOpen || mobileOpen) && (
          <div className="px-3 pb-2 flex-shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Conversations History (Only shown when expanded) */}
        {sidebarOpen || mobileOpen ? (
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            <div className="px-3.5 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Recent Chats
            </div>
            <ConversationList
              conversations={conversations}
              activeId={activeConversationId}
              onDelete={remove}
              filterQuery={searchQuery}
            />
          </div>
        ) : (
          /* Clean empty space when collapsed (no chat history) */
          <div className="flex-1" />
        )}

        {/* Navigation Section */}
        <div className="p-2 border-t border-[#E5E7EB] space-y-1 flex-shrink-0">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                title={link.label}
                className={`flex items-center rounded-xl text-xs font-medium transition-colors ${
                  !sidebarOpen && !mobileOpen
                    ? 'justify-center w-10 h-10 mx-auto p-0'
                    : 'space-x-2.5 px-3 py-2'
                } ${
                  active
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-[#6B7280] hover:bg-gray-100 hover:text-[#202123]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    active ? 'text-blue-600' : 'text-[#6B7280]'
                  }`}
                />
                {(sidebarOpen || mobileOpen) && <span>{link.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Local AI Status Indicator Footer */}
        <div className="p-3 border-t border-[#E5E7EB] bg-white/50 text-xs flex justify-center flex-shrink-0">
          <div
            className={`flex items-center ${
              !sidebarOpen && !mobileOpen ? 'justify-center w-10 h-5' : 'space-x-2 w-full'
            }`}
            title={ollamaOnline ? 'Ollama Online' : 'Ollama Offline'}
          >
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              {ollamaOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  ollamaOnline ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </span>
            {(sidebarOpen || mobileOpen) && (
              <span className="text-[11px] text-gray-500 truncate font-mono">
                {ollamaOnline ? 'Ollama Online' : 'Ollama Offline'}
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
