import {
  RegisterInput,
  LoginInput,
  AuthUser,
  GoogleAuthInput,
  GoogleLinkInput,
  GoogleAuthResponse,
  OnboardInput,
  OnboardResponse,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiErrorResponse {
  statusCode?: number;
  error?: string;
  code?: string;
  message?: string;
  details?: Record<string, string[]>;
}

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  details?: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    code?: string,
    details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Essential for sending and receiving HTTP-only auth cookies
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const err = data as ApiErrorResponse | null;
    throw new ApiError(
      response.status,
      err?.message || 'An unexpected request error occurred.',
      err?.code,
      err?.details
    );
  }

  return data as T;
}

export const authApi = {
  async register(
    data: RegisterInput
  ): Promise<{ status: string; message: string; user?: AuthUser }> {
    return request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async onboard(data: OnboardInput): Promise<OnboardResponse> {
    return request('/api/v1/auth/onboard', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(
    data: LoginInput
  ): Promise<{ status: string; message: string; user: AuthUser }> {
    return request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async logout(): Promise<{ status: string; message: string }> {
    return request('/api/v1/auth/logout', {
      method: 'POST',
    });
  },

  async getMe(): Promise<{ user: AuthUser }> {
    return request('/api/v1/auth/me', {
      method: 'GET',
    });
  },

  async refresh(): Promise<{ status: string; user: AuthUser }> {
    return request('/api/v1/auth/refresh', {
      method: 'POST',
    });
  },

  async getGoogleConfig(): Promise<{ clientId: string; enabled: boolean }> {
    return request('/api/v1/auth/google/config', {
      method: 'GET',
    });
  },

  async googleAuth(data: GoogleAuthInput): Promise<GoogleAuthResponse> {
    return request('/api/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async googleLink(data: GoogleLinkInput): Promise<GoogleAuthResponse> {
    return request('/api/v1/auth/google/link', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export const adminApi = {
  async getPendingRegistrations(): Promise<{
    status: string;
    count: number;
    users: AuthUser[];
  }> {
    return request('/api/v1/admin/pending-registrations', {
      method: 'GET',
    });
  },

  async approveRegistration(
    id: string
  ): Promise<{ status: string; message: string; user: AuthUser }> {
    return request(`/api/v1/admin/registrations/${id}/approve`, {
      method: 'POST',
    });
  },

  async rejectRegistration(
    id: string,
    reason?: string
  ): Promise<{ status: string; message: string; user: Partial<AuthUser> }> {
    return request(`/api/v1/admin/registrations/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};
