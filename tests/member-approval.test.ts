process.env.NODE_ENV = 'test';

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { hashPassword } from '@/server/auth/hash';
import { signAccessToken } from '@/server/auth/session';
import { ACCESS_TOKEN_COOKIE } from '@/server/auth/cookies';
import { proxy } from '@/proxy';

// Route Handlers under test
import { POST as registerRoute } from '@/app/api/v1/auth/register/route';
import { POST as loginRoute } from '@/app/api/v1/auth/login/route';
import { GET as meRoute } from '@/app/api/v1/auth/me/route';
import { GET as overviewRoute } from '@/app/api/v1/admin/overview/route';
import { GET as membersRoute } from '@/app/api/v1/admin/members/route';
import { GET as pendingRegistrationsRoute } from '@/app/api/v1/admin/pending-registrations/route';
import { POST as approveRegistrationRoute } from '@/app/api/v1/admin/registrations/[id]/approve/route';
import { POST as rejectRegistrationRoute } from '@/app/api/v1/admin/registrations/[id]/reject/route';
import { approveRegistration } from '@/server/admin/registrations';

describe('QWSC Member Approval End-to-End Workflow Test Suite', () => {
  // In-memory mock database store
  const mockUsers: Map<string, any> = new Map();
  const mockRefreshTokens: Map<string, any> = new Map();
  const mockAuditLogs: any[] = [];

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

    // Execute CSRF proxy guard
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

    if (pathname === '/api/v1/auth/register' && method === 'POST') {
      response = await registerRoute(req);
    } else if (pathname === '/api/v1/auth/login' && method === 'POST') {
      response = await loginRoute(req);
    } else if (pathname === '/api/v1/auth/me' && method === 'GET') {
      response = await meRoute(req);
    } else if (pathname === '/api/v1/admin/overview' && method === 'GET') {
      response = await overviewRoute(req);
    } else if (pathname === '/api/v1/admin/members' && method === 'GET') {
      response = await membersRoute(req);
    } else if (pathname === '/api/v1/admin/pending-registrations' && method === 'GET') {
      response = await pendingRegistrationsRoute(req);
    } else {
      const approveMatch = pathname.match(/^\/api\/v1\/admin\/registrations\/([^/]+)\/approve$/);
      if (approveMatch && method === 'POST') {
        response = await approveRegistrationRoute(req, {
          params: Promise.resolve({ id: approveMatch[1] }),
        });
      } else {
        const rejectMatch = pathname.match(/^\/api\/v1\/admin\/registrations\/([^/]+)\/reject$/);
        if (rejectMatch && method === 'POST') {
          response = await rejectRegistrationRoute(req, {
            params: Promise.resolve({ id: rejectMatch[1] }),
          });
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

  before(async () => {
    // Intercept Prisma operations for isolated, deterministic execution
    prisma.user.findFirst = (async (args: any) => {
      const conds = args?.where?.OR || (args?.where ? [args.where] : []);
      const excludeId = args?.where?.id?.not;
      for (const u of mockUsers.values()) {
        if (excludeId && u.id === excludeId) continue;
        for (const cond of conds) {
          if (cond.email && u.email === cond.email) return u;
          if (cond.phone && u.phone === cond.phone) return u;
        }
      }
      return null;
    }) as any;

    prisma.user.findUnique = (async (args: any) => {
      const { where } = args;
      if (where.email) {
        for (const u of mockUsers.values()) {
          if (u.email === where.email) return u;
        }
      }
      if (where.id) {
        return mockUsers.get(where.id) || null;
      }
      return null;
    }) as any;

    prisma.user.count = (async (args: any) => {
      const status = args?.where?.status;
      const query = args?.where?.OR;
      let list = Array.from(mockUsers.values());

      if (status) {
        list = list.filter((u) => u.status === status);
      }
      if (query && Array.isArray(query)) {
        list = list.filter((u) => {
          return query.some((cond: any) => {
            if (cond.fullName?.contains && u.fullName.toLowerCase().includes(cond.fullName.contains.toLowerCase())) return true;
            if (cond.email?.contains && u.email.toLowerCase().includes(cond.email.contains.toLowerCase())) return true;
            if (cond.phone?.contains && u.phone && u.phone.includes(cond.phone.contains)) return true;
            return false;
          });
        });
      }
      return list.length;
    }) as any;

    prisma.user.findMany = (async (args: any) => {
      const status = args?.where?.status;
      const query = args?.where?.OR;
      let list = Array.from(mockUsers.values());

      if (status) {
        list = list.filter((u) => u.status === status);
      }
      if (query && Array.isArray(query)) {
        list = list.filter((u) => {
          return query.some((cond: any) => {
            if (cond.fullName?.contains && u.fullName.toLowerCase().includes(cond.fullName.contains.toLowerCase())) return true;
            if (cond.email?.contains && u.email.toLowerCase().includes(cond.email.contains.toLowerCase())) return true;
            if (cond.phone?.contains && u.phone && u.phone.includes(cond.phone.contains)) return true;
            return false;
          });
        });
      }

      if (args?.skip) {
        list = list.slice(args.skip);
      }
      if (args?.take) {
        list = list.slice(0, args.take);
      }
      return list;
    }) as any;

    prisma.user.create = (async (args: any) => {
      const id = 'user-' + Math.random().toString(36).substring(2, 9);
      const user = {
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      };
      mockUsers.set(id, user);
      return user;
    }) as any;

    prisma.user.update = (async (args: any) => {
      const id = args.where.id;
      const user = mockUsers.get(id);
      if (!user) throw new Error('User not found');
      const updated = { ...user, ...args.data, updatedAt: new Date() };
      mockUsers.set(id, updated);
      return updated;
    }) as any;

    prisma.refreshToken.create = (async (args: any) => {
      const id = 'rt-' + Math.random().toString(36).substring(2, 9);
      const rt = {
        id,
        createdAt: new Date(),
        isRevoked: false,
        ...args.data,
      };
      mockRefreshTokens.set(rt.tokenHash, rt);
      return rt;
    }) as any;

    prisma.refreshToken.updateMany = (async (args: any) => {
      let count = 0;
      for (const [hash, rt] of mockRefreshTokens.entries()) {
        if (args.where.userId && rt.userId === args.where.userId) {
          mockRefreshTokens.set(hash, { ...rt, ...args.data });
          count++;
        }
      }
      return { count };
    }) as any;

    prisma.auditLog.create = (async (args: any) => {
      const log = { id: 'log-' + Math.random().toString(36), createdAt: new Date(), ...args.data };
      mockAuditLogs.push(log);
      return log;
    }) as any;

    prisma.$transaction = (async (callback: any) => {
      if (typeof callback === 'function') {
        const snapshot = new Map(mockUsers);
        try {
          return await callback(prisma);
        } catch (err) {
          mockUsers.clear();
          for (const [k, v] of snapshot.entries()) {
            mockUsers.set(k, { ...v });
          }
          throw err;
        }
      }
      return Promise.all(callback);
    }) as any;
  });

  beforeEach(() => {
    mockUsers.clear();
    mockRefreshTokens.clear();
    mockAuditLogs.length = 0;
  });

  test('1. Valid registration creates a pending application with MEMBER role and PENDING_APPROVAL status', async () => {
    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Hamad Al-Kuwari',
        email: 'hamad@qwsc.org',
        password: 'ValidPassword123!',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.status, 'ok');
    assert.equal(body.user.fullName, 'Hamad Al-Kuwari');
    assert.equal(body.user.email, 'hamad@qwsc.org');
    assert.equal(body.user.role, 'MEMBER');
    assert.equal(body.user.status, 'PENDING_APPROVAL');
    assert.equal(body.user.isOnboarded, false);
  });

  test('2. Invalid registration details are rejected with 400 Bad Request', async () => {
    // Weak password
    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Short Pass',
        email: 'short@qwsc.org',
        password: 'weak',
      },
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.equal(body.error, 'Bad Request');
    assert.ok(body.details.password);
  });

  test('3. Duplicate email or phone registration is handled safely (409 Conflict)', async () => {
    const pwHash = await hashPassword('MemberPass123!');
    mockUsers.set('user-existing', {
      id: 'user-existing',
      fullName: 'Existing User',
      email: 'duplicate@qwsc.org',
      phone: '+974 5511 2233',
      passwordHash: pwHash,
      role: 'MEMBER',
      status: 'PENDING_APPROVAL',
      createdAt: new Date(),
    });

    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Duplicate User',
        email: 'duplicate@qwsc.org',
        password: 'Password123!',
      },
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.body);
    assert.equal(body.error, 'Conflict');
    assert.match(body.message, /already exists/i);
  });

  test('4. Public registration cannot create an admin or bypass pending approval', async () => {
    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Privilege Attacker',
        email: 'attacker@qwsc.org',
        password: 'Password123!',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    // Role MUST remain MEMBER and status MUST remain PENDING_APPROVAL
    assert.equal(body.user.role, 'MEMBER');
    assert.equal(body.user.status, 'PENDING_APPROVAL');
  });

  test('5. Unauthenticated requests cannot access admin functionality (401 Unauthorized)', async () => {
    const endpoints = [
      { method: 'GET', url: '/api/v1/admin/overview' },
      { method: 'GET', url: '/api/v1/admin/members' },
      { method: 'GET', url: '/api/v1/admin/pending-registrations' },
      { method: 'POST', url: '/api/v1/admin/registrations/target-user/approve' },
      { method: 'POST', url: '/api/v1/admin/registrations/target-user/reject' },
    ];

    for (const ep of endpoints) {
      const res = await dispatch(ep);
      assert.equal(res.statusCode, 401, `Expected 401 for unauthenticated ${ep.method} ${ep.url}`);
    }
  });

  test('6. Non-admin users cannot list, approve, or reject applications (403 Forbidden)', async () => {
    mockUsers.set('user-member-1', {
      id: 'user-member-1',
      fullName: 'Regular Member',
      email: 'member@qwsc.org',
      role: 'MEMBER',
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    const memberToken = await signAccessToken({
      sub: 'user-member-1',
      email: 'member@qwsc.org',
      role: 'MEMBER',
      status: 'ACTIVE',
    });

    const cookies = { [ACCESS_TOKEN_COOKIE]: memberToken };

    const endpoints = [
      { method: 'GET', url: '/api/v1/admin/overview' },
      { method: 'GET', url: '/api/v1/admin/members' },
      { method: 'GET', url: '/api/v1/admin/pending-registrations' },
      { method: 'POST', url: '/api/v1/admin/registrations/target-user/approve' },
      { method: 'POST', url: '/api/v1/admin/registrations/target-user/reject' },
    ];

    for (const ep of endpoints) {
      const res = await dispatch({ ...ep, cookies });
      assert.equal(res.statusCode, 403, `Expected 403 for member on ${ep.method} ${ep.url}`);
    }
  });

  test('7. Authorized admin can view database-backed overview counts', async () => {
    mockUsers.set('admin-1', {
      id: 'admin-1',
      fullName: 'Admin User',
      email: 'admin@qwsc.org',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date(),
    });
    mockUsers.set('user-p1', {
      id: 'user-p1',
      fullName: 'Pending 1',
      email: 'p1@qwsc.org',
      role: 'MEMBER',
      status: 'PENDING_APPROVAL',
      createdAt: new Date(),
    });
    mockUsers.set('user-p2', {
      id: 'user-p2',
      fullName: 'Pending 2',
      email: 'p2@qwsc.org',
      role: 'MEMBER',
      status: 'PENDING_APPROVAL',
      createdAt: new Date(),
    });
    mockUsers.set('user-a1', {
      id: 'user-a1',
      fullName: 'Active 1',
      email: 'a1@qwsc.org',
      role: 'MEMBER',
      status: 'ACTIVE',
      createdAt: new Date(),
    });
    mockUsers.set('user-r1', {
      id: 'user-r1',
      fullName: 'Rejected 1',
      email: 'r1@qwsc.org',
      role: 'MEMBER',
      status: 'INACTIVE',
      createdAt: new Date(),
    });

    const adminToken = await signAccessToken({
      sub: 'admin-1',
      email: 'admin@qwsc.org',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    const res = await dispatch({
      method: 'GET',
      url: '/api/v1/admin/overview',
      cookies: { [ACCESS_TOKEN_COOKIE]: adminToken },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.status, 'ok');
    assert.equal(body.counts.pending, 2);
    assert.equal(body.counts.approved, 2); // admin-1 + user-a1
    assert.equal(body.counts.rejected, 1);
    assert.equal(body.counts.total, 5);
  });

  test('8. Authorized admin can list and filter members with search', async () => {
    mockUsers.set('admin-1', {
      id: 'admin-1',
      fullName: 'Super Admin',
      email: 'admin@qwsc.org',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date(),
    });
    mockUsers.set('user-search-1', {
      id: 'user-search-1',
      fullName: 'Nasser Al-Kuwari',
      email: 'nasser@qwsc.org',
      phone: '+974 5500 1122',
      role: 'MEMBER',
      status: 'PENDING_APPROVAL',
      createdAt: new Date(),
    });
    mockUsers.set('user-search-2', {
      id: 'user-search-2',
      fullName: 'Rashid Al-Thani',
      email: 'rashid@qwsc.org',
      phone: '+974 5500 3344',
      role: 'MEMBER',
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    const adminToken = await signAccessToken({
      sub: 'admin-1',
      email: 'admin@qwsc.org',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    // 1. Filter by status PENDING_APPROVAL
    const resPending = await dispatch({
      method: 'GET',
      url: '/api/v1/admin/members?status=PENDING_APPROVAL',
      cookies: { [ACCESS_TOKEN_COOKIE]: adminToken },
    });
    assert.equal(resPending.statusCode, 200);
    const bodyPending = JSON.parse(resPending.body);
    assert.equal(bodyPending.members.length, 1);
    assert.equal(bodyPending.members[0].fullName, 'Nasser Al-Kuwari');

    // 2. Search by query 'rashid'
    const resSearch = await dispatch({
      method: 'GET',
      url: '/api/v1/admin/members?search=rashid',
      cookies: { [ACCESS_TOKEN_COOKIE]: adminToken },
    });
    assert.equal(resSearch.statusCode, 200);
    const bodySearch = JSON.parse(resSearch.body);
    assert.equal(bodySearch.members.length, 1);
    assert.equal(bodySearch.members[0].fullName, 'Rashid Al-Thani');
  });

  test('9. Authorized admin can approve a pending application and audit log is written', async () => {
    mockUsers.set('admin-1', {
      id: 'admin-1',
      fullName: 'Admin User',
      email: 'admin@qwsc.org',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date(),
    });
    mockUsers.set('applicant-1', {
      id: 'applicant-1',
      fullName: 'Applicant Player',
      email: 'applicant@qwsc.org',
      phone: '+974 5599 8877',
      role: 'MEMBER',
      status: 'PENDING_APPROVAL',
      createdAt: new Date(),
    });

    const adminToken = await signAccessToken({
      sub: 'admin-1',
      email: 'admin@qwsc.org',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/admin/registrations/applicant-1/approve',
      cookies: { [ACCESS_TOKEN_COOKIE]: adminToken },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.status, 'ok');
    assert.equal(body.user.status, 'ACTIVE');

    // Check persisted store
    const updatedUser = mockUsers.get('applicant-1');
    assert.equal(updatedUser.status, 'ACTIVE');

    // Verify audit log
    const audit = mockAuditLogs.find((l) => l.action === 'ADMIN_APPROVED_REGISTRATION');
    assert.ok(audit);
    assert.equal(audit.actorUserId, 'admin-1');
    assert.equal(audit.entityId, 'applicant-1');
    assert.equal(audit.beforeState.status, 'PENDING_APPROVAL');
    assert.equal(audit.afterState.status, 'ACTIVE');
  });

  test('10. Authorized admin can reject a pending application with optional reason', async () => {
    mockUsers.set('admin-1', {
      id: 'admin-1',
      fullName: 'Admin User',
      email: 'admin@qwsc.org',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date(),
    });
    mockUsers.set('applicant-2', {
      id: 'applicant-2',
      fullName: 'Ineligible Applicant',
      email: 'ineligible@qwsc.org',
      phone: '+974 5599 0000',
      role: 'MEMBER',
      status: 'PENDING_APPROVAL',
      createdAt: new Date(),
    });

    const adminToken = await signAccessToken({
      sub: 'admin-1',
      email: 'admin@qwsc.org',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    const res = await dispatch({
      method: 'POST',
      url: '/api/v1/admin/registrations/applicant-2/reject',
      payload: { reason: 'Does not meet local residency criteria' },
      cookies: { [ACCESS_TOKEN_COOKIE]: adminToken },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.status, 'ok');
    assert.equal(body.user.status, 'INACTIVE');

    // Check persisted store
    const updatedUser = mockUsers.get('applicant-2');
    assert.equal(updatedUser.status, 'INACTIVE');

    // Verify audit log with reason
    const audit = mockAuditLogs.find((l) => l.action === 'ADMIN_REJECTED_REGISTRATION');
    assert.ok(audit);
    assert.equal(audit.actorUserId, 'admin-1');
    assert.equal(audit.entityId, 'applicant-2');
    assert.equal(audit.afterState.reason, 'Does not meet local residency criteria');
  });

  test('11. Administrator cannot approve or reject their own account', async () => {
    mockUsers.set('admin-self', {
      id: 'admin-self',
      fullName: 'Self Admin',
      email: 'selfadmin@qwsc.org',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    const adminToken = await signAccessToken({
      sub: 'admin-self',
      email: 'selfadmin@qwsc.org',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    // Attempt self-approval
    const approveRes = await dispatch({
      method: 'POST',
      url: '/api/v1/admin/registrations/admin-self/approve',
      cookies: { [ACCESS_TOKEN_COOKIE]: adminToken },
    });
    assert.equal(approveRes.statusCode, 400);
    assert.match(JSON.parse(approveRes.body).message, /cannot approve their own account/i);

    // Attempt self-rejection
    const rejectRes = await dispatch({
      method: 'POST',
      url: '/api/v1/admin/registrations/admin-self/reject',
      cookies: { [ACCESS_TOKEN_COOKIE]: adminToken },
    });
    assert.equal(rejectRes.statusCode, 400);
    assert.match(JSON.parse(rejectRes.body).message, /cannot reject their own account/i);
  });

  test('12. Repeated decisions and invalid status transitions are rejected safely', async () => {
    mockUsers.set('admin-1', {
      id: 'admin-1',
      fullName: 'Admin User',
      email: 'admin@qwsc.org',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date(),
    });
    mockUsers.set('already-active', {
      id: 'already-active',
      fullName: 'Already Active Member',
      email: 'active@qwsc.org',
      role: 'MEMBER',
      status: 'ACTIVE',
      createdAt: new Date(),
    });
    mockUsers.set('already-inactive', {
      id: 'already-inactive',
      fullName: 'Already Inactive User',
      email: 'inactive@qwsc.org',
      role: 'MEMBER',
      status: 'INACTIVE',
      createdAt: new Date(),
    });

    const adminToken = await signAccessToken({
      sub: 'admin-1',
      email: 'admin@qwsc.org',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    // 1. Approving an already active user
    const res1 = await dispatch({
      method: 'POST',
      url: '/api/v1/admin/registrations/already-active/approve',
      cookies: { [ACCESS_TOKEN_COOKIE]: adminToken },
    });
    assert.equal(res1.statusCode, 400);
    assert.match(JSON.parse(res1.body).message, /already active/i);

    // 2. Approving an inactive/rejected user (invalid status transition)
    const res2 = await dispatch({
      method: 'POST',
      url: '/api/v1/admin/registrations/already-inactive/approve',
      cookies: { [ACCESS_TOKEN_COOKIE]: adminToken },
    });
    assert.equal(res2.statusCode, 400);
    assert.match(JSON.parse(res2.body).message, /invalid status transition/i);

    // 3. Rejecting an already inactive user
    const res3 = await dispatch({
      method: 'POST',
      url: '/api/v1/admin/registrations/already-inactive/reject',
      cookies: { [ACCESS_TOKEN_COOKIE]: adminToken },
    });
    assert.equal(res3.statusCode, 400);
    assert.match(JSON.parse(res3.body).message, /already been rejected/i);

    // 4. Approving non-existent user
    const res4 = await dispatch({
      method: 'POST',
      url: '/api/v1/admin/registrations/non-existent-user/approve',
      cookies: { [ACCESS_TOKEN_COOKIE]: adminToken },
    });
    assert.equal(res4.statusCode, 404);
  });

  test('13. Stale session protection: rejected user with unexpired token is blocked from member access', async () => {
    // User initially active
    mockUsers.set('user-stale', {
      id: 'user-stale',
      fullName: 'Stale Session User',
      email: 'stale@qwsc.org',
      role: 'MEMBER',
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    // Token signed when user was ACTIVE
    const token = await signAccessToken({
      sub: 'user-stale',
      email: 'stale@qwsc.org',
      role: 'MEMBER',
      status: 'ACTIVE',
    });

    // Verify token works while ACTIVE
    const check1 = await dispatch({
      method: 'GET',
      url: '/api/v1/auth/me',
      cookies: { [ACCESS_TOKEN_COOKIE]: token },
    });
    assert.equal(check1.statusCode, 200);

    // Administrator marks the user INACTIVE in the database
    mockUsers.set('user-stale', {
      ...mockUsers.get('user-stale'),
      status: 'INACTIVE',
    });

    // Even though the JWT still has status='ACTIVE', the server checks persisted status
    // and blocks the stale session immediately
    const check2 = await dispatch({
      method: 'GET',
      url: '/api/v1/auth/me',
      cookies: { [ACCESS_TOKEN_COOKIE]: token },
    });
    assert.equal(check2.statusCode, 403);
    const body2 = JSON.parse(check2.body);
    assert.equal(body2.code, 'ACCOUNT_INACTIVE');
  });

  test('14. Failures during decision do not leave a partially updated approval state (transaction rollback)', async () => {
    mockUsers.set('applicant-atomic', {
      id: 'applicant-atomic',
      fullName: 'Atomic Test Applicant',
      email: 'atomic@qwsc.org',
      role: 'MEMBER',
      status: 'PENDING_APPROVAL',
      createdAt: new Date(),
    });

    const originalAudit = prisma.auditLog.create;
    // Simulate failure during audit record creation inside transaction
    prisma.auditLog.create = (async () => {
      throw new Error('Database disk error during audit writing');
    }) as any;

    try {
      await approveRegistration('applicant-atomic', 'admin-1', '127.0.0.1');
      assert.fail('Expected approval to throw error');
    } catch (err: any) {
      assert.match(err.message, /Database disk error/);
    } finally {
      prisma.auditLog.create = originalAudit;
    }

    // Verify user status remains PENDING_APPROVAL due to transaction rollback
    const userInDb = mockUsers.get('applicant-atomic');
    assert.equal(userInDb.status, 'PENDING_APPROVAL');
  });
});
