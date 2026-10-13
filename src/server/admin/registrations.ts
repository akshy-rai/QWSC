import 'server-only';
import { prisma } from '@/server/db';
import { Prisma } from '@prisma/client';
import type { AdminOverviewCounts, UserStatus } from '@/types';

/**
 * Returns all users with PENDING_APPROVAL status, oldest first.
 * Never returns sensitive fields (passwordHash, tokens).
 */
export async function getPendingRegistrations() {
  return prisma.user.findMany({
    where: { status: 'PENDING_APPROVAL' },
    select: {
      id: true,
      email: true,
      phone: true,
      address: true,
      isOnboarded: true,
      fullName: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Returns overview metrics for the Admin Console dashboard.
 */
export async function getAdminOverviewStats(): Promise<AdminOverviewCounts> {
  const [pending, approved, rejected, suspended, total] = await Promise.all([
    prisma.user.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'INACTIVE' } }),
    prisma.user.count({ where: { status: 'SUSPENDED' } }),
    prisma.user.count(),
  ]);

  return {
    pending,
    approved,
    rejected,
    suspended,
    total,
  };
}

/**
 * Paginated and filterable user query for the Admin Console.
 */
export async function getAdminMembers(options: {
  status?: UserStatus | 'ALL';
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = options.page && options.page > 0 ? options.page : 1;
  const limit = options.limit && options.limit > 0 ? options.limit : 10;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

  if (options.status && options.status !== 'ALL') {
    where.status = options.status;
  }

  if (options.search && options.search.trim()) {
    const q = options.search.trim();
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        phone: true,
        address: true,
        isOnboarded: true,
        fullName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        sportProfiles: {
          select: {
            id: true,
            sportId: true,
            divisionCode: true,
            preferredFlight: true,
            skillRating: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Activates a pending user and writes an audit log entry.
 * Prevents self-approval and invalid status transitions.
 */
export async function approveRegistration(
  userId: string,
  actorId: string,
  ipAddress: string | null
) {
  if (userId === actorId) {
    return { error: 'CANNOT_APPROVE_SELF' as const };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return { error: 'NOT_FOUND' as const };
  }

  if (user.status === 'ACTIVE') {
    return { error: 'ALREADY_ACTIVE' as const };
  }

  if (user.status !== 'PENDING_APPROVAL') {
    return { error: 'INVALID_TRANSITION' as const };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: actorId,
        action: 'ADMIN_APPROVED_REGISTRATION',
        entityType: 'users',
        entityId: userId,
        beforeState: { status: user.status },
        afterState: { status: u.status },
        ipAddress,
      },
    });

    return u;
  });

  return { user: updated };
}

/**
 * Rejects a pending user by marking them INACTIVE, revoking all tokens,
 * and writing an audit log entry.
 * Prevents self-rejection and invalid status transitions.
 */
export async function rejectRegistration(
  userId: string,
  actorId: string,
  ipAddress: string | null,
  reason?: string
) {
  if (userId === actorId) {
    return { error: 'CANNOT_REJECT_SELF' as const };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return { error: 'NOT_FOUND' as const };
  }

  if (user.status === 'INACTIVE') {
    return { error: 'ALREADY_INACTIVE' as const };
  }

  if (user.status !== 'PENDING_APPROVAL') {
    return { error: 'INVALID_TRANSITION' as const };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: userId },
      data: { status: 'INACTIVE' },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
      },
    });

    // Revoke any tokens
    await tx.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: actorId,
        action: 'ADMIN_REJECTED_REGISTRATION',
        entityType: 'users',
        entityId: userId,
        beforeState: { status: user.status },
        afterState: { status: 'INACTIVE', reason },
        ipAddress,
      },
    });

    return u;
  });

  return { user: updated };
}
