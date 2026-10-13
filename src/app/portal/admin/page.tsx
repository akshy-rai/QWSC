"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { adminApi, ApiError } from "@/lib/api";
import { AuthUser } from "@/types";
import {
  IconSun,
  IconMoon,
  IconShieldCheck,
  IconCheckCircle2,
  IconAlertCircle,
} from "@/components/icons/Icons";

export default function AdminConsole() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { toggleTheme } = useTheme();

  const [pendingList, setPendingList] = useState<AuthUser[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/signin");
      } else if (user.role !== "ADMIN") {
        router.push("/portal");
      }
    }
  }, [user, isLoading, router]);

  const loadPending = async () => {
    try {
      setLoadingList(true);
      const res = await adminApi.getPendingRegistrations();
      setPendingList(res.users);
    } catch (err) {
      if (err instanceof ApiError) {
        setActionMessage({ type: "error", text: err.message });
      } else {
        setActionMessage({ type: "error", text: "Failed to load pending registrations." });
      }
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (user && user.role === "ADMIN") {
      adminApi.getPendingRegistrations()
        .then((res) => {
          if (!ignore) {
            setPendingList(res.users);
            setLoadingList(false);
          }
        })
        .catch((err) => {
          if (!ignore) {
            if (err instanceof ApiError) {
              setActionMessage({ type: "error", text: err.message });
            } else {
              setActionMessage({ type: "error", text: "Failed to load pending registrations." });
            }
            setLoadingList(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [user]);

  const handleApprove = async (userId: string, name: string) => {
    setProcessingId(userId);
    setActionMessage(null);
    try {
      await adminApi.approveRegistration(userId);
      setPendingList((prev) => prev.filter((u) => u.id !== userId));
      setActionMessage({ type: "success", text: `Account for ${name} approved and activated successfully.` });
    } catch (err) {
      if (err instanceof ApiError) {
        setActionMessage({ type: "error", text: err.message });
      } else {
        setActionMessage({ type: "error", text: "Failed to approve registration." });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string, name: string) => {
    setProcessingId(userId);
    setActionMessage(null);
    try {
      await adminApi.rejectRegistration(userId, "Application declined by administrator");
      setPendingList((prev) => prev.filter((u) => u.id !== userId));
      setActionMessage({ type: "success", text: `Application for ${name} rejected.` });
    } catch (err) {
      if (err instanceof ApiError) {
        setActionMessage({ type: "error", text: err.message });
      } else {
        setActionMessage({ type: "error", text: "Failed to reject registration." });
      }
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading || !user || user.role !== "ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-club-navy border-t-transparent" />
          <p className="text-xs text-text-muted">Verifying administrator authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-150">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-surface/95 dark:bg-[#0e1320]/95 backdrop-blur-md border-b border-border-subtle shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <Link href="/portal" className="flex items-center gap-3">
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
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-club-navy text-white">
                  Admin Console
                </span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border-subtle bg-surface text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors"
              aria-label="Toggle theme"
            >
              <IconSun className="w-4 h-4 text-amber-400 hidden dark:block" />
              <IconMoon className="w-4 h-4 text-slate-700 block dark:hidden" />
            </button>

            <Link
              href="/portal"
              className="rounded-md border border-border-strong bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-elevated transition-colors"
            >
              Back to Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-club-navy dark:text-blue-400">
              <IconShieldCheck className="w-4 h-4" />
              <span>Membership Governance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground mt-1">
              Pending Registrations
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Review public membership inquiries. Approving an account grants active member access to court schedules and availability.
            </p>
          </div>

          <button
            type="button"
            onClick={loadPending}
            disabled={loadingList}
            className="rounded-md border border-border-strong bg-surface px-3.5 py-2 text-xs font-bold text-foreground hover:bg-surface-elevated transition-colors self-start sm:self-auto disabled:opacity-50"
          >
            {loadingList ? "Refreshing..." : "Refresh Queue"}
          </button>
        </div>

        {/* Action Message Alert */}
        {actionMessage && (
          <div
            className={`rounded-md border p-4 text-xs ${
              actionMessage.type === "success"
                ? "border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200"
                : "border-red-300 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200"
            }`}
          >
            <div className="flex gap-2">
              {actionMessage.type === "success" ? (
                <IconCheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <IconAlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              )}
              <span>{actionMessage.text}</span>
            </div>
          </div>
        )}

        {/* Registration Table / Queue */}
        <div className="rounded-lg border border-border-strong bg-surface overflow-hidden shadow-xs">
          {loadingList ? (
            <div className="p-12 text-center text-xs text-text-muted">
              Loading pending registration queue...
            </div>
          ) : pendingList.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                <IconCheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Queue Clear</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                No pending registrations currently awaiting administrator approval.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border-subtle bg-surface-elevated text-text-muted uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Applicant Name</th>
                    <th className="px-6 py-3.5">Email & Phone</th>
                    <th className="px-6 py-3.5">Requested Role</th>
                    <th className="px-6 py-3.5">Submission Date</th>
                    <th className="px-6 py-3.5 text-right">Administrative Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {pendingList.map((app) => (
                    <tr key={app.id} className="hover:bg-surface-elevated/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-club-red/10 text-club-red text-xs font-black">
                            {app.fullName.charAt(0)}
                          </div>
                          <span>{app.fullName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text-secondary space-y-0.5">
                        <div className="font-mono text-[11px] text-foreground">{app.email}</div>
                        <div className="text-text-muted">{app.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text-muted font-mono text-[11px]">
                        {new Date(app.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={processingId === app.id}
                            onClick={() => handleApprove(app.id, app.fullName)}
                            className="rounded-md bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition-colors disabled:opacity-50 shadow-xs"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={processingId === app.id}
                            onClick={() => handleReject(app.id, app.fullName)}
                            className="rounded-md border border-border-strong bg-surface hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-400 hover:text-red-700 dark:hover:text-red-300 px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
