import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { useAppStore } from '@/store/app-store';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatEmptyState } from './ChatEmptyState';
import { useRouter } from 'next/navigation';

interface ChatContainerProps {
  conversationId?: string | null;
}

export function ChatContainer({ conversationId }: ChatContainerProps) {
  const router = useRouter();
  const { selectedDocumentIds, setActiveConversationId } = useAppStore();
  const {
    messages,
    isStreaming,
    error,
    sendMessage,
    loadConversation,
    stopStreaming,
  } = useChat(conversationId);

  const [promptToFill, setPromptToFill] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId) {
      setActiveConversationId(conversationId);
      loadConversation(conversationId);
    } else {
      setActiveConversationId(null);
    }
  }, [conversationId, loadConversation, setActiveConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSend = async (question: string) => {
    await sendMessage(question, selectedDocumentIds, conversationId);
  };

  const handleSelectPrompt = (prompt: string) => {
    handleSend(prompt);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FFFFFF] overflow-hidden">
      {/* Scrollable message area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto min-h-full flex flex-col">
          {messages.length === 0 ? (
            <ChatEmptyState onSelectPrompt={handleSelectPrompt} />
          ) : (
            <div className="flex-1 space-y-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Error banner if present */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 py-2 w-full">
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Sticky composer */}
      <div className="bg-[#FFFFFF]/90 backdrop-blur-sm pt-2">
        <ChatInput
          onSend={handleSend}
          onStop={stopStreaming}
          isStreaming={isStreaming}
          initialValue={promptToFill}
        />
      </div>
    </div>
  );
}
