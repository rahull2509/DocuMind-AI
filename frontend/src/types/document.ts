export type DocumentStatus = 'uploading' | 'processing' | 'completed' | 'failed';

export interface Document {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  page_count: number | null;
  chunk_count: number;
  status: DocumentStatus;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}
