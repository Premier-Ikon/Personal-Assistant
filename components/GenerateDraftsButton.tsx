"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { apiRequest } from "../lib/api";
import { DRAFTS_SYNCED_EVENT } from "../lib/draftsSync";
import { useAuth } from "../lib/AuthProvider";

function summaryCopy(result: { drafted?: number; scanned?: number; tagged?: number }) {
  const drafted = Number(result.drafted || 0);
  const scanned = Number(result.scanned || 0);
  const tagged = Number(result.tagged || 0);
  const parts = [];
  if (drafted === 1) parts.push("1 draft ready");
  else if (drafted > 1) parts.push(`${drafted} drafts ready`);
  else if (scanned > 0) parts.push("No new drafts needed");
  else parts.push("No new unread mail");
  if (tagged > 0) parts.push(`${tagged} tagged in Gmail`);
  return parts.join(" · ");
}

export default function GenerateDraftsButton() {
  const { token } = useAuth();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const inboxMatch = pathname.match(/^\/inbox\/([^/]+)/);
  const accountId = inboxMatch ? inboxMatch[1] : undefined;

  async function run() {
    if (!token) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ drafted?: number; scanned?: number; tagged?: number }>(token, {
        action: "syncInboxDrafts",
        ...(accountId ? { accountId } : {}),
      });
      setNotice(summaryCopy(result));
      window.dispatchEvent(new CustomEvent(DRAFTS_SYNCED_EVENT, { detail: result }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate drafts");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-toolbar">
      {error ? <span className="toolbar-status error">{error}</span> : null}
      {notice && !error ? <span className="toolbar-status">{notice}</span> : null}
      <button className="primary" disabled={busy || !token} type="button" onClick={run}>
        {busy ? "Generating drafts…" : "Generate drafts"}
      </button>
    </div>
  );
}
