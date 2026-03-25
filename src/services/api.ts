// API Service for Secure Sharded Document Vault
const API_BASE = '/api';

// Token management
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem('vault_token', token);
    else localStorage.removeItem('vault_token');
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('vault_token');
  }
  return authToken;
}

// API request helper
async function api<T>(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'Request failed' };
    // Unwrap nested data structure from server responses
    const data = json.data !== undefined ? json.data : json;
    return { success: true, data };
  } catch (e) {
    return { success: false, error: 'Network error' };
  }
}

// Auth API
export const authApi = {
  register: (email: string, password: string) =>
    api<{ token: string; user: { id: string; email: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then(r => { if (r.success && r.data?.token) setAuthToken(r.data.token); return r; }),

  login: (email: string, password: string) =>
    api<{ token: string; user: { id: string; email: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then(r => { if (r.success && r.data?.token) setAuthToken(r.data.token); return r; }),

  verify: () => api<{ id: string; email: string; files_count: number; total_storage: number }>('/auth/verify'),

  getProfile: () => api<{ id: string; email: string; files_count: number; total_storage: number }>('/auth/verify'),

  logout: () => { setAuthToken(null); },
};

// Files API
export const filesApi = {
  list: () => api<{ file_id: string; file_name: string; file_size: number; status: string; shards_count: number; created_at: string }[]>('/files/list'),
  
  getStats: () => api<{ totalFiles: number; totalSize: number; healthy: number; recovered: number; degraded: number; status_counts?: { healthy: number; recovered: number; degraded: number } }>('/files/stats'),
  
  upload: async (
    fileName: string,
    fileData: string,
    fileSize: number,
    encryptionPassword: string,
    onProgress?: (p: { stage: string; progress: number; message: string }) => void
  ) => {
    if (onProgress) onProgress({ stage: 'encrypting', progress: 20, message: 'Encrypting...' });
    
    const result = await api<{ file_id: string; file_name: string; file_size: number; status: string } & Record<string, unknown>>('/files/upload', {
      method: 'POST',
      body: JSON.stringify({ file_name: fileName, file_data: fileData, file_size: fileSize, encryption_password: encryptionPassword }),
    });
    
    if (onProgress) onProgress({ stage: result.success ? 'complete' : 'error', progress: result.success ? 100 : 0, message: result.success ? 'Done!' : (result.error || 'Failed') });
    return result;
  },
  
  download: (fileId: string, password: string) =>
    api<{ file_name: string; file_data: string; file_size: number; recovery_used: boolean }>(`/files/download/${fileId}?password=${encodeURIComponent(password)}`),
  
  delete: (fileId: string) =>
    api<void>(`/files/delete/${fileId}`, { method: 'DELETE' }),
};

// Cloud API
export const cloudApi = {
  getStatus: () => api<{ providers: { name: string; display_name: string; status: string; health?: string; file_count: number; storage_used: number }[] }>('/cloud/status'),
  
  simulateFailure: (provider: string, enable: boolean) =>
    api<{ message: string }>('/cloud/simulate-failure', {
      method: 'POST',
      body: JSON.stringify({ provider, enable }),
    }),
};

// Activity API
export const activityApi = {
  list: (limit = 50) => api<{ id: string; action: string; status: string; details: Record<string, unknown>; fileName?: string; created_at?: string; createdAt?: string }[]>(`/activity/list?limit=${limit}`),
};
