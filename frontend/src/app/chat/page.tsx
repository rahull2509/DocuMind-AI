'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ChatContainer } from '@/components/chat/ChatContainer';

export default function NewChatPage() {
  return (
    <AppShell>
      <ChatContainer conversationId={null} />
    </AppShell>
  );
}
