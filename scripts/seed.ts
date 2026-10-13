/**
 * Database Seeder for Qatar Wakra Sports Club (QWSC)
 *
 * Populates realistic, idempotent initial data:
 * 1. Badminton Sport Record & Wakra Complex Courts 1-4
 * 2. League Season 2026 Competition & Divisions (DIV_A, DIV_B, DIV_C, MIXED)
 * 3. Seed Users with Argon2id passwords:
 *    - Admin: admin@qwsc.org (Password: Admin1234!)
 *    - Coordinator: coordinator@qwsc.org (Password: Coord1234!)
 *    - Members: ahmed@qwsc.org, khalid@qwsc.org, marcus@qwsc.org, rahul@qwsc.org (Password: Member1234!)
 *    - Pending Registration: pending@qwsc.org (Password: Pending1234!)
 * 4. Member Sport Profiles with division ratings
 * 5. Upcoming Friday Session (Published) with Member Availabilities
 * 6. Sample Scheduled Match on Court 1 (Men's Doubles)
 *
 * Run with: pnpm db:seed
 */
import {
  PrismaClient,
  UserRole,
  UserStatus,
  SessionStatus,
  AvailabilityStatus,
  SlotWindow,
  MatchStatus,
  BadmintonDiscipline,
} from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

async function hashUserPassword(pwd: string): Promise<string> {
  return hash(pwd, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

function getNextFriday(): Date {
  const d = new Date();
  const day = d.getDay(); // 0 is Sunday, 5 is Friday
  const diff = (5 - day + 7) % 7 || 7; // Next Friday
  d.setDate(d.getDate() + diff);
  d.setHours(18, 0, 0, 0);
  return d;
}

export async function seed() {
  console.log('🌱 Starting QWSC database seeding...\n');

  // 1. Sport: Badminton
  const badminton = await prisma.sport.upsert({
    where: { slug: 'badminton' },
    update: { isActive: true },
    create: {
      slug: 'badminton',
      name: 'Badminton',
      isActive: true,
    },
  });
  console.log(`✓ Sport: ${badminton.name} (${badminton.slug})`);

  // 2. Facility Courts 1 - 4
  const courts = [];
  for (let i = 1; i <= 4; i++) {
    const existing = await prisma.court.findFirst({
      where: { sportId: badminton.id, courtNumber: i },
    });
    if (existing) {
      courts.push(existing);
    } else {
      const court = await prisma.court.create({
        data: {
          sportId: badminton.id,
          courtNumber: i,
          name: `Court ${i}`,
          isOperational: true,
        },
      });
      courts.push(court);
    }
  }
  console.log(`✓ Courts: Created/Verified 4 facility courts at Wakra Sports Complex`);

  // 3. Competition: Friday League 2026
  let competition = await prisma.competition.findFirst({
    where: { sportId: badminton.id, title: 'QWBC Friday League 2026' },
  });
  if (!competition) {
    const startDate = new Date();
    startDate.setMonth(0, 1); // Jan 1st of current year
    competition = await prisma.competition.create({
      data: {
        sportId: badminton.id,
        title: 'QWBC Friday League 2026',
        type: 'LEAGUE_SEASON',
        startDate,
        status: 'ACTIVE',
      },
    });
  }
  console.log(`✓ Competition: ${competition.title}`);

  // 4. Divisions
  const divisionConfigs = [
    { code: 'DIV_A', name: 'Premier Flight (Division A)' },
    { code: 'DIV_B', name: 'Championship Flight (Division B)' },
    { code: 'DIV_C', name: 'Development Flight (Division C)' },
    { code: 'MIXED', name: 'Mixed Doubles Flight' },
  ];

  for (const div of divisionConfigs) {
    const existingDiv = await prisma.division.findFirst({
      where: { competitionId: competition.id, code: div.code },
    });
    if (!existingDiv) {
      await prisma.division.create({
        data: {
          competitionId: competition.id,
          sportId: badminton.id,
          code: div.code,
          name: div.name,
        },
      });
    }
  }
  console.log(`✓ Divisions: Created/Verified ${divisionConfigs.length} competition flights`);

  // 5. Seed Users
  const adminPasswordHash = await hashUserPassword('Admin1234!');
  const coordPasswordHash = await hashUserPassword('Coord1234!');
  const memberPasswordHash = await hashUserPassword('Member1234!');
  const pendingPasswordHash = await hashUserPassword('Pending1234!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@qwsc.org' },
    update: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    create: {
      email: 'admin@qwsc.org',
      fullName: 'Wakra Sports Administrator',
      phone: '+974 5500 0001',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      address: 'Al Wakra Main Boulevard, Doha, Qatar',
      isOnboarded: true,
    },
  });

  const coordinator = await prisma.user.upsert({
    where: { email: 'coordinator@qwsc.org' },
    update: { role: UserRole.COORDINATOR, status: UserStatus.ACTIVE },
    create: {
      email: 'coordinator@qwsc.org',
      fullName: 'Tariq Al-Mansoor',
      phone: '+974 5500 0002',
      passwordHash: coordPasswordHash,
      role: UserRole.COORDINATOR,
      status: UserStatus.ACTIVE,
      address: 'Al Jabal Street, Al Wakra, Qatar',
      isOnboarded: true,
    },
  });

  const memberUsers = [
    {
      email: 'ahmed@qwsc.org',
      fullName: 'Ahmed Al-Kuwari',
      phone: '+974 5511 0001',
      division: 'DIV_A',
      rating: 4.8,
      flight: 'SLOT_1_1800',
    },
    {
      email: 'khalid@qwsc.org',
      fullName: 'Khalid Al-Thani',
      phone: '+974 5511 0002',
      division: 'DIV_A',
      rating: 4.5,
      flight: 'SLOT_1_1800',
    },
    {
      email: 'marcus@qwsc.org',
      fullName: 'Marcus Chen',
      phone: '+974 5511 0003',
      division: 'DIV_B',
      rating: 3.8,
      flight: 'FLEXIBLE',
    },
    {
      email: 'rahul@qwsc.org',
      fullName: 'Rahul Sharma',
      phone: '+974 5511 0004',
      division: 'DIV_B',
      rating: 3.7,
      flight: 'FLEXIBLE',
    },
    {
      email: 'omar@qwsc.org',
      fullName: 'Omar Farooq',
      phone: '+974 5511 0005',
      division: 'DIV_C',
      rating: 2.9,
      flight: 'SLOT_2_1930',
    },
    {
      email: 'fatima@qwsc.org',
      fullName: 'Fatima Al-Sulaiti',
      phone: '+974 5511 0006',
      division: 'MIXED',
      rating: 3.5,
      flight: 'FLEXIBLE',
    },
  ];

  const createdMembers = [];
  for (const m of memberUsers) {
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: { status: UserStatus.ACTIVE, role: UserRole.MEMBER },
      create: {
        email: m.email,
        fullName: m.fullName,
        phone: m.phone,
        passwordHash: memberPasswordHash,
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        address: 'Al Wakra, State of Qatar',
        isOnboarded: true,
      },
    });

    await prisma.memberSportProfile.upsert({
      where: {
        userId_sportId: {
          userId: user.id,
          sportId: badminton.id,
        },
      },
      update: {
        divisionCode: m.division,
        skillRating: m.rating,
        preferredFlight: m.flight,
      },
      create: {
        userId: user.id,
        sportId: badminton.id,
        divisionCode: m.division,
        skillRating: m.rating,
        preferredFlight: m.flight,
      },
    });

    createdMembers.push(user);
  }

  // Pending user (for testing registration approval console)
  await prisma.user.upsert({
    where: { email: 'pending@qwsc.org' },
    update: { status: UserStatus.PENDING_APPROVAL },
    create: {
      email: 'pending@qwsc.org',
      fullName: 'Sultan Al-Marri',
      phone: '+974 5599 0001',
      passwordHash: pendingPasswordHash,
      role: UserRole.MEMBER,
      status: UserStatus.PENDING_APPROVAL,
      address: 'Ezdan Village 4, Al Wakra, Qatar',
      isOnboarded: true,
    },
  });

  console.log(`✓ Users: Created Admin, Coordinator, 6 Active Members, and 1 Pending User`);

  // 6. Upcoming Friday Session
  const nextFriday = getNextFriday();
  let session = await prisma.session.findFirst({
    where: {
      competitionId: competition.id,
      sessionDate: nextFriday,
    },
  });

  if (!session) {
    session = await prisma.session.create({
      data: {
        competitionId: competition.id,
        sportId: badminton.id,
        sessionDate: nextFriday,
        startTime: '18:00',
        endTime: '21:00',
        publicationStatus: SessionStatus.PUBLISHED,
        publishedBy: coordinator.id,
        publishedAt: new Date(),
      },
    });
  }
  console.log(`✓ Session: Friday session on ${nextFriday.toISOString().split('T')[0]} (18:00 - 21:00)`);

  // 7. Member Availability for Friday
  for (const member of createdMembers) {
    await prisma.memberAvailability.upsert({
      where: {
        userId_sessionId: {
          userId: member.id,
          sessionId: session.id,
        },
      },
      update: { status: AvailabilityStatus.AVAILABLE },
      create: {
        userId: member.id,
        sessionId: session.id,
        status: AvailabilityStatus.AVAILABLE,
        preferredSlot: 'EITHER',
        notes: 'Ready for Friday lineup',
      },
    });
  }
  console.log(`✓ Availabilities: Submitted availability for ${createdMembers.length} active players`);

  // 8. Sample Scheduled Match on Court 1 (Ahmed & Khalid vs Marcus & Rahul)
  const court1 = courts[0];
  let match = await prisma.match.findFirst({
    where: {
      sessionId: session.id,
      courtId: court1.id,
      slotWindow: SlotWindow.SLOT_1_1800,
    },
  });

  if (!match) {
    match = await prisma.match.create({
      data: {
        sessionId: session.id,
        courtId: court1.id,
        sportId: badminton.id,
        slotWindow: SlotWindow.SLOT_1_1800,
        matchOrder: 1,
        status: MatchStatus.SCHEDULED,
      },
    });

    // Side 1: Ahmed & Khalid
    const side1 = await prisma.matchParticipant.create({
      data: {
        matchId: match.id,
        side: 1,
        teamDisplayName: 'Al-Kuwari / Al-Thani',
      },
    });
    await prisma.matchParticipantPlayer.createMany({
      data: [
        { participantId: side1.id, userId: createdMembers[0].id },
        { participantId: side1.id, userId: createdMembers[1].id },
      ],
    });

    // Side 2: Marcus & Rahul
    const side2 = await prisma.matchParticipant.create({
      data: {
        matchId: match.id,
        side: 2,
        teamDisplayName: 'Chen / Sharma',
      },
    });
    await prisma.matchParticipantPlayer.createMany({
      data: [
        { participantId: side2.id, userId: createdMembers[2].id },
        { participantId: side2.id, userId: createdMembers[3].id },
      ],
    });

    // Badminton Match Detail
    await prisma.badmintonMatchDetail.create({
      data: {
        matchId: match.id,
        discipline: BadmintonDiscipline.MENS_DOUBLES,
        shuttleBrand: 'Yonex Aerosensa AS-30',
        shuttleCountUsed: 2,
        rulesPreset: 'BWF_STANDARD_21',
        bestOfSets: 3,
      },
    });
    console.log(`✓ Match: Scheduled Men's Doubles on Court 1 (18:00 - 19:30)`);
  }

  console.log('\n======================================================');
  console.log('🎉 Seeding successfully completed!');
  console.log('======================================================');
  console.log('Login credentials for local testing:');
  console.log('  Admin:       admin@qwsc.org       / Admin1234!');
  console.log('  Coordinator: coordinator@qwsc.org / Coord1234!');
  console.log('  Members:     ahmed@qwsc.org       / Member1234!');
  console.log('               khalid@qwsc.org      / Member1234!');
  console.log('               marcus@qwsc.org      / Member1234!');
  console.log('  Pending:     pending@qwsc.org     / Pending1234!');
  console.log('======================================================\n');
}

// Execute when invoked directly
seed()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
