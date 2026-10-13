"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import {
  IconSun,
  IconMoon,
  IconUsers,
  IconShieldCheck,
  IconCalendar,
  IconTrophy,
} from "@/components/icons/Icons";

export default function PortalDashboard() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { toggleTheme } = useTheme();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/signin");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-club-red border-t-transparent" />
          <p className="text-xs text-text-muted">Loading QWSC member session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-150">
      {/* Portal Top Bar */}
      <header className="sticky top-0 z-40 bg-surface/95 dark:bg-[#0e1320]/95 backdrop-blur-md border-b border-border-subtle shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white p-1 border border-border-strong shadow-xs">
              <Image
                src="/qwbc-logo.png"
                alt="QWBC Logo"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight text-foreground">QWSC</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-surface-elevated text-text-muted border border-border-subtle">
                  Member Portal
                </span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border-subtle bg-surface text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors"
              aria-label="Toggle theme"
            >
              <IconSun className="w-4 h-4 text-amber-400 hidden dark:block" />
              <IconMoon className="w-4 h-4 text-slate-700 block dark:hidden" />
            </button>

            {user.role === "ADMIN" && (
              <Link
                href="/portal/admin"
                className="rounded-md border border-club-navy bg-club-navy/10 px-3 py-1.5 text-xs font-bold text-club-navy dark:text-blue-400 hover:bg-club-navy/20 transition-colors"
              >
                Admin Console
              </Link>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-border-strong bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-elevated transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="rounded-lg border border-border-strong bg-surface p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-club-red">
                  Authenticated Session
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold font-mono uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  {user.status}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-elevated text-text-muted border border-border-subtle">
                  Role: {user.role}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                Welcome, {user.fullName}
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary">
                Registered Email: <span className="text-foreground font-medium">{user.email}</span> • Mobile: <span className="text-foreground font-medium">{user.phone}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-xs font-semibold text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors"
              >
                View Public Homepage
              </Link>
            </div>
          </div>
        </div>

        {/* Admin Quick Action Card (if user is ADMIN) */}
        {user.role === "ADMIN" && (
          <div className="rounded-lg border border-club-navy/40 bg-club-navy/5 dark:bg-blue-950/20 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-club-navy text-white">
                <IconShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  Administrator Registration Review
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  As an administrator, you are authorized to inspect pending public membership registrations and activate or reject accounts.
                </p>
                <div className="pt-2">
                  <Link
                    href="/portal/admin"
                    className="inline-flex items-center gap-2 rounded-md bg-club-navy px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-xs"
                  >
                    Open Pending Registrations Console
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Member Modules Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Card 1: Friday Sessions */}
          <div className="rounded-lg border border-border-strong bg-surface p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-club-red/10 text-club-red border border-club-red/20">
                <IconCalendar className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Friday Court Sessions</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Wakra Sports Complex Courts 1–4. Submit weekly availability for upcoming Friday sessions.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-border-subtle text-xs text-text-muted font-medium">
              Schedule releases every Wednesday evening.
            </div>
          </div>

          {/* Card 2: League & Match Lineups */}
          <div className="rounded-lg border border-border-strong bg-surface p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-club-navy/10 text-club-navy dark:text-blue-400 border border-club-navy/20">
                <IconUsers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Match Lineups & Standby</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                View confirmed player pairings, opponent matchups, and standby reserve dispatch queue.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-border-subtle text-xs text-text-muted font-medium">
              Lineups verified by session coordinators.
            </div>
          </div>

          {/* Card 3: BWF Badminton Ladders */}
          <div className="rounded-lg border border-border-strong bg-surface p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                <IconTrophy className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Division Standings</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                BWF 21-point rally scoring records across Division A, B, C, and Mixed Doubles ladders.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-border-subtle text-xs text-text-muted font-medium">
              Rankings updated following Friday matches.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
