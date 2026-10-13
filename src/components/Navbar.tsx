"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconMenu, IconX, IconSun, IconMoon, IconShieldCheck, IconUsers } from "./icons/Icons";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isSignIn = pathname === "/signin";
  const isRegister = pathname === "/register";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const navLinks = [
    { name: "About", href: "/#about" },
    { name: "Sessions & Venue", href: "/#sessions" },
    { name: "Divisions", href: "/#divisions" },
    { name: "Member Experience", href: "/#experience" },
  ];

  const dashboardHref =
    user?.role === "ADMIN"
      ? "/admin"
      : user?.role === "COORDINATOR"
      ? "/coordinator"
      : "/member";
  const dashboardLabel =
    user?.role === "ADMIN"
      ? "Admin Console"
      : user?.role === "COORDINATOR"
      ? "Coordinator Console"
      : "Member Portal";

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-150 ${
        scrolled
          ? "bg-surface/95 dark:bg-[#0e1320]/95 backdrop-blur-md border-b border-border-subtle shadow-xs"
          : "bg-surface dark:bg-[#0b0f19] border-b border-border-subtle/80"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-18">
        {/* Brand */}
        <Link
          href="/"
          className="group flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-club-red rounded-md p-1"
          aria-label="Qatar Wakra Badminton Club"
        >
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white p-1 border border-border-strong shadow-xs">
            <Image
              src="/qwbc-logo.png"
              alt="QWBC Logo"
              width={34}
              height={34}
              className="object-contain"
              priority
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-foreground group-hover:text-club-red transition-colors">
                QWBC
              </span>
              <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-surface-elevated text-text-muted border border-border-subtle">
                Al Wakra
              </span>
            </div>
            <span className="text-[11px] text-text-muted font-normal">
              Qatar Wakra Badminton Club
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="hidden md:flex items-center gap-7"
          aria-label="Main Navigation"
        >
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-club-red rounded-sm py-1"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border-subtle bg-surface text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-club-red cursor-pointer"
            aria-label="Toggle appearance"
            title="Toggle appearance"
          >
            <IconSun className="w-4 h-4 text-amber-400 hidden dark:block" />
            <IconMoon className="w-4 h-4 text-slate-700 block dark:hidden" />
          </button>

          {user && user.status === "ACTIVE" ? (
            /* Logged-In User Action & Profile Badge */
            <div className="flex items-center gap-2.5">
              <Link
                href={dashboardHref}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-strong bg-surface hover:bg-surface-elevated transition-colors text-xs font-semibold text-foreground"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-club-navy/10 text-club-navy dark:text-blue-400 font-bold text-[11px]">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[120px] truncate">{user.fullName.split(" ")[0]}</span>
                <span
                  className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                    user.role === "ADMIN"
                      ? "bg-club-navy text-white"
                      : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                  }`}
                >
                  {user.role}
                </span>
              </Link>

              <Link
                href={dashboardHref}
                className="rounded-lg bg-club-navy hover:bg-blue-800 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-xs"
              >
                {dashboardLabel}
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-border-subtle bg-surface hover:bg-surface-elevated px-3 py-2 text-xs font-semibold text-text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            /* Guest / Signed Out Button */
            <Link
              href="/signin"
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-club-red shadow-xs ${
                isSignIn || isRegister
                  ? "bg-club-red text-white ring-2 ring-club-red/30 shadow-md shadow-club-red/20"
                  : "bg-club-red text-white hover:bg-red-700 hover:shadow-md"
              }`}
            >
              Sign In / Register
            </Link>
          )}
        </div>

        {/* Mobile Header Controls */}
        <div className="flex sm:hidden items-center gap-2">
          {/* Theme Toggle Button (Mobile) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-surface text-text-secondary hover:text-foreground transition-colors cursor-pointer"
            aria-label="Toggle appearance"
            title="Toggle appearance"
          >
            <IconSun className="w-3.5 h-3.5 text-amber-400 hidden dark:block" />
            <IconMoon className="w-3.5 h-3.5 text-slate-700 block dark:hidden" />
          </button>

          {user && user.status === "ACTIVE" ? (
            <Link
              href={dashboardHref}
              className="rounded-md bg-club-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors"
            >
              {user.role === "ADMIN" ? "Admin" : "Portal"}
            </Link>
          ) : (
            <Link
              href="/signin"
              className="rounded-md bg-club-red px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition-colors"
            >
              Sign In
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md text-text-secondary hover:text-foreground focus:outline-none focus:ring-2 focus:ring-club-red transition-colors cursor-pointer"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <IconX className="w-5 h-5" /> : <IconMenu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-border-subtle bg-surface px-4 py-4 space-y-3">
          {user && user.status === "ACTIVE" && (
            <div className="p-3 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-club-navy/10 text-club-navy font-bold text-xs">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-foreground">{user.fullName}</div>
                  <div className="text-[10px] text-text-muted">{user.email}</div>
                </div>
              </div>
              <span
                className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                  user.role === "ADMIN"
                    ? "bg-club-navy text-white"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {user.role}
              </span>
            </div>
          )}

          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-2 py-1.5 text-sm font-semibold uppercase tracking-wider text-text-secondary hover:text-club-red rounded transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-border-subtle flex flex-col gap-2">
            {user && user.status === "ACTIVE" ? (
              <>
                <Link
                  href={dashboardHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-lg bg-club-navy py-2.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors text-center shadow-xs flex items-center justify-center gap-2"
                >
                  {user.role === "ADMIN" ? (
                    <IconShieldCheck className="w-4 h-4" />
                  ) : (
                    <IconUsers className="w-4 h-4" />
                  )}
                  <span>Open {dashboardLabel}</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full rounded-lg border border-border-strong bg-surface py-2.5 text-xs font-semibold text-text-muted hover:text-foreground transition-colors text-center cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/signin"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full rounded-lg bg-club-red py-2.5 text-xs font-bold text-white hover:bg-red-700 transition-colors text-center shadow-xs"
              >
                Sign In / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
