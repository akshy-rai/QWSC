import React from "react";
import { IconCheck, IconMapPin, IconCalendar, IconUsers, IconTrophy } from "./icons/Icons";

export function AboutSection() {
  const clubAttributes = [
    { label: "Location", value: "Al Wakra, State of Qatar", icon: IconMapPin },
    { label: "Home Venue", value: "Wakra Sports Complex", icon: IconMapPin },
    { label: "Community", value: "200 Active Members", icon: IconUsers },
    { label: "Regular Session", value: "Every Friday Evening", icon: IconCalendar },
    { label: "Match Format", value: "Doubles League & Singles Ladders", icon: IconTrophy },
  ];

  return (
    <section id="about" className="py-20 md:py-28 bg-surface-elevated border-b border-border-subtle">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
          {/* Left: Editorial Story */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-surface border border-border-subtle text-[11px] font-bold uppercase tracking-widest text-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-club-red" />
              <span>About Qatar Wakra Badminton Club</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-tight">
              Founded on community and passion for badminton.
            </h2>

            <p className="text-base sm:text-lg text-text-secondary leading-relaxed">
              Qatar Wakra Badminton Club began with a dedicated group of players renting municipal sports halls in Al Wakra on weekends. What started as casual weekend matches evolved into a structured club supporting approximately 200 active members.
            </p>

            <p className="text-sm text-text-muted leading-relaxed">
              We built QWBC to resolve the classic challenge of community sports: ensuring every player gets dependable, balanced, and competitive court time without volunteers spending hours every week sorting WhatsApp polls and manual spreadsheets.
            </p>

            {/* Club Commitments */}
            <div className="pt-4 border-t border-border-subtle space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Our Club Commitments
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded border border-border-subtle bg-surface p-3.5">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <IconCheck className="w-3.5 h-3.5 text-club-red" />
                    <span>Equitable Court Allocation</span>
                  </div>
                  <p className="mt-1 text-text-muted text-[11px] leading-relaxed">
                    Court lineups strictly honor member availability and division balancing with zero favoritism.
                  </p>
                </div>

                <div className="rounded border border-border-subtle bg-surface p-3.5">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <IconCheck className="w-3.5 h-3.5 text-club-navy dark:text-blue-400" />
                    <span>Transparent Operations</span>
                  </div>
                  <p className="mt-1 text-text-muted text-[11px] leading-relaxed">
                    Venue booking commitments, feather shuttle supplies, and member dues are accounted for with clarity.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Club Profile Specification Card */}
          <div className="lg:col-span-5">
            <div className="rounded-lg border border-border-strong bg-surface p-6 shadow-xs">
              <div className="border-b border-border-subtle pb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted block">
                  Club Profile
                </span>
                <h3 className="text-lg font-black tracking-tight text-foreground mt-0.5">
                  Qatar Wakra Badminton Club
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  Al Wakra Municipal Community Sports Association
                </p>
              </div>

              <div className="divide-y divide-border-subtle text-xs">
                {clubAttributes.map((attr) => {
                  const Icon = attr.icon;
                  return (
                    <div key={attr.label} className="py-3 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-text-muted">
                        <Icon className="w-3.5 h-3.5 text-club-red" />
                        <span>{attr.label}</span>
                      </span>
                      <span className="font-semibold text-foreground text-right">
                        {attr.value}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-border-subtle bg-surface-elevated rounded p-3 text-[11px] text-text-muted">
                <span className="font-bold text-foreground block mb-0.5">Community Ethos</span>
                QWBC is maintained by volunteer coordinators and player committees dedicated to promoting badminton in Al Wakra.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
