export interface Source {
  text: string;
  filename: string;
  page_number: number;
  chunk_index: number;
  distance: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  created_at: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface ChatStreamRequest {
  conversation_id: string | null;
  question: string;
  document_ids: string[];
}
