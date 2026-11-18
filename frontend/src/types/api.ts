export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface HealthResponse {
  status: string;
  ollama_online: boolean;
  chroma_count: number;
  db_ok: boolean;
}

export interface SettingsResponse {
  ollama_url: string;
  ollama_model: string;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  top_k: number;
  max_file_size_mb: number;
  temperature: number;
  max_tokens: number;
}
