"use client";

import React from "react";
import Link from "next/link";
import { IconArrowRight, IconMapPin, IconClock, IconShieldCheck, IconUsers } from "./icons/Icons";
import { useAuth } from "@/context/AuthContext";

export function Hero() {
  const { user } = useAuth();
  const isAuth = Boolean(user && user.status === "ACTIVE");
  const dashboardHref =
    user?.role === "ADMIN"
      ? "/admin"
      : user?.role === "COORDINATOR"
      ? "/coordinator"
      : "/member";
  const dashboardLabel =
    user?.role === "ADMIN"
      ? "Open Admin Console"
      : user?.role === "COORDINATOR"
      ? "Coordinator Console"
      : "Member Portal & Lineups";

  return (
    <section id="top" className="relative pt-12 pb-16 md:pt-16 md:pb-24 border-b border-border-subtle bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Editorial Masthead */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-surface-elevated border border-border-subtle text-[11px] font-bold uppercase tracking-widest text-text-muted">
                <span className="h-2 w-2 rounded-full bg-club-red" />
                <span>Qatar Wakra Badminton Club • Est. Al Wakra</span>
              </div>

              {isAuth && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    Welcome, {user?.fullName.split(" ")[0]} (
                    {user?.role === "ADMIN"
                      ? "Admin"
                      : user?.role === "COORDINATOR"
                      ? "Coordinator"
                      : "Member"}
                    )
                  </span>
                </div>
              )}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.08]">
              Every Friday. <br />
              <span className="text-club-navy dark:text-blue-400">On the Court.</span>
            </h1>

            <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl">
              {isAuth ? (
                <>
                  Logged in as <strong className="text-foreground">{user?.fullName}</strong>.{" "}
                  {user?.role === "ADMIN"
                    ? "Manage weekly court allocations, review pending member registrations, and supervise club sessions."
                    : "Access your confirmed Friday match schedule, court assignments, and doubles pairings."}
                </>
              ) : (
                "Two hundred players, four competitive divisions, and weekly structured doubles sessions at Wakra Sports Complex. Organized pairings, dedicated court time, and fair play for our community."
              )}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {isAuth ? (
                <>
                  <Link
                    href={dashboardHref}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-club-red px-6 py-3.5 text-sm font-bold text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-club-red shadow-xs"
                  >
                    {user?.role === "ADMIN" ? (
                      <IconShieldCheck className="w-4 h-4" />
                    ) : (
                      <IconUsers className="w-4 h-4" />
                    )}
                    <span>{dashboardLabel}</span>
                    <IconArrowRight className="w-4 h-4" />
                  </Link>

                  <a
                    href="#sessions"
                    className="inline-flex items-center justify-center rounded-md border border-border-strong bg-surface px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-club-red"
                  >
                    View Friday Schedule
                  </a>
                </>
              ) : (
                <>
                  <Link
                    href="/signin"
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-club-red px-6 py-3.5 text-sm font-bold text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-club-red shadow-xs"
                  >
                    <span>Member Portal & Lineups</span>
                    <IconArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-md border border-border-strong bg-surface px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-club-red"
                  >
                    Join QWBC / Request Trial
                  </Link>
                </>
              )}
            </div>

            <div className="pt-6 border-t border-border-subtle grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-text-muted block font-medium">Club Members</span>
                <span className="text-sm font-bold text-foreground mt-0.5 block">
                  ~200 Active
                </span>
              </div>
              <div>
                <span className="text-text-muted block font-medium">Home Arena</span>
                <span className="text-sm font-bold text-foreground mt-0.5 block truncate">
                  Wakra Complex
                </span>
              </div>
              <div>
                <span className="text-text-muted block font-medium">Match Schedule</span>
                <span className="text-sm font-bold text-foreground mt-0.5 block">
                  Fridays 18:00
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Architectural Badminton Court Schematic */}
          <div className="lg:col-span-6 xl:col-span-6">
            <div className="rounded-lg border border-border-strong bg-surface p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                  <IconMapPin className="w-3.5 h-3.5 text-club-red" />
                  <span>Wakra Sports Complex - Match Arena</span>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-surface-elevated border border-border-subtle text-text-muted">
                  BWF Standards
                </span>
              </div>

              {/* Court Blueprint Graphic */}
              <div className="relative rounded border border-border-strong bg-surface-elevated p-4 overflow-hidden">
                {/* Court Boundary Graphic (SVG) */}
                <div className="aspect-16/10 w-full rounded border-2 border-slate-400/40 dark:border-slate-500/40 relative flex flex-col justify-between p-2 bg-slate-100/50 dark:bg-slate-900/50">
                  {/* Service court markings */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-club-red/80 dark:bg-club-red/70 z-10 flex items-center justify-between px-2">
                    <span className="bg-club-red text-white text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">
                      NET 1.55m
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 hidden sm:inline">
                      13.4m Court Length
                    </span>
                  </div>

                  <div className="h-[46%] border border-dashed border-slate-300 dark:border-slate-700 relative flex items-center justify-center p-2">
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-slate-300 dark:bg-slate-700" />
                    <div className="text-center z-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                        Court 1 & 2 • Division A
                      </span>
                      <span className="text-xs font-extrabold text-foreground mt-0.5 block">
                        Competitive Doubles Flight
                      </span>
                    </div>
                  </div>

                  <div className="h-[46%] border border-dashed border-slate-300 dark:border-slate-700 relative flex items-center justify-center p-2">
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-slate-300 dark:bg-slate-700" />
                    <div className="text-center z-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                        Court 3 & 4 • Division B & Mixed
                      </span>
                      <span className="text-xs font-extrabold text-foreground mt-0.5 block">
                        League & Social Flight
                      </span>
                    </div>
                  </div>
                </div>

                {/* Session Timetable Strip */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border border-border-subtle bg-surface p-2.5">
                    <div className="flex items-center gap-1.5 text-text-muted text-[11px] font-semibold">
                      <IconClock className="w-3.5 h-3.5 text-club-red" />
                      <span>Early Window: 18:00 – 19:30</span>
                    </div>
                    <span className="text-xs font-bold text-foreground mt-1 block">
                      Division A & Division B
                    </span>
                    <span className="text-[11px] text-text-muted block mt-0.5">
                      16 Confirmed Players (4 Courts)
                    </span>
                  </div>

                  <div className="rounded border border-border-subtle bg-surface p-2.5">
                    <div className="flex items-center gap-1.5 text-text-muted text-[11px] font-semibold">
                      <IconClock className="w-3.5 h-3.5 text-club-navy dark:text-blue-400" />
                      <span>Late Window: 19:30 – 21:00</span>
                    </div>
                    <span className="text-xs font-bold text-foreground mt-1 block">
                      Division B & Mixed League
                    </span>
                    <span className="text-[11px] text-text-muted block mt-0.5">
                      16 Confirmed Players (4 Courts)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-muted font-medium">
                <span>Shuttlecock: Yonex Tournament Feather</span>
                <span className="font-mono text-text-secondary">21-Point BWF Rally Scoring</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
