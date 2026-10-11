"use client";

import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSavedTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const saved = localStorage.getItem("qwbc-theme");
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
  } catch {
    // Ignore restricted storage
  }
  return "system";
}

function subscribeToMedia(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  window.addEventListener("storage", callback);
  return () => {
    mq.removeEventListener("change", callback);
    window.removeEventListener("storage", callback);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setThemeState(getSavedTheme());
  }, []);

  const systemIsDark = useSyncExternalStore(
    subscribeToMedia,
    () => (typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : true),
    () => true
  );

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (systemIsDark ? "dark" : "light") : theme;

  useEffect(() => {
    if (!mounted) return;
    if (resolvedTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  }, [resolvedTheme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("qwbc-theme", newTheme);
    } catch {
      // Ignore storage errors
    }
  };

  const toggleTheme = () => {
    const isDark =
      typeof document !== "undefined"
        ? document.documentElement.classList.contains("dark")
        : resolvedTheme === "dark";
    const next = isDark ? "light" : "dark";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

