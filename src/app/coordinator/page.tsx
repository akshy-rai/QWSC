"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { AdminBookingsTab } from "@/components/admin/AdminBookingsTab";
import { AdminCourtsTab } from "@/components/admin/AdminCourtsTab";
import {
  IconSun,
  IconMoon,
  IconCalendar,
  IconClock,
  IconShieldCheck,
} from "@/components/icons/Icons";

type CoordinatorTab = "bookings" | "courts";

export default function CoordinatorDashboard() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<CoordinatorTab>("bookings");

  // Enforce Coordinator (or Admin) role authorization
  useEffect(() => {
    if (!isLoading) {
      if (!user || user.status !== "ACTIVE") {
        router.push("/signin");
      } else if (user.role === "MEMBER") {
        router.push("/member");
      }
    }
  }, [user, isLoading, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/signin");
  };

  if (isLoading || !user || (user.role !== "COORDINATOR" && user.role !== "ADMIN")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-club-red border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-muted">Loading coordinator console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-150">
      {/* Top Navigation Bar */}
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
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Coordinator Console
                </span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-surface-elevated hover:bg-surface border border-border-subtle text-text-secondary hover:text-foreground transition-colors"
              >
                <IconShieldCheck className="w-3.5 h-3.5 text-club-red" />
                <span>Admin Console</span>
              </Link>
            )}

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border-subtle bg-surface text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors"
              aria-label="Toggle theme"
            >
              <IconSun className="w-4 h-4 text-amber-400 hidden dark:block" />
              <IconMoon className="w-4 h-4 text-slate-700 block dark:hidden" />
            </button>

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

      {/* Main Content Area */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Hero Banner */}
        <div className="rounded-xl border border-border-subtle bg-surface p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                Session Coordinator
              </span>
              <span className="text-xs text-text-muted">Al Wakra Sports Club</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Court Operations & Session Logistics
            </h1>
            <p className="text-xs sm:text-sm text-text-muted">
              Oversee court availability, manage player reservations, resolve booking conflicts, and schedule facility maintenance windows.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs font-medium text-text-secondary bg-surface-elevated px-3 py-2 rounded-lg border border-border-subtle">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{user.fullName} ({user.role})</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border-subtle">
          <nav className="flex space-x-6 overflow-x-auto" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab("bookings")}
              className={`py-3 px-1 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === "bookings"
                  ? "border-amber-500 text-amber-600 dark:text-amber-400"
                  : "border-transparent text-text-muted hover:text-foreground hover:border-border-strong"
              }`}
            >
              <IconCalendar className="w-4 h-4" />
              <span>Court Bookings & Reservations</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("courts")}
              className={`py-3 px-1 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === "courts"
                  ? "border-amber-500 text-amber-600 dark:text-amber-400"
                  : "border-transparent text-text-muted hover:text-foreground hover:border-border-strong"
              }`}
            >
              <IconClock className="w-4 h-4" />
              <span>Courts & Maintenance Closures</span>
            </button>
          </nav>
        </div>

        {/* Tab 1: Court Bookings & Reservations */}
        {activeTab === "bookings" && (
          <div className="space-y-6">
            <AdminBookingsTab />
          </div>
        )}

        {/* Tab 2: Courts & Maintenance Closures */}
        {activeTab === "courts" && (
          <div className="space-y-6">
            <AdminCourtsTab />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle bg-surface/50 py-6 text-center text-xs text-text-muted">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Qatar Wakra Sports Club (QWSC) — Coordinator Console</span>
          <span>Role: {user.role} • Server Timezone: Asia/Qatar (UTC+3)</span>
        </div>
      </footer>
    </div>
  );
}
