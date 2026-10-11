"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { IconMenu, IconX, IconSun, IconMoon } from "./icons/Icons";
import { ModalMode } from "./PortalModal";
import { useTheme } from "./ThemeProvider";

interface NavbarProps {
  onOpenPortal: (mode: ModalMode) => void;
}

export function Navbar({ onOpenPortal }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "About", href: "#about" },
    { name: "Sessions & Venue", href: "#sessions" },
    { name: "Divisions", href: "#divisions" },
    { name: "Member Experience", href: "#experience" },
  ];

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
          href="#top"
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
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border-subtle bg-surface text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-club-red"
            aria-label="Toggle appearance"
            title="Toggle appearance"
          >
            <IconSun className="w-4 h-4 text-amber-400 hidden dark:block" />
            <IconMoon className="w-4 h-4 text-slate-700 block dark:hidden" />
          </button>

          <button
            type="button"
            onClick={() => onOpenPortal("join")}
            className="rounded-md border border-border-strong bg-surface px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-club-red"
          >
            Join / Inquire
          </button>

          <button
            type="button"
            onClick={() => onOpenPortal("signin")}
            className="rounded-md bg-club-red px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-club-red shadow-xs"
          >
            Member Sign In
          </button>
        </div>

        {/* Mobile Header Controls */}
        <div className="flex sm:hidden items-center gap-2">
          {/* Theme Toggle Button (Mobile) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-surface text-text-secondary hover:text-foreground transition-colors"
            aria-label="Toggle appearance"
            title="Toggle appearance"
          >
            <IconSun className="w-3.5 h-3.5 text-amber-400 hidden dark:block" />
            <IconMoon className="w-3.5 h-3.5 text-slate-700 block dark:hidden" />
          </button>

          <button
            type="button"
            onClick={() => onOpenPortal("signin")}
            className="rounded-md bg-club-red px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition-colors"
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md text-text-secondary hover:text-foreground focus:outline-none focus:ring-2 focus:ring-club-red transition-colors"
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
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPortal("join");
              }}
              className="w-full rounded-md border border-border-strong bg-surface py-2 text-xs font-semibold text-foreground hover:bg-surface-elevated transition-colors text-center"
            >
              Join QWBC / Request Trial
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPortal("signin");
              }}
              className="w-full rounded-md bg-club-red py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors text-center"
            >
              Member & Coordinator Portal
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
