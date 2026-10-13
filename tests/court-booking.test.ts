process.env.NODE_ENV = 'test';

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { signAccessToken } from '@/server/auth/session';
import { ACCESS_TOKEN_COOKIE } from '@/server/auth/cookies';
import { proxy } from '@/proxy';

// Route Handlers under test
import { GET as getCourtsRoute } from '@/app/api/v1/courts/route';
import { GET as getAvailabilityRoute } from '@/app/api/v1/bookings/availability/route';
import { GET as getBookingsRoute, POST as createBookingRoute } from '@/app/api/v1/bookings/route';
import { GET as getMyBookingsRoute } from '@/app/api/v1/bookings/me/route';
import { POST as cancelBookingRoute } from '@/app/api/v1/bookings/[id]/cancel/route';
import { GET as getAdminBookingsRoute } from '@/app/api/v1/admin/bookings/route';
import { POST as adminCancelBookingRoute } from '@/app/api/v1/admin/bookings/[id]/cancel/route';
import { GET as getAdminCourtsRoute } from '@/app/api/v1/admin/courts/route';
import { PATCH as updateCourtRoute } from '@/app/api/v1/admin/courts/[id]/route';
import {
  GET as getClosuresRoute,
  POST as createClosureRoute,
} from '@/app/api/v1/admin/courts/closures/route';
import { DELETE as deleteClosureRoute } from '@/app/api/v1/admin/courts/closures/[id]/route';

// Domain Service & helpers
import {
  createCourtBooking,
  cancelCourtBooking,
  getCourtAvailability,
  toQatarTime,
  qatarTimeToUtc,
  BOOKING_POLICY,
} from '@/server/bookings';

