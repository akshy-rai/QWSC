"use client";

import React from "react";
import Link from "next/link";
import { IconArrowRight, IconMapPin, IconCalendar, IconUsers, IconShieldCheck } from "./icons/Icons";
import { useAuth } from "@/context/AuthContext";

export function FinalCta() {
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
      : "Go to Member Portal";

  return (
    <section className="py-20 md:py-28 bg-surface-elevated border-b border-border-subtle">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-surface border border-border-subtle text-[11px] font-bold uppercase tracking-widest text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-club-red" />
          <span>Qatar Wakra Badminton Club</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-tight">
          {isAuth ? "Ready for Friday Badminton?" : "Join us on the court."}
        </h2>

        <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
          {isAuth ? (
            <>
              You are signed in as <strong className="text-foreground">{user?.fullName}</strong>.{" "}
              {user?.role === "ADMIN"
                ? "Access the administrative management panel to oversee player status, confirm trials, and inspect audit logs."
                : user?.role === "COORDINATOR"
                ? "Manage court operations, schedules, maintenance closures, and game reservations."
                : "Check your court flight assignment, doubles partner pairing, and Friday schedule."}
            </>
          ) : (
            "Whether you are an active QWBC member accessing your Friday match schedule or a badminton player in Al Wakra looking to join competitive sessions, connect with us."
          )}
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          {isAuth ? (
            <>
              <Link
                href={dashboardHref}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-club-red px-6 py-3.5 text-sm font-bold text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-club-red shadow-xs"
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
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-border-strong bg-surface px-6 py-3.5 text-sm font-semibold text-foreground hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-club-red"
              >
                View Session Details
              </a>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-club-red px-6 py-3.5 text-sm font-bold text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-club-red shadow-xs"
              >
                <span>Member Portal & Lineups</span>
                <IconArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-border-strong bg-surface px-6 py-3.5 text-sm font-semibold text-foreground hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-club-red"
              >
                Join QWBC / Request Trial
              </Link>
            </>
          )}
        </div>

        <div className="pt-8 border-t border-border-subtle flex flex-wrap items-center justify-center gap-6 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <IconMapPin className="w-3.5 h-3.5 text-club-red" />
            <span>Al Wakra, State of Qatar</span>
          </span>
          <span className="flex items-center gap-1.5">
            <IconCalendar className="w-3.5 h-3.5 text-club-navy dark:text-blue-400" />
            <span>Every Friday Evening</span>
          </span>
          <span className="flex items-center gap-1.5">
            <IconUsers className="w-3.5 h-3.5 text-foreground" />
            <span>200 Active Club Members</span>
          </span>
        </div>
      </div>
    </section>
  );
}
