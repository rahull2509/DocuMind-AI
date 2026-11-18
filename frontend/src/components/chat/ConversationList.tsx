import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Conversation } from '@/types/chat';
import { MessageSquare, Trash2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string | null;
  onDelete: (id: string) => Promise<void>;
  filterQuery?: string;
  isCollapsed?: boolean;
}

export function ConversationList({
  conversations,
  activeId,
  onDelete,
  filterQuery = '',
  isCollapsed = false,
}: ConversationListProps) {
  const router = useRouter();

  const list = Array.isArray(conversations) ? conversations : [];
  const filtered = list.filter((c) =>
    c.title.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      await onDelete(id);
      if (activeId === id) {
        router.push('/dashboard');
      }
    }
  };

  if (filtered.length === 0) {
    if (isCollapsed) return null;
    return (
      <div className="px-3 py-4 text-xs text-gray-400 text-center">
        {filterQuery ? 'No matching chats' : 'No conversations yet'}
      </div>
    );
  }

  return (
    <div className="space-y-0.5 px-2 py-1 overflow-y-auto">
      {filtered.map((conv) => {
        const isActive = conv.id === activeId;
        return (
          <Link
            key={conv.id}
            href={`/chat/${conv.id}`}
            title={conv.title}
            className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2 truncate pr-2">
              <MessageSquare
                className={`w-3.5 h-3.5 flex-shrink-0 ${
                  isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                }`}
              />
              {!isCollapsed && (
                <span className="truncate">{conv.title}</span>
              )}
            </div>

            {!isCollapsed && (
              <div className="flex items-center space-x-1.5 flex-shrink-0">
                <span className="text-[10px] text-gray-400 group-hover:hidden">
                  {formatRelativeTime(conv.updated_at)}
                </span>
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="hidden group-hover:flex text-gray-400 hover:text-red-600 p-0.5 rounded transition-colors"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
