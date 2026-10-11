import React from "react";
import { IconShieldCheck, IconCheck } from "./icons/Icons";

export function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Monthly Availability Window",
      phase: "Week 4 of Each Month",
      description:
        "Members receive their personal access link via WhatsApp or email. In under two minutes, players indicate which Friday sessions and time slots they can attend for the upcoming month.",
      keyDetail: "Frictionless availability submission with no complex app installation",
    },
    {
      step: "02",
      title: "Balanced Lineup Drafting",
      phase: "Coordinator Review",
      description:
        "The scheduling engine matches player availability against court capacity and division ratings (Div A, B, C). QWBC coordinators personally verify pairings to maintain fair match parity.",
      keyDetail: "Human-in-the-loop review ensures balanced matches and zero favoritism",
    },
    {
      step: "03",
      title: "Published Court Assignments",
      phase: "Wednesday Prior to Session",
      description:
        "Final court assignments and partner pairings are released in the Member Portal. Members know their exact court (1–4), time window, and doubles partners well in advance.",
      keyDetail: "Transparent court schedules so players arrive prepared and warmed up",
    },
    {
      step: "04",
      title: "Match Day & Standby Reserve",
      phase: "Friday Evening on Court",
      description:
        "Coordinators check players in at Wakra Sports Complex. If a player has a last-minute emergency, QWBC's standby queue alerts the next reserve sub to keep all courts active.",
      keyDetail: "Zero wasted court time with automated standby player notifications",
    },
  ];

  return (
    <section id="experience" className="py-20 md:py-28 bg-background border-b border-border-subtle">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-surface-elevated border border-border-subtle text-[11px] font-bold uppercase tracking-widest text-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-club-red" />
            <span>The Member Experience</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-tight">
            How members engage with QWBC.
          </h2>

          <p className="text-base sm:text-lg text-text-secondary leading-relaxed">
            From submitting monthly availability to checking in at the arena, QWBC provides a predictable, organized rhythm so players can focus entirely on their game.
          </p>
        </div>

        {/* Experience Timeline */}
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((item) => (
            <div
              key={item.step}
              className="rounded-lg border border-border-strong bg-surface p-6 flex flex-col justify-between transition-colors hover:border-slate-400 dark:hover:border-slate-600"
            >
              <div>
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <span className="font-mono text-sm font-black text-club-red">
                    PHASE {item.step}
                  </span>
                  <span className="text-[10px] font-semibold text-text-muted uppercase">
                    {item.phase}
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="text-base font-bold text-foreground tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-border-subtle">
                <span className="text-[11px] text-text-muted flex items-start gap-1.5 leading-snug">
                  <IconCheck className="w-3.5 h-3.5 text-club-red shrink-0 mt-0.5" />
                  <span>{item.keyDetail}</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Human-in-the-Loop Coordinator Oversight Banner */}
        <div className="mt-10 rounded-lg border border-border-subtle bg-surface-elevated p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-club-red/10 text-club-red border border-club-red/20">
              <IconShieldCheck className="w-5 h-5" />
            </div>

            <div className="flex-1">
              <h4 className="text-sm font-bold text-foreground">
                Coordinator Oversight Guarantee
              </h4>
              <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                Lineups are never pushed blindly. Experienced QWBC coordinators inspect match dynamics, player compatibility, and division balances before every Friday session is released to members.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
