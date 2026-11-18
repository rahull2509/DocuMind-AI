'use client';

import { useState, useEffect, useCallback } from 'react';
import { Conversation } from '@/types/chat';
import {
  getConversations,
  createConversation,
  updateConversation,
  deleteConversation,
} from '@/services/chat.service';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conversations');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const create = async (title: string = 'New Conversation'): Promise<Conversation> => {
    try {
      const conv = await createConversation(title);
      setConversations((prev) => [conv, ...prev]);
      return conv;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(msg);
      throw err;
    }
  };

  const rename = async (id: string, title: string): Promise<Conversation> => {
    try {
      const updated = await updateConversation(id, title);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: updated.title } : c))
      );
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to rename conversation';
      setError(msg);
      throw err;
    }
  };

  const remove = async (id: string): Promise<void> => {
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete conversation';
      setError(msg);
      throw err;
    }
  };

  return {
    conversations,
    loading,
    error,
    create,
    rename,
    remove,
    refresh: fetchConversations,
  };
}
