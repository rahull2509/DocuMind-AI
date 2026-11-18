'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useConversations } from '@/hooks/useConversations';
import { useAppStore } from '@/store/app-store';
import { ConversationList } from '@/components/chat/ConversationList';
import {
  Sparkles,
  SquarePen,
  LayoutDashboard,
  FileText,
  Settings,
  PanelLeftClose,
  Search,
  Menu,
  X,
  LogIn,
  LogOut,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { conversations, remove, create } = useConversations();
  const {
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    sidebarWidth,
    setSidebarWidth,
    activeConversationId,
    user,
    logout,
    setIsAuthModalOpen,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Restore sidebar width from localStorage on mount
  useEffect(() => {
    try {
      const savedWidth = localStorage.getItem('documind_sidebar_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= 180 && parsed <= 480) {
          setSidebarWidth(parsed);
        }
      }
    } catch {}
  }, [setSidebarWidth]);

  // Handle drag to resize (only when expanded)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sidebarOpen) return;
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX;
      if (newWidth < 130) {
        if (sidebarOpen) setSidebarOpen(false);
      } else {
        if (!sidebarOpen) setSidebarOpen(true);
        const clamped = Math.max(190, Math.min(newWidth, 480));
        setSidebarWidth(clamped);
        try {
          localStorage.setItem('documind_sidebar_width', clamped.toString());
        } catch {}
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, sidebarOpen, setSidebarOpen, setSidebarWidth]);

  const handleDoubleClick = () => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      setSidebarWidth(260);
      try {
        localStorage.setItem('documind_sidebar_width', '260');
      } catch {}
    } else if (sidebarWidth !== 260) {
      setSidebarWidth(260);
      try {
        localStorage.setItem('documind_sidebar_width', '260');
      } catch {}
    } else {
      setSidebarOpen(false);
    }
  };

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
        style={{
          width: mobileOpen ? '280px' : sidebarOpen ? `${sidebarWidth}px` : '68px',
        }}
        className={`fixed md:relative inset-y-0 left-0 z-40 flex flex-col bg-[#F9FAFB] border-r border-[#E5E7EB] ${
          isResizing ? '' : 'transition-[width] duration-200'
        } select-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`h-14 flex items-center border-b border-[#E5E7EB] transition-all flex-shrink-0 ${
            sidebarOpen || mobileOpen ? 'justify-between px-3.5' : 'justify-center px-0'
          }`}
        >
          {sidebarOpen || mobileOpen ? (
            <>
              <Link
                href="/dashboard"
                className="flex items-center min-w-0"
                onClick={() => setMobileOpen(false)}
              >
                <span className="font-semibold text-base text-[#202123] tracking-tight">
                  DocuMind <span className="text-[#2563EB]">AI</span>
                </span>
              </Link>

              <div className="flex items-center space-x-1">
                {/* Search toggle icon button */}
                <button
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isSearchOpen || searchQuery
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/60'
                  }`}
                  title="Search chats"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* Collapse icon button matching ChatGPT PanelLeftClose */}
                <button
                  onClick={toggleSidebar}
                  className="hidden md:flex p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-200/60 transition-colors cursor-pointer"
                  title="Close sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={toggleSidebar}
              className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center flex-shrink-0 shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
              title="Open sidebar"
            >
              <Sparkles className="w-4 h-4 fill-white text-white" />
            </button>
          )}
        </div>

        {/* Expandable Search Input (When Search Icon is toggled) */}
        {(sidebarOpen || mobileOpen) && isSearchOpen && (
          <div className="px-3 pt-2 pb-1 flex-shrink-0 transition-all">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 p-0.5 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Primary Action: New Chat (ChatGPT styled) */}
        <div className="p-2 flex justify-center flex-shrink-0">
          <button
            onClick={handleNewChat}
            className={`flex items-center rounded-xl font-medium text-xs transition-colors cursor-pointer ${
              sidebarOpen || mobileOpen
                ? 'w-full px-3 py-2 space-x-2.5 text-gray-800 hover:bg-gray-200/60 justify-start'
                : 'w-10 h-10 bg-white border border-[#E5E7EB] text-[#202123] hover:border-blue-400 hover:text-blue-600 justify-center p-0 shadow-xs'
            }`}
            title="New chat"
          >
            <SquarePen className="w-4 h-4 text-gray-700 flex-shrink-0" />
            {(sidebarOpen || mobileOpen) && <span>New chat</span>}
          </button>
        </div>

        {/* Navigation Section */}
        <div className="px-2 pb-2 space-y-0.5 flex-shrink-0">
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
                    : 'text-[#6B7280] hover:bg-gray-200/60 hover:text-[#202123]'
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

        {/* Conversations History (Only shown when expanded) */}
        {sidebarOpen || mobileOpen ? (
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 border-t border-[#E5E7EB]/70">
            <div className="px-3.5 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Recents
            </div>
            {user ? (
              <ConversationList
                conversations={conversations}
                activeId={activeConversationId}
                onDelete={remove}
                filterQuery={searchQuery}
              />
            ) : (
              <div className="px-4 py-8 text-center text-xs text-gray-400">
                Log in to save and access your chats
              </div>
            )}
          </div>
        ) : (
          /* Clean empty space when collapsed (no chat history) */
          <div className="flex-1" />
        )}

        {/* User / Authentication Footer */}
        {!user ? (
          sidebarOpen || mobileOpen ? (
            <div className="p-3 m-2.5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs flex-shrink-0">
              <h4 className="font-semibold text-xs text-[#202123] leading-snug">
                Get responses tailored to you
              </h4>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Log in to get answers based on saved chats, plus create images and upload files.
              </p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full mt-3 py-2 rounded-xl bg-[#F3F3F3] hover:bg-[#E5E5E5] text-gray-800 border border-gray-200 text-xs font-medium text-center transition-colors shadow-xs cursor-pointer"
              >
                Log in
              </button>
            </div>
          ) : null
        ) : (
          sidebarOpen || mobileOpen ? (
            <div className="p-2.5 border-t border-[#E5E7EB] bg-white/70 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0 shadow-xs">
                  {(user.name ? user.name.trim()[0] : user.email.trim()[0] || 'U').toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-gray-900 truncate">
                    {user.name ? user.name.trim() : user.email.split('@')[0]}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-2 border-t border-[#E5E7EB] flex justify-center flex-shrink-0">
              <button
                onClick={logout}
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xs font-semibold shadow-xs cursor-pointer transition-transform hover:scale-105"
                title={`Logged in as ${user.name || user.email} • Click to log out`}
              >
                {(user.name ? user.name.trim()[0] : user.email.trim()[0] || 'U').toUpperCase()}
              </button>
            </div>
          )
        )}

        {/* Draggable Resize Handle (Only active when expanded) */}
        {sidebarOpen && (
          <div
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            className="hidden md:flex absolute top-0 -right-1 w-2.5 h-full cursor-col-resize items-center justify-center z-50 group hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors"
            title="Drag to resize sidebar • Double-click to reset"
          >
            <div className="w-1 h-8 rounded-full bg-gray-300 group-hover:bg-blue-600 transition-colors" />
          </div>
        )}
      </aside>
    </>
  );
}
