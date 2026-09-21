"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import RequireAuth from "../../components/RequireAuth";
import { MailAccount, TeamMember, apiRequest } from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";

const SECTIONS = [
  { id: "mailboxes", label: "Mailboxes", href: "/settings" },
  { id: "team", label: "Team", href: "/settings?section=team" },
] as const;

type Section = (typeof SECTIONS)[number]["id"];

function SettingsNav({ section }: { section: Section }) {
  return (
    <nav className="settings-nav" aria-label="Settings">
      {SECTIONS.map((item) => (
        <Link key={item.id} href={item.href} className={section === item.id ? "active" : ""}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function SettingsInner() {
  const { token, profile } = useAuth();
  const searchParams = useSearchParams();
  const section: Section = searchParams.get("section") === "team" ? "team" : "mailboxes";
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [clientName, setClientName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"member" | "admin">("member");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [busy, setBusy] = useState("");

  async function loadAccounts() {
    if (!token) return;
    const result = await apiRequest<{ accounts: MailAccount[] }>(token, { action: "listAccounts" });
    setAccounts(result.accounts || []);
  }

  async function loadTeam() {
    if (!token || profile?.role !== "admin") return;
    const result = await apiRequest<{ members: TeamMember[] }>(token, { action: "listTeam" });
    setMembers(result.members || []);
  }

  useEffect(() => {
    const gmail = searchParams.get("gmail");
    if (gmail === "connected") setNotice("Mailbox connected.");
    if (gmail === "error") setError(searchParams.get("reason") || "Could not connect Gmail");
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    Promise.all([loadAccounts(), loadTeam()]).catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load settings");
    });
  }, [token, profile?.role]);

  async function connectGmail(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy("gmail");
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ authUrl: string }>(token, {
        action: "startGmailConnect",
        clientName,
      });
      window.location.href = result.authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Gmail connect");
      setBusy("");
    }
  }

  async function disconnect(account: MailAccount) {
    if (!token) return;
    setBusy(account.id);
    try {
      await apiRequest(token, { action: "disconnectAccount", accountId: account.id });
      await loadAccounts();
      setNotice(`Disconnected ${account.email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect");
    } finally {
      setBusy("");
    }
  }

  async function addMember(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy("team");
    setError("");
    setResetLink("");
    try {
      const result = await apiRequest<{ resetLink?: string | null }>(token, {
        action: "addTeamMember",
        email: memberEmail,
        role: memberRole,
      });
      setMemberEmail("");
      setNotice("Team member added. Share the password setup link if one was created.");
      setResetLink(result.resetLink || "");
      await loadTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that teammate");
    } finally {
      setBusy("");
    }
  }

  async function removeMember(email: string) {
    if (!token) return;
    setBusy(email);
    try {
      await apiRequest(token, { action: "removeTeamMember", email });
      await loadTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove that teammate");
    } finally {
      setBusy("");
    }
  }

  return (
    <RequireAuth>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>
            {section === "team"
              ? "Invite the people who can review drafts and send."
              : "Connect client Gmail accounts used for customer service."}
          </p>
        </div>
      </div>
      <div className="settings-layout">
        <SettingsNav section={section} />
        <div className="settings-body">
          {error ? <p className="error">{error}</p> : null}
          {notice ? <p className="notice">{notice}</p> : null}

          {section === "mailboxes" ? (
            <div className="stack">
              <form className="panel" onSubmit={connectGmail}>
                <h2>Add a client mailbox</h2>
                <p className="snippet" style={{ marginBottom: 16 }}>
                  Name the client, then connect the Gmail they use for customer service. We read sent and received mail so
                  drafts match that voice. Replies still send as that mailbox.
                </p>
                <label>
                  Client name
                  <input
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    placeholder="e.g. Acme..."
                    required
                  />
                </label>
                <button className="primary" disabled={busy === "gmail"} type="submit">
                  {busy === "gmail" ? "Opening Google…" : "Connect Gmail"}
                </button>
              </form>
              {accounts.map((account) => (
                <div className="row-card account-row" key={account.id}>
                  <div>
                    <b>{account.clientName}</b>
                    <div className="meta" style={{ color: "var(--muted)", fontSize: 13 }}>
                      {account.email}
                    </div>
                  </div>
                  <button className="danger" disabled={busy === account.id} onClick={() => disconnect(account)}>
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="stack">
              {profile?.role === "admin" ? (
                <form className="panel" onSubmit={addMember}>
                  <h2>Add a teammate</h2>
                  <label>
                    Email
                    <input
                      type="email"
                      value={memberEmail}
                      onChange={(event) => setMemberEmail(event.target.value)}
                      placeholder="name@necti.io"
                      required
                    />
                  </label>
                  <label>
                    Role
                    <select
                      value={memberRole}
                      onChange={(event) => setMemberRole(event.target.value as "member" | "admin")}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <button className="primary" disabled={busy === "team"} type="submit">
                    Add teammate
                  </button>
                  {resetLink ? (
                    <p className="notice" style={{ marginTop: 12, wordBreak: "break-all" }}>
                      Password setup: {resetLink}
                    </p>
                  ) : null}
                </form>
              ) : (
                <div className="panel">Only admins can add teammates.</div>
              )}
              {members.map((member) => (
                <div className="row-card member-row" key={member.id}>
                  <div>
                    <b>{member.email}</b>
                    <div className="meta" style={{ color: "var(--muted)", fontSize: 13 }}>
                      {member.role}
                    </div>
                  </div>
                  {profile?.role === "admin" && member.email !== "info@necti.io" ? (
                    <button className="danger" disabled={busy === member.email} onClick={() => removeMember(member.email)}>
                      Remove
                    </button>
                  ) : (
                    <span className="badge ok">Active</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="status">Opening settings…</div>}>
      <SettingsInner />
    </Suspense>
  );
}
