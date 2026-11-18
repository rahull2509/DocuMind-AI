'use client';

import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAppStore } from '@/store/app-store';
import { getMe } from '@/services/auth.service';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { setUser, setToken, setAuthChecked } = useAppStore();

  // Restore authenticated session on mount
  useEffect(() => {
    const token = localStorage.getItem('documind_token');
    if (!token) {
      setAuthChecked(true);
      return;
    }
    setToken(token);
    getMe()
      .then((user) => {
        setUser(user);
      })
      .catch(() => {
        // Token invalid or expired
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setAuthChecked(true);
      });
  }, [setUser, setToken, setAuthChecked]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#202123] font-sans antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header />
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-[#FFFFFF]">
          {children}
        </main>
      </div>
      <AuthModal />
    </div>
  );
}
