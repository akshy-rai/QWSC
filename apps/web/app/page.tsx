import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white p-1">
              <Image
                src="/qwbc-logo.png"
                alt="QWBC Logo"
                width={52}
                height={52}
                priority
              />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-wide">
                Qatar Wakra Badminton Club
              </h1>
              <p className="text-xs text-slate-400">QWBC Club Management</p>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium transition hover:bg-white/10"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold transition hover:bg-red-700"
            >
              Join QWBC
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300">
            Stronger Together
          </div>

          <h2 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
            Smarter scheduling for
            <span className="text-red-500"> QWBC players.</span>
          </h2>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Manage players, categories, locations, availability, playing groups,
            schedules, attendance and payments from one QWBC platform.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="rounded-xl bg-red-600 px-7 py-3.5 text-center font-semibold transition hover:bg-red-700"
            >
              Register / Join
            </Link>

            <Link
              href="/login"
              className="rounded-xl border border-white/20 px-7 py-3.5 text-center font-semibold transition hover:bg-white/10"
            >
              Member Login
            </Link>
          </div>
        </div>

        {/* Schedule Process Card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Monthly Process</p>
              <h3 className="mt-1 text-2xl font-bold">QWBC Scheduling</h3>
            </div>

            <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-400">
              Automated
            </span>
          </div>

          <div className="space-y-4">
            <ProcessStep
              number="01"
              title="Player Availability"
              description="Players select available days, times and locations."
            />

            <ProcessStep
              number="02"
              title="Category Matching"
              description="Players are matched using category, location and availability."
            />

            <ProcessStep
              number="03"
              title="Schedule Generation"
              description="QWBC generates the monthly draft schedule."
            />

            <ProcessStep
              number="04"
              title="Admin Review"
              description="Coordinator reviews groups, courts and conflicts."
            />

            <ProcessStep
              number="05"
              title="Publish"
              description="Final schedule is released to QWBC members."
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/10 bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-red-500">
              Club Operations
            </p>
            <h3 className="mt-2 text-3xl font-bold">
              Everything QWBC needs in one place
            </h3>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              title="Smart Scheduling"
              description="Schedule players based on category, location, availability, priority days and court capacity."
            />

            <FeatureCard
              title="Player Management"
              description="Manage registrations, categories, trials, waiting lists and playing groups."
            />

            <FeatureCard
              title="Club Management"
              description="Track attendance, replacements, payments, expenses and monthly performance."
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-slate-950 px-6 py-6 text-center text-sm text-slate-500">
        Qatar Wakra Badminton Club • QWBC Management Platform
      </footer>
    </main>
  );
}

function ProcessStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 font-bold">
        {number}
      </div>

      <div>
        <h4 className="font-semibold">{title}</h4>
        <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950 p-6 transition hover:border-red-500/40">
      <div className="mb-4 h-1 w-12 rounded bg-red-600" />
      <h4 className="text-xl font-bold">{title}</h4>
      <p className="mt-3 leading-7 text-slate-400">{description}</p>
    </div>
  );
}