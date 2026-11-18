'use client';

import React, { use, Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ChatContainer } from '@/components/chat/ChatContainer';

interface PageProps {
  params: Promise<{ id: string }>;
}

function ChatContent({ params }: PageProps) {
  const resolvedParams = use(params);
  return <ChatContainer conversationId={resolvedParams.id} />;
}

export default function ChatConversationPage({ params }: PageProps) {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
            Loading conversation...
          </div>
        }
      >
        <ChatContent params={params} />
      </Suspense>
    </AppShell>
  );
}
