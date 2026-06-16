import axios from 'axios';
import { auth } from '../lib/firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add user authentication information
apiClient.interceptors.request.use(
  async (config) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      // Send User ID for multi-tenant isolation prep
      config.headers['X-User-ID'] = currentUser.uid;
      // Fetch the Firebase ID Token dynamically
      try {
        const token = await currentUser.getIdToken();
        config.headers['Authorization'] = `Bearer ${token}`;
      } catch (err) {
        console.warn("Failed to get Firebase ID Token, falling back to raw UID", err);
        config.headers['Authorization'] = `Bearer ${currentUser.uid}`;
      }
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

  chat: async (query: string, history: any[], sessionId?: string | null) => {
    const response = await apiClient.post('/chat', { 
      question: query, 
      history, 
      session_id: sessionId 
    });
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
    const currentUser = auth.currentUser;
    const authQuery = currentUser ? `?uid=${currentUser.uid}` : '';
    return `${API_BASE_URL}/documents/${id}/download${authQuery}`;
  },

  reindexDocument: async (id: string) => {
    const response = await apiClient.post(`/documents/${id}/reindex`);
    return response.data;
  },

  resetDb: async () => {
    // Clear-db endpoint scopes specifically to the current authenticated user
    const response = await apiClient.post('/clear-db');
    return response.data;
  },

  getHealth: async () => {
    const response = await apiClient.get('/health/database');
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get('/profile');
    return response.data;
  },

  // Chat Sessions CRUD
  getChatSessions: async () => {
    const response = await apiClient.get('/chat-sessions');
    return response.data;
  },

  createChatSession: async (title?: string, documentIds?: string[]) => {
    const response = await apiClient.post('/chat-sessions', { 
      title: title || 'New Conversation', 
      document_ids: documentIds || [] 
    });
    return response.data;
  },

  deleteChatSession: async (sessionId: string) => {
    const response = await apiClient.delete(`/chat-sessions/${sessionId}`);
    return response.data;
  },

  getSessionMessages: async (sessionId: string) => {
    const response = await apiClient.get(`/chat-sessions/${sessionId}/messages`);
    return response.data;
  }
};
