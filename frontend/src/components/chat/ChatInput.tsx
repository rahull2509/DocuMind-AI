import React, { useState, useRef, useEffect } from 'react';
import { DocumentSelector } from '@/components/documents/DocumentSelector';
import { ArrowUp, Square, Paperclip } from 'lucide-react';
import Link from 'next/link';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  initialValue?: string;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  initialValue = '',
}: ChatInputProps) {
  const [input, setInput] = useState<string>(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialValue) {
      setInput(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || isStreaming || disabled) return;
    onSend(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      <div className="flex items-center justify-between mb-1.5 px-1">
        <DocumentSelector />
        <Link
          href="/documents"
          className="inline-flex items-center space-x-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
          title="Upload or manage documents"
        >
          <Paperclip className="w-3 h-3" />
          <span>Manage PDFs</span>
        </Link>
      </div>

      <div className="relative flex items-end border border-gray-200 rounded-2xl bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your documents... (Shift + Enter for new line)"
          disabled={disabled}
          rows={1}
          className="flex-1 py-3 px-4 resize-none bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none max-h-48 leading-relaxed"
        />

        <div className="p-2">
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer"
              title="Stop generating"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!input.trim() || disabled}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                input.trim() && !disabled
                  ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
              title="Send message"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
      <p className="text-[11px] text-gray-400 text-center mt-2">
        DocuMind AI answers are grounded strictly in your uploaded PDF knowledge base.
      </p>
    </div>
  );
}
