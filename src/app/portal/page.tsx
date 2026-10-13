"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function PortalRedirect() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user || user.status !== "ACTIVE") {
        router.replace("/signin");
      } else if (user.role === "ADMIN") {
        router.replace("/admin");
      } else if (user.role === "COORDINATOR") {
        router.replace("/coordinator");
      } else {
        router.replace("/member");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-club-red border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-text-muted">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
