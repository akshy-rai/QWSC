import React from "react";
import { IconCheck } from "./icons/Icons";

export function ValueProposition() {
  const divisions = [
    {
      code: "DIV A",
      name: "Division A — Advanced Competitive",
      badgeColor: "bg-club-red text-white",
      pace: "High Velocity",
      profile:
        "High-pace competitive doubles. Players demonstrate disciplined footwork, consistent overhead jump smashes, aggressive net interception, and tournament experience.",
      criteria: [
        "Consistent execution of deceptive drops, flat drives, and steep cross-court smashes",
        "Fast court transition and rotation mechanics between attacking and defensive formations",
        "Regular participation in regional open tournaments in Qatar and the GCC",
      ],
    },
    {
      code: "DIV B",
      name: "Division B — Intermediate League",
      badgeColor: "bg-club-navy text-white dark:bg-blue-600",
      pace: "Moderate to Fast",
      profile:
        "Solid rallies and strategic shot selection. Players possess reliable clear-drop consistency, defensive recovery, and understand doubles court coverage.",
      criteria: [
        "Reliable baseline-to-baseline clearing and controlled backcourt recovery",
        "Consistent service reception and offensive net push placement",
        "Active league standing with quarterly coordinator promotion reviews",
      ],
    },
    {
      code: "DIV C",
      name: "Division C — Development & Social",
      badgeColor: "bg-slate-700 text-white dark:bg-slate-600",
      pace: "Recreational & Sustained",
      profile:
        "Players focusing on technique, rally endurance, and doubles positioning in a supportive, social atmosphere.",
      criteria: [
        "Developing overhead mechanics, lift consistency, and footwork patterns",
        "Focus on fitness, friendly rallying, and learning BWF doubles rules",
        "Welcoming environment for returning players and developing badminton enthusiasts",
      ],
    },
    {
      code: "MIXED",
      name: "Mixed Doubles League",
      badgeColor: "bg-emerald-700 text-white dark:bg-emerald-600",
      pace: "Tactical & Balanced",
      profile:
        "Traditional mixed doubles setups emphasizing front-court net control, mid-court interception, and backcourt attacking power.",
      criteria: [
        "Dedicated Friday Slot 2 brackets pairing female and male club members",
        "Tactical placement prioritizing net domination and backcourt drive support",
        "Seasonal round-robin brackets leading to annual QWBC Mixed Trophies",
      ],
    },
  ];

  return (
    <section id="divisions" className="py-20 md:py-28 bg-surface-elevated border-b border-border-subtle">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-surface border border-border-subtle text-[11px] font-bold uppercase tracking-widest text-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-club-red" />
            <span>Competitive Structure</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-tight">
            League divisions & skill tiers.
          </h2>

          <p className="text-base sm:text-lg text-text-secondary leading-relaxed">
            QWBC categorizes members into four distinct playing flights to ensure every match is competitive, balanced, and enjoyable for both sides of the net.
          </p>
        </div>

        {/* Divisions Stack */}
        <div className="mt-12 space-y-4">
          {divisions.map((div) => (
            <div
              key={div.code}
              className="rounded-lg border border-border-strong bg-surface p-6 transition-colors hover:border-slate-400 dark:hover:border-slate-600"
            >
              <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
                <div className="lg:col-span-4 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono tracking-wider ${div.badgeColor}`}>
                      {div.code}
                    </span>
                    <span className="text-xs font-semibold text-text-muted">
                      Pace: {div.pace}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight">
                    {div.name}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {div.profile}
                  </p>
                </div>

                <div className="lg:col-span-8 lg:border-l lg:border-border-subtle lg:pl-6 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                    Placement Guidelines & Play Style:
                  </span>
                  <div className="space-y-2 pt-1">
                    {div.criteria.map((c) => (
                      <div key={c} className="flex items-start gap-2.5 text-xs text-text-secondary">
                        <IconCheck className="w-3.5 h-3.5 text-club-red shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-border-subtle bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-text-muted">
          <span>
            <strong>New Player Evaluation:</strong> Prospective players attend a trial session where coordinators observe footwork, consistency, and match pace before assigning division flight.
          </span>
          <span className="font-semibold text-foreground shrink-0">
            Fair Placement Guaranteed
          </span>
        </div>
      </div>
    </section>
  );
}
