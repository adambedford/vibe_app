import { useAuthStore } from '@/stores/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

type RequestOptions = {
  method?: string;
  body?: any;
  auth?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) return request(path, options);
    useAuthStore.getState().logout();
    throw new Error('Unauthorized');
  }

  if (res.status === 204) return {} as T;

  const json = await res.json();
  if (!res.ok) throw new ApiError(json.error?.code || 'error', json.error?.message || 'Request failed', res.status);

  return json;
}

async function refreshToken(): Promise<boolean> {
  const { refreshToken: token, setTokens } = useAuthStore.getState();
  if (!token) return false;

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: token }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    setTokens(json.data.access_token, json.data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Auth
export const auth = {
  register: (params: { email: string; password: string; display_name: string; username: string; date_of_birth: string }) =>
    request<any>('/api/v1/auth/register', { method: 'POST', body: params, auth: false }),
  login: (email: string, password: string) =>
    request<any>('/api/v1/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  logout: () => request<any>('/api/v1/auth/logout', { method: 'DELETE' }),
};

// Current user
export const me = {
  get: () => request<any>('/api/v1/me'),
  update: (params: { display_name?: string; username?: string; bio?: string }) =>
    request<any>('/api/v1/me', { method: 'PATCH', body: params }),
  creations: () => request<any>('/api/v1/me/creations'),
};

// Users
export const users = {
  get: (id: number) => request<any>(`/api/v1/users/${id}`, { auth: false }),
  apps: (id: number, cursor?: string) =>
    request<any>(`/api/v1/users/${id}/apps${cursor ? `?cursor=${cursor}` : ''}`, { auth: false }),
  followers: (id: number) => request<any>(`/api/v1/users/${id}/followers`, { auth: false }),
  following: (id: number) => request<any>(`/api/v1/users/${id}/following`, { auth: false }),
  follow: (id: number) => request<any>(`/api/v1/users/${id}/follow`, { method: 'POST' }),
  unfollow: (id: number) => request<any>(`/api/v1/users/${id}/follow`, { method: 'DELETE' }),
};

// Feed
export const feed = {
  home: (cursor?: string) => request<any>(`/api/v1/feed${cursor ? `?cursor=${cursor}` : ''}`),
  explore: (cursor?: string) => request<any>(`/api/v1/feed/explore${cursor ? `?cursor=${cursor}` : ''}`),
  following: (cursor?: string) => request<any>(`/api/v1/feed/following${cursor ? `?cursor=${cursor}` : ''}`),
};

// Apps
export const apps = {
  get: (id: number) => request<any>(`/api/v1/apps/${id}`, { auth: false }),
  like: (id: number) => request<any>(`/api/v1/apps/${id}/like`, { method: 'POST' }),
  unlike: (id: number) => request<any>(`/api/v1/apps/${id}/like`, { method: 'DELETE' }),
  comment: (id: number, body: string, parentId?: number) =>
    request<any>(`/api/v1/apps/${id}/comments`, { method: 'POST', body: { body, parent_id: parentId } }),
  comments: (id: number) => request<any>(`/api/v1/apps/${id}/comments`, { auth: false }),
  save: (id: number) => request<any>(`/api/v1/apps/${id}/save`, { method: 'POST' }),
  unsave: (id: number) => request<any>(`/api/v1/apps/${id}/save`, { method: 'DELETE' }),
  play: (id: number, durationSeconds: number) =>
    request<any>(`/api/v1/apps/${id}/play`, { method: 'POST', body: { duration_seconds: durationSeconds } }),
  remix: (id: number) => request<any>(`/api/v1/apps/${id}/remix`, { method: 'POST' }),
  lineage: (id: number) => request<any>(`/api/v1/apps/${id}/lineage`, { auth: false }),
  report: (id: number, reason: string) =>
    request<any>(`/api/v1/apps/${id}/report`, { method: 'POST', body: { reason } }),
};

// Creation
export type CreateParams = {
  prompt?: string;
  source_app_id?: number;
  category?: string;
  visual_theme?: string;
  content_theme?: string;
  details?: string;
  wizard_version?: number;
};

export const creation = {
  create: (params: CreateParams) =>
    request<any>('/api/v1/create/sessions', { method: 'POST', body: params }),
  get: (id: number) => request<any>(`/api/v1/create/sessions/${id}`),
  message: (id: number, content: string) =>
    request<any>(`/api/v1/create/sessions/${id}/message`, { method: 'POST', body: { content } }),
  approve: (id: number, modifications?: string) =>
    request<any>(`/api/v1/create/sessions/${id}/approve`, { method: 'POST', body: { modifications } }),
  publish: (id: number) =>
    request<any>(`/api/v1/create/sessions/${id}/publish`, { method: 'POST' }),
};

// Notifications
export const notifications = {
  list: (cursor?: string) => request<any>(`/api/v1/notifications${cursor ? `?cursor=${cursor}` : ''}`),
  read: (id: number) => request<any>(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }),
  readAll: () => request<any>('/api/v1/notifications/read_all', { method: 'POST' }),
};
