import { z } from 'zod';

// User Roles & Statuses
export const USER_ROLES = ['MEMBER', 'COORDINATOR', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = [
  'PENDING_APPROVAL',
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

// Supported Sports & Extensibility
export const SUPPORTED_SPORTS = ['badminton'] as const;
export type SupportedSport = (typeof SUPPORTED_SPORTS)[number];

// Badminton Division Codes
export const BADMINTON_DIVISIONS = [
  'DIV_A',
  'DIV_B',
  'DIV_C',
  'MIXED',
] as const;
export type BadmintonDivision = (typeof BADMINTON_DIVISIONS)[number];

// Session Lifecycle
export const SESSION_STATUSES = [
  'DRAFT',
  'READY_FOR_REVIEW',
  'PUBLISHED',
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

// Match Scheduling & Execution Status
export const MATCH_STATUSES = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'WALKOVER',
  'CANCELLED',
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

// Availability Lifecycle
export const AVAILABILITY_STATUSES = [
  'AVAILABLE',
  'UNAVAILABLE',
  'STANDBY',
] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const SLOT_WINDOWS = ['SLOT_1_1800', 'SLOT_2_1930'] as const;
export type SlotWindow = (typeof SLOT_WINDOWS)[number];

// BWF Badminton Rules & Scoring Constants
export const BWF_RULES = {
  STANDARD_GAME_POINTS: 21,
  INTERVAL_POINTS: 11,
  SUDDEN_DEATH_CAP: 30,
  DEFAULT_BEST_OF_SETS: 3,
  DEFAULT_SHUTTLECOCK: 'Yonex Aerosensa AS-30',
} as const;

// -------------------------------------------------------------
// AUTHENTICATION CONTRACTS & SCHEMAS
// -------------------------------------------------------------

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address')
    .max(255, 'Email must not exceed 255 characters'),
  phone: z
    .string()
    .trim()
    .min(7, 'Phone number must be at least 7 characters')
    .max(20, 'Phone number must not exceed 20 characters')
    .regex(/^[+0-9\s-]+$/, 'Phone number must contain only numbers, +, -, and spaces')
    .optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const onboardSchema = z.object({
  userId: z.string().trim().min(1).max(128).optional(),
  phone: z
    .string()
    .trim()
    .min(7, 'Phone number must be at least 7 characters')
    .max(20, 'Phone number must not exceed 20 characters')
    .regex(/^[+0-9\s-]+$/, 'Phone number must contain only numbers, +, -, and spaces'),
  address: z
    .string()
    .trim()
    .min(3, 'Address or municipality in Qatar must be at least 3 characters')
    .max(255, 'Address must not exceed 255 characters'),
  divisionCode: z.enum(['DIV_A', 'DIV_B', 'DIV_C', 'MIXED']).optional(),
  preferredSlot: z.enum(['SLOT_1_1800', 'SLOT_2_1930', 'FLEXIBLE']).optional(),
});

export type OnboardInput = z.infer<typeof onboardSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
  nonce: z.string().optional(),
});

export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

export const googleLinkSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
  password: z.string().min(1, 'Password is required to link account').optional(),
});

export type GoogleLinkInput = z.infer<typeof googleLinkSchema>;

export const OAUTH_PROVIDERS = ['google'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export interface AuthUser {
  id: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  hasPassword?: boolean;
  isOnboarded?: boolean;
  providers?: OAuthProvider[];
}

export interface OnboardResponse {
  status: 'ok';
  message: string;
  user: AuthUser;
}

export interface AuthResponse {
  status: 'ok';
  message: string;
  user?: AuthUser;
}

export interface GoogleAuthResponse {
  status: 'ok' | 'pending';
  code?: 'ACCOUNT_PENDING_APPROVAL' | 'ACCOUNT_LINKING_REQUIRED';
  message: string;
  user?: AuthUser;
  email?: string;
}

export interface CurrentUserResponse {
  user: AuthUser;
}

export const adminRegistrationActionSchema = z.object({
  reason: z.string().trim().max(255).optional(),
});

export type AdminRegistrationActionInput = z.infer<typeof adminRegistrationActionSchema>;

// Health Check Response Interface
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  service: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
}

// Admin Console Metric & Management Types
export interface AdminOverviewCounts {
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
  total: number;
}

export interface AdminSportProfileItem {
  id: string;
  sportId?: string;
  divisionCode: string;
  skillRating?: string | null;
  preferredFlight?: string | null;
  matchesPlayed?: number;
  matchesWon?: number;
}

export interface AdminMemberItem {
  id: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  isOnboarded?: boolean;
  createdAt: string;
  updatedAt?: string;
  sportProfiles?: AdminSportProfileItem[];
}

