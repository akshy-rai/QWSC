"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "./ThemeProvider";
import { IconSun, IconMoon } from "./icons/Icons";
import { useAuth } from "@/context/AuthContext";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <footer className="bg-surface text-text-secondary border-t border-border-subtle">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white p-1 border border-border-strong shadow-xs">
                <Image
                  src="/qwbc-logo.png"
                  alt="QWBC Logo"
                  width={30}
                  height={30}
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-foreground tracking-tight">
                  QWBC
                </span>
                <span className="text-[11px] text-text-muted">
                  Qatar Wakra Badminton Club
                </span>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed max-w-sm">
              Community sports club based in Al Wakra, Qatar. Organizing structured weekly badminton sessions, competitive doubles leagues, and member scheduling at Wakra Sports Complex.
            </p>

            <div className="pt-2 text-xs text-text-muted">
              <span>Al Wakra, State of Qatar • 200 Active Members</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/#about" className="text-text-muted hover:text-foreground transition-colors">
                  About QWBC
                </Link>
              </li>
              <li>
                <Link href="/#sessions" className="text-text-muted hover:text-foreground transition-colors">
                  Sessions & Venue
                </Link>
              </li>
              <li>
                <Link href="/#divisions" className="text-text-muted hover:text-foreground transition-colors">
                  League Divisions
                </Link>
              </li>
              <li>
                <Link href="/#experience" className="text-text-muted hover:text-foreground transition-colors">
                  Member Experience
                </Link>
              </li>
            </ul>
          </div>

          {/* Member & Staff Access */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Member & Staff Portal
            </h4>
            <p className="text-xs text-text-muted leading-relaxed">
              Active members access monthly availability windows and confirmed court assignments via authenticated club links.
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-2">
              {user && user.status === "ACTIVE" ? (
                <Link
                  href={
                    user.role === "ADMIN"
                      ? "/admin"
                      : user.role === "COORDINATOR"
                      ? "/coordinator"
                      : "/member"
                  }
                  className="rounded-md border border-border-strong bg-club-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 transition-colors text-left"
                >
                  {user.role === "ADMIN"
                    ? "Admin Console"
                    : user.role === "COORDINATOR"
                    ? "Coordinator Console"
                    : "Member Portal"}
                </Link>
              ) : (
                <>
                  <Link
                    href="/signin"
                    className="rounded-md border border-border-strong bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface transition-colors text-left"
                  >
                    Member Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-md border border-border-strong bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-club-red hover:bg-surface transition-colors text-left"
                  >
                    Join / Trial Request
                  </Link>
                </>
              )}

              {/* Theme toggle in footer */}
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-7 items-center gap-1.5 rounded-md border border-border-subtle bg-surface px-2.5 text-[11px] font-medium text-text-muted hover:text-foreground transition-colors"
                aria-label="Toggle theme"
              >
                <IconSun className="w-3.5 h-3.5 text-amber-400 hidden dark:block" />
                <span className="hidden dark:inline">Light Mode</span>
                <IconMoon className="w-3.5 h-3.5 text-slate-700 block dark:hidden" />
                <span className="inline dark:hidden">Dark Mode</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Copyright Strip */}
        <div className="mt-12 pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>© {currentYear} Qatar Wakra Badminton Club. All rights reserved.</span>
          <span className="font-mono text-[11px]">
            Wakra Sports Complex • Al Wakra, Qatar
          </span>
        </div>
      </div>
    </footer>
  );
}
