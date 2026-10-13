"use client";

import React, { useState, useEffect, useCallback } from "react";
import { adminApi, bookingApi, ApiError } from "@/lib/api";
import { BookingDto, BookingStatus, CourtDto } from "@/types";
import {
  IconSearch,
  IconRefreshCw,
  IconX,
  IconAlertCircle,
  IconCheckCircle2,
} from "@/components/icons/Icons";

export function AdminBookingsTab() {
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [courts, setCourts] = useState<CourtDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [courtFilter, setCourtFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [appliedSearch, setAppliedSearch] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Cancellation Modal State
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<BookingDto | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Banner Message State
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load Courts for filter
  useEffect(() => {
    bookingApi.getCourts("badminton").then((res) => {
      setCourts(res.courts);
    }).catch(console.error);
  }, []);

  // Load Bookings
  const loadBookings = useCallback(() => {
    setLoading(true);
    return adminApi.getAdminBookings({
      courtId: courtFilter === "ALL" ? undefined : courtFilter,
      date: dateFilter || undefined,
      status: statusFilter,
      search: appliedSearch.trim() || undefined,
      page: currentPage,
      limit: 15,
    })
      .then((res) => {
        setBookings(res.bookings);
        setTotalPages(res.pagination.totalPages);
        setTotalRecords(res.pagination.total);
      })
      .catch((err: unknown) => {
        const msg = err instanceof ApiError ? err.message : "Failed to load bookings.";
        setBanner({ type: "error", text: msg });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [courtFilter, dateFilter, statusFilter, appliedSearch, currentPage]);

  useEffect(() => {
    let ignore = false;
    adminApi.getAdminBookings({
      courtId: courtFilter === "ALL" ? undefined : courtFilter,
      date: dateFilter || undefined,
      status: statusFilter,
      search: appliedSearch.trim() || undefined,
      page: currentPage,
      limit: 15,
    })
      .then((res) => {
        if (!ignore) {
          setBookings(res.bookings);
          setTotalPages(res.pagination.totalPages);
          setTotalRecords(res.pagination.total);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg = err instanceof ApiError ? err.message : "Failed to load bookings.";
          setBanner({ type: "error", text: msg });
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [courtFilter, dateFilter, statusFilter, appliedSearch, currentPage]);

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

  const handleConfirmCancel = async () => {
    if (!selectedBookingForCancel) return;
    setIsSubmittingCancel(true);
    setModalError(null);

    try {
      await adminApi.adminCancelBooking(
        selectedBookingForCancel.id,
        cancelReason.trim() || "Administrative override cancellation"
      );

      setBanner({
        type: "success",
        text: `Booking on ${selectedBookingForCancel.courtName} has been administratively cancelled.`,
      });

      setSelectedBookingForCancel(null);
      setCancelReason("");
      loadBookings();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to cancel booking.";
      setModalError(msg);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Message */}
      {banner && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            banner.type === "success"
              ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200"
              : "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === "success" ? (
              <IconCheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <IconAlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-text-muted hover:text-foreground"
          >
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-border-strong bg-surface p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted mr-1">
              Status:
            </span>
            {(["ALL", "CONFIRMED", "CANCELLED"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === st
                    ? "bg-club-navy text-white shadow-xs"
                    : "bg-surface-elevated text-text-muted hover:text-foreground border border-border-subtle"
                }`}
              >
                {st === "ALL" ? "All Bookings" : st === "CONFIRMED" ? "Confirmed" : "Cancelled"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={loadBookings}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border-subtle bg-surface text-xs font-semibold text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors self-start sm:self-auto disabled:opacity-50"
          >
            <IconRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border-subtle">
          {/* Court Filter */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">
              Court:
            </label>
            <select
              value={courtFilter}
              onChange={(e) => {
                setCourtFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-md border border-border-strong bg-surface px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-club-red"
            >
              <option value="ALL">All Courts</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (#{c.courtNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">
              Date (Qatar Time):
            </label>
            <div className="flex gap-1.5">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-md border border-border-strong bg-surface px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-club-red"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter("");
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded bg-surface-elevated text-xs text-text-muted hover:text-foreground border border-border-subtle"
                  title="Clear date"
                >
                  <IconX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Member Search */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">
              Search Member / Court:
            </label>
            <form onSubmit={handleSearchSubmit} className="flex gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name, email, court..."
                  className="w-full rounded-md border border-border-strong bg-surface pl-7 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-club-red"
                />
                <IconSearch className="w-3.5 h-3.5 text-text-muted absolute left-2 top-2" />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-md bg-club-red text-white text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                Find
              </button>
              {appliedSearch && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-2 py-1 rounded bg-surface-elevated text-xs text-text-muted hover:text-foreground border border-border-subtle"
                  title="Clear search"
                >
                  <IconX className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="rounded-xl border border-border-strong bg-surface shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">
            Court Bookings List ({totalRecords} record{totalRecords === 1 ? "" : "s"})
          </h3>
          <span className="text-[11px] font-medium text-text-muted">
            All times displayed in Qatar Standard Time (UTC+3)
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-club-red border-t-transparent" />
            <p className="text-xs text-text-muted">Loading reservations from database...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center text-xs text-text-muted">
            No bookings found matching the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-elevated/40 text-text-muted uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Court / Sport</th>
                  <th className="py-3 px-4">Scheduled Slot (Qatar Time)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notes / Cancellation</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-foreground">
                {bookings.map((b) => {
                  const startTime = new Date(b.startTime);
                  const endTime = new Date(b.endTime);

                  return (
                    <tr key={b.id} className="hover:bg-surface-elevated/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground">{b.userName}</div>
                        <div className="text-[11px] text-text-muted">{b.userEmail}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{b.courtName}</div>
                        <div className="text-[11px] text-text-muted">{b.sportName}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="font-semibold">
                          {startTime.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            timeZone: "Asia/Qatar",
                          })}
                        </div>
                        <div className="text-[11px] text-text-muted">
                          {startTime.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                            timeZone: "Asia/Qatar",
                          })}{" "}
                          –{" "}
                          {endTime.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                            timeZone: "Asia/Qatar",
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {b.status === "CONFIRMED" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            Confirmed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800">
                            Cancelled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate">
                        {b.status === "CANCELLED" ? (
                          <span className="text-[11px] text-red-600 dark:text-red-400 italic">
                            Cancelled: {b.cancellationReason || "No reason recorded"}
                          </span>
                        ) : b.notes ? (
                          <span className="text-[11px] text-text-muted italic">&ldquo;{b.notes}&rdquo;</span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {b.status === "CONFIRMED" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBookingForCancel(b);
                              setModalError(null);
                            }}
                            className="px-2.5 py-1 rounded bg-surface border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            Cancel / Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
            <div>
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded border border-border-subtle bg-surface hover:bg-surface-elevated disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded border border-border-subtle bg-surface hover:bg-surface-elevated disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Admin Cancel Modal */}
      {selectedBookingForCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border-strong bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                Administrative Cancellation Override
              </h3>
              <button
                type="button"
                onClick={() => setSelectedBookingForCancel(null)}
                className="text-text-muted hover:text-foreground"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs">
                {modalError}
              </div>
            )}

            <p className="text-xs text-text-secondary leading-relaxed">
              You are about to administratively cancel the booking on{" "}
              <strong>{selectedBookingForCancel.courtName}</strong> for member{" "}
              <strong>{selectedBookingForCancel.userName}</strong>. This action will be audited and the court slot will immediately be made available.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-muted">
                Reason for Cancellation (Required for Audit Trail):
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Club tournament fixture rescheduled, emergency maintenance..."
                className="w-full rounded-md border border-border-strong bg-surface p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-club-red"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBookingForCancel(null)}
                className="px-3 py-1.5 rounded-md border border-border-subtle bg-surface text-xs font-semibold text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={handleConfirmCancel}
                className="px-4 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingCancel ? "Processing..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
