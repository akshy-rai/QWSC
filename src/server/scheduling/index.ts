import 'server-only';
import { prisma } from '../db';
import { SessionStatus } from '@prisma/client';

export interface CreateSessionInput {
  competitionId: string;
  sportId: string;
  sessionDate: Date;
  startTime: string;
  endTime: string;
}

export async function createSession(input: CreateSessionInput) {
  return prisma.session.create({
    data: {
      competitionId: input.competitionId,
      sportId: input.sportId,
      sessionDate: input.sessionDate,
      startTime: input.startTime,
      endTime: input.endTime,
      publicationStatus: SessionStatus.DRAFT,
    },
  });
}

export async function publishSession(sessionId: string, publisherUserId: string) {
  return prisma.session.update({
    where: { id: sessionId },
    data: {
      publicationStatus: SessionStatus.PUBLISHED,
      publishedBy: publisherUserId,
      publishedAt: new Date(),
    },
  });
}

export async function getUpcomingPublishedSessions(sportSlug: string = 'badminton') {
  return prisma.session.findMany({
    where: {
      sport: { slug: sportSlug },
      publicationStatus: SessionStatus.PUBLISHED,
      sessionDate: {
        gte: new Date(),
      },
    },
    include: {
      competition: true,
      matches: {
        include: {
          court: true,
          participants: {
            include: {
              players: {
                include: {
                  player: {
                    select: {
                      id: true,
                      fullName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      sessionDate: 'asc',
    },
  });
}
