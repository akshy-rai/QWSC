import 'server-only';
import { prisma } from '../db';
import { BookingStatus, UserRole, Prisma } from '@prisma/client';
import type {
  CourtDto,
  TimeSlotDto,
  CourtAvailabilityResponse,
  BookingDto,
  CourtClosureDto,
} from '@/types';

// Club Policy Configuration for Qatar Wakra Sports Club
export const BOOKING_POLICY = {
  TIMEZONE: 'Asia/Qatar',
  UTC_OFFSET_HOURS: 3, // Qatar is UTC+3 with no daylight saving time
  DEFAULT_SLOT_MINUTES: 60,
  DEFAULT_OPEN_HOUR: 8,   // 08:00 Qatar time
  DEFAULT_CLOSE_HOUR: 23, // 23:00 Qatar time
  ADVANCE_BOOKING_HORIZON_DAYS: 14,
  CANCELLATION_CUTOFF_HOURS: 6, // 6 hours prior to start time
  MAX_ACTIVE_FUTURE_BOOKINGS: 3,
} as const;

export type CourtWithSport = {
  id: string;
  sportId: string;
  courtNumber: number;
  name: string;
  isOperational: boolean;
  createdAt?: Date | string;
  sport?: { slug: string; name: string } | null;
};

export type BookingWithCourtAndUser = {
  id: string;
  courtId: string;
  userId: string;
  startTime: Date | string;
  endTime: Date | string;
  status: BookingStatus;
  notes?: string | null;
  cancelledAt?: Date | string | null;
  cancelledByUserId?: string | null;
  cancellationReason?: string | null;
  createdAt?: Date | string;
  court?: { name: string; courtNumber: number; sport?: { name: string; slug: string } | null } | null;
  user?: { fullName: string; email: string } | null;
};

/**
 * Converts a UTC Date object to Qatar local calendar components
 */
export function toQatarTime(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dayOfWeek: number;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
} {
  const qatarTimeMs = date.getTime() + BOOKING_POLICY.UTC_OFFSET_HOURS * 3600 * 1000;
  const d = new Date(qatarTimeMs);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const hour = d.getUTCHours();
  const minute = d.getUTCMinutes();
  const dayOfWeek = d.getUTCDay();

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return { year, month, day, hour, minute, dayOfWeek, dateStr, timeStr };
}

/**
 * Creates a UTC Date from a Qatar local date string "YYYY-MM-DD" and hour/minute
 */
export function qatarTimeToUtc(dateStr: string, hour: number, minute: number = 0): Date {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  // Qatar is UTC+3, so UTC hour = Qatar hour - 3
  return new Date(Date.UTC(year, month, day, hour - BOOKING_POLICY.UTC_OFFSET_HOURS, minute, 0));
}

/**
 * Format a database Court row into a CourtDto
 */
