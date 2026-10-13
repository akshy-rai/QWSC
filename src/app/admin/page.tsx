"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { adminApi, ApiError } from "@/lib/api";
import { AdminMemberItem, AdminOverviewCounts, UserStatus } from "@/types";
import {
  IconSun,
  IconMoon,
  IconShieldCheck,
  IconCheckCircle2,
  IconAlertCircle,
  IconSearch,
  IconRefreshCw,
  IconX,
  IconUsers,
  IconClock,
} from "@/components/icons/Icons";

export default function AdminConsole() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { toggleTheme } = useTheme();

  // Metrics Overview State
  const [counts, setCounts] = useState<AdminOverviewCounts>({
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
    total: 0,
  });
  const [loadingCounts, setLoadingCounts] = useState(true);

  // Members List & Filtering State
  const [members, setMembers] = useState<AdminMemberItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [statusFilter, setStatusFilter] = useState<UserStatus | "ALL">("PENDING_APPROVAL");
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // User Actions State
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Dialog / Modal States
  const [selectedMember, setSelectedMember] = useState<AdminMemberItem | null>(null);
  const [confirmApproveMember, setConfirmApproveMember] = useState<AdminMemberItem | null>(null);
  const [confirmRejectMember, setConfirmRejectMember] = useState<AdminMemberItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const searchInputId = useId();
  const rejectReasonInputId = useId();

  // Auth Protection: Redirect unauthenticated or non-admin users directly
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/signin");
      } else if (user.role !== "ADMIN") {
        router.push("/portal");
      }
    }
  }, [user, isLoading, router]);

  // Fetch real database overview counts
  const loadOverviewCounts = useCallback(() => {
    setLoadingCounts(true);
    return adminApi.getOverviewCounts()
      .then((res) => {
        setCounts(res.counts);
      })
      .catch((err) => {
        console.error("Failed to load overview counts:", err);
      })
      .finally(() => {
        setLoadingCounts(false);
      });
  }, []);

  // Fetch filtered member list
  const loadMembers = useCallback(() => {
    setLoadingMembers(true);
    return adminApi.getMembers({
      status: statusFilter,
      search: appliedSearch.trim() || undefined,
      page: currentPage,
      limit: 10,
    })
      .then((res) => {
        setMembers(res.members);
        setTotalPages(res.pagination.totalPages);
        setTotalRecords(res.pagination.total);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setActionMessage({ type: "error", text: err.message });
        } else {
          setActionMessage({ type: "error", text: "Failed to load member records." });
        }
      })
      .finally(() => {
        setLoadingMembers(false);
      });
  }, [statusFilter, appliedSearch, currentPage]);

  // Initial and reactive load
  useEffect(() => {
    let ignore = false;
    if (user && user.role === "ADMIN") {
      adminApi.getOverviewCounts().then((res) => {
        if (!ignore) {
          setCounts(res.counts);
          setLoadingCounts(false);
        }
      }).catch((err) => {
        if (!ignore) {
          console.error("Failed to load overview counts:", err);
          setLoadingCounts(false);
        }
      });

      adminApi.getMembers({
        status: statusFilter,
        search: appliedSearch.trim() || undefined,
        page: currentPage,
        limit: 10,
      }).then((res) => {
        if (!ignore) {
          setMembers(res.members);
          setTotalPages(res.pagination.totalPages);
          setTotalRecords(res.pagination.total);
          setLoadingMembers(false);
        }
      }).catch((err) => {
        if (!ignore) {
          if (err instanceof ApiError) {
            setActionMessage({ type: "error", text: err.message });
          } else {
            setActionMessage({ type: "error", text: "Failed to load member records." });
          }
          setLoadingMembers(false);
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [user, statusFilter, appliedSearch, currentPage]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setAppliedSearch(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setAppliedSearch("");
    setCurrentPage(1);
  };

  // Status Filter Switcher
  const handleStatusFilterChange = (newStatus: UserStatus | "ALL") => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  // Perform Member Approval
  const executeApprove = async () => {
    if (!confirmApproveMember) return;
    setIsProcessing(true);
    setActionMessage(null);

    try {
      const res = await adminApi.approveRegistration(confirmApproveMember.id);
      setActionMessage({
        type: "success",
        text: res.message || `Application for ${confirmApproveMember.fullName} approved successfully.`,
      });
      setConfirmApproveMember(null);
      if (selectedMember?.id === confirmApproveMember.id) {
        setSelectedMember(null);
      }
      // Refresh both queue and stats
      await Promise.all([loadOverviewCounts(), loadMembers()]);
    } catch (err) {
      if (err instanceof ApiError) {
        setActionMessage({ type: "error", text: err.message });
      } else {
        setActionMessage({ type: "error", text: "Failed to approve registration." });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Perform Member Rejection
  const executeReject = async () => {
    if (!confirmRejectMember) return;
    setIsProcessing(true);
    setActionMessage(null);

    try {
      const res = await adminApi.rejectRegistration(
        confirmRejectMember.id,
        rejectionReason.trim() || undefined
      );
      setActionMessage({
        type: "success",
        text: res.message || `Application for ${confirmRejectMember.fullName} was declined.`,
      });
      setConfirmRejectMember(null);
      setRejectionReason("");
      if (selectedMember?.id === confirmRejectMember.id) {
        setSelectedMember(null);
      }
      // Refresh both queue and stats
      await Promise.all([loadOverviewCounts(), loadMembers()]);
    } catch (err) {
      if (err instanceof ApiError) {
        setActionMessage({ type: "error", text: err.message });
      } else {
        setActionMessage({ type: "error", text: "Failed to decline registration." });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
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
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border-subtle bg-surface text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              <IconSun className="w-4 h-4 text-amber-400 hidden dark:block" />
              <IconMoon className="w-4 h-4 text-slate-700 block dark:hidden" />
            </button>

            <Link
              href="/"
              className="rounded-md border border-border-strong bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-elevated transition-colors"
            >
              Home
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md bg-surface-elevated border border-border-subtle px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-club-navy dark:text-blue-400">
              <IconShieldCheck className="w-4 h-4" />
              <span>Membership Governance & Roster Review</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground mt-1">
              Member Approvals & Management
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Review incoming public member applications, inspect division preferences, and maintain verified player accounts.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              loadOverviewCounts();
              loadMembers();
            }}
            disabled={loadingMembers || loadingCounts}
            className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-surface px-3.5 py-2 text-xs font-bold text-foreground hover:bg-surface-elevated transition-colors self-start sm:self-auto disabled:opacity-50 shadow-xs cursor-pointer"
          >
            <IconRefreshCw className={`w-3.5 h-3.5 ${loadingMembers || loadingCounts ? "animate-spin" : ""}`} />
            <span>{loadingMembers || loadingCounts ? "Refreshing..." : "Refresh Queue"}</span>
          </button>
        </div>

        {actionMessage && (
          <div
            role="alert"
            className={`rounded-xl border p-4 text-xs transition-all ${
              actionMessage.type === "success"
                ? "border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200"
                : "border-red-300 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {actionMessage.type === "success" ? (
                  <IconCheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <IconAlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                )}
                <span className="font-medium">{actionMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionMessage(null)}
                className="text-text-muted hover:text-foreground cursor-pointer"
                aria-label="Dismiss alert"
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => handleStatusFilterChange("PENDING_APPROVAL")}
            className={`text-left p-5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === "PENDING_APPROVAL"
                ? "border-amber-400 bg-amber-50/60 dark:bg-amber-950/20 ring-2 ring-amber-400/30 shadow-sm"
                : "border-border-strong bg-surface hover:bg-surface-elevated shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted">Pending Review</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <IconClock className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-foreground">
                {loadingCounts ? "—" : counts.pending}
              </span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Action required
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleStatusFilterChange("ACTIVE")}
            className={`text-left p-5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === "ACTIVE"
                ? "border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20 ring-2 ring-emerald-400/30 shadow-sm"
                : "border-border-strong bg-surface hover:bg-surface-elevated shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted">Approved Members</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <IconCheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-foreground">
                {loadingCounts ? "—" : counts.approved}
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Active access
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleStatusFilterChange("INACTIVE")}
            className={`text-left p-5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === "INACTIVE"
                ? "border-red-400 bg-red-50/60 dark:bg-red-950/20 ring-2 ring-red-400/30 shadow-sm"
                : "border-border-strong bg-surface hover:bg-surface-elevated shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted">Declined / Inactive</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400">
                <IconAlertCircle className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-foreground">
                {loadingCounts ? "—" : counts.rejected}
              </span>
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Access revoked
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleStatusFilterChange("ALL")}
            className={`text-left p-5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === "ALL"
                ? "border-club-navy bg-club-navy/5 dark:bg-blue-950/20 ring-2 ring-club-navy/30 shadow-sm"
                : "border-border-strong bg-surface hover:bg-surface-elevated shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted">Total Accounts</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-elevated text-text-muted border border-border-subtle">
                <IconUsers className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-foreground">
                {loadingCounts ? "—" : counts.total}
              </span>
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Full roster
              </span>
            </div>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-elevated border border-border-subtle overflow-x-auto">
            <button
              type="button"
              onClick={() => handleStatusFilterChange("PENDING_APPROVAL")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === "PENDING_APPROVAL"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-text-secondary hover:text-foreground"
              }`}
            >
              Pending ({counts.pending})
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange("ACTIVE")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === "ACTIVE"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-text-secondary hover:text-foreground"
              }`}
            >
              Approved ({counts.approved})
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange("INACTIVE")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === "INACTIVE"
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-text-secondary hover:text-foreground"
              }`}
            >
              Declined ({counts.rejected})
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange("ALL")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === "ALL"
                  ? "bg-club-navy text-white shadow-xs"
                  : "text-text-secondary hover:text-foreground"
              }`}
            >
              All Records ({counts.total})
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:max-w-xs">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                <IconSearch className="w-4 h-4" />
              </div>
              <input
                id={searchInputId}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, phone..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-border-strong bg-surface text-xs text-foreground placeholder:text-text-muted focus:border-club-navy focus:outline-none focus:ring-1 focus:ring-club-navy"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-muted hover:text-foreground cursor-pointer"
                  aria-label="Clear search"
                >
                  <IconX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-border-strong bg-surface overflow-hidden shadow-xs">
          {loadingMembers ? (
            <div className="p-16 text-center space-y-3">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-club-navy border-t-transparent" />
              <p className="text-xs text-text-muted font-medium">Loading membership roster...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated text-text-muted border border-border-subtle">
                <IconUsers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">No records found</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                {appliedSearch
                  ? `No applications matched "${appliedSearch}". Try adjusting your search keyword.`
                  : statusFilter === "PENDING_APPROVAL"
                  ? "The pending queue is clear. No member registrations currently await approval."
                  : `There are currently no accounts with status ${statusFilter}.`}
              </p>
              {appliedSearch && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="mt-2 text-xs font-bold text-club-navy hover:underline cursor-pointer"
                >
                  Clear search query
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border-subtle bg-surface-elevated text-text-muted uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">Applicant / Member</th>
                    <th className="px-6 py-3.5">Contact Details</th>
                    <th className="px-6 py-3.5">Account Status</th>
                    <th className="px-6 py-3.5">Division & Flight</th>
                    <th className="px-6 py-3.5">Registered</th>
                    <th className="px-6 py-3.5 text-right">Administrative Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {members.map((m) => {
                    const sportProfile = m.sportProfiles?.[0];
                    const isPending = m.status === "PENDING_APPROVAL";
                    const isSelf = user.id === m.id;

                    return (
                      <tr key={m.id} className="hover:bg-surface-elevated/50 transition-colors">
                        {/* Member Identity */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-club-navy/10 text-club-navy dark:text-blue-400 font-bold text-xs">
                              {m.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="space-y-0.5">
                              <div className="font-bold text-foreground flex items-center gap-1.5">
                                <span>{m.fullName}</span>
                                {isSelf && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-club-navy/10 text-club-navy">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-text-muted flex items-center gap-1">
                                <span className="capitalize">{m.role.toLowerCase()}</span>
                                <span>•</span>
                                <span>{m.isOnboarded ? "Profile complete" : "Pending onboard"}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 space-y-0.5">
                          <div className="font-mono text-[11px] text-foreground">{m.email}</div>
                          <div className="text-text-muted text-[11px]">{m.phone || "No phone registered"}</div>
                        </td>

                        <td className="px-6 py-4">
                          {m.status === "PENDING_APPROVAL" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <IconClock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          )}
                          {m.status === "ACTIVE" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <IconCheckCircle2 className="w-3 h-3" />
                              <span>Active Member</span>
                            </span>
                          )}
                          {m.status === "INACTIVE" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800">
                              <IconAlertCircle className="w-3 h-3" />
                              <span>Declined / Inactive</span>
                            </span>
                          )}
                          {m.status === "SUSPENDED" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border-subtle">
                              <span>Suspended</span>
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-text-secondary text-[11px]">
                          {sportProfile ? (
                            <div className="space-y-0.5">
                              <div className="font-semibold text-foreground">
                                {sportProfile.divisionCode}
                              </div>
                              <div className="text-text-muted text-[10px]">
                                Flight: {sportProfile.preferredFlight || "FLEXIBLE"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-text-muted italic">Unassigned</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-text-muted font-mono text-[11px]">
                          {new Date(m.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedMember(m)}
                              className="rounded-md border border-border-subtle bg-surface hover:bg-surface-elevated px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:text-foreground transition-colors cursor-pointer"
                            >
                              Inspect
                            </button>

                            {isPending && !isSelf && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setConfirmApproveMember(m)}
                                  className="rounded-md bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition-colors shadow-xs cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmRejectMember(m);
                                    setRejectionReason("");
                                  }}
                                  className="rounded-md border border-border-strong bg-surface hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-400 hover:text-red-700 dark:hover:text-red-300 px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors cursor-pointer"
                                >
                                  Decline
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-border-subtle bg-surface-elevated text-xs">
              <span className="text-text-muted">
                Showing page <strong className="text-foreground">{currentPage}</strong> of{" "}
                <strong className="text-foreground">{totalPages}</strong> ({totalRecords} records)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1 || loadingMembers}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-md border border-border-strong bg-surface px-3 py-1 font-semibold text-foreground hover:bg-surface-elevated disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages || loadingMembers}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-md border border-border-strong bg-surface px-3 py-1 font-semibold text-foreground hover:bg-surface-elevated disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: Member Inspection Dialog */}
      {selectedMember && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border-strong bg-surface p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-club-navy/10 text-club-navy font-bold text-xs">
                  {selectedMember.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 id="member-detail-title" className="text-base font-bold text-foreground">
                    {selectedMember.fullName}
                  </h3>
                  <span className="text-[11px] text-text-muted">Account Profile & Audit Record</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="text-text-muted hover:text-foreground p-1 rounded-md cursor-pointer"
                aria-label="Close dialog"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-elevated border border-border-subtle space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted block">Email Address</span>
                <span className="font-mono text-foreground break-all">{selectedMember.email}</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-elevated border border-border-subtle space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted block">Mobile Number</span>
                <span className="text-foreground">{selectedMember.phone || "Not provided"}</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-elevated border border-border-subtle space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted block">Municipality / Address</span>
                <span className="text-foreground">{selectedMember.address || "Not specified"}</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-elevated border border-border-subtle space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted block">Account Status</span>
                <span className="font-bold text-foreground">{selectedMember.status}</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-elevated border border-border-subtle space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted block">Sport Division</span>
                <span className="font-semibold text-foreground">
                  {selectedMember.sportProfiles?.[0]?.divisionCode || "Unassigned"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-elevated border border-border-subtle space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted block">Preferred Match Flight</span>
                <span className="text-foreground">
                  {selectedMember.sportProfiles?.[0]?.preferredFlight || "FLEXIBLE"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-elevated border border-border-subtle space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted block">Registration Date</span>
                <span className="font-mono text-text-muted">
                  {new Date(selectedMember.createdAt).toLocaleString("en-GB")}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-elevated border border-border-subtle space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted block">System User ID</span>
                <span className="font-mono text-[10px] text-text-muted break-all">{selectedMember.id}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
              {selectedMember.status === "PENDING_APPROVAL" && user.id !== selectedMember.id && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmApproveMember(selectedMember);
                      setSelectedMember(null);
                    }}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    Approve Registration
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmRejectMember(selectedMember);
                      setSelectedMember(null);
                      setRejectionReason("");
                    }}
                    className="rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Decline
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="rounded-lg border border-border-strong bg-surface hover:bg-surface-elevated px-4 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Approve Confirmation Dialog */}
      {confirmApproveMember && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="approve-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-2xl border border-border-strong bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/50">
                <IconCheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 id="approve-dialog-title" className="text-base font-bold text-foreground">
                  Confirm Member Approval
                </h3>
                <span className="text-[11px] text-text-muted">Consequential administrative action</span>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Are you sure you want to approve registration for{" "}
              <strong className="text-foreground">{confirmApproveMember.fullName}</strong> (
              <span className="font-mono text-text-muted">{confirmApproveMember.email}</span>)?
            </p>

            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300">
              ✓ Upon approval, their account status is updated to <strong>ACTIVE</strong>. They will be granted member portal access and eligibility to submit availability for Friday court sessions.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setConfirmApproveMember(null)}
                className="rounded-lg border border-border-strong bg-surface hover:bg-surface-elevated px-4 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={executeApprove}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <span>{isProcessing ? "Activating Account..." : "Confirm & Activate"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Reject Confirmation Dialog */}
      {confirmRejectMember && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-2xl border border-border-strong bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/50">
                <IconAlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 id="reject-dialog-title" className="text-base font-bold text-foreground">
                  Decline Application
                </h3>
                <span className="text-[11px] text-text-muted">Consequential administrative action</span>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Decline membership application for{" "}
              <strong className="text-foreground">{confirmRejectMember.fullName}</strong> (
              <span className="font-mono text-text-muted">{confirmRejectMember.email}</span>)?
            </p>

            <div>
              <label htmlFor={rejectReasonInputId} className="block text-xs font-bold text-foreground mb-1">
                Reason for Declining (Optional)
              </label>
              <input
                id={rejectReasonInputId}
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Duplicate application, non-resident inquiry"
                maxLength={255}
                className="w-full px-3 py-2 rounded-lg border border-border-strong bg-surface text-xs text-foreground placeholder:text-text-muted focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <span className="text-[10px] text-text-muted mt-0.5 block">
                Persisted in the administrative audit log for compliance records.
              </span>
            </div>

            <div className="p-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-[11px] text-red-800 dark:text-red-300">
              ⚠ The account status will be set to <strong>INACTIVE</strong>, all active refresh tokens will be immediately revoked, and portal access will be denied.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  setConfirmRejectMember(null);
                  setRejectionReason("");
                }}
                className="rounded-lg border border-border-strong bg-surface hover:bg-surface-elevated px-4 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={executeReject}
                className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <span>{isProcessing ? "Declining Application..." : "Confirm & Decline"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
