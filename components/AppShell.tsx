"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/AuthProvider";
import Walkthrough from "./Walkthrough";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, logOut } = useAuth();
  const inboxActive = pathname === "/" || pathname.startsWith("/inbox");
  const [tourOpen, setTourOpen] = useState(false);
  const initial = (profile?.email || "P").slice(0, 1).toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="sidebar-brand">
          <span className="brand-mark">PA</span>
          <span className="sidebar-brand-copy">
            <b>Personal Assistant</b>
            <span>Premier Ikon</span>
          </span>
        </Link>
        <nav>
          <Link className={inboxActive ? "active" : ""} href="/">
            Clients
          </Link>
          <Link className={pathname.startsWith("/settings") ? "active" : ""} href="/settings">
            Settings
          </Link>
          <button className="sidebar-help" type="button" onClick={() => setTourOpen(true)}>
            How it works
          </button>
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-user">
            <span className="sidebar-avatar">{initial}</span>
            <small>{profile?.email}</small>
          </div>
          <button className="ghost" onClick={() => logOut()}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
      {profile?.email ? (
        <Walkthrough email={profile.email} forceOpen={tourOpen} onClose={() => setTourOpen(false)} />
      ) : null}
    </div>
  );
}
