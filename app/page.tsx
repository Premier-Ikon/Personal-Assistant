"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import RequireAuth from "../components/RequireAuth";
import { MailAccount, apiRequest } from "../lib/api";
import { useAuth } from "../lib/AuthProvider";
import { useDraftsSynced } from "../lib/draftsSync";

export default function DashboardPage() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [gmailConfigured, setGmailConfigured] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [footerAccount, setFooterAccount] = useState<MailAccount | null>(null);
  const [footerDraft, setFooterDraft] = useState("");
  const [savingFooter, setSavingFooter] = useState(false);

  const loadAccounts = useCallback((quiet = false) => {
    if (!token) return Promise.resolve();
    if (!quiet) setBusy(true);
    return apiRequest<{ accounts: MailAccount[]; gmailConfigured?: boolean }>(token, { action: "listAccounts" })
      .then((result) => {
        setAccounts(result.accounts || []);
        setGmailConfigured(result.gmailConfigured !== false);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load clients"))
      .finally(() => {
        if (!quiet) setBusy(false);
      });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadAccounts();
  }, [token, loadAccounts]);

  const refreshAccounts = useCallback(() => {
    void loadAccounts(true);
  }, [loadAccounts]);

  useDraftsSynced(refreshAccounts);

  function openFooter(account: MailAccount) {
    setError("");
    setNotice("");
    setFooterAccount(account);
    setFooterDraft(account.emailFooter || "");
  }

  async function saveOpsBrand(account: MailAccount, opsBrand: string) {
    if (!token) return;
    try {
      const result = await apiRequest<{ account: MailAccount }>(token, {
        action: "updateAccount",
        accountId: account.id,
        opsBrand,
      });
      setAccounts((current) => current.map((item) => (item.id === result.account.id ? { ...item, ...result.account } : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save ops brand");
    }
  }

  async function saveFooter() {
    if (!token || !footerAccount) return;
    setSavingFooter(true);
    setError("");
    try {
      const result = await apiRequest<{ account: MailAccount }>(token, {
        action: "updateAccount",
        accountId: footerAccount.id,
        emailFooter: footerDraft,
      });
      setAccounts((current) => current.map((item) => (item.id === result.account.id ? { ...item, ...result.account } : item)));
      setNotice(`Footer saved for ${result.account.clientName}.`);
      setFooterAccount(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that footer");
    } finally {
      setSavingFooter(false);
    }
  }

  return (
    <RequireAuth>
      <div className="page-head">
        <div>
          <h1>Clients</h1>
          <p>Each mailbox is a client workspace. Open one to review mail, generate a reply, and send as that account.</p>
        </div>
        <Link className="primary" href="/settings" style={{ display: "inline-flex", alignItems: "center" }}>
          Add mailbox
        </Link>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      {!gmailConfigured ? (
        <p className="error">Gmail OAuth is not configured on the backend yet. Add the Google client ID and secret, then redeploy personalAssistantApi.</p>
      ) : null}
      {busy ? <p className="status" style={{ paddingTop: 24 }}>Loading clients…</p> : null}
      {!busy && !accounts.length ? (
        <div className="empty-hero">
          <div className="empty-hero-copy">
            <span className="eyebrow">New workspace</span>
            <h2>Connect the first mailbox to teach the agent</h2>
            <p>
              Add a client Gmail account. We read the mail they send and receive so drafts match how this brand already
              replies — then you review and send.
            </p>
            <Link className="primary" href="/settings">
              Connect Gmail
            </Link>
          </div>
          <div className="empty-steps">
            <div className="empty-step lemon">
              <b>1</b>
              <span>Add a client mailbox</span>
            </div>
            <div className="empty-step mint">
              <b>2</b>
              <span>Learn from sent & received mail</span>
            </div>
            <div className="empty-step blue">
              <b>3</b>
              <span>Generate a reply, then you send</span>
            </div>
          </div>
        </div>
      ) : null}
      <div className="client-grid">
        {accounts.map((account) => (
          <article key={account.id} className="client-card">
            <Link href={`/inbox/${account.id}`} className="client-card-main">
              <div className="client-top">
                <div>
                  <h2>{account.clientName}</h2>
                  <div className="meta">{account.email}</div>
                </div>
                <span className="dot" style={{ background: account.color }} />
              </div>
              <div>
                {typeof account.unreadCount === "number" ? (
                  <span className="badge unread">{account.unreadCount} unread</span>
                ) : (
                  <span className="badge neutral">Inbox</span>
                )}
              </div>
            </Link>
            <div className="client-card-actions">
              <select
                className="ops-select"
                value={account.opsBrand || ""}
                onChange={(event) => saveOpsBrand(account, event.target.value)}
                aria-label={`Ops brand for ${account.clientName}`}
              >
                <option value="">No ops</option>
                <option value="bluff">Bluff</option>
              </select>
              <button className="ghost" type="button" onClick={() => openFooter(account)}>
                {account.emailFooter ? "Edit footer" : "Add footer"}
              </button>
            </div>
          </article>
        ))}
      </div>
      {footerAccount ? (
        <div className="walkthrough-backdrop" onClick={() => !savingFooter && setFooterAccount(null)}>
          <div
            className="walkthrough-modal footer-editor"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-labelledby="footer-editor-title"
          >
            <div className="walkthrough-copy">
              <h2 id="footer-editor-title">Email footer</h2>
              <p>
                Paste the signature for {footerAccount.clientName}. It is added at the bottom of every reply from{" "}
                {footerAccount.email}.
              </p>
              <label>
                Footer
                <textarea
                  value={footerDraft}
                  onChange={(event) => setFooterDraft(event.target.value)}
                  placeholder={"Best,\nCustomer Care\nbrand.com"}
                />
              </label>
              <div className="walkthrough-actions">
                <button className="ghost" type="button" disabled={savingFooter} onClick={() => setFooterAccount(null)}>
                  Cancel
                </button>
                <button className="primary" type="button" disabled={savingFooter} onClick={saveFooter}>
                  {savingFooter ? "Saving…" : "Save footer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </RequireAuth>
  );
}
