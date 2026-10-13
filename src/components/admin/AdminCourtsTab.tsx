"use client";

import React, { useState, useEffect, useCallback } from "react";
import { adminApi, ApiError } from "@/lib/api";
import { CourtDto, CourtClosureDto } from "@/types";
import {
  IconCalendar,
  IconClock,
  IconRefreshCw,
  IconX,
  IconAlertCircle,
  IconCheckCircle2,
} from "@/components/icons/Icons";

function getInitialClosureDate(): string {
  const qatarNowMs = Date.now() + 3 * 3600 * 1000;
  return new Date(qatarNowMs).toISOString().slice(0, 10);
}

export function AdminCourtsTab() {
  const [courts, setCourts] = useState<CourtDto[]>([]);
  const [closures, setClosures] = useState<CourtClosureDto[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(true);
  const [loadingClosures, setLoadingClosures] = useState(true);

  // Toggle Court State
  const [togglingCourtId, setTogglingCourtId] = useState<string | null>(null);

  // New Closure Modal State
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [closureCourtId, setClosureCourtId] = useState<string>("");
  const [closureReason, setClosureReason] = useState<string>("");
  const [closureDate, setClosureDate] = useState<string>(getInitialClosureDate);
  const [closureStartHour, setClosureStartHour] = useState<string>("08:00");
  const [closureEndHour, setClosureEndHour] = useState<string>("12:00");
  const [isSubmittingClosure, setIsSubmittingClosure] = useState(false);
  const [closureError, setClosureError] = useState<string | null>(null);

  // Global Notification Banner
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load Courts
  const loadCourts = useCallback(() => {
    setLoadingCourts(true);
    return adminApi.getAdminCourts("badminton")
      .then((res) => {
        setCourts(res.courts);
      })
      .catch((err: unknown) => {
        const msg = err instanceof ApiError ? err.message : "Failed to load courts.";
        setBanner({ type: "error", text: msg });
      })
      .finally(() => {
        setLoadingCourts(false);
      });
  }, []);

  // Load Closures
  const loadClosures = useCallback(() => {
    setLoadingClosures(true);
    return adminApi.getClosures()
      .then((res) => {
        setClosures(res.closures);
      })
      .catch((err: unknown) => {
        console.error("Failed to load closures:", err);
      })
      .finally(() => {
        setLoadingClosures(false);
      });
  }, []);

  useEffect(() => {
    let ignore = false;
    adminApi.getAdminCourts("badminton")
      .then((res) => {
        if (!ignore) {
          setCourts(res.courts);
          setLoadingCourts(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg = err instanceof ApiError ? err.message : "Failed to load courts.";
          setBanner({ type: "error", text: msg });
          setLoadingCourts(false);
        }
      });

    adminApi.getClosures()
      .then((res) => {
        if (!ignore) {
          setClosures(res.closures);
          setLoadingClosures(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          console.error("Failed to load closures:", err);
          setLoadingClosures(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Toggle Court Operational Status
  const handleToggleOperational = async (court: CourtDto) => {
    setTogglingCourtId(court.id);
    try {
      const res = await adminApi.updateCourt(court.id, {
        isOperational: !court.isOperational,
      });

      setBanner({
        type: "success",
        text: `${court.name} is now ${res.court.isOperational ? "Operational" : "Disabled"}.`,
      });
      loadCourts();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to update court status.";
      setBanner({ type: "error", text: msg });
    } finally {
      setTogglingCourtId(null);
    }
  };

  // Create Maintenance Closure
  const handleCreateClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closureReason.trim() || !closureDate) return;
    setIsSubmittingClosure(true);
    setClosureError(null);

    try {
      // Calculate UTC datetime from Qatar time (UTC+3)
      const [startH, startM] = closureStartHour.split(":").map(Number);
      const [endH, endM] = closureEndHour.split(":").map(Number);
      const [year, month, day] = closureDate.split("-").map(Number);

      const startTimeUtc = new Date(Date.UTC(year, month - 1, day, startH - 3, startM, 0));
      const endTimeUtc = new Date(Date.UTC(year, month - 1, day, endH - 3, endM, 0));

      await adminApi.createClosure({
        courtId: closureCourtId ? closureCourtId : null,
        reason: closureReason.trim(),
        startTime: startTimeUtc.toISOString(),
        endTime: endTimeUtc.toISOString(),
      });

      setBanner({
        type: "success",
        text: `Maintenance closure scheduled successfully for ${closureDate}.`,
      });

      setShowClosureModal(false);
      setClosureReason("");
      loadClosures();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to schedule closure.";
      setClosureError(msg);
    } finally {
      setIsSubmittingClosure(false);
    }
  };

  // Delete Closure
  const handleDeleteClosure = async (closureId: string) => {
    try {
      await adminApi.deleteClosure(closureId);
      setBanner({
        type: "success",
        text: "Maintenance closure removed.",
      });
      loadClosures();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to remove closure.";
      setBanner({ type: "error", text: msg });
    }
  };

  return (
    <div className="space-y-8">
      {/* Banner */}
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

      {/* SECTION 1: COURT INVENTORY */}
      <div className="rounded-xl border border-border-strong bg-surface p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Court Facility Inventory</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Manage physical courts at Wakra Sports Complex. Deactivating a court prevents new bookings.
            </p>
          </div>
          <button
            type="button"
            onClick={loadCourts}
            disabled={loadingCourts}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border-subtle bg-surface text-xs font-semibold text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors disabled:opacity-50"
          >
            <IconRefreshCw className={`w-3.5 h-3.5 ${loadingCourts ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loadingCourts ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-club-red border-t-transparent" />
            <p className="text-xs text-text-muted">Loading court inventory...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {courts.map((court) => (
              <div
                key={court.id}
                className="rounded-lg border border-border-strong bg-surface-elevated/40 p-4 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{court.name}</span>
                    {court.isOperational ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                        Operational
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    Court #{court.courtNumber} • {court.sportName}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    Operating: 08:00 – 23:00 (Qatar Time)
                  </div>
                </div>

                <div className="pt-2 border-t border-border-subtle">
                  <button
                    type="button"
                    disabled={togglingCourtId === court.id}
                    onClick={() => handleToggleOperational(court)}
                    className={`w-full py-1.5 px-3 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 ${
                      court.isOperational
                        ? "border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {togglingCourtId === court.id
                      ? "Updating..."
                      : court.isOperational
                      ? "Disable Court"
                      : "Activate Court"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: MAINTENANCE CLOSURES */}
      <div className="rounded-xl border border-border-strong bg-surface p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Maintenance Closures & Blocked Dates</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Block court availability for scheduled facility cleaning, lighting upgrades, or club tournaments.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowClosureModal(true);
              setClosureError(null);
            }}
            className="px-3.5 py-2 rounded-md bg-club-red text-white text-xs font-bold hover:bg-red-700 transition-colors self-start sm:self-auto cursor-pointer shadow-xs"
          >
            + Schedule Court Closure
          </button>
        </div>

        {loadingClosures ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-club-red border-t-transparent" />
            <p className="text-xs text-text-muted">Loading closures...</p>
          </div>
        ) : closures.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-muted">
            No active maintenance closures or blocked dates scheduled.
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {closures.map((c) => {
              const start = new Date(c.startTime);
              const end = new Date(c.endTime);

              return (
                <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">
                        {c.courtName || "All Courts (Whole Facility)"}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        Maintenance
                      </span>
                    </div>
                    <div className="text-xs text-text-secondary">
                      Reason: <span className="font-medium text-foreground">{c.reason}</span>
                    </div>
                    <div className="text-[11px] font-mono text-text-muted flex items-center gap-2">
                      <IconCalendar className="w-3 h-3 text-text-muted" />
                      <span>
                        {start.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "Asia/Qatar",
                        })}
                      </span>
                      <span>•</span>
                      <IconClock className="w-3 h-3 text-text-muted" />
                      <span>
                        {start.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                          timeZone: "Asia/Qatar",
                        })}{" "}
                        –{" "}
                        {end.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                          timeZone: "Asia/Qatar",
                        })}
                      </span>
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => handleDeleteClosure(c.id)}
                      className="px-2.5 py-1 rounded bg-surface border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Remove Closure
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SCHEDULE CLOSURE MODAL */}
      {showClosureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-border-strong bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                Schedule Court Maintenance Closure
              </h3>
              <button
                type="button"
                onClick={() => setShowClosureModal(false)}
                className="text-text-muted hover:text-foreground"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {closureError && (
              <div className="p-3 rounded border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs">
                {closureError}
              </div>
            )}

            <form onSubmit={handleCreateClosure} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">
                  Target Court:
                </label>
                <select
                  value={closureCourtId}
                  onChange={(e) => setClosureCourtId(e.target.value)}
                  className="w-full rounded-md border border-border-strong bg-surface p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-club-red"
                >
                  <option value="">All Courts (Whole Facility)</option>
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (#{c.courtNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">
                  Reason for Closure:
                </label>
                <input
                  type="text"
                  required
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  placeholder="e.g. Floor polishing, light fixture maintenance..."
                  className="w-full rounded-md border border-border-strong bg-surface p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-club-red"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">
                  Date (Qatar Time):
                </label>
                <input
                  type="date"
                  required
                  value={closureDate}
                  onChange={(e) => setClosureDate(e.target.value)}
                  className="w-full rounded-md border border-border-strong bg-surface p-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-club-red"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">
                    Start Time:
                  </label>
                  <input
                    type="time"
                    required
                    value={closureStartHour}
                    onChange={(e) => setClosureStartHour(e.target.value)}
                    className="w-full rounded-md border border-border-strong bg-surface p-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-club-red"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">
                    End Time:
                  </label>
                  <input
                    type="time"
                    required
                    value={closureEndHour}
                    onChange={(e) => setClosureEndHour(e.target.value)}
                    className="w-full rounded-md border border-border-strong bg-surface p-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-club-red"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
                🔒 <strong>Safety Guard:</strong> System will automatically reject this closure if any existing confirmed reservations overlap this time range.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClosureModal(false)}
                  className="px-3 py-1.5 rounded-md border border-border-subtle bg-surface text-xs font-semibold text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClosure}
                  className="px-4 py-1.5 rounded-md bg-club-red text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isSubmittingClosure ? "Scheduling..." : "Schedule Closure"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
