import React from 'react';
import { FileText, Sparkles, Compass, BookOpen } from 'lucide-react';

interface ChatEmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

export function ChatEmptyState({ onSelectPrompt }: ChatEmptyStateProps) {
  const suggestedPrompts = [
    {
      icon: Sparkles,
      title: 'Summarize documents',
      description: 'Summarize my uploaded documents and key themes.',
      prompt: 'Summarize my uploaded documents and highlight the main themes.',
    },
    {
      icon: Compass,
      title: 'Main findings',
      description: 'What are the main findings and conclusions?',
      prompt: 'What are the main findings, takeaways, and conclusions in my documents?',
    },
    {
      icon: FileText,
      title: 'Compare information',
      description: 'Compare the points and methodologies across documents.',
      prompt: 'Compare the information, methodologies, or findings across my uploaded documents.',
    },
    {
      icon: BookOpen,
      title: 'Important definitions',
      description: 'Find important definitions and technical terms.',
      prompt: 'Extract and list all important definitions and key terminology mentioned in the documents.',
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto my-auto select-none">
      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 shadow-sm">
        <Sparkles className="w-6 h-6 text-blue-600" />
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">
        What would you like to explore?
      </h2>
      <p className="text-sm text-gray-500 max-w-md mb-8">
        Ask natural-language questions about your uploaded documents and discover citations grounded in your knowledge base.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {suggestedPrompts.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.prompt)}
              className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all text-left group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              <div className="flex items-center space-x-2.5 mb-1.5 text-gray-700 group-hover:text-blue-600 transition-colors">
                <Icon className="w-4 h-4" />
                <span className="font-medium text-sm text-gray-900">{item.title}</span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
