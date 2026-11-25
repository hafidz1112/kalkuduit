import { User, Need, Transaction, WeeklyPeriod } from '../types';

const TOKEN_KEY = 'kalkuduit_token';
const USER_KEY = 'kalkuduit_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null): void {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: 'Terjadi kesalahan pada server.' }));
    throw new Error(errorBody.error || `HTTP error ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const data = await fetchApi<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    setStoredUser(data.user);
    return data;
  },

  register: async (name: string, email: string, password: string) => {
    const data = await fetchApi<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setStoredToken(data.token);
    setStoredUser(data.user);
    return data;
  },

  me: async () => {
    return fetchApi<{ user: User }>('/auth/me');
  },

  logout: () => {
    setStoredToken(null);
    setStoredUser(null);
  },

  // Needs
  getNeeds: async () => {
    return fetchApi<Need[]>('/needs');
  },

  createNeed: async (need: Partial<Need>) => {
    return fetchApi<Need>('/needs', {
      method: 'POST',
      body: JSON.stringify(need),
    });
  },

  updateNeed: async (id: string, need: Partial<Need>) => {
    return fetchApi<Need>(`/needs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(need),
    });
  },

  deleteNeed: async (id: string) => {
    return fetchApi<{ success: boolean }>(`/needs/${id}`, {
      method: 'DELETE',
    });
  },

  // Transactions
  getTransactions: async (params?: { period_id?: string; need_id?: string; type?: string }) => {
    const query = new URLSearchParams();
    if (params?.period_id) query.set('period_id', params.period_id);
    if (params?.need_id) query.set('need_id', params.need_id);
    if (params?.type) query.set('type', params.type);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return fetchApi<Transaction[]>(`/transactions${queryString}`);
  },

  createTransaction: async (tx: Partial<Transaction>) => {
    return fetchApi<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(tx),
    });
  },

  updateTransaction: async (id: string, tx: Partial<Transaction>) => {
    return fetchApi<Transaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tx),
    });
  },

  deleteTransaction: async (id: string) => {
    return fetchApi<{ success: boolean }>(`/transactions/${id}`, {
      method: 'DELETE',
    });
  },

  // Periods
  getPeriods: async () => {
    return fetchApi<WeeklyPeriod[]>('/periods');
  },

  createPeriod: async (period: Partial<WeeklyPeriod>) => {
    return fetchApi<WeeklyPeriod>('/periods', {
      method: 'POST',
      body: JSON.stringify(period),
    });
  },

  updatePeriod: async (id: string, period: Partial<WeeklyPeriod>) => {
    return fetchApi<WeeklyPeriod>(`/periods/${id}`, {
      method: 'PUT',
      body: JSON.stringify(period),
    });
  },

  // Reset & Template
  resetData: async () => {
    return fetchApi<{ success: boolean; message: string }>('/user/reset', {
      method: 'POST',
    });
  },

  loadTemplate: async () => {
    return fetchApi<{ success: boolean; message: string; needs: Need[] }>('/user/load-template', {
      method: 'POST',
    });
  },
};
