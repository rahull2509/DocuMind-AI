'use client';

import { useState, useEffect, useCallback } from 'react';
import { Document } from '@/types/document';
import { getDocuments, uploadDocument, deleteDocument } from '@/services/document.service';

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDocuments();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const upload = async (file: File): Promise<Document> => {
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const doc = await uploadDocument(file, (pct) => setUploadProgress(pct));
      setDocuments((prev) => [doc, ...prev]);
      return doc;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
      throw err;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeDocument = async (id: string): Promise<void> => {
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete document';
      setError(msg);
      throw err;
    }
  };

  return {
    documents,
    loading,
    error,
    uploading,
    uploadProgress,
    upload,
    removeDocument,
    refresh: fetchDocuments,
  };
}
