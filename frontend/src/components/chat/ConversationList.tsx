import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Conversation } from '@/types/chat';
import { Trash2 } from 'lucide-react';

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

  if (isCollapsed) return null;

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
        router.push('/chat');
      }
    }
  };

  if (filtered.length === 0) {
    return (
      <div className="px-3 py-6 text-xs text-gray-400 text-center">
        {filterQuery ? 'No matching chats' : 'No conversations yet'}
      </div>
    );
  }

  return (
    <div className="space-y-0.5 px-2 py-1">
      {filtered.map((conv) => {
        const isActive = conv.id === activeId;
        return (
          <Link
            key={conv.id}
            href={`/chat/${conv.id}`}
            title={conv.title}
            className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors relative ${
              isActive
                ? 'bg-gray-200/80 text-gray-900 font-medium'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span className="truncate flex-1 pr-2 text-left leading-relaxed">
              {conv.title}
            </span>

            <button
              onClick={(e) => handleDelete(e, conv.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 p-0.5 rounded transition-opacity flex-shrink-0"
              title="Delete chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Link>
        );
      })}
    </div>
  );
}
