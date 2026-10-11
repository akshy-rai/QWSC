"use client";

import React, { useState } from "react";
import { IconCheck } from "./icons/Icons";

export function FeatureShowcase() {
  const [activeTab, setActiveTab] = useState<"schedule" | "facility" | "equipment" | "standby">("schedule");

  return (
    <section id="sessions" className="py-20 md:py-28 bg-background border-b border-border-subtle">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-surface-elevated border border-border-subtle text-[11px] font-bold uppercase tracking-widest text-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-club-red" />
            <span>Activities & Facilities</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-tight">
            Weekly sessions at Wakra Sports Complex.
          </h2>

          <p className="text-base sm:text-lg text-text-secondary leading-relaxed">
            QWBC convenes every Friday evening across four regulation badminton courts. Learn about our session timing, facility standards, equipment, and match guidelines.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="mt-10 flex flex-wrap gap-2 border-b border-border-subtle pb-4">
          {[
            { id: "schedule", label: "Friday Session Timetable" },
            { id: "facility", label: "Arena & Court Standards" },
            { id: "equipment", label: "Shuttlecocks & Rules" },
            { id: "standby", label: "Standby & Replacement Protocol" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`rounded px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-club-red ${
                activeTab === tab.id
                  ? "bg-club-red text-white"
                  : "bg-surface text-text-secondary border border-border-subtle hover:bg-surface-elevated hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Display */}
        <div className="mt-8">
          {/* Tab 1: Friday Session Timetable */}
          {activeTab === "schedule" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-border-strong bg-surface p-6">
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-club-red">
                    Early Flight
                  </span>
                  <span className="text-xs font-mono font-semibold text-text-muted">
                    18:00 – 19:30
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground mt-3">
                  Slot 1: Division A & Division B League Doubles
                </h3>
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                  Fast-paced competitive doubles pairings. Players arrive by 17:50 for warm-up. Four courts run simultaneously with pre-assigned partners and opponents.
                </p>
                <div className="mt-4 pt-3 border-t border-border-subtle space-y-1.5 text-xs text-text-muted">
                  <div className="flex justify-between">
                    <span>Courts 1 & 2:</span>
                    <span className="font-semibold text-foreground">Division A (Advanced Competitive)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Courts 3 & 4:</span>
                    <span className="font-semibold text-foreground">Division B (Intermediate League)</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border-strong bg-surface p-6">
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-club-navy dark:text-blue-400">
                    Late Flight
                  </span>
                  <span className="text-xs font-mono font-semibold text-text-muted">
                    19:30 – 21:00
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground mt-3">
                  Slot 2: Division B, Mixed League & Social Development
                </h3>
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                  Mixed doubles brackets, second-flight intermediate games, and Division C recreational matches. Provides balanced competition across all playing tiers.
                </p>
                <div className="mt-4 pt-3 border-t border-border-subtle space-y-1.5 text-xs text-text-muted">
                  <div className="flex justify-between">
                    <span>Courts 1 & 2:</span>
                    <span className="font-semibold text-foreground">Division B & Mixed Doubles Brackets</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Courts 3 & 4:</span>
                    <span className="font-semibold text-foreground">Division C (Development & Social Play)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Arena & Court Standards */}
          {activeTab === "facility" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-lg border border-border-strong bg-surface p-6">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted block">
                  Flooring & Safety
                </span>
                <h4 className="text-base font-bold text-foreground mt-1">Sprung Hardwood Arena</h4>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  Professional sprung indoor flooring providing optimal traction and shock absorption to protect knees and ankles during intensive rallies.
                </p>
              </div>

              <div className="rounded-lg border border-border-strong bg-surface p-6">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted block">
                  Court Environment
                </span>
                <h4 className="text-base font-bold text-foreground mt-1">Climate & High Lighting</h4>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  Full climate control maintained at 22°C year-round. High-lux overhead illumination calibrated to eliminate glare when tracking high clears and smashes.
                </p>
              </div>

              <div className="rounded-lg border border-border-strong bg-surface p-6">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted block">
                  Hall Amenities
                </span>
                <h4 className="text-base font-bold text-foreground mt-1">Showers & Changing Rooms</h4>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  Dedicated member changing facilities, clean shower stalls, filtered water stations, and secure parking within Wakra Sports Complex.
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: Shuttlecocks & Rules */}
          {activeTab === "equipment" && (
            <div className="rounded-lg border border-border-strong bg-surface p-6 sm:p-8">
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-foreground">Official Shuttlecock Standards</h4>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                    QWBC strictly uses tournament-grade goose feather shuttlecocks (Yonex Aerosensa AS-30 or equivalent). Feather shuttles ensure authentic flight trajectory, true net tumble, and consistent smash speeds.
                  </p>
                  <div className="rounded border border-border-subtle bg-surface-elevated p-3 text-xs text-text-muted">
                    <span className="font-semibold text-foreground block">Shuttle Allocation</span>
                    Club dues cover all fresh tubes allocated for each court session. Used tubes are retired to training and warm-up baskets.
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-foreground">BWF Rally Scoring Laws</h4>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                    All QWBC league games follow official Badminton World Federation (BWF) laws: best-of-3 sets of 21 points with sudden death at 29-29 (cap at 30).
                  </p>
                  <ul className="space-y-2 text-xs text-text-muted">
                    <li className="flex items-center gap-2">
                      <IconCheck className="w-3.5 h-3.5 text-club-red" />
                      <span>Standard 21-point rally scoring with sudden death cap at 30</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <IconCheck className="w-3.5 h-3.5 text-club-red" />
                      <span>Players rotate court sides at 11 points in the deciding third set</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <IconCheck className="w-3.5 h-3.5 text-club-red" />
                      <span>Scores submitted to session coordinator after each match</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Standby & Replacement Protocol */}
          {activeTab === "standby" && (
            <div className="rounded-lg border border-border-strong bg-surface p-6 sm:p-8">
              <div className="max-w-2xl space-y-4">
                <h4 className="text-lg font-bold text-foreground">Zero Court Downtime Policy</h4>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  Because court time is in high demand, QWBC maintains a standby reserve protocol. If a confirmed member provides notice of absence, the next qualified reserve player in that division is notified via WhatsApp.
                </p>
                <div className="grid gap-3 sm:grid-cols-3 pt-2 text-xs">
                  <div className="rounded border border-border-subtle bg-surface-elevated p-3">
                    <span className="font-bold text-foreground block">1. Early Notice</span>
                    <span className="text-text-muted mt-1 block">
                      Members notify absence at least 6 hours before Friday session.
                    </span>
                  </div>
                  <div className="rounded border border-border-subtle bg-surface-elevated p-3">
                    <span className="font-bold text-foreground block">2. Auto-Dispatch</span>
                    <span className="text-text-muted mt-1 block">
                      Standby queue alerts next available sub matching player category.
                    </span>
                  </div>
                  <div className="rounded border border-border-subtle bg-surface-elevated p-3">
                    <span className="font-bold text-foreground block">3. Lineup Updated</span>
                    <span className="text-text-muted mt-1 block">
                      Court remains at full 4/4 capacity with zero lost rally time.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
