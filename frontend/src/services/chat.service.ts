import { apiFetch } from './api';
import { Conversation, ChatStreamRequest, Source } from '@/types/chat';
import { HealthResponse, SettingsResponse } from '@/types/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function getConversations(): Promise<Conversation[]> {
  return apiFetch<Conversation[]>('/api/conversations');
}

export async function getConversation(id: string): Promise<Conversation> {
  return apiFetch<Conversation>(`/api/conversations/${id}`);
}

export async function createConversation(title: string): Promise<Conversation> {
  return apiFetch<Conversation>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export async function updateConversation(id: string, title: string): Promise<Conversation> {
  return apiFetch<Conversation>(`/api/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export async function deleteConversation(id: string): Promise<void> {
  await apiFetch(`/api/conversations/${id}`, { method: 'DELETE' });
}

export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/api/health');
}

export async function getSettings(): Promise<SettingsResponse> {
  return apiFetch<SettingsResponse>('/api/settings');
}

export async function getModels(): Promise<string[]> {
  return apiFetch<string[]>('/api/models');
}

export async function streamChat(
  request: ChatStreamRequest,
  onSources: (sources: Source[]) => void,
  onToken: (token: string) => void,
  onDone: (payload?: { conversation_id?: string; title?: string }) => void,
  onError: (error: string) => void,
  signal?: AbortSignal
): Promise<void> {
  let doneDispatched = false;
  let hasError = false;
  let isAborted = false;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('documind_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      let sessionId = localStorage.getItem('documind_session_id');
      if (!sessionId) {
        sessionId = 'sess_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));
        localStorage.setItem('documind_session_id', sessionId);
      }
      headers['X-Session-ID'] = sessionId;
    }

    const response = await fetch(`${BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question: request.question,
        conversation_id: request.conversation_id,
        document_ids: request.document_ids && request.document_ids.length > 0 ? request.document_ids : null,
      }),
      signal,
    });

    if (!response.ok) {
      hasError = true;
      let detail = response.statusText;
      try {
        const errJson = await response.json();
        detail = errJson.detail || detail;
      } catch {
        // ignore
      }
      onError(`Request failed with status ${response.status}: ${detail}`);
      return;
    }

    if (!response.body) {
      hasError = true;
      onError('Response body is null');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const dataStr = trimmed.slice(5).trim();
        if (!dataStr) continue;

        try {
          const payload = JSON.parse(dataStr);
          if (payload.type === 'sources') {
            onSources(payload.sources || []);
          } else if (payload.type === 'token') {
            onToken(payload.token || '');
          } else if (payload.type === 'done') {
            doneDispatched = true;
            onDone({
              conversation_id: payload.conversation_id,
              title: payload.title,
            });
          } else if (payload.type === 'error') {
            hasError = true;
            onError(payload.message || 'An error occurred during generation');
            break;
          }
        } catch {
          // If non-JSON SSE chunk, skip
        }
      }

      if (hasError) {
        try {
          await reader.cancel();
        } catch {
          // ignore
        }
        break;
      }
    }

    // Only dispatch onDone if generation was successful and neither done nor error was already dispatched
    if (!doneDispatched && !hasError && !isAborted) {
      doneDispatched = true;
      onDone();
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      isAborted = true;
      return;
    }
    hasError = true;
    onError(err instanceof Error ? err.message : 'Unknown streaming error');
  }
}
