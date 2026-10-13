import 'server-only';
import { prisma } from '../db';
import { Prisma } from '@prisma/client';

export interface MembershipFeeRecord {
  userId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'WAIVED';
  billingPeriod: string;
  notes?: string;
}

/**
 * Server module managing membership fees, subscriptions, and financial records.
 * Provides integration hooks for Qatar local payment gateways (QPay / Debit Cards).
 */
export async function getMemberPaymentSummary(userId: string) {
  // Queries user standing and audit logs for financial records
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      status: true,
      createdAt: true,
      auditLogs: {
        where: {
          action: {
            startsWith: 'PAYMENT_',
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      },
    },
  });

  return user;
}

export async function logPaymentTransaction(
  userId: string,
  adminUserId: string | null,
  action: 'PAYMENT_RECORDED' | 'PAYMENT_WAIVED' | 'PAYMENT_REFUNDED',
  details: Record<string, unknown>
) {
  return prisma.auditLog.create({
    data: {
      actorUserId: adminUserId ?? userId,
      action,
      entityType: 'membership_payment',
      entityId: userId,
      afterState: details as Prisma.InputJsonValue,
    },
  });
}
