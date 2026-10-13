import 'server-only';
import { prisma } from '../db';
import { AvailabilityStatus, SlotWindow } from '@prisma/client';

export interface SubmitAvailabilityInput {
  userId: string;
  sessionId: string;
  status: AvailabilityStatus;
  preferredSlot?: string;
  notes?: string;
}

export async function getCourtList(sportSlug: string = 'badminton') {
  return prisma.court.findMany({
    where: {
      sport: {
        slug: sportSlug,
      },
      isOperational: true,
    },
    orderBy: {
      courtNumber: 'asc',
    },
  });
}

export async function submitAvailability(input: SubmitAvailabilityInput) {
  return prisma.memberAvailability.upsert({
    where: {
      userId_sessionId: {
        userId: input.userId,
        sessionId: input.sessionId,
      },
    },
    update: {
      status: input.status,
      preferredSlot: input.preferredSlot ?? 'EITHER',
      notes: input.notes,
    },
    create: {
      userId: input.userId,
      sessionId: input.sessionId,
      status: input.status,
      preferredSlot: input.preferredSlot ?? 'EITHER',
      notes: input.notes,
    },
  });
}

export async function getSessionAttendees(sessionId: string) {
  return prisma.memberAvailability.findMany({
    where: { sessionId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          sportProfiles: true,
        },
      },
    },
    orderBy: {
      submittedAt: 'asc',
    },
  });
}

export const BOOKING_SLOTS: Record<SlotWindow, { label: string; time: string }> = {
  [SlotWindow.SLOT_1_1800]: { label: 'Slot 1', time: '18:00 - 19:30' },
  [SlotWindow.SLOT_2_1930]: { label: 'Slot 2', time: '19:30 - 21:00' },
};

export * from './court-booking-service';

