import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/types/chat';
import { SourcesPanel } from '@/components/sources/SourcesPanel';
import { StreamingIndicator } from './StreamingIndicator';
import { formatMessageTime } from '@/lib/utils';
import { Copy, Check, Bot, User } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 group">
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%]">
          <div className="flex items-start space-x-2">
            <div className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed shadow-sm">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 text-xs font-semibold mt-0.5">
              <User className="w-4 h-4" />
            </div>
          </div>
          {message.created_at && (
            <span className="text-[10px] text-gray-400 mt-1 mr-9">
              {formatMessageTime(message.created_at)}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6 group">
      <div className="flex items-start max-w-[95%] sm:max-w-[88%] space-x-3 w-full">
        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
          <Bot className="w-4 h-4" />
        </div>

        <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm relative">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-50 text-xs text-gray-400">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-700">DocuMind AI</span>
              {message.created_at && (
                <span className="text-[11px] text-gray-400 font-normal">
                  {formatMessageTime(message.created_at)}
                </span>
              )}
            </div>
            <button
              onClick={handleCopy}
              className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-50 transition-colors"
              title="Copy message"
            >
              {copied ? (
                <span className="flex items-center space-x-1 text-emerald-600">
                  <Check className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Copied</span>
                </span>
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {message.content ? (
            <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed font-sans prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-pre:bg-gray-50 prose-pre:text-gray-800 prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-lg prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          ) : message.isStreaming ? (
            <div className="py-2 text-gray-500 flex items-center space-x-2">
              <span className="text-xs">Thinking & retrieving context...</span>
              <StreamingIndicator />
            </div>
          ) : null}

          {message.isStreaming && message.content && (
            <div className="inline-block ml-1">
              <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse align-middle" />
            </div>
          )}

          {message.sources && message.sources.length > 0 && (
            <SourcesPanel sources={message.sources} />
          )}
        </div>
      </div>
    </div>
  );
}
