import 'server-only';
import { prisma } from '../db';
import { MatchStatus } from '@prisma/client';

export async function listCompetitions(sportSlug: string = 'badminton') {
  return prisma.competition.findMany({
    where: {
      sport: {
        slug: sportSlug,
      },
    },
    include: {
      divisions: true,
    },
    orderBy: {
      startDate: 'desc',
    },
  });
}

export async function getCompetitionById(competitionId: string) {
  return prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      divisions: true,
      sessions: {
        orderBy: { sessionDate: 'asc' },
      },
    },
  });
}

export async function getMatchesForSession(sessionId: string) {
  return prisma.match.findMany({
    where: { sessionId },
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
      badmintonScores: {
        orderBy: { setNumber: 'asc' },
      },
    },
    orderBy: [
      { slotWindow: 'asc' },
      { matchOrder: 'asc' },
      { court: { courtNumber: 'asc' } },
    ],
  });
}

export async function updateMatchScore(
  matchId: string,
  setNumber: number,
  side1Score: number,
  side2Score: number,
  status: MatchStatus = MatchStatus.COMPLETED
) {
  const existing = await prisma.badmintonSetScore.findFirst({
    where: { matchId, setNumber },
  });

  return prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.badmintonSetScore.update({
        where: { id: existing.id },
        data: { side1Score, side2Score },
      });
    } else {
      await tx.badmintonSetScore.create({
        data: {
          matchId,
          setNumber,
          side1Score,
          side2Score,
        },
      });
    }

    return tx.match.update({
      where: { id: matchId },
      data: { status },
    });
  });
}
