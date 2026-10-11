"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  IconX,
  IconLock,
  IconUsers,
  IconCheckCircle2,
  IconShieldCheck,
  IconSend,
  IconAlertCircle,
  IconCalendar,
} from "./icons/Icons";

export type ModalMode = "signin" | "join" | null;

interface PortalModalProps {
  mode: ModalMode;
  onClose: () => void;
}

export function PortalModal({ mode, onClose }: PortalModalProps) {
  const [activeTab, setActiveTab] = useState<"member" | "coordinator">("member");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    skillLevel: "division-b",
    preferredSlot: "either",
    notes: "",
  });

  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (mode) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [mode, onClose]);

  if (!mode) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) return;
    setIsSubmitted(true);
  };

  const resetAndClose = () => {
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={resetAndClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        ref={modalRef}
        className="relative w-full max-w-xl rounded-lg border border-border-strong bg-surface p-6 sm:p-8 text-foreground shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={resetAndClose}
          className="absolute right-4 top-4 rounded-md p-2 text-text-muted hover:bg-surface-elevated hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-club-red"
          aria-label="Close modal"
        >
          <IconX className="w-5 h-5" />
        </button>

        {mode === "signin" ? (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-club-red/10 text-club-red border border-club-red/20">
                <IconLock className="w-5 h-5" />
              </div>
              <div>
                <h3 id="modal-title" className="text-xl font-bold tracking-tight text-foreground">
                  QWBC Club Portal Access
                </h3>
                <p className="text-xs text-text-muted">
                  Qatar Wakra Badminton Club Members & Staff
                </p>
              </div>
            </div>

            {/* Tab selection */}
            <div className="mt-6 flex rounded-md bg-surface-elevated p-1 border border-border-subtle">
              <button
                type="button"
                onClick={() => setActiveTab("member")}
                className={`flex-1 flex items-center justify-center gap-2 rounded py-2 text-xs font-semibold transition-all ${
                  activeTab === "member"
                    ? "bg-club-red text-white font-bold shadow-xs"
                    : "text-text-muted hover:text-foreground"
                }`}
              >
                <IconUsers className="w-4 h-4" />
                Player Member Access
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("coordinator")}
                className={`flex-1 flex items-center justify-center gap-2 rounded py-2 text-xs font-semibold transition-all ${
                  activeTab === "coordinator"
                    ? "bg-club-red text-white font-bold shadow-xs"
                    : "text-text-muted hover:text-foreground"
                }`}
              >
                <IconShieldCheck className="w-4 h-4" />
                Coordinator Login
              </button>
            </div>

            {activeTab === "member" ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-md border border-border-subtle bg-surface-elevated p-4">
                  <div className="flex gap-3">
                    <IconAlertCircle className="w-5 h-5 text-club-red shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        Monthly Member Availability Cycle
                      </h4>
                      <p className="mt-1 text-xs text-text-muted leading-relaxed">
                        Player availability submissions for upcoming Friday sessions are accessed via unique authenticated member links sent directly to registered QWBC players.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-md border border-border-subtle bg-surface p-4 text-xs text-text-secondary">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <IconCheckCircle2 className="w-4 h-4 text-club-red" />
                    <span>How to access your player profile:</span>
                  </div>
                  <ul className="space-y-2 pl-6 list-disc text-text-muted">
                    <li>Use your personal access link sent to your registered WhatsApp or email.</li>
                    <li>Submit your weekly court availability, preferred time slots, and category preferences.</li>
                    <li>View confirmed court pairings, opponent matchups, and standby queue status.</li>
                  </ul>
                </div>

                <div className="mt-6 rounded-md border border-border-subtle bg-surface-elevated p-4">
                  <p className="text-xs text-text-muted">
                    Not yet a registered QWBC player? Inquire to join our ~200 player roster or apply for a trial session.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubmitted(false);
                      onClose();
                      setTimeout(() => {
                        window.location.hash = "join";
                      }, 50);
                    }}
                    className="mt-3 w-full rounded-md border border-border-strong bg-surface py-2.5 text-center text-xs font-semibold text-foreground hover:bg-surface-elevated transition-colors"
                  >
                    Submit Player Membership Inquiry
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-md border border-border-subtle bg-surface-elevated p-4">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Authorized Coordinator Email
                  </label>
                  <input
                    type="email"
                    placeholder="coordinator@qwbc.org"
                    className="w-full rounded-md border border-border-strong bg-surface px-3.5 py-2 text-sm text-foreground placeholder-text-muted focus:border-club-red focus:outline-none focus:ring-1 focus:ring-club-red"
                    defaultValue="coordinator@qwbc.org"
                  />
                  <label className="block text-xs font-semibold text-foreground mt-3.5 mb-1.5">
                    Session Passkey / Two-Factor Code
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    className="w-full rounded-md border border-border-strong bg-surface px-3.5 py-2 text-sm text-foreground placeholder-text-muted focus:border-club-red focus:outline-none focus:ring-1 focus:ring-club-red"
                  />
                  <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
                    <span>Role: QWBC Staff / Coordinator</span>
                    <span className="text-club-navy dark:text-blue-400 font-mono text-[11px]">Hardware 2FA Active</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      alert("Coordinator Console: In this preview environment, administrator credentials authenticate through QWBC's internal coordinator identity service.");
                    }}
                    className="mt-5 w-full rounded-md bg-club-red py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors shadow-xs"
                  >
                    Enter Management Console
                  </button>
                </div>

                <p className="text-center text-xs text-text-muted">
                  Staff credentials are provisioned strictly by QWBC club committee.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {!isSubmitted ? (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-club-red/10 text-club-red border border-club-red/20">
                    <IconCalendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 id="modal-title" className="text-xl font-bold tracking-tight text-foreground">
                      Join Qatar Wakra Badminton Club
                    </h3>
                    <p className="text-xs text-text-muted">
                      Submit a player membership inquiry or request a trial session in Al Wakra
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Tariq Al-Kuwari"
                        className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground placeholder-text-muted focus:border-club-red focus:outline-none focus:ring-1 focus:ring-club-red"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Mobile / WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+974 5555 1234"
                        className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground placeholder-text-muted focus:border-club-red focus:outline-none focus:ring-1 focus:ring-club-red"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="you@domain.com"
                        className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground placeholder-text-muted focus:border-club-red focus:outline-none focus:ring-1 focus:ring-club-red"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Skill Level / Division
                      </label>
                      <select
                        value={formData.skillLevel}
                        onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
                        className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus:border-club-red focus:outline-none focus:ring-1 focus:ring-club-red"
                      >
                        <option value="division-a">Division A (Advanced Competitive)</option>
                        <option value="division-b">Division B (Intermediate League)</option>
                        <option value="mixed">Mixed Doubles League</option>
                        <option value="beginner">Division C (Development & Social)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Preferred Friday Time Slot
                    </label>
                    <select
                      value={formData.preferredSlot}
                      onChange={(e) => setFormData({ ...formData, preferredSlot: e.target.value })}
                      className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus:border-club-red focus:outline-none focus:ring-1 focus:ring-club-red"
                    >
                      <option value="either">Flexible / Either Slot (18:00 – 21:00)</option>
                      <option value="slot-1">Slot 1 Only (18:00 – 19:30)</option>
                      <option value="slot-2">Slot 2 Only (19:30 – 21:00)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Playing Background & Experience
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="e.g. Right-handed doubles player with 3 years club experience..."
                      className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground placeholder-text-muted focus:border-club-red focus:outline-none focus:ring-1 focus:ring-club-red"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-md bg-club-red py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors shadow-xs"
                    >
                      <IconSend className="w-4 h-4" />
                      Submit Player Registration Request
                    </button>
                    <p className="mt-2 text-center text-[11px] text-text-muted">
                      QWBC coordinators will review division capacity and contact you via WhatsApp for upcoming trials.
                    </p>
                  </div>
                </form>
              </>
            ) : (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 mb-4">
                  <IconCheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Registration Request Received</h3>
                <p className="mt-2 text-sm text-text-secondary max-w-sm mx-auto leading-relaxed">
                  Thank you, <span className="text-foreground font-semibold">{formData.name}</span>. Your request to join Qatar Wakra Badminton Club has been recorded.
                </p>
                <div className="mt-6 rounded-md border border-border-subtle bg-surface-elevated p-4 text-left text-xs text-text-muted space-y-2">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <IconUsers className="w-4 h-4 text-club-red" />
                    <span>Next steps for onboarding:</span>
                  </div>
                  <p>1. QWBC coordinators will assess division capacity for {formData.skillLevel.toUpperCase()}.</p>
                  <p>2. You will be contacted at {formData.phone} via WhatsApp for an evaluation trial session.</p>
                  <p>3. Confirmation has been logged for {formData.email}.</p>
                </div>
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="mt-6 w-full rounded-md bg-club-red py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors shadow-xs"
                >
                  Return to Homepage
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
