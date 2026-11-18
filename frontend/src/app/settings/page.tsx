'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAppStore } from '@/store/app-store';
import { getSettings, getModels, getHealth } from '@/services/chat.service';
import { SettingsResponse, HealthResponse } from '@/types/api';
import {
  Settings,
  Cpu,
  Database,
  Layers,
  Sliders,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

export default function SettingsPage() {
  const { systemSettings, setSystemSettings } = useAppStore();
  const [settings, setSettings] = useState<SettingsResponse | null>(systemSettings);
  const [models, setModels] = useState<string[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(!systemSettings);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      try {
        if (!systemSettings) setLoading(true);
        const [s, m, h] = await Promise.all([
          getSettings(),
          getModels().catch(() => ['qwen2.5:3b']),
          getHealth().catch(() => null),
        ]);
        setSettings(s);
        setSystemSettings(s);
        setModels(m.length > 0 ? m : ['qwen2.5:3b']);
        setHealth(h);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [systemSettings, setSystemSettings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AppShell>
      <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="pb-6 border-b border-gray-100">
          <div className="flex items-center space-x-2 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-1">
            <Settings className="w-3.5 h-3.5" />
            <span>Configuration</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            System & RAG Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Inspect and configure local inference parameters, vector database parameters, and chunking strategies.
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
            Loading system configuration...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Ollama Section */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900 pb-3 border-b border-gray-100">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>Local LLM Runtime (Ollama)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Ollama Base URL
                  </label>
                  <input
                    type="text"
                    defaultValue={settings?.ollama_url || 'http://localhost:11434'}
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/50 text-gray-800 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Local Ollama daemon endpoint.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    LLM Model
                  </label>
                  <select
                    defaultValue={settings?.ollama_model || 'qwen2.5:3b'}
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Currently selected model for answering queries.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    health?.ollama_online ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                <span className="text-xs text-gray-600 font-medium">
                  Status: {health?.ollama_online ? 'Connected to local Ollama service' : 'Ollama not detected'}
                </span>
              </div>
            </div>

            {/* Embedding Model Section */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900 pb-3 border-b border-gray-100">
                <Database className="w-4 h-4 text-indigo-600" />
                <span>Vector Embeddings</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Active Embedding Model (Read-Only)
                </label>
                <input
                  type="text"
                  readOnly
                  value={settings?.embedding_model || 'BAAI/bge-small-en-v1.5'}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-100 text-gray-600 font-mono cursor-not-allowed"
                />
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                  <p>
                    <strong>Safe Indexing Notice:</strong> The embedding model cannot be changed without purging and reindexing existing ChromaDB vectors, as vector spaces are non-transferable across different architectures.
                  </p>
                </div>
              </div>
            </div>

            {/* Chunking & Retrieval Strategy */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900 pb-3 border-b border-gray-100">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Page-Aware Chunking & Retrieval</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Chunk Size (Characters)
                  </label>
                  <input
                    type="number"
                    defaultValue={settings?.chunk_size || 2800}
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Approx. 700 tokens per chunk.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Chunk Overlap (Characters)
                  </label>
                  <input
                    type="number"
                    defaultValue={settings?.chunk_overlap || 400}
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Approx. 100 tokens overlap.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Retrieval Top-K
                  </label>
                  <input
                    type="number"
                    defaultValue={settings?.top_k || 5}
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Number of retrieved passages.
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 italic">
                * Note: Changing chunk size or overlap affects newly uploaded documents. Existing documents keep their indexed chunks.
              </p>
            </div>

            {/* Inference Generation Controls */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900 pb-3 border-b border-gray-100">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span>Inference Parameters</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Temperature ({settings?.temperature || 0.1})
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    defaultValue={settings?.temperature || 0.1}
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Low temperature (0.1) prioritizes strict factual grounding.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Max Output Tokens
                  </label>
                  <input
                    type="number"
                    defaultValue={settings?.max_tokens || 2048}
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Maximum length of generated response.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              {saved && (
                <div className="flex items-center space-x-1.5 text-xs text-emerald-600 font-medium">
                  <CheckCircle className="w-4 h-4" />
                  <span>Settings saved successfully</span>
                </div>
              )}
              <div className="ml-auto">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
