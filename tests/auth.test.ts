process.env.NODE_ENV = 'test';

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { hashPassword, verifyPassword } from '@/server/auth/hash';
import { hashToken } from '@/server/auth/tokens';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/server/auth/cookies';
import { setGoogleTokenVerifierForTesting } from '@/server/auth/google';
import { proxy } from '@/proxy';

// Route Handlers
import { POST as registerRoute } from '@/app/api/v1/auth/register/route';
import { POST as loginRoute } from '@/app/api/v1/auth/login/route';
import { GET as meRoute } from '@/app/api/v1/auth/me/route';
import { POST as refreshRoute } from '@/app/api/v1/auth/refresh/route';
import { POST as logoutRoute } from '@/app/api/v1/auth/logout/route';
import { POST as onboardRoute } from '@/app/api/v1/auth/onboard/route';
import { GET as googleConfigRoute } from '@/app/api/v1/auth/google/config/route';
import { POST as googleRoute } from '@/app/api/v1/auth/google/route';
import { POST as googleLinkRoute } from '@/app/api/v1/auth/google/link/route';
import { GET as pendingRegistrationsRoute } from '@/app/api/v1/admin/pending-registrations/route';
import { POST as approveRegistrationRoute } from '@/app/api/v1/admin/registrations/[id]/approve/route';
import { POST as rejectRegistrationRoute } from '@/app/api/v1/admin/registrations/[id]/reject/route';

