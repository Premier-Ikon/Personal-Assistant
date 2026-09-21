"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "./AppShell";
import { useAuth } from "../lib/AuthProvider";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, user, profile, error } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="status">Opening Personal Assistant…</div>;
  }

  if (!profile) {
    return (
      <AppShell>
        <p className="error">{error || "This account is not on the team allow-list."}</p>
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}
