import { apiFetch } from './api';
import { Document } from '@/types/document';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch (e) {
          reject(new Error('Failed to parse upload response'));
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

    xhr.onerror = () => reject(new Error('Network error during file upload'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));

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
