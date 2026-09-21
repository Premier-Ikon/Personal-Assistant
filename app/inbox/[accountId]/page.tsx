"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MailNav from "../../../components/MailNav";
import RequireAuth from "../../../components/RequireAuth";
import { MailAccount, MailMessage, apiRequest } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthProvider";

export default function InboxPage() {
  const { token } = useAuth();
  const params = useParams<{ accountId: string }>();
  const accountId = params.accountId;
  const [account, setAccount] = useState<Pick<MailAccount, "id" | "clientName" | "email" | "color"> | null>(null);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token || !accountId) return;
    setBusy(true);
    apiRequest<{ account: MailAccount; messages: MailMessage[] }>(token, {
      action: "listInbox",
      accountId,
    })
      .then((result) => {
        setAccount(result.account);
        setMessages(result.messages || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load this inbox"))
      .finally(() => setBusy(false));
  }, [token, accountId]);

  return (
    <RequireAuth>
      <MailNav
        backHref="/"
        backLabel="Clients"
        crumbs={[
          { href: "/", label: "Clients" },
          { label: account?.clientName || "Inbox" },
        ]}
      />
      <div className="page-head">
        <div>
          <h1>{account?.clientName || "Inbox"}</h1>
          <p>{account?.email || "Loading the latest customer emails for this mailbox."}</p>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {busy ? <p className="status" style={{ paddingTop: 12 }}>Reading inbox…</p> : null}
      {!busy && !messages.length ? (
        <div className="panel empty">This inbox is quiet. New customer mail will show here with a suggested reply.</div>
      ) : null}
      <div className="inbox-list">
        {messages.map((message) => (
          <Link
            key={message.id}
            href={`/inbox/${accountId}/${message.id}`}
            className={`row-card message-row ${message.unread ? "unread" : ""}`}
          >
            <div>
              <div className="from">{message.from}</div>
              <h3>{message.subject || "(no subject)"}</h3>
              <p className="snippet">{message.snippet}</p>
            </div>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              {message.draftReady ? <span className="badge ok">Draft ready</span> : null}
              {message.actionPlan ? <span className="badge warn">{message.actionPlan.typeLabel}</span> : null}
              <div className="meta" style={{ marginTop: 8, color: "var(--muted)", fontSize: 12 }}>
                {message.date}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </RequireAuth>
  );
}
