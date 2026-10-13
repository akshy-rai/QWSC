"use client";

import React from "react";
import Link from "next/link";

interface AuthTabsProps {
  activeTab: "signin" | "register";
}

export function AuthTabs({ activeTab }: AuthTabsProps) {
  return (
    <div className="flex items-center p-1 rounded-xl bg-surface-elevated border border-border-subtle w-full max-w-xs mx-auto mb-6 select-none">
      {activeTab === "signin" ? (
        <span className="flex-1 py-2 px-3 text-xs font-bold text-center rounded-lg bg-surface text-foreground shadow-xs border border-border-subtle cursor-default">
          Sign In
        </span>
      ) : (
        <Link
          href="/signin"
          className="flex-1 py-2 px-3 text-xs font-semibold text-center rounded-lg text-text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          Sign In
        </Link>
      )}

      {activeTab === "register" ? (
        <span className="flex-1 py-2 px-3 text-xs font-bold text-center rounded-lg bg-surface text-foreground shadow-xs border border-border-subtle cursor-default">
          New Player
        </span>
      ) : (
        <Link
          href="/register"
          className="flex-1 py-2 px-3 text-xs font-semibold text-center rounded-lg text-text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          New Player
        </Link>
      )}
    </div>
  );
}
