'use client';

import { useState, useCallback, useRef } from 'react';
import { Message, Source } from '@/types/chat';
import { getConversation, streamChat } from '@/services/chat.service';

export function useChat(initialConversationId?: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId || null
  );

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadConversation = useCallback(async (id: string) => {
    try {
      setError(null);
      setConversationId(id);
      const data = await getConversation(id);
      const formatted: Message[] = (data.messages || []).map((m: any) => ({
        id: m.id,
        conversation_id: m.conversation_id,
        role: m.role,
        content: m.content,
        sources: m.sources_json ? JSON.parse(m.sources_json) : undefined,
        created_at: m.created_at,
      }));
      setMessages(formatted);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (
      question: string,
      documentIds: string[] = [],
      targetConversationId?: string | null
    ): Promise<void> => {
      if (!question.trim() || isStreaming) return;

      setError(null);
      const effectiveConvId = targetConversationId ?? conversationId;

      // 1. Add user message optimistically
      const userMsgId = 'user-' + Date.now();
      const userMessage: Message = {
        id: userMsgId,
        conversation_id: effectiveConvId || '',
        role: 'user',
        content: question,
        created_at: new Date().toISOString(),
      };

      // 2. Add placeholder assistant message
      const assistantMsgId = 'asst-' + Date.now();
      const assistantMessage: Message = {
        id: assistantMsgId,
        conversation_id: effectiveConvId || '',
        role: 'assistant',
        content: '',
        sources: [],
        created_at: new Date().toISOString(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      let accumulatedTokens = '';
      let receivedSources: Source[] = [];

      await streamChat(
        {
          conversation_id: effectiveConvId,
          question,
          document_ids: documentIds,
        },
        (sources) => {
          receivedSources = sources;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, sources } : m
            )
          );
        },
        (token) => {
          accumulatedTokens += token;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: accumulatedTokens, isStreaming: true }
                : m
            )
          );
        },
        () => {
          setIsStreaming(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: accumulatedTokens,
                    sources: receivedSources,
                    isStreaming: false,
                  }
                : m
            )
          );
          abortControllerRef.current = null;
        },
        (errMsg) => {
          setIsStreaming(false);
          setError(errMsg);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content:
                      accumulatedTokens ||
                      `⚠️ *Error generating response:* ${errMsg}`,
                    isStreaming: false,
                  }
                : m
            )
          );
          abortControllerRef.current = null;
        },
        abortController.signal
      );
    },
    [conversationId, isStreaming]
  );

  return {
    messages,
    isStreaming,
    error,
    conversationId,
    setConversationId,
    sendMessage,
    loadConversation,
    stopStreaming,
    clearMessages: () => setMessages([]),
  };
}
