import axios from 'axios';
import { auth } from '../lib/firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add user authentication information
apiClient.interceptors.request.use(
  (config) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      // Send User ID for multi-tenant isolation prep
      config.headers['X-User-ID'] = currentUser.uid;
      // Send standard authorization token structure
      config.headers['Authorization'] = `Bearer ${currentUser.uid}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const api = {
  uploadPdf: async (
    files: FileList | File[], 
    onUploadProgress?: (progressEvent: any) => void
  ) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });
    const response = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  },

  getUploadStatus: async (jobId: string) => {
    const response = await apiClient.get(`/upload-status/${jobId}`);
    return response.data;
  },

  chat: async (query: string, history: any[]) => {
    const response = await apiClient.post('/chat', { question: query, history });
    return response.data;
  },

  getDocuments: async () => {
    const response = await apiClient.get('/documents');
    return response.data;
  },

  deleteDocument: async (id: string) => {
    const response = await apiClient.delete(`/documents/${id}`);
    return response.data;
  },

  downloadDocumentUrl: (id: string) => {
    // Return relative URL or absolute, appending user identification if needed
    const currentUser = auth.currentUser;
    const authQuery = currentUser ? `?uid=${currentUser.uid}` : '';
    return `${API_BASE_URL}/documents/${id}/download${authQuery}`;
  },

  reindexDocument: async (id: string) => {
    const response = await apiClient.post(`/documents/${id}/reindex`);
    return response.data;
  },

  resetDb: async () => {
    const response = await apiClient.post('/reset');
    return response.data;
  },

  getHealth: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },
};
