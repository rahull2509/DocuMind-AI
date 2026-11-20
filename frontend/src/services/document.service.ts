import { apiFetch } from './api';
import { Document } from '@/types/document';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sessionId = localStorage.getItem('documind_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));
    localStorage.setItem('documind_session_id', sessionId);
  }
  return sessionId;
}

export async function uploadDocument(
  file: File,
  onProgress?: (percent: number) => void
): Promise<Document> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/api/documents/upload`);

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('documind_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      // Ensure X-Session-ID is ALWAYS sent for reliable guest session ownership and data isolation
      const sessionId = getOrCreateSessionId();
      if (sessionId) {
        xhr.setRequestHeader('X-Session-ID', sessionId);
      }
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data: Document = JSON.parse(xhr.responseText);
          // If backend returns status "failed", do not treat as successful upload
          if (data.status === 'failed') {
            reject(new Error(data.error_message || 'Document processing and indexing failed.'));
            return;
          }
          resolve(data);
        } catch {
          reject(new Error('Failed to parse upload response from server.'));
        }
      } else {
        let msg = `Upload failed with status ${xhr.status}`;
        try {
          const err = JSON.parse(xhr.responseText);
          msg = err.detail || msg;
        } catch {
          // ignore
        }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during file upload. Please check your connection.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out.'));

    xhr.send(formData);
  });
}

export async function getDocuments(): Promise<Document[]> {
  const res = await apiFetch<any>('/api/documents');
  if (Array.isArray(res)) {
    return res;
  }
  if (res && Array.isArray(res.documents)) {
    return res.documents;
  }
  return [];
}

export async function getDocument(id: string): Promise<Document> {
  return apiFetch<Document>(`/api/documents/${id}`);
}

export async function deleteDocument(id: string): Promise<void> {
  await apiFetch(`/api/documents/${id}`, { method: 'DELETE' });
}
