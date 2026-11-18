'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useDocuments } from '@/hooks/useDocuments';
import { useConversations } from '@/hooks/useConversations';
import { getHealth, getSettings } from '@/services/chat.service';
import { HealthResponse, SettingsResponse } from '@/types/api';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatus';
import { formatFileSize, formatRelativeTime, formatDate } from '@/lib/utils';
import {
  FileText,
  MessageSquare,
  Database,
  Cpu,
  Plus,
  UploadCloud,
  ArrowRight,
  Sparkles,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { documents, loading: docsLoading } = useDocuments();
  const { conversations, loading: convsLoading, create: createConv } = useConversations();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [h, s] = await Promise.all([getHealth(), getSettings()]);
        setHealth(h);
        setSettings(s);
      } catch (err) {
        console.error('Error fetching dashboard health/settings:', err);
      } finally {
        setLoadingHealth(false);
      }
    }
    loadData();
  }, []);

  const docsList = Array.isArray(documents) ? documents : [];
  const convsList = Array.isArray(conversations) ? conversations : [];
  const totalChunks = docsList.reduce((acc, d) => acc + (d.chunk_count || 0), 0);
  const completedDocs = docsList.filter((d) => d.status === 'completed');

  const handleStartChat = async () => {
    try {
      const conv = await createConv('New Conversation');
      router.push(`/chat/${conv.id}`);
    } catch {
      router.push('/chat');
    }
  };

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
        {/* Welcome Hero */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Grounded Intelligence</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Welcome to DocuMind AI
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Your local document intelligence platform. Chat with multiple PDFs with verifiable source citations.
            </p>
          </div>

          <div className="flex items-center space-x-3 flex-shrink-0">
            <Link
              href="/documents"
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-xs transition-colors"
            >
              <UploadCloud className="w-4 h-4 text-blue-600" />
              <span>Upload PDF</span>
            </Link>
            <button
              onClick={handleStartChat}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Conversation</span>
            </button>
          </div>
        </div>

        {/* Analytics Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Documents */}
          <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium text-gray-500">Total Documents</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {docsLoading ? '...' : docsList.length}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              {completedDocs.length} indexed & ready for query
            </div>
          </div>

          {/* Total Chunks */}
          <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium text-gray-500">Vector Chunks</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {docsLoading ? '...' : totalChunks}
            </div>
            <div className="text-[11px] text-gray-400 mt-1 font-mono">
              ChromaDB persistent store
            </div>
          </div>

          {/* Total Conversations */}
          <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium text-gray-500">Conversations</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {convsLoading ? '...' : convsList.length}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              Stored in SQLite database
            </div>
          </div>

          {/* AI Runtime Status */}
          <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-medium text-gray-500">Local LLM</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-sm font-bold text-gray-900 truncate">
                {settings?.ollama_model || 'qwen2.5:3b'}
              </div>
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  health?.ollama_online ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </div>
            <div className="text-[11px] text-gray-400 mt-1 font-mono">
              {loadingHealth ? 'Checking...' : health?.ollama_online ? 'Ollama running' : 'Ollama disconnected'}
            </div>
          </div>
        </div>

        {/* Recent Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Documents */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Recent Documents</span>
              </h2>
              <Link
                href="/documents"
                className="text-xs text-blue-600 hover:underline flex items-center space-x-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex-1 divide-y divide-gray-100">
              {docsLoading ? (
                <div className="py-6 text-center text-xs text-gray-400">Loading documents...</div>
              ) : docsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  No documents uploaded yet.{' '}
                  <Link href="/documents" className="text-blue-600 hover:underline">
                    Upload your first PDF
                  </Link>
                </div>
              ) : (
                docsList.slice(0, 5).map((doc) => (
                  <div
                    key={doc.id}
                    className="py-2.5 flex items-center justify-between text-xs hover:bg-gray-50/50 px-1 rounded-lg"
                  >
                    <div className="truncate pr-3">
                      <p className="font-medium text-gray-900 truncate" title={doc.filename}>
                        {doc.filename}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {formatFileSize(doc.file_size)} • {doc.chunk_count} chunks • {formatRelativeTime(doc.created_at)}
                      </p>
                    </div>
                    <DocumentStatusBadge status={doc.status} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Conversations */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Recent Conversations</span>
              </h2>
              <button
                onClick={handleStartChat}
                className="text-xs text-blue-600 hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <span>New chat</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex-1 divide-y divide-gray-100">
              {convsLoading ? (
                <div className="py-6 text-center text-xs text-gray-400">Loading conversations...</div>
              ) : convsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  No conversations yet.{' '}
                  <button onClick={handleStartChat} className="text-blue-600 hover:underline cursor-pointer">
                    Ask your first question
                  </button>
                </div>
              ) : (
                convsList.slice(0, 5).map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/chat/${conv.id}`}
                    className="py-2.5 flex items-center justify-between text-xs hover:bg-gray-50/50 px-1 rounded-lg transition-colors group"
                  >
                    <div className="truncate pr-3">
                      <p className="font-medium text-gray-900 group-hover:text-blue-600 truncate">
                        {conv.title}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Updated {formatRelativeTime(conv.updated_at)}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-600" />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
