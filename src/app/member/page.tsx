"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { bookingApi, ApiError } from "@/lib/api";
import {
  CourtDto,
  TimeSlotDto,
  BookingDto,
} from "@/types";
import {
  IconSun,
  IconMoon,
  IconUsers,
  IconCalendar,
  IconTrophy,
  IconClock,
  IconCheckCircle2,
  IconAlertCircle,
  IconRefreshCw,
  IconX,
} from "@/components/icons/Icons";

// Helper to get today's date in Qatar timezone (UTC+3)
function getTodayQatarDateStr(): string {
  const now = new Date();
  const qatarMs = now.getTime() + 3 * 3600 * 1000;
  return new Date(qatarMs).toISOString().slice(0, 10);
}

// Helper to format ISO date to readable string
function formatDisplayDate(dateStr: string): string {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day));
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

function getInitialClientTimestamp(): number {
  return Date.now();
}

export default function PortalDashboard() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { toggleTheme } = useTheme();

  // Active Tab: "book" | "my-bookings" | "overview"
  const [activeTab, setActiveTab] = useState<"book" | "my-bookings" | "overview">("book");

  // Courts & Selection State
  const [courts, setCourts] = useState<CourtDto[]>([]);
  const [selectedCourtId, setSelectedCourtId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayQatarDateStr());
  const [loadingCourts, setLoadingCourts] = useState<boolean>(true);

  // Availability State
  const [slots, setSlots] = useState<TimeSlotDto[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Booking Modal State
  const [bookingSlot, setBookingSlot] = useState<TimeSlotDto | null>(null);
  const [bookingNotes, setBookingNotes] = useState<string>("");
  const [isSubmittingBooking, setIsSubmittingBooking] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Member Reservations State
  const [myBookings, setMyBookings] = useState<BookingDto[]>([]);
  const [loadingMyBookings, setLoadingMyBookings] = useState<boolean>(false);

  // Cancellation Modal State
  const [cancellingBooking, setCancellingBooking] = useState<BookingDto | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Global Notification Banner
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const dateInputId = useId();
  const notesInputId = useId();
  const cancelReasonInputId = useId();

  // Enforce Member Authentication & Status
  useEffect(() => {
    if (!isLoading) {
      if (!user || user.status !== "ACTIVE") {
        router.push("/signin");
      } else if (user.role === "ADMIN") {
        router.push("/admin");
      } else if (user.role === "COORDINATOR") {
        router.push("/coordinator");
      }
    }
  }, [user, isLoading, router]);

  // Client timestamp on mount
  const [clientNowMs] = useState<number>(getInitialClientTimestamp);

  useEffect(() => {
    let ignore = false;
    if (user && user.status === "ACTIVE") {
      bookingApi.getCourts("badminton")
        .then((res) => {
          if (!ignore) {
            setCourts(res.courts);
            if (res.courts.length > 0 && !selectedCourtId) {
              setSelectedCourtId(res.courts[0].id);
            }
            setLoadingCourts(false);
          }
        })
        .catch((err: unknown) => {
          if (!ignore) {
            console.error("Failed to load courts:", err);
            setLoadingCourts(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [user, selectedCourtId]);

  // Load Availability for Selected Court & Date
  const loadAvailability = useCallback(async () => {
    if (!selectedCourtId || !selectedDate) return;
    setLoadingSlots(true);
    setSlotsError(null);
    try {
      const res = await bookingApi.getAvailability(selectedCourtId, selectedDate);
      setSlots(res.slots);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to load court availability.";
      setSlotsError(msg);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedCourtId, selectedDate]);

  useEffect(() => {
    let ignore = false;
    if (selectedCourtId && selectedDate) {
      bookingApi.getAvailability(selectedCourtId, selectedDate)
        .then((res) => {
          if (!ignore) {
            setSlots(res.slots);
            setLoadingSlots(false);
          }
        })
        .catch((err: unknown) => {
          if (!ignore) {
            const msg = err instanceof ApiError ? err.message : "Failed to load court availability.";
            setSlotsError(msg);
            setSlots([]);
            setLoadingSlots(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [selectedCourtId, selectedDate]);

  // Load Member's Bookings
  const loadMyBookings = useCallback(async () => {
    setLoadingMyBookings(true);
    try {
      const res = await bookingApi.getMyBookings();
      setMyBookings(res.bookings);
    } catch (err: unknown) {
      console.error("Failed to load my bookings:", err);
    } finally {
      setLoadingMyBookings(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    if (activeTab === "my-bookings") {
      bookingApi.getMyBookings()
        .then((res) => {
          if (!ignore) {
            setMyBookings(res.bookings);
            setLoadingMyBookings(false);
          }
        })
        .catch((err: unknown) => {
          if (!ignore) {
            console.error("Failed to load my bookings:", err);
            setLoadingMyBookings(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-club-red border-t-transparent" />
          <p className="text-xs text-text-muted">Loading QWSC member session...</p>
        </div>
      </div>
    );
  }

  if (!user || user.status !== "ACTIVE" || user.role === "ADMIN") {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // Submit Booking
  const handleConfirmBooking = async () => {
    if (!bookingSlot || !selectedCourtId) return;
    setIsSubmittingBooking(true);
    setBookingError(null);

    try {
      const res = await bookingApi.createBooking({
        courtId: selectedCourtId,
        startTime: bookingSlot.startTime,
        endTime: bookingSlot.endTime,
        notes: bookingNotes.trim() || undefined,
      });

      setBannerMessage({
        type: "success",
        text: `Court booked successfully! ${res.booking.courtName} reserved for ${res.booking.startTime.slice(11, 16)}–${res.booking.endTime.slice(11, 16)}.`,
      });

      setBookingSlot(null);
      setBookingNotes("");
      loadAvailability();
      loadMyBookings();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to confirm court booking.";
      setBookingError(msg);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Submit Cancellation
  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    setIsSubmittingCancel(true);
    setCancelError(null);

    try {
      await bookingApi.cancelBooking(cancellingBooking.id, cancellationReason.trim() || undefined);

      setBannerMessage({
        type: "success",
        text: `Reservation on ${cancellingBooking.courtName} has been cancelled.`,
      });

      setCancellingBooking(null);
      setCancellationReason("");
      loadMyBookings();
      loadAvailability();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to cancel reservation.";
      setCancelError(msg);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const selectedCourt = courts.find((c) => c.id === selectedCourtId);
  const activeBookingsCount = myBookings.filter(
    (b) => b.status === "CONFIRMED" && new Date(b.endTime).getTime() > clientNowMs
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-150">
      {/* Top Navigation Bar */}
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
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-surface-elevated text-text-muted border border-border-subtle">
                  Member Portal
                </span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border-subtle bg-surface text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors"
              aria-label="Toggle theme"
            >
              <IconSun className="w-4 h-4 text-amber-400 hidden dark:block" />
              <IconMoon className="w-4 h-4 text-slate-700 block dark:hidden" />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-border-strong bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-elevated transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner Alert */}
        {bannerMessage && (
          <div
            className={`p-4 rounded-lg border text-sm flex items-center justify-between gap-3 ${
              bannerMessage.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {bannerMessage.type === "success" ? (
                <IconCheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <IconAlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
              )}
              <span>{bannerMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="text-text-muted hover:text-foreground text-xs font-bold"
            >
              <IconX className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Member Profile Banner */}
        <div className="rounded-lg border border-border-strong bg-surface p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-club-red">
                  Qatar Wakra Sports Club
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold font-mono uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  {user.status}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-elevated text-text-muted border border-border-subtle">
                  Timezone: Asia/Qatar (UTC+3)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                Welcome, {user.fullName}
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary">
                Registered Email: <span className="text-foreground font-medium">{user.email}</span> • Mobile:{" "}
                <span className="text-foreground font-medium">{user.phone || "—"}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-xs font-semibold text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors"
              >
                Public Homepage
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-border-strong flex gap-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("book")}
            className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "book"
                ? "border-club-red text-club-red"
                : "border-transparent text-text-muted hover:text-foreground"
            }`}
          >
            <IconCalendar className="w-4 h-4" />
            Book a Court
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("my-bookings")}
            className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "my-bookings"
                ? "border-club-red text-club-red"
                : "border-transparent text-text-muted hover:text-foreground"
            }`}
          >
            <IconClock className="w-4 h-4" />
            My Reservations
            {activeBookingsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-club-red text-white">
                {activeBookingsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "overview"
                ? "border-club-red text-club-red"
                : "border-transparent text-text-muted hover:text-foreground"
            }`}
          >
            <IconTrophy className="w-4 h-4" />
            Club Overview & Sessions
          </button>
        </div>

        {/* TAB 1: BOOK A COURT */}
        {activeTab === "book" && (
          <div className="space-y-6">
            {/* Sport & Facility Indicator */}
            <div className="rounded-lg border border-border-strong bg-surface p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Court Availability & Booking</h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Select a court and date to inspect live real-time availability and confirm your reservation.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-surface-elevated text-text-primary border border-border-subtle">
                    🏸 Sport: Badminton
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-surface-elevated text-text-primary border border-border-subtle">
                    📍 Wakra Sports Complex
                  </span>
                </div>
              </div>

              {/* Court Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Choose Court:
                </label>
                {loadingCourts ? (
                  <div className="h-10 animate-pulse bg-surface-elevated rounded-md" />
                ) : courts.length === 0 ? (
                  <p className="text-xs text-text-muted">No courts available.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {courts.map((court) => (
                      <button
                        key={court.id}
                        type="button"
                        onClick={() => setSelectedCourtId(court.id)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          selectedCourtId === court.id
                            ? "border-club-red bg-club-red/5 dark:bg-club-red/10 ring-1 ring-club-red"
                            : "border-border-strong bg-surface hover:bg-surface-elevated"
                        }`}
                      >
                        <div className="font-bold text-sm text-foreground">{court.name}</div>
                        <div className="text-[11px] text-text-muted mt-0.5">
                          Court #{court.courtNumber} • Badminton
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date Selector */}
              <div className="space-y-2 pt-2 border-t border-border-subtle">
                <label htmlFor={dateInputId} className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Select Date (Qatar Local Time):
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    id={dateInputId}
                    type="date"
                    value={selectedDate}
                    min={getTodayQatarDateStr()}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-club-red"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedDate(getTodayQatarDateStr())}
                    className="px-3 py-1.5 rounded-md border border-border-subtle bg-surface text-xs font-semibold text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={loadAvailability}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border-subtle bg-surface text-xs font-semibold text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors"
                  >
                    <IconRefreshCw className={`w-3.5 h-3.5 ${loadingSlots ? "animate-spin" : ""}`} />
                    Refresh Slots
                  </button>
                </div>
              </div>
            </div>

            {/* Slots Grid Section */}
            <div className="rounded-lg border border-border-strong bg-surface p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Available Slots for {selectedCourt ? selectedCourt.name : "Selected Court"} on{" "}
                  <span className="text-club-red font-mono">{formatDisplayDate(selectedDate)}</span>
                </h3>
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Available
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" /> Booked / Unavailable
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Your Booking
                  </div>
                </div>
              </div>

              {loadingSlots ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-club-red border-t-transparent" />
                  <p className="text-xs text-text-muted">Checking real-time slot availability...</p>
                </div>
              ) : slotsError ? (
                <div className="p-4 rounded-md border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs">
                  {slotsError}
                </div>
              ) : slots.length === 0 ? (
                <p className="text-xs text-text-muted py-8 text-center">
                  No slots scheduled for this date.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {slots.map((slot, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg border p-3 flex flex-col justify-between transition-all ${
                        slot.isAvailable
                          ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-500"
                          : slot.isMyBooking
                          ? "border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20"
                          : "border-border-subtle bg-surface-elevated/40 opacity-75"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-mono font-bold text-foreground">
                          {slot.displayStartTime} – {slot.displayEndTime}
                        </div>
                        <div className="mt-1 text-[10px] font-bold">
                          {slot.isAvailable ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Available</span>
                          ) : slot.isMyBooking ? (
                            <span className="text-blue-600 dark:text-blue-400">Your Booking</span>
                          ) : slot.unavailabilityReason === "MAINTENANCE_CLOSURE" ? (
                            <span className="text-amber-600 dark:text-amber-400">Maintenance</span>
                          ) : slot.unavailabilityReason === "PAST_TIME" ? (
                            <span className="text-text-muted">Past Time</span>
                          ) : (
                            <span className="text-text-muted">Reserved</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        {slot.isAvailable ? (
                          <button
                            type="button"
                            onClick={() => {
                              setBookingSlot(slot);
                              setBookingError(null);
                            }}
                            className="w-full py-1.5 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                          >
                            Book Slot
                          </button>
                        ) : slot.isMyBooking ? (
                          <button
                            type="button"
                            onClick={() => setActiveTab("my-bookings")}
                            className="w-full py-1.5 px-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                          >
                            View Details
                          </button>
                        ) : (
                          <span className="block text-center py-1.5 text-xs text-text-muted">
                            Unavailable
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MY RESERVATIONS */}
        {activeTab === "my-bookings" && (
          <div className="rounded-lg border border-border-strong bg-surface p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">My Court Reservations</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  View upcoming bookings and past attendance records. Reservations can be cancelled up to 6 hours before slot start time.
                </p>
              </div>
              <button
                type="button"
                onClick={loadMyBookings}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border-subtle bg-surface text-xs font-semibold text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors"
              >
                <IconRefreshCw className={`w-3.5 h-3.5 ${loadingMyBookings ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {loadingMyBookings ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-club-red border-t-transparent" />
                <p className="text-xs text-text-muted">Loading your reservations...</p>
              </div>
            ) : myBookings.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-xs text-text-muted">You have no active or historical court bookings.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("book")}
                  className="px-4 py-2 rounded-md bg-club-red text-white text-xs font-semibold hover:bg-red-700 transition-colors"
                >
                  Book a Court Now
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {myBookings.map((b) => {
                  const startTimeDate = new Date(b.startTime);
                  const endTimeDate = new Date(b.endTime);
                  const isPast = endTimeDate.getTime() < clientNowMs;

                  return (
                    <div key={b.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{b.courtName}</span>
                          <span className="text-xs text-text-muted">• {b.sportName}</span>
                          {b.status === "CONFIRMED" ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isPast
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                  : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                              }`}
                            >
                              {isPast ? "Completed" : "Confirmed"}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">
                              Cancelled
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-mono text-text-secondary flex items-center gap-2">
                          <IconCalendar className="w-3.5 h-3.5 text-text-muted" />
                          <span>
                            {startTimeDate.toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              timeZone: "Asia/Qatar",
                            })}
                          </span>
                          <span>•</span>
                          <IconClock className="w-3.5 h-3.5 text-text-muted" />
                          <span>
                            {startTimeDate.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                              timeZone: "Asia/Qatar",
                            })}{" "}
                            –{" "}
                            {endTimeDate.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                              timeZone: "Asia/Qatar",
                            })}
                          </span>
                        </div>

                        {b.notes && (
                          <p className="text-xs text-text-muted italic">Notes: &ldquo;{b.notes}&rdquo;</p>
                        )}
                        {b.status === "CANCELLED" && b.cancellationReason && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            Reason: {b.cancellationReason}
                          </p>
                        )}
                      </div>

                      <div>
                        {b.status === "CONFIRMED" && !isPast && (
                          b.canCancel ? (
                            <button
                              type="button"
                              onClick={() => {
                                setCancellingBooking(b);
                                setCancelError(null);
                              }}
                              className="px-3 py-1.5 rounded-md border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors"
                            >
                              Cancel Booking
                            </button>
                          ) : (
                            <span className="text-[11px] text-text-muted italic" title="Bookings cannot be cancelled less than 6 hours prior to start time.">
                              Locked (&lt;6h to start)
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: OVERVIEW & SESSIONS */}
        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-border-strong bg-surface p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-club-red/10 text-club-red border border-club-red/20">
                  <IconCalendar className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Friday Court Sessions</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  Wakra Sports Complex Courts 1–4. Submit weekly availability for scheduled Friday league matches.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-border-subtle text-xs text-text-muted font-medium">
                Schedules publish every Wednesday evening.
              </div>
            </div>

            <div className="rounded-lg border border-border-strong bg-surface p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-club-navy/10 text-club-navy dark:text-blue-400 border border-club-navy/20">
                  <IconUsers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Match Lineups & Standby</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  View confirmed player pairings, opponent matchups, and standby reserve dispatch queue.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-border-subtle text-xs text-text-muted font-medium">
                Lineups verified by session coordinators.
              </div>
            </div>

            <div className="rounded-lg border border-border-strong bg-surface p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  <IconTrophy className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Division Standings</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  BWF 21-point rally scoring records across Division A, B, C, and Mixed Doubles ladders.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-border-subtle text-xs text-text-muted font-medium">
                Rankings updated following Friday matches.
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: CONFIRM BOOKING */}
      {bookingSlot && selectedCourt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-border-strong bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Confirm Court Reservation</h3>
              <button
                type="button"
                onClick={() => setBookingSlot(null)}
                className="text-text-muted hover:text-foreground"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {bookingError && (
              <div className="p-3 rounded border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs">
                {bookingError}
              </div>
            )}

            <div className="space-y-2 text-xs text-text-secondary border p-3 rounded-md border-border-subtle bg-surface-elevated/40">
              <div className="flex justify-between">
                <span className="text-text-muted">Court:</span>
                <span className="font-bold text-foreground">{selectedCourt.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Sport:</span>
                <span className="font-bold text-foreground">Badminton</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Date:</span>
                <span className="font-bold text-foreground font-mono">{formatDisplayDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Time Window:</span>
                <span className="font-bold text-club-red font-mono">
                  {bookingSlot.displayStartTime} – {bookingSlot.displayEndTime} (Qatar Local Time)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Member Name:</span>
                <span className="font-bold text-foreground">{user.fullName}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor={notesInputId} className="text-xs font-semibold text-text-muted">
                Notes / Special Requests (Optional):
              </label>
              <textarea
                id={notesInputId}
                rows={2}
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="e.g. Training drills with coach..."
                className="w-full rounded-md border border-border-strong bg-surface p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-club-red"
              />
            </div>

            <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
              ⚠️ <strong>Club Policy:</strong> Cancellations are permitted free of charge up to 6 hours before slot start time.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBookingSlot(null)}
                className="px-3 py-1.5 rounded-md border border-border-subtle bg-surface text-xs font-semibold text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmittingBooking}
                onClick={handleConfirmBooking}
                className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingBooking ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                    Confirming...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CANCEL BOOKING */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-border-strong bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Cancel Court Reservation</h3>
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                className="text-text-muted hover:text-foreground"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {cancelError && (
              <div className="p-3 rounded border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs">
                {cancelError}
              </div>
            )}

            <p className="text-xs text-text-secondary leading-relaxed">
              Are you sure you want to cancel your reservation for{" "}
              <strong>{cancellingBooking.courtName}</strong>? This action will immediately release the slot for other club players.
            </p>

            <div className="space-y-1">
              <label htmlFor={cancelReasonInputId} className="text-xs font-semibold text-text-muted">
                Reason for Cancellation (Optional):
              </label>
              <input
                id={cancelReasonInputId}
                type="text"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Schedule conflict..."
                className="w-full rounded-md border border-border-strong bg-surface p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-club-red"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                className="px-3 py-1.5 rounded-md border border-border-subtle bg-surface text-xs font-semibold text-text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={handleConfirmCancel}
                className="px-4 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingCancel ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                    Cancelling...
                  </>
                ) : (
                  "Confirm Cancellation"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
