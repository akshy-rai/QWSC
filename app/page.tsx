"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { AboutSection } from "@/components/AboutSection";
import { FeatureShowcase } from "@/components/FeatureShowcase";
import { ValueProposition } from "@/components/ValueProposition";
import { HowItWorks } from "@/components/HowItWorks";
import { FinalCta } from "@/components/FinalCta";
import { Footer } from "@/components/Footer";

export default function Home() {
  const router = useRouter();

  // Check URL hash for direct links like #join or #signin
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === "#join" || hash === "#register" || hash === "#inquire") {
        router.push("/register");
      } else if (hash === "#signin" || hash === "#login" || hash === "#portal") {
        router.push("/signin");
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-club-red selection:text-white transition-colors duration-150">
      {/* Skip to Main Content for Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-club-red focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      {/* Navigation */}
      <Navbar />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1">
        <Hero />
        <AboutSection />
        <FeatureShowcase />
        <ValueProposition />
        <HowItWorks />
        <FinalCta />
      </main>

      <Footer />
    </div>
  );
}
