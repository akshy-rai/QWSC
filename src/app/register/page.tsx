"use client";

import React, { useState, useId, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconMapPin,
  IconPhone,
  IconSend,
  IconCheckCircle2,
  IconUsers,
  IconAlertCircle,
  IconArrowRight,
  IconArrowLeft,
  IconLock,
  IconMail,
  IconEye,
  IconEyeOff,
  IconClock,
  IconSparkles,
  IconCheck,
} from "@/components/icons/Icons";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AuthTabs } from "@/components/AuthTabs";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { ApiError } from "@/lib/api";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, onboard, user: currentUser, isLoading: authLoading } = useAuth();

  // Redirect authenticated active users directly based on role
  useEffect(() => {
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

  const isDirectOnboard =
    (searchParams.get("step") === "onboard" || searchParams.get("step") === "onboarding") &&
    Boolean(searchParams.get("userId"));
  const isDirectSubmitted = searchParams.get("step") === "submitted";

  // Step state: "credentials" | "onboarding" | "submitted"
  const [step, setStep] = useState<"credentials" | "onboarding" | "submitted">(() => {
    if (isDirectSubmitted) return "submitted";
    if (isDirectOnboard) return "onboarding";
    return "credentials";
  });

  // Step 1: Initial Registration state
  const [initialData, setInitialData] = useState({
    name: searchParams.get("name") || "",
    email: searchParams.get("email") || "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(() => {
    const urlErr = searchParams.get("error");
    if (urlErr === "google_cancelled") return "Google registration was cancelled.";
    if (urlErr === "google_not_configured") return "Google OAuth is not configured on this server.";
    if (urlErr) return "Google registration could not be completed. Please try with email.";
    return null;
  });
  const [registerLoading, setRegisterLoading] = useState(false);

  // Step 2: Onboarding state
  const [pendingUserId, setPendingUserId] = useState<string | null>(() =>
    searchParams.get("userId") || null
  );
  const [pendingUserEmail, setPendingUserEmail] = useState<string>(() =>
    searchParams.get("email") || ""
  );
  const [pendingUserName, setPendingUserName] = useState<string>(() =>
    searchParams.get("name") || ""
  );
  const [onboardData, setOnboardData] = useState({
    phone: "",
    address: "",
    divisionCode: "DIV_B" as "DIV_A" | "DIV_B" | "DIV_C" | "MIXED",
    preferredSlot: "FLEXIBLE" as "SLOT_1_1800" | "SLOT_2_1930" | "FLEXIBLE",
  });
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardLoading, setOnboardLoading] = useState(false);

  // Accessible unique IDs
  const nameInputId = useId();
  const emailInputId = useId();
  const passwordInputId = useId();
  const confirmPasswordInputId = useId();
  const phoneInputId = useId();
  const addressInputId = useId();

  // Password validation checks
  const passLengthMet = initialData.password.length >= 8;
  const passLetterMet = /[A-Za-z]/.test(initialData.password);
  const passNumberMet = /[0-9]/.test(initialData.password);
  const passMatch =
    initialData.confirmPassword.length > 0 &&
    initialData.password === initialData.confirmPassword;

  // Password strength score (0 to 3)
  const strengthScore = [passLengthMet, passLetterMet, passNumberMet].filter(Boolean).length;

  // Common Qatar location presets
  const locationPresets = [
    "Al Wakra",
    "Ezdan Village",
    "Mesaieed",
    "Barwa City",
    "Doha Zone 90",
  ];

  // Step 1: Initial Submit
  const handleInitialRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    // Client-side validations
    if (!passLengthMet || !passLetterMet || !passNumberMet) {
      setRegisterError("Password must be at least 8 characters long and contain at least 1 letter and 1 number.");
      return;
    }

    if (initialData.password !== initialData.confirmPassword) {
      setRegisterError("Passwords do not match. Please re-type your confirm password.");
      return;
    }

    setRegisterLoading(true);

    try {
      const res = await register({
        fullName: initialData.name.trim(),
        email: initialData.email.trim(),
        password: initialData.password,
      });

      if (res.user) {
        setPendingUserId(res.user.id);
        setPendingUserEmail(res.user.email);
        setPendingUserName(res.user.fullName);
      } else {
        setPendingUserEmail(initialData.email.trim());
        setPendingUserName(initialData.name.trim());
      }

      setStep("onboarding");
    } catch (err) {
      if (err instanceof ApiError) {
        setRegisterError(err.message);
      } else {
        setRegisterError("Unable to initiate registration. Please check your network and try again.");
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  // Step 2: Onboard Submit
  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardError(null);
    setOnboardLoading(true);

    try {
      await onboard({
        userId: pendingUserId || undefined,
        phone: onboardData.phone.trim(),
        address: onboardData.address.trim(),
        divisionCode: onboardData.divisionCode,
        preferredSlot: onboardData.preferredSlot,
      });

      setStep("submitted");
    } catch (err) {
      if (err instanceof ApiError) {
        setOnboardError(err.message);
      } else {
        setOnboardError("Unable to save player profile details. Please try again.");
      }
    } finally {
      setOnboardLoading(false);
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
          <AuthTabs activeTab="register" />

          {/* STEP 1: CREDENTIALS */}
          {step === "credentials" && (
            <div>
              {/* Step Progress Bar */}
              <div className="mb-5">
                <div className="flex items-center justify-between text-xs font-semibold text-text-muted mb-2">
                  <span className="text-club-red font-bold">Step 1 of 2: Account Credentials</span>
                  <span>50% Completed</span>
                </div>
                <div className="h-1.5 w-full bg-border-subtle rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-club-red rounded-full transition-all duration-300" />
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="text-center mb-6">
                <h1 id="register-heading" className="text-2xl font-black tracking-tight text-foreground">
                  Create Player Account
                </h1>
                <p className="mt-1 text-xs text-text-muted">
                  Join Qatar Wakra Badminton Club as a registered player
                </p>
              </div>

              {/* Register Error Banner */}
              {registerError && (
                <div role="alert" className="mb-5 rounded-xl border border-red-300 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 p-3.5 text-xs text-red-800 dark:text-red-200">
                  <div className="flex gap-2">
                    <IconAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{registerError}</span>
                  </div>
                </div>
              )}

              {/* Fast Register with Google */}
              <div className="space-y-3">
                <GoogleSignInButton
                  mode="signup"
                  text="signup_with"
                />

                <div className="relative flex items-center justify-center my-4">
                  <div className="border-t border-border-subtle w-full" />
                  <span className="bg-surface px-3 text-[11px] font-bold text-text-muted uppercase tracking-wider relative z-10">
                    or register with email
                  </span>
                  <div className="border-t border-border-subtle w-full" />
                </div>
              </div>

              {/* Step 1 Credentials Form */}
              <form onSubmit={handleInitialRegisterSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label htmlFor={nameInputId} className="block text-xs font-bold text-foreground mb-1.5">
                    Full Name (as in Qatar ID / Passport) *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                      <IconUsers className="w-4 h-4" />
                    </div>
                    <input
                      id={nameInputId}
                      type="text"
                      required
                      autoComplete="name"
                      value={initialData.name}
                      onChange={(e) => setInitialData({ ...initialData, name: e.target.value })}
                      placeholder="e.g. Tariq Al-Kuwari"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border-strong bg-surface text-sm text-foreground placeholder:text-text-muted/60 focus:border-club-red focus:outline-none focus:ring-2 focus:ring-club-red/20 transition-all"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor={emailInputId} className="block text-xs font-bold text-foreground mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                      <IconMail className="w-4 h-4" />
                    </div>
                    <input
                      id={emailInputId}
                      type="email"
                      required
                      autoComplete="email"
                      value={initialData.email}
                      onChange={(e) => setInitialData({ ...initialData, email: e.target.value })}
                      placeholder="you@domain.qa"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border-strong bg-surface text-sm text-foreground placeholder:text-text-muted/60 focus:border-club-red focus:outline-none focus:ring-2 focus:ring-club-red/20 transition-all"
                    />
                  </div>
                </div>

                {/* Password with Strength Checklist */}
                <div>
                  <label htmlFor={passwordInputId} className="block text-xs font-bold text-foreground mb-1.5">
                    Create Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                      <IconLock className="w-4 h-4" />
                    </div>
                    <input
                      id={passwordInputId}
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      minLength={8}
                      value={initialData.password}
                      onChange={(e) => setInitialData({ ...initialData, password: e.target.value })}
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

                  {/* Password Requirements Real-Time Checklist */}
                  {initialData.password.length > 0 && (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-surface-elevated border border-border-subtle text-[11px] space-y-1.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[10px] text-text-muted font-medium">Strength:</span>
                        <div className="flex-1 h-1 bg-border-subtle rounded-full overflow-hidden flex gap-1">
                          <div className={`h-full flex-1 rounded-full ${
                            strengthScore >= 1 ? (strengthScore === 1 ? "bg-red-500" : strengthScore === 2 ? "bg-amber-500" : "bg-emerald-500") : "bg-transparent"
                          }`} />
                          <div className={`h-full flex-1 rounded-full ${
                            strengthScore >= 2 ? (strengthScore === 2 ? "bg-amber-500" : "bg-emerald-500") : "bg-transparent"
                          }`} />
                          <div className={`h-full flex-1 rounded-full ${
                            strengthScore === 3 ? "bg-emerald-500" : "bg-transparent"
                          }`} />
                        </div>
                        <span className="text-[10px] font-bold text-text-secondary">
                          {strengthScore === 0 ? "Empty" : strengthScore === 1 ? "Weak" : strengthScore === 2 ? "Good" : "Strong"}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1">
                        <span className={`flex items-center gap-1 ${passLengthMet ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-text-muted"}`}>
                          <IconCheck className={`w-3 h-3 ${passLengthMet ? "text-emerald-500" : "opacity-30"}`} />
                          <span>8+ chars</span>
                        </span>
                        <span className={`flex items-center gap-1 ${passLetterMet ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-text-muted"}`}>
                          <IconCheck className={`w-3 h-3 ${passLetterMet ? "text-emerald-500" : "opacity-30"}`} />
                          <span>1 letter</span>
                        </span>
                        <span className={`flex items-center gap-1 ${passNumberMet ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-text-muted"}`}>
                          <IconCheck className={`w-3 h-3 ${passNumberMet ? "text-emerald-500" : "opacity-30"}`} />
                          <span>1 number</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor={confirmPasswordInputId} className="block text-xs font-bold text-foreground">
                      Confirm Password *
                    </label>
                    {initialData.confirmPassword.length > 0 && (
                      <span className={`text-[11px] font-semibold ${passMatch ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                        {passMatch ? "✓ Passwords match" : "Passwords do not match"}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                      <IconLock className="w-4 h-4" />
                    </div>
                    <input
                      id={confirmPasswordInputId}
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={initialData.confirmPassword}
                      onChange={(e) => setInitialData({ ...initialData, confirmPassword: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-border-strong bg-surface text-sm text-foreground placeholder:text-text-muted/60 focus:border-club-red focus:outline-none focus:ring-2 focus:ring-club-red/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-foreground cursor-pointer focus:outline-none"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  id="btn-register-step1"
                  disabled={registerLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-club-red py-3 text-sm font-bold text-white hover:bg-red-700 transition-all shadow-md shadow-club-red/20 disabled:opacity-50 cursor-pointer hover:shadow-lg active:scale-[0.99]"
                >
                  {registerLoading ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Creating Player Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Step 2: Player Profile</span>
                      <IconArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

            </div>
          )}

          {/* STEP 2: ONBOARDING */}
          {step === "onboarding" && (
            <div>
              {/* Progress Header */}
              <div className="mb-5">
                <div className="flex items-center justify-between text-xs font-semibold text-text-muted mb-2">
                  <button
                    type="button"
                    onClick={() => setStep("credentials")}
                    className="text-club-red hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <IconArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Step 1</span>
                  </button>
                  <span className="text-club-red font-bold">Step 2 of 2: Player Profile</span>
                </div>
                <div className="h-1.5 w-full bg-border-subtle rounded-full overflow-hidden">
                  <div className="h-full w-full bg-club-red rounded-full transition-all duration-300" />
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black tracking-tight text-foreground">
                  Complete Your Profile
                </h2>
                <p className="mt-1 text-xs text-text-muted">
                  Welcome{pendingUserName ? `, ${pendingUserName}` : ""}! Enter your Qatar contact number and match preferences.
                </p>
              </div>

              {/* Onboard Error Banner */}
              {onboardError && (
                <div role="alert" className="mb-5 rounded-xl border border-red-300 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 p-3.5 text-xs text-red-800 dark:text-red-200">
                  <div className="flex gap-2">
                    <IconAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{onboardError}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleOnboardSubmit} className="space-y-4">
                {/* Qatar Phone Number */}
                <div>
                  <label htmlFor={phoneInputId} className="block text-xs font-bold text-foreground mb-1.5">
                    Mobile / WhatsApp Number in Qatar *
                  </label>
                  <div className="relative flex rounded-lg border border-border-strong bg-surface focus-within:border-club-red focus-within:ring-2 focus-within:ring-club-red/20 transition-all overflow-hidden">
                    <div className="flex items-center gap-1.5 px-3 bg-surface-elevated border-r border-border-subtle text-xs font-bold text-foreground shrink-0 select-none">
                      <span role="img" aria-label="Qatar flag">🇶🇦</span>
                      <span>+974</span>
                    </div>
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                        <IconPhone className="w-4 h-4" />
                      </div>
                      <input
                        id={phoneInputId}
                        type="tel"
                        required
                        value={onboardData.phone}
                        onChange={(e) => setOnboardData({ ...onboardData, phone: e.target.value })}
                        placeholder="5555 1234 or +974 5555 1234"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-transparent text-foreground placeholder:text-text-muted/60 focus:outline-none"
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-text-muted">
                    Used for Friday court assignment notifications and coordinator match confirmations.
                  </p>
                </div>

                {/* Qatar Address / Zone */}
                <div>
                  <label htmlFor={addressInputId} className="block text-xs font-bold text-foreground mb-1.5">
                    Address / Zone in Qatar *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                      <IconMapPin className="w-4 h-4" />
                    </div>
                    <input
                      id={addressInputId}
                      type="text"
                      required
                      value={onboardData.address}
                      onChange={(e) => setOnboardData({ ...onboardData, address: e.target.value })}
                      placeholder="e.g. Al Wakra / Street 840, Zone 90"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border-strong bg-surface text-sm text-foreground placeholder:text-text-muted/60 focus:border-club-red focus:outline-none focus:ring-2 focus:ring-club-red/20 transition-all"
                    />
                  </div>

                  {/* Quick Location Suggestion Chips */}
                  <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-text-muted font-medium">Quick select:</span>
                    {locationPresets.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setOnboardData({ ...onboardData, address: loc })}
                        className="px-2 py-0.5 rounded-md bg-surface-elevated hover:bg-club-red/10 border border-border-subtle hover:border-club-red/30 text-[10px] text-text-secondary hover:text-club-red transition-colors cursor-pointer"
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Division Selection (Visual Cards) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-foreground">
                      Badminton Division / Skill Level *
                    </label>
                    <span className="text-[10px] text-text-muted">BWF Doubles Format</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Division A */}
                    <label
                      className={`relative flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                        onboardData.divisionCode === "DIV_A"
                          ? "border-club-red bg-club-red/5 ring-1 ring-club-red shadow-xs"
                          : "border-border-strong bg-surface hover:bg-surface-elevated"
                      }`}
                    >
                      <input
                        type="radio"
                        name="divisionCode"
                        value="DIV_A"
                        checked={onboardData.divisionCode === "DIV_A"}
                        onChange={() => setOnboardData({ ...onboardData, divisionCode: "DIV_A" })}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Division A</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                          Advanced
                        </span>
                      </div>
                      <span className="text-[11px] text-text-muted mt-1">
                        High-tempo competitive play, tournament veterans & elite smashes.
                      </span>
                    </label>

                    {/* Division B */}
                    <label
                      className={`relative flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                        onboardData.divisionCode === "DIV_B"
                          ? "border-club-red bg-club-red/5 ring-1 ring-club-red shadow-xs"
                          : "border-border-strong bg-surface hover:bg-surface-elevated"
                      }`}
                    >
                      <input
                        type="radio"
                        name="divisionCode"
                        value="DIV_B"
                        checked={onboardData.divisionCode === "DIV_B"}
                        onChange={() => setOnboardData({ ...onboardData, divisionCode: "DIV_B" })}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Division B</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          Most Popular
                        </span>
                      </div>
                      <span className="text-[11px] text-text-muted mt-1">
                        Intermediate league, solid rally control & club regulars.
                      </span>
                    </label>

                    {/* Division C */}
                    <label
                      className={`relative flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                        onboardData.divisionCode === "DIV_C"
                          ? "border-club-red bg-club-red/5 ring-1 ring-club-red shadow-xs"
                          : "border-border-strong bg-surface hover:bg-surface-elevated"
                      }`}
                    >
                      <input
                        type="radio"
                        name="divisionCode"
                        value="DIV_C"
                        checked={onboardData.divisionCode === "DIV_C"}
                        onChange={() => setOnboardData({ ...onboardData, divisionCode: "DIV_C" })}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Division C</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Recreational
                        </span>
                      </div>
                      <span className="text-[11px] text-text-muted mt-1">
                        Developing players, social games & friendly Friday doubles.
                      </span>
                    </label>

                    {/* Mixed Doubles */}
                    <label
                      className={`relative flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                        onboardData.divisionCode === "MIXED"
                          ? "border-club-red bg-club-red/5 ring-1 ring-club-red shadow-xs"
                          : "border-border-strong bg-surface hover:bg-surface-elevated"
                      }`}
                    >
                      <input
                        type="radio"
                        name="divisionCode"
                        value="MIXED"
                        checked={onboardData.divisionCode === "MIXED"}
                        onChange={() => setOnboardData({ ...onboardData, divisionCode: "MIXED" })}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Mixed Doubles</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          Co-Ed League
                        </span>
                      </div>
                      <span className="text-[11px] text-text-muted mt-1">
                        Dedicated mixed pairs league roster and Friday round-robins.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Preferred Slot (Visual Toggle Cards) */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Preferred Friday Match Slot *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Flexible */}
                    <label
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        onboardData.preferredSlot === "FLEXIBLE"
                          ? "border-club-red bg-club-red/5 ring-1 ring-club-red shadow-xs"
                          : "border-border-strong bg-surface hover:bg-surface-elevated"
                      }`}
                    >
                      <input
                        type="radio"
                        name="preferredSlot"
                        value="FLEXIBLE"
                        checked={onboardData.preferredSlot === "FLEXIBLE"}
                        onChange={() => setOnboardData({ ...onboardData, preferredSlot: "FLEXIBLE" })}
                        className="sr-only"
                      />
                      <IconSparkles className="w-4 h-4 text-club-red shrink-0" />
                      <div className="text-left">
                        <span className="block text-xs font-bold text-foreground">Flexible</span>
                        <span className="block text-[10px] text-text-muted">18:00 – 21:00</span>
                      </div>
                    </label>

                    {/* Slot 1 */}
                    <label
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        onboardData.preferredSlot === "SLOT_1_1800"
                          ? "border-club-red bg-club-red/5 ring-1 ring-club-red shadow-xs"
                          : "border-border-strong bg-surface hover:bg-surface-elevated"
                      }`}
                    >
                      <input
                        type="radio"
                        name="preferredSlot"
                        value="SLOT_1_1800"
                        checked={onboardData.preferredSlot === "SLOT_1_1800"}
                        onChange={() => setOnboardData({ ...onboardData, preferredSlot: "SLOT_1_1800" })}
                        className="sr-only"
                      />
                      <IconClock className="w-4 h-4 text-text-muted shrink-0" />
                      <div className="text-left">
                        <span className="block text-xs font-bold text-foreground">Slot 1 Only</span>
                        <span className="block text-[10px] text-text-muted">18:00 – 19:30</span>
                      </div>
                    </label>

                    {/* Slot 2 */}
                    <label
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        onboardData.preferredSlot === "SLOT_2_1930"
                          ? "border-club-red bg-club-red/5 ring-1 ring-club-red shadow-xs"
                          : "border-border-strong bg-surface hover:bg-surface-elevated"
                      }`}
                    >
                      <input
                        type="radio"
                        name="preferredSlot"
                        value="SLOT_2_1930"
                        checked={onboardData.preferredSlot === "SLOT_2_1930"}
                        onChange={() => setOnboardData({ ...onboardData, preferredSlot: "SLOT_2_1930" })}
                        className="sr-only"
                      />
                      <IconClock className="w-4 h-4 text-text-muted shrink-0" />
                      <div className="text-left">
                        <span className="block text-xs font-bold text-foreground">Slot 2 Only</span>
                        <span className="block text-[10px] text-text-muted">19:30 – 21:00</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    id="btn-onboard-submit"
                    disabled={onboardLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-club-red py-3 text-sm font-bold text-white hover:bg-red-700 transition-all shadow-md shadow-club-red/20 disabled:opacity-50 cursor-pointer hover:shadow-lg active:scale-[0.99]"
                  >
                    {onboardLoading ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Submitting Player Application...</span>
                      </>
                    ) : (
                      <>
                        <IconSend className="w-4 h-4" />
                        <span>Complete Registration & Submit Application</span>
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-center text-[11px] text-text-muted">
                    Your player application will be forwarded to the QWSC committee for roster clearance.
                  </p>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: SUBMITTED CONFIRMATION */}
          {step === "submitted" && (
            <div className="py-4 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 mb-4 shadow-inner">
                <IconCheckCircle2 className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-black text-foreground">
                Application Successfully Submitted!
              </h2>
              <p className="mt-1.5 text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
                Thank you, <span className="text-foreground font-bold">{pendingUserName || initialData.name}</span>. Your player profile and division preferences have been submitted to Qatar Wakra Badminton Club.
              </p>

              {/* Player Summary Card */}
              <div className="mt-5 rounded-xl border border-border-strong bg-surface-elevated p-4 text-left text-xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                  <span className="font-bold text-foreground">Application Summary</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    Pending Committee Approval
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-text-muted block">Registered Email</span>
                    <span className="font-semibold text-foreground truncate block">
                      {pendingUserEmail || initialData.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Mobile Number</span>
                    <span className="font-semibold text-foreground block">
                      {onboardData.phone || "On file"}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Requested Division</span>
                    <span className="font-semibold text-foreground block">
                      {onboardData.divisionCode === "DIV_A" ? "Division A (Advanced)" : onboardData.divisionCode === "DIV_B" ? "Division B (Intermediate)" : onboardData.divisionCode === "DIV_C" ? "Division C (Recreational)" : "Mixed Doubles"}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Preferred Match Slot</span>
                    <span className="font-semibold text-foreground block">
                      {onboardData.preferredSlot === "FLEXIBLE" ? "Flexible (18:00 – 21:00)" : onboardData.preferredSlot === "SLOT_1_1800" ? "Slot 1 (18:00 – 19:30)" : "Slot 2 (19:30 – 21:00)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Next Steps Timeline */}
              <div className="mt-4 rounded-xl border border-border-subtle bg-surface p-4 text-left text-xs space-y-2">
                <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider">
                  What happens next:
                </span>
                <div className="space-y-1.5 text-text-muted text-[11px]">
                  <p>• <strong>1. Committee Review:</strong> Coordinators balance division rosters every Wednesday.</p>
                  <p>• <strong>2. WhatsApp Notification:</strong> You will receive court venue & match confirmation alerts.</p>
                  <p>• <strong>3. Portal Access:</strong> Once approved, sign in anytime to RSVP for upcoming Friday sessions.</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/"
                  className="flex-1 rounded-xl bg-club-red py-3 text-xs font-bold text-white hover:bg-red-700 transition-colors shadow-xs text-center"
                >
                  Return to Homepage
                </Link>
                <Link
                  href="/signin"
                  className="flex-1 rounded-xl border border-border-strong bg-surface-elevated py-3 text-xs font-semibold text-foreground hover:bg-surface transition-colors text-center"
                >
                  Go to Sign In Portal
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Common Site Footer */}
      <Footer />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
            <div className="h-4 w-4 rounded-full border-2 border-club-red border-t-transparent animate-spin" />
            <span>Loading Registration...</span>
          </div>
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
