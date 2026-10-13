<<<<<<< HEAD
# Qatar Wakra Sports Club (QWSC)

Digital operations and member platform for **Qatar Wakra Sports Club** (launching initially with **Qatar Wakra Badminton Club — QWBC**).

The repository is built as a unified, full-stack **Next.js application** structured in accordance with **Tudar v2** conventions.

---

## 1. Architecture & Directory Structure

```
QWSC/
├── docs/                        # Architecture, design guidelines & migration records
├── prisma/                      # PostgreSQL schema & tracked Prisma migrations
├── public/                      # Static assets, branding, and images
├── scripts/                     # Standalone database seeders and scripts
├── src/
│   ├── app/                     # App Router: pages, layouts, and route handlers
│   │   ├── api/v1/              # Versioned REST API endpoints (auth, admin, health)
│   │   ├── portal/              # Member portal & admin registration console
│   │   ├── signin/              # Member & coordinator authentication page
│   │   ├── register/            # Registration & 2-step onboarding page
│   │   ├── layout.tsx           # Global root layout & font provider
│   │   └── page.tsx             # Public landing page
│   ├── components/              # Reusable React UI components
│   ├── context/                 # Context providers (AuthContext)
│   ├── hooks/                   # Custom React client hooks (useAuth, useTheme)
│   ├── lib/                     # Client fetch wrapper and API utilities
│   ├── server/                  # Server-only feature modules ('server-only' guarded)
│   │   ├── auth/                # Session tokens, Argon2id, Google OAuth, middleware
│   │   ├── admin/               # Administrator moderation and approval
│   │   ├── members/             # Member profiles and directories
│   │   ├── bookings/            # Court availability and slot bookings
│   │   ├── tournaments/         # Competitions, matches, and scorecards
│   │   ├── scheduling/          # Friday session lineups & publishing
│   │   ├── payments/            # Dues management and transaction audit logging
│   │   └── db.ts                # PrismaClient singleton
│   ├── styles/                  # Design tokens, theme constants, breakpoints
│   ├── types/                   # Zod schemas and inferred TypeScript types
│   └── utils/                   # Formatting, date/time, and helper utilities
├── tests/                       # Automated integration tests (node:test + tsx)
├── eslint.config.mjs            # ESLint 9 flat configuration
├── next.config.ts               # Next.js configuration
├── package.json                 # Project dependencies & scripts
└── tsconfig.json                # TypeScript configuration with @/* path alias
```

---

## 2. Technology Stack

* **Framework**: Next.js 16.3 (Turbopack, App Router)
* **UI**: React 19, Tailwind CSS v4
* **Database & ORM**: PostgreSQL with Prisma ORM
* **Authentication**: Dual-token pattern (Argon2id password hashing, HTTP-only SameSite cookies, short-lived JOSE JWTs, rotating SHA-256 refresh tokens, and Google OAuth 2.0 / GIS)
* **Testing**: Node.js native test runner (`node:test`) executed via `tsx`

---

## 3. Getting Started

### Prerequisites

* **Node.js**: `v20+` or `v24+`
* **pnpm**: `v10+`
* **PostgreSQL**: Local or remote instance (v14+)

### Installation & Environment Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   ```
   Update `DATABASE_URL`, `JWT_SECRET`, and `COOKIE_SECRET` in `.env`.

3. Generate Prisma client & seed database:
   ```bash
   pnpm db:generate
   pnpm db:seed
   ```

---

## 4. Development & Operations Commands

| Command | Action |
|---|---|
| `pnpm dev` | Start Next.js development server (`http://localhost:3000`) |
| `pnpm build` | Create optimized production bundle |
| `pnpm start` | Run Next.js production server |
| `pnpm test` | Run full authentication & authorization test suite |
| `pnpm typecheck` | Run `tsc --noEmit` across all TypeScript files |
| `pnpm lint` | Run ESLint check |
| `pnpm db:generate` | Generate Prisma client from schema |
| `pnpm db:migrate` | Apply pending Prisma database migrations |
| `pnpm db:seed` | Seed default Badminton sport & courts 1–4 |

---

## 5. Security & Governance

1. **Server-Only Boundaries**: Backend operations (`src/server/*`) strictly use `import 'server-only'` to prevent sensitive server logic from leaking into client bundles.
2. **Same-Origin API**: Frontend routes make relative requests (`/api/v1/*`), removing cross-origin complexity and maintaining secure HTTP-only cookies.
3. **Audit Trails**: All privileged administrator actions (approvals, rejections, overrides) are logged in the immutable `AuditLog` table.
=======
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
>>>>>>> ffe39e2616768b52c8c4adf9a75178293f9cd39d
