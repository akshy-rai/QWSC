import 'server-only';
import { prisma } from '../db';
import { UserRole, UserStatus, Prisma } from '@prisma/client';

export interface MemberProfileUpdateInput {
  fullName?: string;
  phone?: string;
  address?: string;
  divisionCode?: string;
  preferredFlight?: string;
}

export async function getMemberById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      sportProfiles: {
        include: {
          sport: true,
        },
      },
    },
  });
}

export async function listActiveMembers() {
  return prisma.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
      role: UserRole.MEMBER,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      status: true,
      role: true,
      sportProfiles: true,
      createdAt: true,
    },
    orderBy: {
      fullName: 'asc',
    },
  });
}

export async function updateMemberProfile(
  userId: string,
  input: MemberProfileUpdateInput,
  sportSlug: string = 'badminton'
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        ...(input.fullName ? { fullName: input.fullName } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
        ...(input.address ? { address: input.address } : {}),
      },
    });

    if (input.divisionCode || input.preferredFlight) {
      const sport = await tx.sport.findUnique({ where: { slug: sportSlug } });
      if (sport) {
        await tx.memberSportProfile.upsert({
          where: {
            userId_sportId: {
              userId,
              sportId: sport.id,
            },
          },
          update: {
            ...(input.divisionCode ? { divisionCode: input.divisionCode } : {}),
            ...(input.preferredFlight ? { preferredFlight: input.preferredFlight } : {}),
          },
          create: {
            userId,
            sportId: sport.id,
            divisionCode: input.divisionCode || 'DIV_B',
            preferredFlight: input.preferredFlight || 'FLEXIBLE',
          },
        });
      }
    }

    return user;
  });
}
