import {
  RegisterInput,
  LoginInput,
  AuthUser,
  GoogleAuthInput,
  GoogleLinkInput,
  GoogleAuthResponse,
  OnboardInput,
  OnboardResponse,
  AdminOverviewCounts,
  AdminMemberItem,
  UserStatus,
  CourtDto,
  TimeSlotDto,
  BookingDto,
  BookingStatus,
  CreateBookingInput,
  AdminCourtUpdateInput,
  AdminCreateClosureInput,
  CourtClosureDto,
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

  async getOverviewCounts(): Promise<{ status: string; counts: AdminOverviewCounts }> {
    return request('/api/v1/admin/overview', {
      method: 'GET',
    });
  },

  async getMembers(params?: {
    status?: UserStatus | 'ALL';
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    status: string;
    members: AdminMemberItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return request(`/api/v1/admin/members${query ? `?${query}` : ''}`, {
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

  async getAdminCourts(sport?: string): Promise<{ status: string; courts: CourtDto[] }> {
    const query = sport ? `?sport=${encodeURIComponent(sport)}` : '';
    return request(`/api/v1/admin/courts${query}`, { method: 'GET' });
  },

  async updateCourt(
    courtId: string,
    data: AdminCourtUpdateInput
  ): Promise<{ status: string; message: string; court: CourtDto }> {
    return request(`/api/v1/admin/courts/${courtId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getAdminBookings(params?: {
    date?: string;
    courtId?: string;
    status?: BookingStatus | 'ALL';
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    status: string;
    bookings: BookingDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params?.date) searchParams.set('date', params.date);
    if (params?.courtId) searchParams.set('courtId', params.courtId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return request(`/api/v1/admin/bookings${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  async adminCancelBooking(
    bookingId: string,
    reason?: string
  ): Promise<{ status: string; message: string; booking: BookingDto }> {
    return request(`/api/v1/admin/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async getClosures(courtId?: string): Promise<{ status: string; closures: CourtClosureDto[] }> {
    const query = courtId ? `?courtId=${encodeURIComponent(courtId)}` : '';
    return request(`/api/v1/admin/courts/closures${query}`, { method: 'GET' });
  },

  async createClosure(
    data: AdminCreateClosureInput
  ): Promise<{ status: string; message: string; closure: CourtClosureDto }> {
    return request('/api/v1/admin/courts/closures', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteClosure(closureId: string): Promise<{ status: string; message: string }> {
    return request(`/api/v1/admin/courts/closures/${closureId}`, {
      method: 'DELETE',
    });
  },
};

export const bookingApi = {
  async getCourts(sport: string = 'badminton'): Promise<{ status: string; courts: CourtDto[] }> {
    return request(`/api/v1/courts?sport=${encodeURIComponent(sport)}`, { method: 'GET' });
  },

  async getAvailability(
    courtId: string,
    date: string
  ): Promise<{
    status: string;
    date: string;
    court: CourtDto;
    slots: TimeSlotDto[];
  }> {
    return request(
      `/api/v1/bookings/availability?courtId=${encodeURIComponent(courtId)}&date=${encodeURIComponent(
        date
      )}`,
      { method: 'GET' }
    );
  },

  async createBooking(
    data: CreateBookingInput
  ): Promise<{ status: string; message: string; booking: BookingDto }> {
    return request('/api/v1/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMyBookings(): Promise<{ status: string; bookings: BookingDto[] }> {
    return request('/api/v1/bookings/me', { method: 'GET' });
  },

  async cancelBooking(
    bookingId: string,
    reason?: string
  ): Promise<{ status: string; message: string; booking: BookingDto }> {
    return request(`/api/v1/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};

