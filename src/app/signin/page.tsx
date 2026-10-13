"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconLock,
  IconMail,
  IconEye,
  IconEyeOff,
  IconAlertCircle,
  IconArrowRight,
  IconShieldCheck,
  IconHelpCircle,
  IconX,
} from "@/components/icons/Icons";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AuthTabs } from "@/components/AuthTabs";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { ApiError } from "@/lib/api";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user: currentUser, isLoading: authLoading } = useAuth();

  // Direct redirection for already-authenticated active users based on role
  React.useEffect(() => {
    if (!authLoading && currentUser && currentUser.status === "ACTIVE") {
      if (currentUser.role === "ADMIN") {
        router.push("/admin");
      } else if (currentUser.role === "COORDINATOR") {
        router.push("/coordinator");
      } else {
        router.push("/member");
      }
    }
  }, [currentUser, authLoading, router]);

  // Form states
  const [email, setEmail] = useState(() => {
    const urlEmail = searchParams.get("email");
    if (urlEmail) return urlEmail;
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("qwbc_saved_email") || "";
      } catch {
        return "";
      }
    }
    return "";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return Boolean(localStorage.getItem("qwbc_saved_email"));
      } catch {
        return false;
      }
    }
    return false;
  });
  const [error, setError] = useState<string | null>(() => {
    const urlErr = searchParams.get("error");
    if (urlErr === "account_linking_required") {
      return "An account with this Google email already exists. Please sign in with your password to link your accounts.";
    }
    if (urlErr === "account_suspended") {
      return "Your account has been suspended. Please contact club administration.";
    }
    if (urlErr === "account_inactive") {
      return "Your account is inactive. Please contact club administration.";
    }
    if (urlErr === "google_cancelled") {
      return "Google Sign-In was cancelled.";
    }
    if (urlErr === "oauth_session_expired" || urlErr === "oauth_state_mismatch") {
      return "Google Sign-In session expired. Please try again.";
    }
    if (urlErr === "google_not_configured") {
      return "Google OAuth is not configured on this server.";
    }
    if (urlErr) {
      return "Google authentication failed. Please try again or sign in with email and password.";
    }
    return null;
  });
  const [errorCode, setErrorCode] = useState<string | null>(() => {
    return searchParams.get("error") || null;
  });
  const [loading, setLoading] = useState(false);

  // Forgot password dialog state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  // Pending user needing onboarding
  const [pendingUser, setPendingUser] = useState<{ id: string; fullName: string; email: string } | null>(null);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorCode(null);
    setPendingUser(null);
    setLoading(true);

    try {
      try {
        if (rememberEmail && email.trim()) {
          localStorage.setItem("qwbc_saved_email", email.trim());
        } else {
          localStorage.removeItem("qwbc_saved_email");
        }
      } catch {
        // ignore storage errors
      }

      const loggedInUser = await login({ email, password });
      if (loggedInUser.role === "ADMIN") {
        router.push("/admin");
      } else if (loggedInUser.role === "COORDINATOR") {
        router.push("/coordinator");
      } else {
        router.push("/member");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setErrorCode(err.code || null);
      } else {
        setError("Unable to connect to the authentication service. Please check your internet connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors selection:bg-club-red selection:text-white">
      {/* Common Site Navbar */}
      <Navbar />

      {/* Main Centered Content */}
      <main className="flex-1 flex items-center justify-center py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg rounded-2xl border border-border-strong bg-surface p-6 sm:p-8 shadow-xl">
          {/* Centered Mode Toggle Tabs */}
          <AuthTabs activeTab="signin" />

          {/* Title & Subtitle */}
          <div className="text-center mb-6">
            <h1 id="signin-heading" className="text-2xl font-black tracking-tight text-foreground">
              Member Sign In
            </h1>
            <p className="mt-1 text-xs text-text-muted">
              Access your court schedules, lineups, and player profile
            </p>
          </div>

          {/* Error / Pending Notice Banner */}
          {error && (
            <div
              role="alert"
              className={`mb-5 rounded-xl border p-4 text-xs animate-in fade-in duration-200 ${
                errorCode === "ACCOUNT_PENDING_APPROVAL"
                  ? "border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200"
                  : "border-red-300 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200"
              }`}
            >
              <div className="flex gap-2.5">
                <IconAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="block font-bold">
                    {errorCode === "ACCOUNT_PENDING_APPROVAL"
                      ? "Account Pending Administrator Approval"
                      : "Sign In Unsuccessful"}
                  </strong>
                  <span className="mt-0.5 block leading-relaxed">{error}</span>

                  {errorCode === "ACCOUNT_PENDING_APPROVAL" && (
                    <p className="mt-2 text-[11px] text-amber-800/80 dark:text-amber-300/80">
                      Player registrations are reviewed by the QWSC committee every Wednesday. You will receive an email once approved.
                    </p>
                  )}

                  {pendingUser && (
                    <Link
                      href={`/register?step=onboard&userId=${encodeURIComponent(
                        pendingUser.id
                      )}&name=${encodeURIComponent(pendingUser.fullName)}&email=${encodeURIComponent(
                        pendingUser.email
                      )}`}
                      className="mt-2 inline-flex items-center gap-1 font-bold text-amber-950 dark:text-amber-100 underline hover:no-underline"
                    >
                      <span>Complete your player profile details →</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Google Sign In Area */}
          <div className="space-y-3">
            <GoogleSignInButton
              mode="signin"
              text="continue_with"
            />

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-border-subtle w-full" />
              <span className="bg-surface px-3 text-[11px] font-bold text-text-muted uppercase tracking-wider relative z-10">
                or sign in with password
              </span>
              <div className="border-t border-border-subtle w-full" />
            </div>
          </div>

          {/* Password Sign In Form */}
          <form onSubmit={handleSignInSubmit} className="space-y-4">
            {/* Email Address */}
            <div>
              <label htmlFor="signin-email" className="block text-xs font-bold text-foreground mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <IconMail className="w-4 h-4" />
                </div>
                <input
                  id="signin-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="player@domain.qa"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border-strong bg-surface text-sm text-foreground placeholder:text-text-muted/60 focus:border-club-red focus:outline-none focus:ring-2 focus:ring-club-red/20 transition-all"
                />
              </div>
            </div>

            {/* Password with Show/Hide toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="signin-password" className="block text-xs font-bold text-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-[11px] font-semibold text-club-red hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <IconLock className="w-4 h-4" />
                </div>
                <input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-border-strong bg-surface text-sm text-foreground placeholder:text-text-muted/60 focus:border-club-red focus:outline-none focus:ring-2 focus:ring-club-red/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-foreground cursor-pointer focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Session Note */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  className="rounded border-border-strong text-club-red focus:ring-club-red/20 h-4 w-4"
                />
                <span className="text-text-secondary font-medium">Remember my email</span>
              </label>

              <span className="text-[11px] text-text-muted flex items-center gap-1">
                <IconShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Encrypted Session</span>
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-signin-submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-club-red py-3 text-sm font-bold text-white hover:bg-red-700 transition-all shadow-md shadow-club-red/20 disabled:opacity-50 cursor-pointer hover:shadow-lg active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Authenticating Player...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Member Portal</span>
                  <IconArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* New Player Callout */}
          <div className="pt-6 mt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-text-muted">Not registered with QWBC yet?</span>
            <Link
              href="/register"
              className="font-bold text-club-red hover:underline inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-club-red/10 transition-colors"
            >
              <span>Register as New Player</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal Dialog */}
      {forgotPasswordOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-2xl border border-border-strong bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-club-red/10 text-club-red">
                  <IconHelpCircle className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">Forgot Your Password?</h3>
              </div>
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(false)}
                className="text-text-muted hover:text-foreground rounded-lg p-1 hover:bg-surface-elevated transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-text-secondary leading-relaxed">
              <p>
                To maintain player registry security and division integrity, password resets for QWBC accounts are managed through the club technical committee.
              </p>
              <div className="rounded-xl border border-border-subtle bg-surface-elevated p-3.5 space-y-2">
                <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider">
                  How to reset your access:
                </span>
                <p>
                  <strong>1. Contact WhatsApp Helpdesk:</strong> Message your registered mobile number and full name to the QWBC coordinator team.
                </p>
                <p>
                  <strong>2. Visit the Coordinator Desk:</strong> Speak to our registration desk coordinator any Friday at Wakra Sports Complex between 17:30 and 18:00.
                </p>
                <p>
                  <strong>3. Google Account:</strong> If your email is a Google account, you can sign in directly using the <em>&quot;Continue with Google&quot;</em> button.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(false)}
                className="rounded-lg bg-club-red px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
              >
                Got It, Return to Sign In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Common Site Footer */}
      <Footer />
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
            <div className="h-4 w-4 rounded-full border-2 border-club-red border-t-transparent animate-spin" />
            <span>Loading Sign In...</span>
          </div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