describe('QWSC Court Booking System — End-to-End Test Suite', () => {
  // In-memory mock database store for deterministic fast tests
  const mockUsers: Map<string, any> = new Map();
  const mockCourts: Map<string, any> = new Map();
  const mockSports: Map<string, any> = new Map();
  const mockBookings: Map<string, any> = new Map();
  const mockClosures: Map<string, any> = new Map();
  const mockSchedules: Map<string, any> = new Map();
  const mockAuditLogs: any[] = [];

  // Seed fixed fixtures
  const SPORT_ID = '6fa2ca98-7492-450d-9d34-f5e45e693ce4';
  const COURT_1_ID = 'cc98d476-8c7b-4167-818f-2ded7f246bb5';
  const COURT_2_ID = '387fa158-661c-4daa-9538-a21b7f4936e0';

  const ACTIVE_MEMBER_1 = {
    id: 'user-active-member-1',
    email: 'member1@qwsc.org',
    fullName: 'Jassim Al-Kuwari',
    role: 'MEMBER',
    status: 'ACTIVE',
  };

  const ACTIVE_MEMBER_2 = {
    id: 'user-active-member-2',
    email: 'member2@qwsc.org',
    fullName: 'Fatima Al-Thani',
    role: 'MEMBER',
    status: 'ACTIVE',
  };

  const PENDING_MEMBER = {
    id: 'user-pending-member',
    email: 'pending@qwsc.org',
    fullName: 'Tariq Mahmoud',
    role: 'MEMBER',
    status: 'PENDING_APPROVAL',
  };

  const ADMIN_USER = {
    id: 'user-admin-main',
    email: 'admin@qwsc.org',
    fullName: 'Club Director',
    role: 'ADMIN',
    status: 'ACTIVE',
  };

  // Helper to generate auth headers with signed tokens
  const authHeaders = async (user: { id: string; role: string; status: string }) => {
    const token = await signAccessToken({
      sub: user.id,
      email: `${user.id}@qwsc.org`,
      role: user.role as any,
      status: user.status as any,
    });
    return {
      cookie: `${ACCESS_TOKEN_COOKIE}=${token}`,
    };
  };

  // Request dispatcher
  const dispatch = async (options: {
    method?: string;
    url: string;
    payload?: any;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
  }) => {
    const method = (options.method || 'GET').toUpperCase();
    const url = options.url;
    const fullUrl = `http://localhost:3000${url}`;

    const reqHeaders = new Headers();
    reqHeaders.set('host', 'localhost:3000');

    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        reqHeaders.set(k, v);
      }
    }

    const cookiePairs: string[] = [];
    if (options.cookies) {
      for (const [k, v] of Object.entries(options.cookies)) {
        cookiePairs.push(`${k}=${v}`);
      }
    }
    if (cookiePairs.length > 0) {
      reqHeaders.set('cookie', cookiePairs.join('; '));
    }

    let bodyStr: string | undefined = undefined;
    if (options.payload !== undefined) {
      bodyStr = JSON.stringify(options.payload);
      reqHeaders.set('content-type', 'application/json');
    }

    const req = new NextRequest(fullUrl, {
      method,
      headers: reqHeaders,
      body: bodyStr,
    });

    const mwRes = proxy(req);
    if (mwRes && mwRes.status !== 200) {
      const text = await mwRes.text();
      return {
        statusCode: mwRes.status,
        body: text,
      };
    }

    const parsedUrl = new URL(fullUrl);
    const pathname = parsedUrl.pathname;
    let response: NextResponse | undefined;

    if (pathname === '/api/v1/courts' && method === 'GET') {
      response = await getCourtsRoute(req);
    } else if (pathname === '/api/v1/bookings/availability' && method === 'GET') {
      response = await getAvailabilityRoute(req);
    } else if (pathname === '/api/v1/bookings' && method === 'GET') {
      response = await getBookingsRoute(req);
    } else if (pathname === '/api/v1/bookings' && method === 'POST') {
      response = await createBookingRoute(req);
    } else if (pathname === '/api/v1/bookings/me' && method === 'GET') {
      response = await getMyBookingsRoute(req);
    } else if (pathname === '/api/v1/admin/bookings' && method === 'GET') {
      response = await getAdminBookingsRoute(req);
    } else if (pathname === '/api/v1/admin/courts' && method === 'GET') {
      response = await getAdminCourtsRoute(req);
    } else if (pathname === '/api/v1/admin/courts/closures' && method === 'GET') {
      response = await getClosuresRoute(req);
    } else if (pathname === '/api/v1/admin/courts/closures' && method === 'POST') {
      response = await createClosureRoute(req);
    } else {
      const cancelMatch = pathname.match(/^\/api\/v1\/bookings\/([^/]+)\/cancel$/);
      if (cancelMatch && method === 'POST') {
        response = await cancelBookingRoute(req, {
          params: Promise.resolve({ id: cancelMatch[1] }),
        });
      } else {
        const adminCancelMatch = pathname.match(/^\/api\/v1\/admin\/bookings\/([^/]+)\/cancel$/);
        if (adminCancelMatch && method === 'POST') {
          response = await adminCancelBookingRoute(req, {
            params: Promise.resolve({ id: adminCancelMatch[1] }),
          });
        } else {
          const courtPatchMatch = pathname.match(/^\/api\/v1\/admin\/courts\/([^/]+)$/);
          if (courtPatchMatch && method === 'PATCH') {
            response = await updateCourtRoute(req, {
              params: Promise.resolve({ id: courtPatchMatch[1] }),
            });
          } else {
            const closureDeleteMatch = pathname.match(
              /^\/api\/v1\/admin\/courts\/closures\/([^/]+)$/
            );
            if (closureDeleteMatch && method === 'DELETE') {
              response = await deleteClosureRoute(req, {
                params: Promise.resolve({ id: closureDeleteMatch[1] }),
              });
            }
          }
        }
      }
    }

    if (!response) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Not Found' }),
      };
    }

    const text = await response.text();
    return {
      statusCode: response.status,
      body: text,
    };
  };

  // Wire Prisma Mock Handlers
  before(() => {
    mockSports.set(SPORT_ID, {
      id: SPORT_ID,
      slug: 'badminton',
      name: 'Badminton',
      isActive: true,
    });

    mockCourts.set(COURT_1_ID, {
      id: COURT_1_ID,
      sportId: SPORT_ID,
      courtNumber: 1,
      name: 'Court 1',
      isOperational: true,
      sport: mockSports.get(SPORT_ID),
    });

    mockCourts.set(COURT_2_ID, {
      id: COURT_2_ID,
      sportId: SPORT_ID,
      courtNumber: 2,
      name: 'Court 2',
      isOperational: true,
      sport: mockSports.get(SPORT_ID),
    });

    mockUsers.set(ACTIVE_MEMBER_1.id, ACTIVE_MEMBER_1);
    mockUsers.set(ACTIVE_MEMBER_2.id, ACTIVE_MEMBER_2);
    mockUsers.set(PENDING_MEMBER.id, PENDING_MEMBER);
    mockUsers.set(ADMIN_USER.id, ADMIN_USER);

    // Prisma User Mock
    prisma.user.findUnique = (async (args: any) => {
      const u = mockUsers.get(args?.where?.id);
      return u ? { ...u } : null;
    }) as any;

    // Prisma Court Mock
    prisma.court.findUnique = (async (args: any) => {
      const c = mockCourts.get(args?.where?.id);
      if (!c) return null;
      return {
        ...c,
        sport: mockSports.get(c.sportId),
      };
    }) as any;

    prisma.court.findMany = (async (args: any) => {
      let list = Array.from(mockCourts.values());
      if (args?.where?.isOperational !== undefined) {
        list = list.filter((c) => c.isOperational === args.where.isOperational);
      }
      if (args?.where?.sport?.slug) {
        list = list.filter((c) => c.sport?.slug === args.where.sport.slug);
      }
      return list.map((c) => ({ ...c, sport: mockSports.get(c.sportId) }));
    }) as any;

    prisma.court.update = (async (args: any) => {
      const c = mockCourts.get(args?.where?.id);
      if (!c) throw new Error('Not found');
      Object.assign(c, args.data);
      return { ...c, sport: mockSports.get(c.sportId) };
    }) as any;

    // Prisma CourtSchedule Mock
    prisma.courtSchedule.findFirst = (async (args: any) => {
      for (const s of mockSchedules.values()) {
        if (s.dayOfWeek === args?.where?.dayOfWeek && s.isActive) {
          return { ...s };
        }
      }
      return null;
    }) as any;

    // Prisma CourtClosure Mock
    prisma.courtClosure.findMany = (async (args: any) => {
      return Array.from(mockClosures.values()).map((cl) => ({
        ...cl,
        court: cl.courtId ? mockCourts.get(cl.courtId) : null,
      }));
    }) as any;

    prisma.courtClosure.findFirst = (async (args: any) => {
      const start = args?.where?.startTime?.lt ? new Date(args.where.startTime.lt) : null;
      const end = args?.where?.endTime?.gt ? new Date(args.where.endTime.gt) : null;
      for (const cl of mockClosures.values()) {
        if (start && end) {
          if (cl.startTime.getTime() < start.getTime() && cl.endTime.getTime() > end.getTime()) {
            return { ...cl };
          }
        }
      }
      return null;
    }) as any;

    prisma.courtClosure.create = (async (args: any) => {
      const id = `closure-${Date.now()}-${Math.random()}`;
      const cl = {
        id,
        ...args.data,
        createdAt: new Date(),
        court: args.data.courtId ? mockCourts.get(args.data.courtId) : null,
      };
      mockClosures.set(id, cl);
      return cl;
    }) as any;

    prisma.courtClosure.delete = (async (args: any) => {
      mockClosures.delete(args.where.id);
      return { id: args.where.id };
    }) as any;

    prisma.courtClosure.findUnique = (async (args: any) => {
      return mockClosures.get(args.where.id) || null;
    }) as any;

    // Prisma CourtBooking Mock
    prisma.courtBooking.findUnique = (async (args: any) => {
      const b = mockBookings.get(args.where.id);
      if (!b) return null;
      return {
        ...b,
        court: mockCourts.get(b.courtId),
        user: mockUsers.get(b.userId),
      };
    }) as any;

    prisma.courtBooking.findFirst = (async (args: any) => {
      const courtId = args?.where?.courtId;
      const userId = args?.where?.userId;
      const status = args?.where?.status;
      const startLt = args?.where?.startTime?.lt ? new Date(args.where.startTime.lt) : null;
      const endGt = args?.where?.endTime?.gt ? new Date(args.where.endTime.gt) : null;

      for (const b of mockBookings.values()) {
        if (status && b.status !== status) continue;
        if (courtId && b.courtId !== courtId) continue;
        if (userId && b.userId !== userId) continue;

        if (startLt && endGt) {
          // Half-open interval overlap check
          if (b.startTime.getTime() < startLt.getTime() && b.endTime.getTime() > endGt.getTime()) {
            return {
              ...b,
              court: mockCourts.get(b.courtId),
              user: mockUsers.get(b.userId),
            };
          }
        }
      }
      return null;
    }) as any;

    prisma.courtBooking.findMany = (async (args: any) => {
      let list = Array.from(mockBookings.values());
      if (args?.where?.userId) {
        list = list.filter((b) => b.userId === args.where.userId);
      }
      if (args?.where?.courtId) {
        list = list.filter((b) => b.courtId === args.where.courtId);
      }
      if (args?.where?.status && args.where.status !== 'ALL') {
        list = list.filter((b) => b.status === args.where.status);
      }
      return list.map((b) => ({
        ...b,
        court: mockCourts.get(b.courtId),
        user: mockUsers.get(b.userId),
      }));
    }) as any;

    prisma.courtBooking.count = (async (args: any) => {
      let count = 0;
      for (const b of mockBookings.values()) {
        if (args?.where?.userId && b.userId !== args.where.userId) continue;
        if (args?.where?.courtId && b.courtId !== args.where.courtId) continue;
        if (args?.where?.status && b.status !== args.where.status) continue;
        if (args?.where?.endTime?.gt && b.endTime.getTime() <= new Date(args.where.endTime.gt).getTime())
          continue;
        count++;
      }
      return count;
    }) as any;

    prisma.courtBooking.create = (async (args: any) => {
      const id = `booking-${Date.now()}-${Math.random()}`;
      const b = {
        id,
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
        court: mockCourts.get(args.data.courtId),
        user: mockUsers.get(args.data.userId),
      };
      mockBookings.set(id, b);
      return b;
    }) as any;

    prisma.courtBooking.update = (async (args: any) => {
      const b = mockBookings.get(args.where.id);
      if (!b) throw new Error('Not found');
      Object.assign(b, args.data);
      return {
        ...b,
        court: mockCourts.get(b.courtId),
        user: mockUsers.get(b.userId),
      };
    }) as any;

    // Prisma AuditLog Mock
    prisma.auditLog.create = (async (args: any) => {
      const entry = { id: `audit-${mockAuditLogs.length + 1}`, ...args.data };
      mockAuditLogs.push(entry);
      return entry;
    }) as any;

    // Prisma $transaction mock
    prisma.$transaction = (async (arg: any) => {
      if (typeof arg === 'function') {
        return arg(prisma);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return arg;
    }) as any;
  });

  beforeEach(() => {
    mockBookings.clear();
    mockClosures.clear();
    mockAuditLogs.length = 0;
  });

  // -------------------------------------------------------------
  // TEST SUITE CASES
  // -------------------------------------------------------------

  test('1. Timezone conversion: Qatar local time is always UTC+3', () => {
    const utcDate = new Date('2026-10-15T15:00:00.000Z');
    const qatarTime = toQatarTime(utcDate);

    assert.equal(qatarTime.dateStr, '2026-10-15');
    assert.equal(qatarTime.timeStr, '18:00');
    assert.equal(qatarTime.hour, 18);

    const backToUtc = qatarTimeToUtc('2026-10-15', 18, 0);
    assert.equal(backToUtc.toISOString(), '2026-10-15T15:00:00.000Z');
  });

  test('2. Public/Authenticated Court inventory: lists operational courts', async () => {
    const res = await dispatch({
      method: 'GET',
      url: '/api/v1/courts?sport=badminton',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.status, 'ok');
    assert.equal(body.courts.length, 2);
    assert.equal(body.courts[0].name, 'Court 1');
  });

  test('3. Availability: open court shows scheduled operating slots', async () => {
    const tomorrowStr = new Date(Date.now() + 24 * 3600 * 1000 + 3 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);

    const headers = await authHeaders(ACTIVE_MEMBER_1);

    const res = await dispatch({
      method: 'GET',
      url: `/api/v1/bookings/availability?courtId=${COURT_1_ID}&date=${tomorrowStr}`,
      headers,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.date, tomorrowStr);
    assert.ok(body.slots.length > 0);
    assert.equal(body.slots[0].isAvailable, true);
  });

  test('4. Availability: existing booking marks slot as unavailable and identifies user booking', async () => {
    const tomorrowStr = new Date(Date.now() + 24 * 3600 * 1000 + 3 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);

    const slotStart = qatarTimeToUtc(tomorrowStr, 18, 0);
    const slotEnd = qatarTimeToUtc(tomorrowStr, 19, 0);

    mockBookings.set('b1', {
      id: 'b1',
      courtId: COURT_1_ID,
      userId: ACTIVE_MEMBER_1.id,
      startTime: slotStart,
      endTime: slotEnd,
      status: 'CONFIRMED',
      createdAt: new Date(),
    });

    // Check availability as Member 1 (should see isMyBooking = true)
    const headers1 = await authHeaders(ACTIVE_MEMBER_1);
    const res1 = await dispatch({
      method: 'GET',
      url: `/api/v1/bookings/availability?courtId=${COURT_1_ID}&date=${tomorrowStr}`,
      headers: headers1,
    });
    assert.equal(res1.statusCode, 200);
    const body1 = JSON.parse(res1.body);
    const bookedSlot1 = body1.slots.find((s: any) => s.displayStartTime === '18:00');
    assert.ok(bookedSlot1);
    assert.equal(bookedSlot1.isAvailable, false);
    assert.equal(bookedSlot1.unavailabilityReason, 'BOOKED');
    assert.equal(bookedSlot1.isMyBooking, true);

    // Check availability as Member 2 (should see isMyBooking = false)
    const headers2 = await authHeaders(ACTIVE_MEMBER_2);
    const res2 = await dispatch({
      method: 'GET',
      url: `/api/v1/bookings/availability?courtId=${COURT_1_ID}&date=${tomorrowStr}`,
      headers: headers2,
    });
    const body2 = JSON.parse(res2.body);
    const bookedSlot2 = body2.slots.find((s: any) => s.displayStartTime === '18:00');
    assert.equal(bookedSlot2.isMyBooking, false);
  });

  test('5. Availability: court closure blocks availability for maintenance', async () => {
    const tomorrowStr = new Date(Date.now() + 24 * 3600 * 1000 + 3 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);

    const slotStart = qatarTimeToUtc(tomorrowStr, 10, 0);
    const slotEnd = qatarTimeToUtc(tomorrowStr, 14, 0);

    mockClosures.set('c1', {
      id: 'c1',
      courtId: COURT_1_ID,
      reason: 'Lighting repair',
      startTime: slotStart,
      endTime: slotEnd,
    });

    const headers = await authHeaders(ACTIVE_MEMBER_1);
    const res = await dispatch({
      method: 'GET',
      url: `/api/v1/bookings/availability?courtId=${COURT_1_ID}&date=${tomorrowStr}`,
      headers,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    const closedSlot = body.slots.find((s: any) => s.displayStartTime === '11:00');
    assert.ok(closedSlot);
    assert.equal(closedSlot.isAvailable, false);
    assert.equal(closedSlot.unavailabilityReason, 'MAINTENANCE_CLOSURE');
  });

  test('6. Availability: adjacent intervals [18:00, 19:00) and [19:00, 20:00) do NOT conflict', async () => {
    const tomorrowStr = new Date(Date.now() + 24 * 3600 * 1000 + 3 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);

    const slot1Start = qatarTimeToUtc(tomorrowStr, 18, 0);
    const slot1End = qatarTimeToUtc(tomorrowStr, 19, 0);

    mockBookings.set('b-adj', {
      id: 'b-adj',
      courtId: COURT_1_ID,
      userId: ACTIVE_MEMBER_1.id,
      startTime: slot1Start,
      endTime: slot1End,
      status: 'CONFIRMED',
      createdAt: new Date(),
    });

    const headers = await authHeaders(ACTIVE_MEMBER_2);
    const res = await dispatch({
      method: 'GET',
      url: `/api/v1/bookings/availability?courtId=${COURT_1_ID}&date=${tomorrowStr}`,
      headers,
    });

    const body = JSON.parse(res.body);
    const slot19 = body.slots.find((s: any) => s.displayStartTime === '19:00');
    assert.ok(slot19);
    assert.equal(slot19.isAvailable, true, 'Adjacent 19:00 slot must remain available');
  });

  test('7. Booking creation: unauthenticated request is rejected (401 Unauthorized)', async () => {
    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/bookings',
      payload: {
        courtId: COURT_1_ID,
        startTime: '2026-10-15T15:00:00.000Z',
        endTime: '2026-10-15T16:00:00.000Z',
      },
    });

    assert.equal(res.statusCode, 401);
  });

  test('8. Booking creation: pending account status is rejected (403 Forbidden)', async () => {
    const headers = await authHeaders(PENDING_MEMBER);
    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/bookings',
      headers,
      payload: {
        courtId: COURT_1_ID,
        startTime: '2026-10-15T15:00:00.000Z',
        endTime: '2026-10-15T16:00:00.000Z',
      },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.body);
    assert.equal(body.code, 'ACCOUNT_PENDING_APPROVAL');
  });

  test('9. Booking creation: active member can successfully book court and audit log is recorded', async () => {
    const futureDate = new Date(Date.now() + 48 * 3600 * 1000);
    const startTime = new Date(futureDate.getTime());
    startTime.setMinutes(0, 0, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const headers = await authHeaders(ACTIVE_MEMBER_1);

    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/bookings',
      headers,
      payload: {
        courtId: COURT_1_ID,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: 'Practice match',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.status, 'ok');
    assert.equal(body.booking.userId, ACTIVE_MEMBER_1.id);
    assert.equal(body.booking.status, 'CONFIRMED');

    // Verify AuditLog was created
    const audit = mockAuditLogs.find((a) => a.action === 'COURT_BOOKING_CREATED');
    assert.ok(audit, 'Audit log must record court booking creation');
    assert.equal(audit.actorUserId, ACTIVE_MEMBER_1.id);
  });

  test('10. Booking creation: overlapping booking on same court is rejected with 409 Conflict', async () => {
    const futureDate = new Date(Date.now() + 48 * 3600 * 1000);
    const startTime = new Date(futureDate.getTime());
    startTime.setMinutes(0, 0, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    // Initial booking by Member 1
    mockBookings.set('b-first', {
      id: 'b-first',
      courtId: COURT_1_ID,
      userId: ACTIVE_MEMBER_1.id,
      startTime,
      endTime,
      status: 'CONFIRMED',
      createdAt: new Date(),
    });

    // Member 2 tries to book overlapping slot (18:30 to 19:30)
    const overlapStart = new Date(startTime.getTime() + 30 * 60 * 1000);
    const overlapEnd = new Date(endTime.getTime() + 30 * 60 * 1000);

    const headers2 = await authHeaders(ACTIVE_MEMBER_2);
    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/bookings',
      headers: headers2,
      payload: {
        courtId: COURT_1_ID,
        startTime: overlapStart.toISOString(),
        endTime: overlapEnd.toISOString(),
      },
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.body);
    assert.match(body.message, /already been booked/i);
  });

  test('11. Booking creation: member cannot be booked on two courts at the same time', async () => {
    const futureDate = new Date(Date.now() + 48 * 3600 * 1000);
    const startTime = new Date(futureDate.getTime());
    startTime.setMinutes(0, 0, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    // Member 1 already booked Court 1
    mockBookings.set('b-c1', {
      id: 'b-c1',
      courtId: COURT_1_ID,
      userId: ACTIVE_MEMBER_1.id,
      startTime,
      endTime,
      status: 'CONFIRMED',
      createdAt: new Date(),
    });

    // Member 1 tries to book Court 2 at same time
    const headers1 = await authHeaders(ACTIVE_MEMBER_1);
    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/bookings',
      headers: headers1,
      payload: {
        courtId: COURT_2_ID,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.body);
    assert.match(body.message, /already have another active booking/i);
  });

  test('12. Booking creation: booking conflicting with maintenance closure is rejected', async () => {
    const futureDate = new Date(Date.now() + 48 * 3600 * 1000);
    const startTime = new Date(futureDate.getTime());
    startTime.setMinutes(0, 0, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    mockClosures.set('maint-c1', {
      id: 'maint-c1',
      courtId: COURT_1_ID,
      reason: 'Hall floor varnishing',
      startTime: new Date(startTime.getTime() - 1000),
      endTime: new Date(endTime.getTime() + 1000),
    });

    const headers = await authHeaders(ACTIVE_MEMBER_1);
    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/bookings',
      headers,
      payload: {
        courtId: COURT_1_ID,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.body);
    assert.match(body.message, /closed for maintenance/i);
  });

  test('13. Booking creation: bookings past the 14-day advance horizon are rejected', async () => {
    const beyondHorizon = new Date(Date.now() + 16 * 24 * 3600 * 1000);
    const startTime = new Date(beyondHorizon);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const headers = await authHeaders(ACTIVE_MEMBER_1);
    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/bookings',
      headers,
      payload: {
        courtId: COURT_1_ID,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.match(body.message, /14 days in advance/i);
  });

  test('14. Booking creation: member active booking limit (3) is enforced', async () => {
    const now = Date.now();
    for (let i = 1; i <= 3; i++) {
      mockBookings.set(`b-limit-${i}`, {
        id: `b-limit-${i}`,
        courtId: COURT_1_ID,
        userId: ACTIVE_MEMBER_1.id,
        startTime: new Date(now + (i * 24 + 1) * 3600 * 1000),
        endTime: new Date(now + (i * 24 + 2) * 3600 * 1000),
        status: 'CONFIRMED',
      });
    }

    const headers = await authHeaders(ACTIVE_MEMBER_1);
    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/bookings',
      headers,
      payload: {
        courtId: COURT_2_ID,
        startTime: new Date(now + 100 * 3600 * 1000).toISOString(),
        endTime: new Date(now + 101 * 3600 * 1000).toISOString(),
      },
    });

    assert.equal(res.statusCode, 422);
    const body = JSON.parse(res.body);
    assert.match(body.message, /maximum allowed active bookings limit/i);
  });

  test('15. Cancellation: member can cancel own eligible booking and record is preserved', async () => {
    const futureDate = new Date(Date.now() + 48 * 3600 * 1000);
    mockBookings.set('b-cancel-test', {
      id: 'b-cancel-test',
      courtId: COURT_1_ID,
      userId: ACTIVE_MEMBER_1.id,
      startTime: futureDate,
      endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
      status: 'CONFIRMED',
      createdAt: new Date(),
    });

    const headers = await authHeaders(ACTIVE_MEMBER_1);
    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/bookings/b-cancel-test/cancel',
      headers,
      payload: { reason: 'Work schedule change' },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.booking.status, 'CANCELLED');
    assert.equal(body.booking.cancellationReason, 'Work schedule change');

    // Verify row was preserved and not deleted
    const preserved = mockBookings.get('b-cancel-test');
    assert.ok(preserved);
    assert.equal(preserved.status, 'CANCELLED');

    // Verify audit log
    const audit = mockAuditLogs.find((a) => a.action === 'MEMBER_CANCELLED_BOOKING');
    assert.ok(audit);
    assert.equal(audit.actorUserId, ACTIVE_MEMBER_1.id);
  });

  test('16. Cancellation: member cannot cancel another member booking (403 Forbidden)', async () => {
    const futureDate = new Date(Date.now() + 48 * 3600 * 1000);
    mockBookings.set('b-other-user', {
      id: 'b-other-user',
      courtId: COURT_1_ID,
      userId: ACTIVE_MEMBER_2.id,
      startTime: futureDate,
      endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
      status: 'CONFIRMED',
    });

    const headers1 = await authHeaders(ACTIVE_MEMBER_1);
    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/bookings/b-other-user/cancel',
      headers: headers1,
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.body);
    assert.match(body.message, /only cancel your own bookings/i);
  });

  test('17. Cancellation: cancellation less than 6 hours prior to start is rejected for regular member', async () => {
    // 3 hours from now (less than 6 hours cutoff)
    const soonDate = new Date(Date.now() + 3 * 3600 * 1000);
    mockBookings.set('b-soon', {
      id: 'b-soon',
      courtId: COURT_1_ID,
      userId: ACTIVE_MEMBER_1.id,
      startTime: soonDate,
      endTime: new Date(soonDate.getTime() + 60 * 60 * 1000),
      status: 'CONFIRMED',
    });

    const headers = await authHeaders(ACTIVE_MEMBER_1);
    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/bookings/b-soon/cancel',
      headers,
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.match(body.message, /less than 6 hours prior/i);
  });

  test('18. Cancellation: administrator can override 6-hour deadline and cancel with audit', async () => {
    const soonDate = new Date(Date.now() + 2 * 3600 * 1000);
    mockBookings.set('b-admin-cancel', {
      id: 'b-admin-cancel',
      courtId: COURT_1_ID,
      userId: ACTIVE_MEMBER_1.id,
      startTime: soonDate,
      endTime: new Date(soonDate.getTime() + 60 * 60 * 1000),
      status: 'CONFIRMED',
    });

    const adminHeaders = await authHeaders(ADMIN_USER);
    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/admin/bookings/b-admin-cancel/cancel',
      headers: adminHeaders,
      payload: { reason: 'Court emergency maintenance' },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.booking.status, 'CANCELLED');

    const audit = mockAuditLogs.find((a) => a.action === 'ADMIN_CANCELLED_BOOKING');
    assert.ok(audit);
    assert.equal(audit.actorUserId, ADMIN_USER.id);
  });

  test('19. Administration: non-admin user cannot manage courts or closures (403 Forbidden)', async () => {
    const memberHeaders = await authHeaders(ACTIVE_MEMBER_1);

    const res1 = await dispatch({
      method: 'PATCH',
      url: `/api/v1/admin/courts/${COURT_1_ID}`,
      headers: memberHeaders,
      payload: { isOperational: false },
    });
    assert.equal(res1.statusCode, 403);

    const res2 = await dispatch({
      method: 'POST',
      url: '/api/v1/admin/courts/closures',
      headers: memberHeaders,
      payload: {
        reason: 'Unauthorized test',
        startTime: '2026-10-15T10:00:00Z',
        endTime: '2026-10-15T12:00:00Z',
      },
    });
    assert.equal(res2.statusCode, 403);
  });

  test('20. Administration: deactivating a court with active future bookings returns 409 Conflict', async () => {
    const futureDate = new Date(Date.now() + 48 * 3600 * 1000);
    mockBookings.set('b-active-court', {
      id: 'b-active-court',
      courtId: COURT_1_ID,
      userId: ACTIVE_MEMBER_1.id,
      startTime: futureDate,
      endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
      status: 'CONFIRMED',
    });

    const adminHeaders = await authHeaders(ADMIN_USER);
    const res = await dispatch({
      method: 'PATCH',
      url: `/api/v1/admin/courts/${COURT_1_ID}`,
      headers: adminHeaders,
      payload: { isOperational: false },
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.body);
    assert.match(body.message, /active future bookings/i);
  });

  test('21. Administration: creating a closure that conflicts with existing bookings returns 409 Conflict', async () => {
    const futureDate = new Date(Date.now() + 48 * 3600 * 1000);
    const startTime = new Date(futureDate.getTime());
    startTime.setMinutes(0, 0, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    mockBookings.set('b-conflicting-closure', {
      id: 'b-conflicting-closure',
      courtId: COURT_1_ID,
      userId: ACTIVE_MEMBER_1.id,
      startTime,
      endTime,
      status: 'CONFIRMED',
      court: mockCourts.get(COURT_1_ID),
      user: mockUsers.get(ACTIVE_MEMBER_1.id),
    });

    const adminHeaders = await authHeaders(ADMIN_USER);
    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/admin/courts/closures',
      headers: adminHeaders,
      payload: {
        courtId: COURT_1_ID,
        reason: 'Emergency painting',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.body);
    assert.match(body.message, /conflicts with 1 existing booking/i);
  });
});
