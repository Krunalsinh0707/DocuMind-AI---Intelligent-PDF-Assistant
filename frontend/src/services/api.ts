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
    } else {
      // Fallback for local development mock authentication bypass
      const mockUid = localStorage.getItem('mock_user_uid');
      if (mockUid) {
        config.headers['X-User-ID'] = mockUid;
        config.headers['Authorization'] = `Bearer ${mockUid}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const cacheMap = new Map<string, { data: any; timestamp: number }>();
const activeRequests = new Map<string, Promise<any>>();
const CACHE_TTL = 5000; // 5 seconds cache TTL

async function cachedRequest<T>(key: string, fetchFn: () => Promise<T>, forceRefresh = false): Promise<T> {
  if (!forceRefresh) {
    const cached = cacheMap.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  let active = activeRequests.get(key);
  if (active) {
    return active;
  }

  const promise = fetchFn().then(
    (data) => {
      cacheMap.set(key, { data, timestamp: Date.now() });
      activeRequests.delete(key);
      return data;
    },
    (err) => {
      activeRequests.delete(key);
      throw err;
    }
  );

  activeRequests.set(key, promise);
  return promise;
}

function invalidateCache(keyPrefix: string) {
  for (const key of cacheMap.keys()) {
    if (key.startsWith(keyPrefix)) {
      cacheMap.delete(key);
    }
  }
}

function invalidateAllCache() {
  cacheMap.clear();
}

export const api = {
  uploadPdf: async (
    files: FileList | File[], 
    onUploadProgress?: (progressEvent: any) => void
  ) => {
    invalidateCache('documents');
    invalidateCache('dashboard');
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
    if (sessionId) {
      invalidateCache(`messages_${sessionId}`);
    }
    invalidateCache('chat-sessions');
    invalidateCache('history');
    invalidateCache('dashboard');
    const response = await apiClient.post('/chat', { 
      question: query, 
      history, 
      session_id: sessionId 
    });
    return response.data;
  },

  getDocuments: async (forceRefresh = false) => {
    return cachedRequest('documents', async () => {
      const response = await apiClient.get('/documents');
      return response.data;
    }, forceRefresh);
  },

  deleteDocument: async (id: string) => {
    invalidateCache('documents');
    invalidateCache('dashboard');
    const response = await apiClient.delete(`/documents/${id}`);
    return response.data;
  },

  downloadDocumentUrl: (id: string) => {
    const currentUser = auth.currentUser;
    let uid = '';
    if (currentUser) {
      uid = currentUser.uid;
    } else {
      uid = localStorage.getItem('mock_user_uid') || '';
    }
    const authQuery = uid ? `?uid=${uid}` : '';
    return `${API_BASE_URL}/documents/${id}/download${authQuery}`;
  },

  reindexDocument: async (id: string) => {
    invalidateCache('documents');
    invalidateCache('dashboard');
    const response = await apiClient.post(`/documents/${id}/reindex`);
    return response.data;
  },

  resetDb: async () => {
    invalidateAllCache();
    const response = await apiClient.post('/clear-db');
    return response.data;
  },

  getHealth: async () => {
    const response = await apiClient.get('/health/database');
    return response.data;
  },

  getProfile: async (forceRefresh = false) => {
    return cachedRequest('profile', async () => {
      const response = await apiClient.get('/profile');
      return response.data;
    }, forceRefresh);
  },

  updateProfile: async (name?: string, email?: string, profilePicture?: string) => {
    invalidateCache('profile');
    const response = await apiClient.put('/profile', {
      name,
      email,
      profile_picture: profilePicture
    });
    return response.data;
  },

  getDashboard: async (forceRefresh = false) => {
    return cachedRequest('dashboard', async () => {
      const response = await apiClient.get('/dashboard');
      return response.data;
    }, forceRefresh);
  },

  // Search History
  getSearchHistory: async (
    filters?: { start_date?: string; end_date?: string; document_id?: string; query?: string },
    forceRefresh = false
  ) => {
    const cacheKey = `history_${JSON.stringify(filters || {})}`;
    return cachedRequest(cacheKey, async () => {
      const response = await apiClient.get('/history', { params: filters });
      return response.data;
    }, forceRefresh);
  },

  deleteSearchHistoryEntry: async (id: string) => {
    invalidateCache('history');
    const response = await apiClient.delete(`/history/${id}`);
    return response.data;
  },

  clearSearchHistory: async () => {
    invalidateCache('history');
    const response = await apiClient.delete('/history');
    return response.data;
  },

  // Chat Sessions CRUD
  getChatSessions: async (forceRefresh = false) => {
    return cachedRequest('chat-sessions', async () => {
      const response = await apiClient.get('/chat-sessions');
      return response.data;
    }, forceRefresh);
  },

  createChatSession: async (title?: string, documentIds?: string[]) => {
    invalidateCache('chat-sessions');
    invalidateCache('dashboard');
    const response = await apiClient.post('/chat-sessions', { 
      title: title || 'New Conversation', 
      document_ids: documentIds || [] 
    });
    return response.data;
  },

  deleteChatSession: async (sessionId: string) => {
    invalidateCache('chat-sessions');
    invalidateCache(`messages_${sessionId}`);
    invalidateCache('dashboard');
    const response = await apiClient.delete(`/chat-sessions/${sessionId}`);
    return response.data;
  },

  renameChatSession: async (sessionId: string, title: string) => {
    invalidateCache('chat-sessions');
    const response = await apiClient.put(`/chat-sessions/${sessionId}/rename`, { title });
    return response.data;
  },

  pinChatSession: async (sessionId: string, isPinned: boolean) => {
    invalidateCache('chat-sessions');
    const response = await apiClient.put(`/chat-sessions/${sessionId}/pin`, { is_pinned: isPinned });
    return response.data;
  },

  getSessionMessages: async (sessionId: string, forceRefresh = false) => {
    const cacheKey = `messages_${sessionId}`;
    return cachedRequest(cacheKey, async () => {
      const response = await apiClient.get(`/chat-sessions/${sessionId}/messages`);
      return response.data;
    }, forceRefresh);
  }
};