export function formatCourtDto(court: CourtWithSport): CourtDto {
  return {
    id: court.id,
    sportId: court.sportId,
    sportSlug: court.sport?.slug || 'badminton',
    sportName: court.sport?.name || 'Badminton',
    courtNumber: court.courtNumber,
    name: court.name,
    isOperational: court.isOperational,
    createdAt: court.createdAt ? new Date(court.createdAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Format a database CourtBooking row into a BookingDto
 */
export function formatBookingDto(
  b: BookingWithCourtAndUser,
  currentUserId?: string,
  userRole?: UserRole
): BookingDto {
  const now = new Date();
  const startTime = new Date(b.startTime);
  const canCancel =
    b.status === 'CONFIRMED' &&
    (userRole === 'ADMIN' ||
      userRole === 'COORDINATOR' ||
      (b.userId === currentUserId &&
        startTime.getTime() - now.getTime() >= BOOKING_POLICY.CANCELLATION_CUTOFF_HOURS * 3600 * 1000));

  return {
    id: b.id,
    courtId: b.courtId,
    courtName: b.court?.name || 'Court',
    courtNumber: b.court?.courtNumber || 1,
    sportName: b.court?.sport?.name || 'Badminton',
    sportSlug: b.court?.sport?.slug || 'badminton',
    userId: b.userId,
    userName: b.user?.fullName || 'Member',
    userEmail: b.user?.email || '',
    startTime: startTime.toISOString(),
    endTime: new Date(b.endTime).toISOString(),
    status: b.status,
    notes: b.notes,
    cancelledAt: b.cancelledAt ? new Date(b.cancelledAt).toISOString() : null,
    cancelledByUserId: b.cancelledByUserId,
    cancellationReason: b.cancellationReason,
    canCancel,
    createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * List all operational courts for a sport
 */
export async function getBookableCourts(sportSlug: string = 'badminton'): Promise<CourtDto[]> {
  const courts = await prisma.court.findMany({
    where: {
      sport: { slug: sportSlug },
      isOperational: true,
    },
    include: { sport: true },
    orderBy: { courtNumber: 'asc' },
  });

  return courts.map(formatCourtDto);
}

/**
 * List all courts (admin view, operational and non-operational)
 */
export async function getAllCourtsAdmin(sportSlug?: string): Promise<CourtDto[]> {
  const where: Prisma.CourtWhereInput = {};
  if (sportSlug) {
    where.sport = { slug: sportSlug };
  }

  const courts = await prisma.court.findMany({
    where,
    include: { sport: true },
    orderBy: { courtNumber: 'asc' },
  });

  return courts.map(formatCourtDto);
}

/**
 * Calculate court availability for a specific Qatar date
 */
export async function getCourtAvailability(
  courtId: string,
  dateStr: string,
  currentUserId?: string
): Promise<CourtAvailabilityResponse | { error: string }> {
  // Validate dateStr format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { error: 'INVALID_DATE_FORMAT' };
  }

  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: { sport: true },
  });

  if (!court) {
    return { error: 'COURT_NOT_FOUND' };
  }

  if (!court.isOperational) {
    return { error: 'COURT_NOT_OPERATIONAL' };
  }

  // Determine day of week in Qatar local time
  const dayStartUtc = qatarTimeToUtc(dateStr, 0, 0);
  const dayEndUtc = qatarTimeToUtc(dateStr, 24, 0);
  const qatarDayOfWeek = toQatarTime(dayStartUtc).dayOfWeek;

  // Check if a custom schedule exists for this court/day
  const schedule = await prisma.courtSchedule.findFirst({
    where: {
      isActive: true,
      dayOfWeek: qatarDayOfWeek,
      OR: [{ courtId: court.id }, { courtId: null, sportId: court.sportId }],
    },
    orderBy: { courtId: 'asc' }, // specific court schedule takes priority
  });

  let openHour: number = BOOKING_POLICY.DEFAULT_OPEN_HOUR;
  let closeHour: number = BOOKING_POLICY.DEFAULT_CLOSE_HOUR;
  let slotMinutes: number = BOOKING_POLICY.DEFAULT_SLOT_MINUTES;

  if (schedule) {
    const [openH] = schedule.openTime.split(':').map(Number);
    const [closeH] = schedule.closeTime.split(':').map(Number);
    if (!isNaN(openH)) openHour = openH;
    if (!isNaN(closeH)) closeHour = closeH;
    if (schedule.slotMinutes > 0) slotMinutes = schedule.slotMinutes;
  }

  // Fetch closures overlapping this day
  const closures = await prisma.courtClosure.findMany({
    where: {
      OR: [{ courtId: court.id }, { courtId: null, sportId: court.sportId }],
      startTime: { lt: dayEndUtc },
      endTime: { gt: dayStartUtc },
    },
  });

  // Fetch confirmed bookings overlapping this day
  const bookings = await prisma.courtBooking.findMany({
    where: {
      courtId: court.id,
      status: 'CONFIRMED',
      startTime: { lt: dayEndUtc },
      endTime: { gt: dayStartUtc },
    },
    include: { user: true },
  });

  const now = new Date();
  const slots: TimeSlotDto[] = [];

  // Generate slots from openHour to closeHour
  let currentHour: number = openHour;
  let currentMin: number = 0;

  while (currentHour + currentMin / 60 + slotMinutes / 60 <= closeHour + 0.001) {
    const slotStartUtc = qatarTimeToUtc(dateStr, currentHour, currentMin);
    const nextTotalMin = currentHour * 60 + currentMin + slotMinutes;
    const nextH = Math.floor(nextTotalMin / 60);
    const nextM = nextTotalMin % 60;
    const slotEndUtc = qatarTimeToUtc(dateStr, nextH, nextM);

    const displayStartTime = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
    const displayEndTime = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;

    let isAvailable = true;
    let unavailabilityReason: TimeSlotDto['unavailabilityReason'] = undefined;
    let existingBookingId: string | undefined = undefined;
    let isMyBooking = false;

    // Check past time
    if (slotStartUtc.getTime() <= now.getTime()) {
      isAvailable = false;
      unavailabilityReason = 'PAST_TIME';
    }

    // Check closures [slotStartUtc, slotEndUtc)
    if (isAvailable) {
      const closureMatch = closures.find(
        (c) => c.startTime.getTime() < slotEndUtc.getTime() && c.endTime.getTime() > slotStartUtc.getTime()
      );
      if (closureMatch) {
        isAvailable = false;
        unavailabilityReason = 'MAINTENANCE_CLOSURE';
      }
    }

    // Check bookings [slotStartUtc, slotEndUtc)
    const bookingMatch = bookings.find(
      (b) => b.startTime.getTime() < slotEndUtc.getTime() && b.endTime.getTime() > slotStartUtc.getTime()
    );
    if (bookingMatch) {
      isAvailable = false;
      unavailabilityReason = 'BOOKED';
      existingBookingId = bookingMatch.id;
      if (currentUserId && bookingMatch.userId === currentUserId) {
        isMyBooking = true;
      }
    }

    slots.push({
      startTime: slotStartUtc.toISOString(),
      endTime: slotEndUtc.toISOString(),
      displayStartTime,
      displayEndTime,
      isAvailable,
      unavailabilityReason,
      existingBookingId,
      isMyBooking,
    });

    currentHour = nextH;
    currentMin = nextM;
  }

  return {
    date: dateStr,
    court: formatCourtDto(court),
    slots,
  };
}

/**
 * Concurrency-safe court booking creation
 */
export async function createCourtBooking(input: {
  courtId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
  ipAddress?: string | null;
}) {
  const { courtId, userId, startTime, endTime, notes, ipAddress } = input;
  const now = new Date();

  // 1. Validate time ordering
  if (startTime.getTime() >= endTime.getTime()) {
    return { error: 'INVALID_TIME_RANGE' as const };
  }

  // 2. Cannot book in the past
  if (startTime.getTime() <= now.getTime()) {
    return { error: 'CANNOT_BOOK_IN_PAST' as const };
  }

  // 3. Slot duration check (60 or 90 minutes)
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000));
  if (durationMinutes !== 60 && durationMinutes !== 90) {
    return { error: 'INVALID_SLOT_DURATION' as const };
  }

  // 4. Advance booking horizon check
  const maxHorizonMs = BOOKING_POLICY.ADVANCE_BOOKING_HORIZON_DAYS * 24 * 3600 * 1000;
  if (startTime.getTime() - now.getTime() > maxHorizonMs) {
    return { error: 'EXCEEDS_ADVANCE_HORIZON' as const };
  }

  // 5. Check user account eligibility (ACTIVE status required)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, fullName: true, email: true },
  });

  if (!user || user.status !== 'ACTIVE') {
    return { error: 'MEMBER_NOT_ELIGIBLE' as const };
  }

  // 6. Active booking limits per member
  const activeBookingsCount = await prisma.courtBooking.count({
    where: {
      userId,
      status: 'CONFIRMED',
      endTime: { gt: now },
    },
  });

  if (activeBookingsCount >= BOOKING_POLICY.MAX_ACTIVE_FUTURE_BOOKINGS) {
    return { error: 'MAX_BOOKINGS_LIMIT_REACHED' as const };
  }

  // 7. Transactional creation with database exclusion protection
  try {
    const booking = await prisma.$transaction(async (tx) => {
      // Re-verify court status
      const court = await tx.court.findUnique({
        where: { id: courtId },
        include: { sport: true },
      });

      if (!court || !court.isOperational) {
        throw new Error('COURT_NOT_AVAILABLE');
      }

      // Re-verify closures
      const closureConflict = await tx.courtClosure.findFirst({
        where: {
          OR: [{ courtId: court.id }, { courtId: null, sportId: court.sportId }],
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (closureConflict) {
        throw new Error('COURT_CLOSED');
      }

      // Re-verify court booking conflict
      const courtConflict = await tx.courtBooking.findFirst({
        where: {
          courtId: court.id,
          status: 'CONFIRMED',
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (courtConflict) {
        throw new Error('SLOT_ALREADY_BOOKED');
      }

      // Re-verify user overlapping booking
      const userConflict = await tx.courtBooking.findFirst({
        where: {
          userId,
          status: 'CONFIRMED',
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (userConflict) {
        throw new Error('USER_ALREADY_BOOKED_AT_THIS_TIME');
      }

      // Create confirmed booking
      const created = await tx.courtBooking.create({
        data: {
          courtId: court.id,
          userId,
          startTime,
          endTime,
          notes,
          status: 'CONFIRMED',
        },
        include: {
          court: { include: { sport: true } },
          user: true,
        },
      });

      // Write immutable audit log
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'COURT_BOOKING_CREATED',
          entityType: 'court_bookings',
          entityId: created.id,
          afterState: {
            courtId: court.id,
            courtName: court.name,
            courtNumber: court.courtNumber,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            status: 'CONFIRMED',
          },
          ipAddress,
        },
      });

      return created;
    });

    return { booking: formatBookingDto(booking, userId) };
  } catch (err: unknown) {
    const errorObj = err as Record<string, unknown> | null;
    const message = err instanceof Error ? err.message : '';
    const code = errorObj && typeof errorObj.code === 'string' ? errorObj.code : '';

    if (message === 'COURT_NOT_AVAILABLE') return { error: 'COURT_NOT_AVAILABLE' as const };
    if (message === 'COURT_CLOSED') return { error: 'COURT_CLOSED' as const };
    if (message === 'SLOT_ALREADY_BOOKED') return { error: 'SLOT_ALREADY_BOOKED' as const };
    if (message === 'USER_ALREADY_BOOKED_AT_THIS_TIME')
      return { error: 'USER_ALREADY_BOOKED_AT_THIS_TIME' as const };

    // Catch PostgreSQL exclusion constraint error 23P01
    if (code === '23P01' || message.includes('no_overlapping_court_bookings')) {
      return { error: 'SLOT_ALREADY_BOOKED' as const };
    }
    if (message.includes('no_overlapping_user_bookings')) {
      return { error: 'USER_ALREADY_BOOKED_AT_THIS_TIME' as const };
    }

    throw err;
  }
}

/**
 * Cancel a court booking (preserves history, soft cancellation)
 */
export async function cancelCourtBooking(input: {
  bookingId: string;
  actorId: string;
  actorRole: UserRole;
  reason?: string;
  ipAddress?: string | null;
}) {
  const { bookingId, actorId, actorRole, reason, ipAddress } = input;

  const booking = await prisma.courtBooking.findUnique({
    where: { id: bookingId },
    include: {
      court: { include: { sport: true } },
      user: true,
    },
  });

  if (!booking) {
    return { error: 'NOT_FOUND' as const };
  }

  if (booking.status === 'CANCELLED') {
    return { error: 'ALREADY_CANCELLED' as const };
  }

  const isAdminOrCoord = actorRole === 'ADMIN' || actorRole === 'COORDINATOR';

  // Authorization check: member can only cancel their own booking
  if (!isAdminOrCoord && booking.userId !== actorId) {
    return { error: 'UNAUTHORIZED' as const };
  }

  const now = new Date();
  const cutoffMs = BOOKING_POLICY.CANCELLATION_CUTOFF_HOURS * 3600 * 1000;

  // Deadline check for regular members
  if (!isAdminOrCoord && booking.startTime.getTime() - now.getTime() < cutoffMs) {
    return { error: 'CANCELLATION_DEADLINE_PASSED' as const };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.courtBooking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        cancelledByUserId: actorId,
        cancellationReason:
          reason || (isAdminOrCoord ? 'Administrative cancellation' : 'Cancelled by member'),
      },
      include: {
        court: { include: { sport: true } },
        user: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: actorId,
        action: isAdminOrCoord ? 'ADMIN_CANCELLED_BOOKING' : 'MEMBER_CANCELLED_BOOKING',
        entityType: 'court_bookings',
        entityId: booking.id,
        beforeState: { status: 'CONFIRMED' },
        afterState: {
          status: 'CANCELLED',
          cancelledAt: now.toISOString(),
          cancelledByUserId: actorId,
          cancellationReason: res.cancellationReason,
        },
        ipAddress,
      },
    });

    return res;
  });

  return { booking: formatBookingDto(updated, actorId, actorRole) };
}

/**
 * Get bookings for the currently authenticated member
 */
export async function getUserCourtBookings(userId: string): Promise<BookingDto[]> {
  const bookings = await prisma.courtBooking.findMany({
    where: { userId },
    include: {
      court: { include: { sport: true } },
      user: true,
    },
    orderBy: { startTime: 'desc' },
  });

  return bookings.map((b) => formatBookingDto(b, userId, 'MEMBER'));
}

/**
 * Filter and paginate bookings for Admin Console
 */
export async function getAdminCourtBookings(options: {
  date?: string;
  courtId?: string;
  status?: BookingStatus | 'ALL';
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = options.page && options.page > 0 ? options.page : 1;
  const limit = options.limit && options.limit > 0 ? options.limit : 15;
  const skip = (page - 1) * limit;

  const where: Prisma.CourtBookingWhereInput = {};

  if (options.status && options.status !== 'ALL') {
    where.status = options.status;
  }

  if (options.courtId) {
    where.courtId = options.courtId;
  }

  if (options.date && /^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    const dayStartUtc = qatarTimeToUtc(options.date, 0, 0);
    const dayEndUtc = qatarTimeToUtc(options.date, 24, 0);
    where.startTime = { gte: dayStartUtc, lt: dayEndUtc };
  }

  if (options.search && options.search.trim()) {
    const q = options.search.trim();
    where.OR = [
      { user: { fullName: { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
      { court: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [total, bookings] = await Promise.all([
    prisma.courtBooking.count({ where }),
    prisma.courtBooking.findMany({
      where,
      include: {
        court: { include: { sport: true } },
        user: true,
      },
      orderBy: { startTime: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return {
    bookings: bookings.map((b) => formatBookingDto(b, undefined, 'ADMIN')),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Admin: Update court details (e.g. name or operational status)
 */
export async function adminUpdateCourt(
  courtId: string,
  data: { name?: string; isOperational?: boolean },
  actorId: string,
  ipAddress?: string | null
) {
  const court = await prisma.court.findUnique({ where: { id: courtId } });
  if (!court) return { error: 'NOT_FOUND' as const };

  if (data.isOperational === false && court.isOperational) {
    const futureBookingsCount = await prisma.courtBooking.count({
      where: {
        courtId,
        status: 'CONFIRMED',
        endTime: { gt: new Date() },
      },
    });

    if (futureBookingsCount > 0) {
      return {
        error: 'COURT_HAS_ACTIVE_BOOKINGS' as const,
        activeBookingsCount: futureBookingsCount,
      };
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.court.update({
      where: { id: courtId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(typeof data.isOperational === 'boolean' ? { isOperational: data.isOperational } : {}),
      },
      include: { sport: true },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: actorId,
        action: 'ADMIN_UPDATED_COURT',
        entityType: 'courts',
        entityId: courtId,
        beforeState: { name: court.name, isOperational: court.isOperational },
        afterState: { name: c.name, isOperational: c.isOperational },
        ipAddress,
      },
    });

    return c;
  });

  return { court: formatCourtDto(updated) };
}

/**
 * Admin: Create a court closure / maintenance block
 */
export async function adminCreateCourtClosure(input: {
  courtId?: string | null;
  sportId?: string | null;
  reason: string;
  startTime: Date;
  endTime: Date;
  actorId: string;
  ipAddress?: string | null;
}) {
  if (input.startTime.getTime() >= input.endTime.getTime()) {
    return { error: 'INVALID_TIME_RANGE' as const };
  }

  // Check conflicting confirmed bookings
  const whereBookings: Prisma.CourtBookingWhereInput = {
    status: 'CONFIRMED',
    startTime: { lt: input.endTime },
    endTime: { gt: input.startTime },
  };

  if (input.courtId) {
    whereBookings.courtId = input.courtId;
  } else if (input.sportId) {
    whereBookings.court = { sportId: input.sportId };
  }

  const conflictingBookings = await prisma.courtBooking.findMany({
    where: whereBookings,
    include: {
      court: { include: { sport: true } },
      user: true,
    },
  });

  if (conflictingBookings.length > 0) {
    return {
      error: 'CLOSURE_CONFLICTS_WITH_EXISTING_BOOKINGS' as const,
      conflicts: conflictingBookings.map((b) => formatBookingDto(b, undefined, 'ADMIN')),
    };
  }

  const closure = await prisma.$transaction(async (tx) => {
    const cl = await tx.courtClosure.create({
      data: {
        courtId: input.courtId || null,
        sportId: input.sportId || null,
        reason: input.reason,
        startTime: input.startTime,
        endTime: input.endTime,
        createdByUserId: input.actorId,
      },
      include: {
        court: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorId,
        action: 'ADMIN_CREATED_COURT_CLOSURE',
        entityType: 'court_closures',
        entityId: cl.id,
        afterState: {
          courtId: cl.courtId,
          reason: cl.reason,
          startTime: cl.startTime.toISOString(),
          endTime: cl.endTime.toISOString(),
        },
        ipAddress: input.ipAddress,
      },
    });

    return cl;
  });

  return {
    closure: {
      id: closure.id,
      courtId: closure.courtId,
      courtName: closure.court?.name || 'All Courts',
      sportId: closure.sportId,
      reason: closure.reason,
      startTime: closure.startTime.toISOString(),
      endTime: closure.endTime.toISOString(),
      createdAt: closure.createdAt.toISOString(),
    } as CourtClosureDto,
  };
}

/**
 * Admin: List active and upcoming court closures
 */
export async function getCourtClosures(courtId?: string): Promise<CourtClosureDto[]> {
  const where: Prisma.CourtClosureWhereInput = {};
  if (courtId) {
    where.OR = [{ courtId }, { courtId: null }];
  }

  const closures = await prisma.courtClosure.findMany({
    where,
    include: { court: true },
    orderBy: { startTime: 'desc' },
  });

  return closures.map((c) => ({
    id: c.id,
    courtId: c.courtId,
    courtName: c.court?.name || 'All Courts',
    sportId: c.sportId,
    reason: c.reason,
    startTime: c.startTime.toISOString(),
    endTime: c.endTime.toISOString(),
    createdAt: c.createdAt.toISOString(),
  }));
}

/**
 * Admin: Delete a court closure
 */
export async function adminDeleteCourtClosure(
  closureId: string,
  actorId: string,
  ipAddress?: string | null
) {
  const closure = await prisma.courtClosure.findUnique({
    where: { id: closureId },
  });

  if (!closure) {
    return { error: 'NOT_FOUND' as const };
  }

  await prisma.$transaction(async (tx) => {
    await tx.courtClosure.delete({
      where: { id: closureId },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: actorId,
        action: 'ADMIN_DELETED_COURT_CLOSURE',
        entityType: 'court_closures',
        entityId: closureId,
        beforeState: {
          courtId: closure.courtId,
          reason: closure.reason,
          startTime: closure.startTime.toISOString(),
          endTime: closure.endTime.toISOString(),
        },
        ipAddress,
      },
    });
  });

  return { success: true };
}