describe('QWSC Authentication & Authorization Test Suite', () => {
  let server: any;

  // In-memory mock database state
  const mockUsers: Map<string, any> = new Map();
  const mockRefreshTokens: Map<string, any> = new Map();
  const mockOAuthAccounts: Map<string, any> = new Map();
  const mockAuditLogs: any[] = [];

  before(async () => {
    // Intercept Prisma methods with in-memory test store
    prisma.user.findFirst = (async (args: any) => {
      const conds = args?.where?.OR || (args?.where ? [args.where] : []);
      const excludeId = args?.where?.id?.not;
      for (const u of mockUsers.values()) {
        if (excludeId && u.id === excludeId) continue;
        for (const cond of conds) {
          if (cond.email && u.email === cond.email) return u;
          if (cond.phone && u.phone === cond.phone) return u;
        }
        if (args?.where?.phone && u.phone === args.where.phone) {
          return u;
        }
      }
      return null;
    }) as any;

    prisma.user.findUnique = (async (args: any) => {
      const { where } = args;
      let user = null;
      if (where.email) {
        for (const u of mockUsers.values()) {
          if (u.email === where.email) {
            user = u;
            break;
          }
        }
      }
      if (!user && where.id) {
        user = mockUsers.get(where.id) || null;
      }
      if (!user) return null;
      const providers = Array.from(mockOAuthAccounts.values()).filter((a) => a.userId === user.id);
      return {
        ...user,
        oauthAccounts: providers,
      };
    }) as any;

    prisma.user.findMany = (async (args: any) => {
      const status = args?.where?.status;
      const list = Array.from(mockUsers.values());
      if (status) {
        return list.filter((u) => u.status === status);
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
        replacedBy: null,
        ...args.data,
      };
      mockRefreshTokens.set(rt.tokenHash, rt);
      return rt;
    }) as any;

    prisma.refreshToken.findFirst = (async (args: any) => {
      const tokenHash = args.where.tokenHash;
      const rt = mockRefreshTokens.get(tokenHash);
      if (!rt) return null;
      if (args.include?.user) {
        return { ...rt, user: mockUsers.get(rt.userId) };
      }
      return rt;
    }) as any;

    prisma.refreshToken.update = (async (args: any) => {
      const id = args.where.id;
      for (const [hash, rt] of mockRefreshTokens.entries()) {
        if (rt.id === id) {
          const updated = { ...rt, ...args.data };
          mockRefreshTokens.set(hash, updated);
          return updated;
        }
      }
      throw new Error('Refresh token not found');
    }) as any;

    prisma.refreshToken.updateMany = (async (args: any) => {
      let count = 0;
      for (const [hash, rt] of mockRefreshTokens.entries()) {
        if (args.where.familyId && rt.familyId === args.where.familyId) {
          mockRefreshTokens.set(hash, { ...rt, ...args.data });
          count++;
        }
        if (args.where.tokenHash && rt.tokenHash === args.where.tokenHash) {
          mockRefreshTokens.set(hash, { ...rt, ...args.data });
          count++;
        }
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

    prisma.oAuthAccount = {
      findUnique: (async (args: any) => {
        const key = `${args.where.provider_providerUserId.provider}:${args.where.provider_providerUserId.providerUserId}`;
        const acc = mockOAuthAccounts.get(key);
        if (!acc) return null;
        if (args.include?.user) {
          return { ...acc, user: mockUsers.get(acc.userId) };
        }
        return acc;
      }) as any,

      create: (async (args: any) => {
        const id = 'oauth-' + Math.random().toString(36).substring(2, 9);
        const acc = {
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args.data,
        };
        const key = `${acc.provider}:${acc.providerUserId}`;
        if (mockOAuthAccounts.has(key)) {
          const err: any = new Error('Unique constraint failed on the fields: (`provider`,`provider_user_id`)');
          err.code = 'P2002';
          throw err;
        }
        mockOAuthAccounts.set(key, acc);
        return acc;
      }) as any,
    } as any;

    const mockSports: Map<string, any> = new Map([
      ['badminton', { id: 'sport-badminton', slug: 'badminton', name: 'Badminton', isActive: true }],
    ]);
    const mockSportProfiles: Map<string, any> = new Map();

    prisma.sport = {
      findUnique: (async (args: any) => {
        if (args?.where?.slug) return mockSports.get(args.where.slug) || null;
        return null;
      }) as any,
    } as any;

    prisma.memberSportProfile = {
      upsert: (async (args: any) => {
        const key = `${args.create.userId}:${args.create.sportId}`;
        const profile = { id: 'profile-' + Math.random().toString(36), ...args.create, updatedAt: new Date() };
        mockSportProfiles.set(key, profile);
        return profile;
      }) as any,
    } as any;

    setGoogleTokenVerifierForTesting(async (idToken: string, expectedNonce?: string) => {
      if (idToken === 'invalid-google-token') {
        throw new Error('Invalid Google ID token: Signature verification failed.');
      }
      if (idToken === 'unverified-email-token') {
        throw new Error('Unverified Google email address. Google accounts must have a verified email.');
      }
      if (idToken === 'nonce-token' && expectedNonce !== 'expected-nonce-999') {
        throw new Error('Invalid Google ID token: Nonce mismatch.');
      }

      try {
        const parsed = JSON.parse(idToken);
        return {
          sub: parsed.sub || 'google-sub-default',
          email: (parsed.email || 'googleuser@qwsc.org').toLowerCase().trim(),
          emailVerified: parsed.emailVerified !== undefined ? parsed.emailVerified : true,
          name: parsed.name || 'Google Player',
          picture: parsed.picture,
          nonce: parsed.nonce,
        };
      } catch {
        return {
          sub: 'google-sub-standard',
          email: 'googleuser@qwsc.org',
          emailVerified: true,
          name: 'Google User',
        };
      }
    });

    prisma.$transaction = (async (callbackOrPromises: any) => {
      if (typeof callbackOrPromises === 'function') {
        return callbackOrPromises(prisma);
      }
      return Promise.all(callbackOrPromises);
    }) as any;

    // Test request dispatcher
    const inject = async (options: {
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
      const existingCookieHeader = reqHeaders.get('cookie');
      if (existingCookieHeader) {
        cookiePairs.push(existingCookieHeader);
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

      // Execute CSRF proxy guard if present
      const mwRes = proxy(req);
      if (mwRes && mwRes.status !== 200) {
        const text = await mwRes.text();
        return {
          statusCode: mwRes.status,
          body: text,
          payload: text,
          headers: Object.fromEntries(mwRes.headers.entries()),
          cookies: mwRes.cookies.getAll().map((c) => ({
            ...c,
            sameSite: c.sameSite ? c.sameSite.charAt(0).toUpperCase() + c.sameSite.slice(1).toLowerCase() : undefined,
          })),
        };
      }

      // Route invocation
      const pathname = new URL(fullUrl).pathname;
      let response: NextResponse | undefined;

      if (pathname === '/api/v1/auth/register' && method === 'POST') {
        response = await registerRoute(req);
      } else if (pathname === '/api/v1/auth/login' && method === 'POST') {
        response = await loginRoute(req);
      } else if (pathname === '/api/v1/auth/me' && method === 'GET') {
        response = await meRoute(req);
      } else if (pathname === '/api/v1/auth/refresh' && method === 'POST') {
        response = await refreshRoute(req);
      } else if (pathname === '/api/v1/auth/logout' && method === 'POST') {
        response = await logoutRoute(req);
      } else if (pathname === '/api/v1/auth/onboard' && method === 'POST') {
        response = await onboardRoute(req);
      } else if (pathname === '/api/v1/auth/google/config' && method === 'GET') {
        response = await googleConfigRoute();
      } else if (pathname === '/api/v1/auth/google' && method === 'POST') {
        response = await googleRoute(req);
      } else if (pathname === '/api/v1/auth/google/link' && method === 'POST') {
        response = await googleLinkRoute(req);
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
          payload: JSON.stringify({ error: 'Not Found' }),
          headers: {},
          cookies: [],
        };
      }

      const text = await response.text();
      const cookiesList = response.cookies.getAll().map((c) => ({
        ...c,
        sameSite: c.sameSite ? c.sameSite.charAt(0).toUpperCase() + c.sameSite.slice(1).toLowerCase() : undefined,
      }));

      return {
        statusCode: response.status,
        body: text,
        payload: text,
        headers: Object.fromEntries(response.headers.entries()),
        cookies: cookiesList,
      };
    };

    server = {
      inject,
      jwt: {
        sign: (payload: any) => {
          const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
          const body = Buffer.from(
            JSON.stringify({
              ...payload,
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 15 * 60,
            })
          ).toString('base64url');
          const signature = crypto
            .createHmac('sha256', process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_min_32_chars!')
            .update(`${header}.${body}`)
            .digest('base64url');
          return `${header}.${body}.${signature}`;
        },
      },
      close: async () => {},
    };
  });

  after(async () => {
    if (server) await server.close();
  });

  beforeEach(() => {
    mockUsers.clear();
    mockRefreshTokens.clear();
    mockOAuthAccounts.clear();
    mockAuditLogs.length = 0;
  });

  test('1. Successful registration creates a pending account with MEMBER role and PENDING_APPROVAL status', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Ahmed Al-Kuwari',
        email: 'ahmed@qwsc.org',
        phone: '+974 5555 1234',
        password: 'Password123!',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.status, 'ok');
    assert.equal(body.user.role, 'MEMBER');
    assert.equal(body.user.status, 'PENDING_APPROVAL');
    assert.equal(body.user.email, 'ahmed@qwsc.org');

    // Verify stored user password hash uses Argon2id
    const stored = mockUsers.get(body.user.id);
    assert.ok(stored.passwordHash.startsWith('$argon2id$'));
    assert.notEqual(stored.passwordHash, 'Password123!');
  });

  test('2. Duplicate email registration is rejected safely (409 Conflict)', async () => {
    // Register first user
    await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Player One',
        email: 'duplicate@qwsc.org',
        phone: '+974 5555 0001',
        password: 'Password123!',
      },
    });

    // Attempt second registration with same email
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Player Two',
        email: 'duplicate@qwsc.org',
        phone: '+974 5555 0002',
        password: 'Password123!',
      },
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.body);
    assert.equal(body.statusCode, 409);
    assert.match(body.message, /already exists/i);
  });

  test('3. Passwords are never stored or returned in plaintext', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Secure User',
        email: 'secure@qwsc.org',
        phone: '+974 5555 9999',
        password: 'SecretPassword99!',
      },
    });

    const body = JSON.parse(res.body);
    assert.equal(body.user.password, undefined);
    assert.equal(body.user.passwordHash, undefined);

    const storedUser = mockUsers.get(body.user.id);
    const isPlaintext = storedUser.passwordHash === 'SecretPassword99!';
    assert.equal(isPlaintext, false);
    assert.equal(await verifyPassword(storedUser.passwordHash, 'SecretPassword99!'), true);
  });

  test('4. Pending users cannot login or access protected member endpoints (403 ACCOUNT_PENDING_APPROVAL)', async () => {
    // Create pending user
    await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Pending Player',
        email: 'pending@qwsc.org',
        phone: '+974 5555 7777',
        password: 'Password123!',
      },
    });

    // Attempt login
    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'pending@qwsc.org',
        password: 'Password123!',
      },
    });

    assert.equal(loginRes.statusCode, 403);
    const loginBody = JSON.parse(loginRes.body);
    assert.equal(loginBody.code, 'ACCOUNT_PENDING_APPROVAL');
    assert.match(loginBody.message, /pending administrator approval/i);

    // No cookies issued
    assert.equal(loginRes.cookies.length, 0);
  });

  test('5. Invalid login fails with generic error (401 Unauthorized)', async () => {
    // Non-existent email
    const res1 = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'nobody@qwsc.org',
        password: 'WrongPassword!',
      },
    });
    assert.equal(res1.statusCode, 401);
    assert.equal(JSON.parse(res1.body).message, 'Invalid email or password.');

    // Existing user with wrong password
    const pwHash = await hashPassword('CorrectPassword1!');
    mockUsers.set('user-1', {
      id: 'user-1',
      fullName: 'Active Player',
      email: 'active@qwsc.org',
      phone: '+974 5555 1111',
      passwordHash: pwHash,
      role: 'MEMBER',
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    const res2 = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'active@qwsc.org',
        password: 'WrongPassword!',
      },
    });
    assert.equal(res2.statusCode, 401);
    assert.equal(JSON.parse(res2.body).message, 'Invalid email or password.');
  });

  test('6. Valid login and current-user checks work with HTTP-only cookies', async () => {
    const pwHash = await hashPassword('ValidPass123!');
    mockUsers.set('user-2', {
      id: 'user-2',
      fullName: 'Court Captain',
      email: 'captain@qwsc.org',
      phone: '+974 5555 2222',
      passwordHash: pwHash,
      role: 'MEMBER',
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'captain@qwsc.org',
        password: 'ValidPass123!',
      },
    });

    assert.equal(loginRes.statusCode, 200);

    // Check cookies
    const accessCookie = loginRes.cookies.find((c: any) => c.name === ACCESS_TOKEN_COOKIE);
    const refreshCookie = loginRes.cookies.find((c: any) => c.name === REFRESH_TOKEN_COOKIE);

    assert.ok(accessCookie);
    assert.ok(refreshCookie);
    assert.equal(accessCookie.httpOnly, true);
    assert.equal(accessCookie.sameSite, 'Lax');
    assert.equal(refreshCookie.httpOnly, true);
    assert.equal(refreshCookie.sameSite, 'Lax');

    // Call GET /me using access cookie
    const meRes = await server.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      cookies: {
        [ACCESS_TOKEN_COOKIE]: accessCookie.value,
      },
    });

    assert.equal(meRes.statusCode, 200);
    const meBody = JSON.parse(meRes.body);
    assert.equal(meBody.user.email, 'captain@qwsc.org');
    assert.equal(meBody.user.role, 'MEMBER');
    assert.equal(meBody.user.status, 'ACTIVE');
  });

  test('7. Expired or invalid tokens are rejected on protected endpoints', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      cookies: {
        [ACCESS_TOKEN_COOKIE]: 'invalid.jwt.token',
      },
    });

    assert.equal(res.statusCode, 401);
    assert.equal(JSON.parse(res.body).error, 'Unauthorized');
  });

  test('8. Refresh-token rotation and reuse detection work', async () => {
    const pwHash = await hashPassword('ValidPass123!');
    mockUsers.set('user-rot', {
      id: 'user-rot',
      fullName: 'Rotation User',
      email: 'rotation@qwsc.org',
      phone: '+974 5555 3333',
      passwordHash: pwHash,
      role: 'MEMBER',
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    // 1. Initial Login
    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'rotation@qwsc.org', password: 'ValidPass123!' },
    });
    const initialRefreshCookie = loginRes.cookies.find((c: any) => c.name === REFRESH_TOKEN_COOKIE);

    // 2. Refresh Token Rotation
    const rotateRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: {
        [REFRESH_TOKEN_COOKIE]: initialRefreshCookie.value,
      },
    });

    assert.equal(rotateRes.statusCode, 200);
    const newRefreshCookie = rotateRes.cookies.find((c: any) => c.name === REFRESH_TOKEN_COOKIE);
    assert.ok(newRefreshCookie);
    assert.notEqual(newRefreshCookie.value, initialRefreshCookie.value);

    // 3. Reuse Detection: Present the OLD (already rotated) refresh token again
    const reuseRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: {
        [REFRESH_TOKEN_COOKIE]: initialRefreshCookie.value,
      },
    });

    assert.equal(reuseRes.statusCode, 401);
    const reuseBody = JSON.parse(reuseRes.body);
    assert.equal(reuseBody.code, 'REFRESH_TOKEN_REUSE_DETECTED');

    // 4. Verify that the new token was ALSO revoked as part of the family revocation
    const subsequentRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: {
        [REFRESH_TOKEN_COOKIE]: newRefreshCookie.value,
      },
    });
    assert.equal(subsequentRes.statusCode, 401);
  });

  test('9. Logout revokes refresh credentials and clears cookies', async () => {
    const pwHash = await hashPassword('ValidPass123!');
    mockUsers.set('user-out', {
      id: 'user-out',
      fullName: 'Logout User',
      email: 'logout@qwsc.org',
      phone: '+974 5555 4444',
      passwordHash: pwHash,
      role: 'MEMBER',
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'logout@qwsc.org', password: 'ValidPass123!' },
    });
    const refreshCookie = loginRes.cookies.find((c: any) => c.name === REFRESH_TOKEN_COOKIE);

    const logoutRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      cookies: {
        [REFRESH_TOKEN_COOKIE]: refreshCookie.value,
      },
    });

    assert.equal(logoutRes.statusCode, 200);
    // Refresh token should now be marked revoked
    const stored = mockRefreshTokens.get(hashToken(refreshCookie.value));
    assert.equal(stored.isRevoked, true);
  });

  test('10. Members cannot perform administrator actions (403 Forbidden)', async () => {
    // Generate member access token
    const memberToken = server.jwt.sign({
      sub: 'user-member',
      email: 'member@qwsc.org',
      role: 'MEMBER',
      status: 'ACTIVE',
    });

    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/pending-registrations',
      cookies: {
        [ACCESS_TOKEN_COOKIE]: memberToken,
      },
    });

    assert.equal(res.statusCode, 403);
    assert.equal(JSON.parse(res.body).message, 'Insufficient permissions to perform this action.');
  });

  test('11. Only administrators can approve or reject registrations', async () => {
    // Create pending user
    mockUsers.set('pending-1', {
      id: 'pending-1',
      fullName: 'Awaiting Player',
      email: 'awaiting@qwsc.org',
      phone: '+974 5555 8888',
      role: 'MEMBER',
      status: 'PENDING_APPROVAL',
      createdAt: new Date(),
    });

    // Admin token
    const adminToken = server.jwt.sign({
      sub: 'admin-1',
      email: 'admin@qwsc.org',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    // 1. Admin lists pending registrations
    const listRes = await server.inject({
      method: 'GET',
      url: '/api/v1/admin/pending-registrations',
      cookies: {
        [ACCESS_TOKEN_COOKIE]: adminToken,
      },
    });
    assert.equal(listRes.statusCode, 200);
    const listBody = JSON.parse(listRes.body);
    assert.equal(listBody.count, 1);
    assert.equal(listBody.users[0].email, 'awaiting@qwsc.org');

    // 2. Admin approves registration
    const approveRes = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/registrations/pending-1/approve',
      cookies: {
        [ACCESS_TOKEN_COOKIE]: adminToken,
      },
    });
    assert.equal(approveRes.statusCode, 200);
    const approveBody = JSON.parse(approveRes.body);
    assert.equal(approveBody.user.status, 'ACTIVE');

    // 3. Verify user in mock store is now ACTIVE
    assert.equal(mockUsers.get('pending-1').status, 'ACTIVE');

    // 4. Verify audit log was recorded
    const audit = mockAuditLogs.find((l) => l.action === 'ADMIN_APPROVED_REGISTRATION');
    assert.ok(audit);
    assert.equal(audit.entityId, 'pending-1');
  });

  test('12. CORS rejection on untrusted origin on state-changing requests', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      headers: {
        origin: 'http://malicious-website.com',
      },
      payload: {
        fullName: 'Attacker',
        email: 'attacker@evil.com',
        phone: '+974 0000 0000',
        password: 'Password123!',
      },
    });

    assert.equal(res.statusCode, 403);
    assert.match(JSON.parse(res.body).message, /Untrusted origin/i);
  });

  test('13. Valid Google ID token registration creates a pending account with MEMBER role and PENDING_APPROVAL status', async () => {
    const googleToken = JSON.stringify({
      sub: 'google-sub-new-player',
      email: 'newgoogleplayer@qwsc.org',
      name: 'Nasser Al-Kuwari',
      emailVerified: true,
    });

    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        idToken: googleToken,
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.status, 'pending');
    assert.equal(body.code, 'ACCOUNT_PENDING_APPROVAL');
    assert.equal(body.user.role, 'MEMBER');
    assert.equal(body.user.status, 'PENDING_APPROVAL');
    assert.equal(body.user.email, 'newgoogleplayer@qwsc.org');
    assert.equal(body.user.fullName, 'Nasser Al-Kuwari');

    // Verify stored OAuth link in mock database
    const oauthAccount = mockOAuthAccounts.get('google:google-sub-new-player');
    assert.ok(oauthAccount);
    assert.equal(oauthAccount.userId, body.user.id);
    assert.equal(oauthAccount.provider, 'google');
    assert.equal(oauthAccount.providerUserId, 'google-sub-new-player');

    // Ensure NO session cookies are issued to pending account
    assert.equal(res.cookies.length, 0);
  });

  test('14. Invalid Google ID token is rejected (401 Unauthorized)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        idToken: 'invalid-google-token',
      },
    });

    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.body);
    assert.equal(body.statusCode, 401);
    assert.match(body.message, /verification failed/i);
  });

  test('15. Google ID token with unverified email is rejected (401 Unauthorized)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        idToken: 'unverified-email-token',
      },
    });

    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.body);
    assert.match(body.message, /verified email/i);
  });

  test('16. Google nonce verification protects against replay attacks', async () => {
    // Fails when nonce doesn't match expected nonce
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        idToken: 'nonce-token',
        nonce: 'wrong-nonce',
      },
    });

    assert.equal(res.statusCode, 401);
    assert.match(JSON.parse(res.body).message, /nonce mismatch/i);
  });

  test('17. Existing active Google-linked user logs in successfully and receives HTTP-only cookies', async () => {
    // Seed existing active user and linked OAuth account
    const userId = 'user-active-google';
    mockUsers.set(userId, {
      id: userId,
      fullName: 'Rashid Al-Athba',
      email: 'rashid@qwsc.org',
      phone: null,
      passwordHash: null,
      role: 'MEMBER',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockOAuthAccounts.set('google:google-sub-rashid', {
      id: 'oauth-rashid',
      userId,
      provider: 'google',
      providerUserId: 'google-sub-rashid',
      email: 'rashid@qwsc.org',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const googleToken = JSON.stringify({
      sub: 'google-sub-rashid',
      email: 'rashid@qwsc.org',
      name: 'Rashid Al-Athba',
      emailVerified: true,
    });

    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        idToken: googleToken,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.status, 'ok');
    assert.equal(body.user.email, 'rashid@qwsc.org');

    // Verify HTTP-only session cookies issued
    const accessCookie = res.cookies.find((c: any) => c.name === ACCESS_TOKEN_COOKIE);
    const refreshCookie = res.cookies.find((c: any) => c.name === REFRESH_TOKEN_COOKIE);
    assert.ok(accessCookie);
    assert.ok(refreshCookie);
    assert.equal(accessCookie.httpOnly, true);
    assert.equal(refreshCookie.httpOnly, true);

    // Call GET /me using access cookie and check providers list
    const meRes = await server.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      cookies: {
        [ACCESS_TOKEN_COOKIE]: accessCookie.value,
      },
    });
    assert.equal(meRes.statusCode, 200);
    const meBody = JSON.parse(meRes.body);
    assert.equal(meBody.user.hasPassword, false);
    assert.deepEqual(meBody.user.providers, ['google']);
  });

  test('18. Existing Google-linked user in PENDING_APPROVAL status cannot log in (403 ACCOUNT_PENDING_APPROVAL)', async () => {
    const userId = 'user-pending-google';
    mockUsers.set(userId, {
      id: userId,
      fullName: 'Pending Google Player',
      email: 'pending_google@qwsc.org',
      role: 'MEMBER',
      status: 'PENDING_APPROVAL',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockOAuthAccounts.set('google:google-sub-pending', {
      id: 'oauth-pending',
      userId,
      provider: 'google',
      providerUserId: 'google-sub-pending',
      email: 'pending_google@qwsc.org',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const googleToken = JSON.stringify({
      sub: 'google-sub-pending',
      email: 'pending_google@qwsc.org',
      emailVerified: true,
    });

    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        idToken: googleToken,
      },
    });

    assert.equal(res.statusCode, 403);
    const body = JSON.parse(res.body);
    assert.equal(body.code, 'ACCOUNT_PENDING_APPROVAL');
    assert.equal(res.cookies.length, 0);
  });

  test('19. Existing Google-linked user in SUSPENDED status is blocked (403 Forbidden)', async () => {
    const userId = 'user-suspended-google';
    mockUsers.set(userId, {
      id: userId,
      fullName: 'Suspended Player',
      email: 'suspended_google@qwsc.org',
      role: 'MEMBER',
      status: 'SUSPENDED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockOAuthAccounts.set('google:google-sub-suspended', {
      id: 'oauth-suspended',
      userId,
      provider: 'google',
      providerUserId: 'google-sub-suspended',
      email: 'suspended_google@qwsc.org',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const googleToken = JSON.stringify({
      sub: 'google-sub-suspended',
      email: 'suspended_google@qwsc.org',
      emailVerified: true,
    });

    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        idToken: googleToken,
      },
    });

    assert.equal(res.statusCode, 403);
    assert.equal(JSON.parse(res.body).code, 'ACCOUNT_SUSPENDED');
  });

  test('20. Google login does not automatically link to existing password account with matching email (409 Conflict ACCOUNT_LINKING_REQUIRED)', async () => {
    // Seed existing password user with email match
    const pwHash = await hashPassword('ExistingPass123!');
    const userId = 'user-password-only';
    mockUsers.set(userId, {
      id: userId,
      fullName: 'Password Only Player',
      email: 'shared_email@qwsc.org',
      phone: '+974 5555 4321',
      passwordHash: pwHash,
      role: 'MEMBER',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Try Google sign-in with same email but new unlinked Google sub
    const googleToken = JSON.stringify({
      sub: 'google-sub-unlinked-new',
      email: 'shared_email@qwsc.org',
      name: 'Google Attacker or Alias',
      emailVerified: true,
    });

    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/google',
      payload: {
        idToken: googleToken,
      },
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.body);
    assert.equal(body.code, 'ACCOUNT_LINKING_REQUIRED');
    assert.match(body.message, /verify your password to link/i);

    // Verify NO OAuth account was automatically linked
    assert.equal(mockOAuthAccounts.has('google:google-sub-unlinked-new'), false);
    assert.equal(res.cookies.length, 0);
  });

  test('21. Secure account linking succeeds when valid password of existing account is provided', async () => {
    // Existing password user
    const pwHash = await hashPassword('SecretKey123!');
    const userId = 'user-link-target';
    mockUsers.set(userId, {
      id: userId,
      fullName: 'Link Target User',
      email: 'linktarget@qwsc.org',
      passwordHash: pwHash,
      role: 'MEMBER',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const googleToken = JSON.stringify({
      sub: 'google-sub-linked-securely',
      email: 'linktarget@qwsc.org',
      emailVerified: true,
    });

    // Link with correct password
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/google/link',
      payload: {
        idToken: googleToken,
        password: 'SecretKey123!',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.status, 'ok');
    assert.match(body.message, /linked successfully/i);

    // Verify OAuth account is now created in store
    const linked = mockOAuthAccounts.get('google:google-sub-linked-securely');
    assert.ok(linked);
    assert.equal(linked.userId, userId);

    // Verify session cookies issued
    assert.ok(res.cookies.find((c: any) => c.name === ACCESS_TOKEN_COOKIE));
  });

  test('22. Account linking fails when invalid password is provided (401 Unauthorized)', async () => {
    const pwHash = await hashPassword('CorrectPass123!');
    mockUsers.set('user-pw-fail', {
      id: 'user-pw-fail',
      fullName: 'Target User',
      email: 'pwfail@qwsc.org',
      passwordHash: pwHash,
      role: 'MEMBER',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const googleToken = JSON.stringify({
      sub: 'google-sub-bad-link',
      email: 'pwfail@qwsc.org',
      emailVerified: true,
    });

    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/google/link',
      payload: {
        idToken: googleToken,
        password: 'WrongPassword!',
      },
    });

    assert.equal(res.statusCode, 401);
    assert.match(JSON.parse(res.body).message, /invalid account password/i);
    assert.equal(mockOAuthAccounts.has('google:google-sub-bad-link'), false);
  });

  test('23. Duplicate Google identity cannot be linked or registered twice (409 Conflict)', async () => {
    mockOAuthAccounts.set('google:google-sub-already-taken', {
      id: 'oauth-taken',
      userId: 'user-orig',
      provider: 'google',
      providerUserId: 'google-sub-already-taken',
      email: 'taken@qwsc.org',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const googleToken = JSON.stringify({
      sub: 'google-sub-already-taken',
      email: 'seconduser@qwsc.org',
      emailVerified: true,
    });

    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/google/link',
      payload: {
        idToken: googleToken,
        password: 'AnyPassword!',
      },
    });

    assert.equal(res.statusCode, 409);
    assert.match(JSON.parse(res.body).message, /already linked/i);
  });

  test('24. Google login config endpoint returns public client ID without exposing secrets', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/auth/google/config',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(typeof body.enabled, 'boolean');
    assert.equal(typeof body.clientId, 'string');
    assert.equal(body.clientSecret, undefined);
  });

  test('25. Stepwise flow: Step 1 registration without phone succeeds and marks isOnboarded as false', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Step One User',
        email: 'stepone@qwsc.org',
        password: 'SecurePassword123!',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.user.email, 'stepone@qwsc.org');
    assert.equal(body.user.phone, null);
    assert.equal(body.user.status, 'PENDING_APPROVAL');
    assert.equal(body.user.isOnboarded, false);
    assert.ok(body.user.id);
  });

  test('26. Stepwise flow: Step 2 onboarding saves phone, Qatar address, and sport division', async () => {
    // 1. Initial Step 1 registration
    const regRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        fullName: 'Player To Onboard',
        email: 'onboardme@qwsc.org',
        password: 'SecurePassword123!',
      },
    });

    assert.equal(regRes.statusCode, 201);
    const registeredUser = JSON.parse(regRes.body).user;
    assert.equal(registeredUser.isOnboarded, false);

    // 2. Step 2 Onboarding submission
    const onboardRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/onboard',
      payload: {
        userId: registeredUser.id,
        phone: '+974 5511 2233',
        address: 'Al Wakrah, Zone 90, Street 840',
        divisionCode: 'DIV_B',
        preferredSlot: 'SLOT_1_1800',
      },
    });

    assert.equal(onboardRes.statusCode, 200);
    const onboardBody = JSON.parse(onboardRes.body);
    assert.equal(onboardBody.status, 'ok');
    assert.equal(onboardBody.user.id, registeredUser.id);
    assert.equal(onboardBody.user.phone, '+974 5511 2233');
    assert.equal(onboardBody.user.address, 'Al Wakrah, Zone 90, Street 840');
    assert.equal(onboardBody.user.isOnboarded, true);
    // Crucial security invariant: user remains PENDING_APPROVAL until administrator approves
    assert.equal(onboardBody.user.status, 'PENDING_APPROVAL');
  });

  test('27. Step 2 onboarding rejects duplicate phone numbers and invalid input', async () => {
    // Existing user with a phone
    mockUsers.set('user-phone-holder', {
      id: 'user-phone-holder',
      fullName: 'Phone Holder',
      email: 'phoneholder@qwsc.org',
      phone: '+974 7777 8888',
      role: 'MEMBER',
      status: 'PENDING_APPROVAL',
      isOnboarded: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // New pending user
    mockUsers.set('user-new-pending', {
      id: 'user-new-pending',
      fullName: 'New Pending',
      email: 'newpending@qwsc.org',
      phone: null,
      role: 'MEMBER',
      status: 'PENDING_APPROVAL',
      isOnboarded: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Attempt onboarding with conflicting phone
    const conflictRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/onboard',
      payload: {
        userId: 'user-new-pending',
        phone: '+974 7777 8888',
        address: 'Doha, Al Sadd',
      },
    });

    assert.equal(conflictRes.statusCode, 409);
    assert.match(JSON.parse(conflictRes.body).message, /phone number already exists/i);

    // Attempt onboarding with missing/invalid address
    const invalidRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/onboard',
      payload: {
        userId: 'user-new-pending',
        phone: '+974 5555 4444',
        address: 'ab', // too short (< 3 chars)
      },
    });

    assert.equal(invalidRes.statusCode, 400);
  });
});
