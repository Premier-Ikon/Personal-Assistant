"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MailNav from "../../../components/MailNav";
import RequireAuth from "../../../components/RequireAuth";
import ActionTagSelect from "../../../components/ActionTagSelect";
import { ActionPlan, MailAccount, MailMessage, apiRequest } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthProvider";
import { useDraftsSynced } from "../../../lib/draftsSync";

export default function InboxPage() {
  const { token } = useAuth();
  const params = useParams<{ accountId: string }>();
  const accountId = params.accountId;
  const [account, setAccount] = useState<Pick<MailAccount, "id" | "clientName" | "email" | "color"> | null>(null);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tagging, setTagging] = useState("");

  const loadInbox = useCallback((quiet = false) => {
    if (!token || !accountId) return Promise.resolve();
    if (!quiet) setBusy(true);
    return apiRequest<{ account: MailAccount; messages: MailMessage[] }>(token, {
      action: "listInbox",
      accountId,
    })
      .then((result) => {
        setAccount(result.account);
        setMessages(result.messages || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load this inbox"))
      .finally(() => {
        if (!quiet) setBusy(false);
      });
  }, [token, accountId]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  const refreshInbox = useCallback(() => {
    void loadInbox(true);
  }, [loadInbox]);

  useDraftsSynced(refreshInbox);

  async function assignTag(message: MailMessage, actionType: string) {
    if (!token) return;
    setTagging(message.id);
    setError("");
    try {
      const result = await apiRequest<{ actionPlan: ActionPlan | null }>(token, {
        action: "assignActionTag",
        accountId,
        messageId: message.id,
        actionType,
      });
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id ? { ...item, actionPlan: result.actionPlan } : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign that tag");
    } finally {
      setTagging("");
    }
  }

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
          <div className={`row-card message-row ${message.unread ? "unread" : ""}`} key={message.id}>
            <Link href={`/inbox/${accountId}/${message.id}`} className="message-row-main">
              <div className="from">{message.from}</div>
              <h3>{message.subject || "(no subject)"}</h3>
              <p className="snippet">{message.snippet}</p>
            </Link>
            <div className="message-row-side">
              {message.draftReady ? <span className="badge ok">Draft ready</span> : null}
              <ActionTagSelect
                compact
                value={message.actionPlan?.type || "none"}
                disabled={tagging === message.id}
                onChange={(actionType) => assignTag(message, actionType)}
              />
              <div className="meta" style={{ color: "var(--muted)", fontSize: 12 }}>
                {message.date}
              </div>
            </div>
          </div>
        ))}
      </div>
    </RequireAuth>
  );
}
