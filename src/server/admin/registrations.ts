import 'server-only';
import { prisma } from '@/server/db';

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
 * Activates a pending user and writes an audit log entry.
 * Returns the updated user or throws if not found / already active.
 */
export async function approveRegistration(
  userId: string,
  actorId: string,
  ipAddress: string | null
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return { error: 'NOT_FOUND' as const };
  }

  if (user.status === 'ACTIVE') {
    return { error: 'ALREADY_ACTIVE' as const };
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
 */
export async function rejectRegistration(
  userId: string,
  actorId: string,
  ipAddress: string | null,
  reason?: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return { error: 'NOT_FOUND' as const };
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
