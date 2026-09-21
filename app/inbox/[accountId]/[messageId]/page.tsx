"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MailNav from "../../../../components/MailNav";
import RequireAuth from "../../../../components/RequireAuth";
import WorkflowPipeline from "../../../../components/WorkflowPipeline";
import ActionTagSelect from "../../../../components/ActionTagSelect";
import WorkOverlay from "../../../../components/WorkOverlay";
import { ActionPlan, Draft, MailAccount, MailMessage, ShippingAddress, apiRequest } from "../../../../lib/api";
import { useAuth } from "../../../../lib/AuthProvider";
import { useDraftsSynced } from "../../../../lib/draftsSync";

function blankAddress(): ShippingAddress {
  return {
    name: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
  };
}

function verificationCopy(plan: ActionPlan | null) {
  const status = plan?.addressVerification?.status;
  const formatted = plan?.addressVerification?.formatted;
  if (status === "verified") {
    return {
      badge: "Verified with Google",
      badgeClass: "ok",
      detail: formatted
        ? `Google confirmed ${formatted}. Edit any field if a unit, name, or phone is still off.`
        : "Google confirmed this address. Edit any field if a unit, name, or phone is still off.",
    };
  }
  if (status === "partial") {
    return {
      badge: "Google match",
      badgeClass: "warn",
      detail: formatted
        ? `Google matched this to ${formatted}. Adjust anything that looks wrong before you run the workflow.`
        : "Google found a close match. Adjust anything that looks wrong before you run the workflow.",
    };
  }
  return {
    badge: "Needs review",
    badgeClass: "neutral",
    detail: "We pulled this from the email. Edit any field if it is wrong — the workflow uses what you save here.",
  };
}

function tagNotice(plan: ActionPlan | null) {
  if (!plan) return "Workflow tag cleared.";
  if (plan.type !== "address_change") return `Tagged as ${plan.typeLabel}. The workflow is on this email.`;
  if (!plan.extractedAddress?.address1) {
    return `Tagged as ${plan.typeLabel}. The address workflow is ready — add the street if it is still empty.`;
  }
  if (plan.addressVerification?.status === "verified") {
    return `Tagged as ${plan.typeLabel}. The shipping address was pulled from this email and confirmed with Google. You can still edit it.`;
  }
  return `Tagged as ${plan.typeLabel}. The shipping address was pulled from this email. Edit it if anything looks off.`;
}

function queuedPlan(plan: ActionPlan): ActionPlan {
  return {
    ...plan,
    execution: { ...(plan.execution || {}), ran: true, result: "running", note: "Pipeline started." },
    steps: plan.steps.map((step) => ({ ...step, status: "queued", detail: step.detail || "Waiting to run" })),
  };
}

export default function MessagePage() {
  const { token } = useAuth();
  const params = useParams<{ accountId: string; messageId: string }>();
  const [account, setAccount] = useState<Pick<MailAccount, "id" | "clientName" | "email" | "emailFooter"> | null>(null);
  const [message, setMessage] = useState<MailMessage | null>(null);
  const [draft, setDraft] = useState<Draft>({ replySubject: "", replyBody: "" });
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [address, setAddress] = useState<ShippingAddress>(blankAddress());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [working, setWorking] = useState("");
  const [pendingTag, setPendingTag] = useState("");
  const [confirmRun, setConfirmRun] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<{
        account: MailAccount;
        message: MailMessage;
        draft: Draft | null;
        actionPlan: ActionPlan | null;
      }>(token, {
        action: "getMessage",
        accountId: params.accountId,
        messageId: params.messageId,
      });
      setAccount(result.account);
      setMessage(result.message);
      setPlan(result.actionPlan);
      if (result.actionPlan?.extractedAddress) {
        setAddress({ ...blankAddress(), ...result.actionPlan.extractedAddress });
      }
      setDraft(
        result.draft || {
          replySubject: result.message.subject ? `Re: ${result.message.subject}` : "",
          replyBody: "",
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open this email");
    } finally {
      setBusy(false);
    }
  }, [token, params.accountId, params.messageId]);

  useEffect(() => {
    load();
  }, [load]);

  useDraftsSynced(load);

  async function generate() {
    if (!token) return;
    setWorking("draft");
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ draft: Draft; actionPlan: ActionPlan | null }>(token, {
        action: "generateDraft",
        accountId: params.accountId,
        messageId: params.messageId,
      });
      setDraft(result.draft);
      setPlan(result.actionPlan);
      if (result.actionPlan?.extractedAddress) {
        setAddress({ ...blankAddress(), ...result.actionPlan.extractedAddress });
      }
      const via =
        result.draft.provider === "openai"
          ? "OpenAI"
          : result.draft.provider === "openrouter"
            ? "OpenRouter"
            : result.draft.provider === "vertex"
              ? "Gemini"
              : "the assistant";
      setNotice(`Draft ready from ${via}. Edit anything before it sends.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a draft");
    } finally {
      setWorking("");
    }
  }

  async function assignTag(actionType: string) {
    if (!token || !message) return;
    setWorking("tag");
    setPendingTag(actionType);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ actionPlan: ActionPlan | null }>(token, {
        action: "assignActionTag",
        accountId: params.accountId,
        messageId: params.messageId,
        actionType,
      });
      setPlan(result.actionPlan);
      if (result.actionPlan?.extractedAddress) {
        setAddress({ ...blankAddress(), ...result.actionPlan.extractedAddress });
      } else if (!result.actionPlan) {
        setAddress(blankAddress());
      }
      setNotice(tagNotice(result.actionPlan));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign that tag");
    } finally {
      setWorking("");
      setPendingTag("");
    }
  }

  async function send() {
    if (!token) return;
    setWorking("send");
    setError("");
    setNotice("");
    try {
      await apiRequest(token, {
        action: "sendReply",
        accountId: params.accountId,
        messageId: params.messageId,
        replySubject: draft.replySubject,
        replyBody: draft.replyBody,
      });
      setNotice("Sent from the connected mailbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setWorking("");
    }
  }

  async function approvePlan() {
    if (!token || !plan) return;
    setConfirmRun(false);
    setWorking("plan");
    setError("");
    setNotice("Executing pipeline…");
    setPlan(queuedPlan(plan));
    const poll = window.setInterval(async () => {
      try {
        const result = await apiRequest<{ actionPlan: ActionPlan | null }>(token, {
          action: "getMessage",
          accountId: params.accountId,
          messageId: params.messageId,
        });
        if (result.actionPlan) setPlan(result.actionPlan);
      } catch {
        // keep the in-flight view; the execute request is the source of truth
      }
    }, 1200);
    try {
      const result = await apiRequest<{ actionPlan: ActionPlan }>(token, {
        action: "runAddressChange",
        planId: plan.id,
        extractedAddress: address,
      });
      setPlan(result.actionPlan);
      if (result.actionPlan.extractedAddress) {
        setAddress({ ...blankAddress(), ...result.actionPlan.extractedAddress });
      }
      const resultLabel = result.actionPlan.execution?.result;
      if (resultLabel === "ok") {
        setNotice(result.actionPlan.execution?.note || "Address update completed.");
      } else if (resultLabel === "needs_address") {
        setNotice("Need the full street, city, and ZIP, then execute again.");
      } else {
        setNotice(result.actionPlan.execution?.note || "Pipeline finished with a stop. Check the jobs below.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run the address update");
    } finally {
      window.clearInterval(poll);
      setWorking("");
    }
  }

  const inboxHref = `/inbox/${params.accountId}`;
  const clientLabel = account?.clientName || "Inbox";
  const verify = plan?.type === "address_change" ? verificationCopy(plan) : null;

  return (
    <RequireAuth>
      {working === "tag" ? (
        <WorkOverlay
          title="Reading this email"
          detail={
            pendingTag === "address_change"
              ? "Parsing the shipping address and checking it with Google."
              : "Updating the workflow on this thread."
          }
        />
      ) : null}
      <MailNav
        backHref={inboxHref}
        backLabel="All emails"
        crumbs={[
          { href: "/", label: "Clients" },
          { href: inboxHref, label: clientLabel },
          { label: message?.subject || "Email" },
        ]}
      />
      <div className="page-head thread-head">
        <div>
          <h1>{message?.subject || "Email"}</h1>
          <p>
            {message
              ? `From ${message.from}${account?.email ? ` · ${account.email}` : ""}`
              : "Review the incoming note, then generate and send the reply as this mailbox."}
          </p>
        </div>
        <div className="page-head-actions">
          <ActionTagSelect
            value={plan?.type || "none"}
            disabled={Boolean(working) || !message}
            busy={working === "tag"}
            onChange={assignTag}
          />
          <button className="primary" disabled={Boolean(working) || !message} onClick={generate}>
            {working === "draft" ? "Writing…" : "Generate reply"}
          </button>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      {busy ? <p className="status" style={{ paddingTop: 12 }}>Opening email…</p> : null}
      {message ? (
        <div className="workbench">
          <section className="panel mail-pane">
            <p className="pane-kicker">Incoming</p>
            <h2>{message.subject || "(no subject)"}</h2>
            <div className="email-meta">
              <div>From {message.from}</div>
              <div>{message.date}</div>
            </div>
            <div className="email-body">{message.bodyText || message.snippet}</div>
          </section>
          <section className="panel assistant-pane">
            <p className="pane-kicker">Assistant</p>
            <h2>Reply</h2>
            {draft.provider ? (
              <p className="snippet" style={{ marginTop: -4, marginBottom: 14 }}>
                Drafted with{" "}
                {draft.provider === "openai" ? "OpenAI" : draft.provider === "openrouter" ? "OpenRouter" : "Gemini"}
                {draft.model ? ` · ${draft.model}` : ""}
              </p>
            ) : null}
            <label>
              Subject
              <input
                value={draft.replySubject}
                onChange={(event) => setDraft({ ...draft, replySubject: event.target.value })}
              />
            </label>
            <label>
              Reply
              <textarea
                value={draft.replyBody}
                onChange={(event) => setDraft({ ...draft, replyBody: event.target.value })}
                placeholder="Generate a reply, then edit it here before sending."
              />
            </label>
            {account?.emailFooter ? (
              <p className="snippet" style={{ marginTop: -8, marginBottom: 14 }}>
                Saved mailbox footer is included at the bottom of this reply.
              </p>
            ) : null}
            <div className="actions">
              <button className="primary" disabled={Boolean(working) || !draft.replyBody} onClick={send}>
                {working === "send" ? "Sending…" : "Send as mailbox"}
              </button>
              <Link className="ghost" href={inboxHref}>
                All emails
              </Link>
            </div>
            {plan ? (
              <div style={{ marginTop: 28 }}>
                {plan.type === "address_change" ? (
                  <>
                    <div className="address-verify">
                      <p>{verify?.detail}</p>
                      <span className={`badge ${verify?.badgeClass}`}>{verify?.badge}</span>
                    </div>
                    <div className="address-grid">
                    <label>
                      Name
                      <input
                        value={address.name || ""}
                        onChange={(event) => setAddress({ ...address, name: event.target.value })}
                      />
                    </label>
                    <label>
                      Phone
                      <input
                        value={address.phone || ""}
                        onChange={(event) => setAddress({ ...address, phone: event.target.value })}
                      />
                    </label>
                    <label className="full-span">
                      Street
                      <input
                        value={address.address1 || ""}
                        onChange={(event) => setAddress({ ...address, address1: event.target.value })}
                      />
                    </label>
                    <label className="full-span">
                      Apt / suite
                      <input
                        value={address.address2 || ""}
                        onChange={(event) => setAddress({ ...address, address2: event.target.value })}
                      />
                    </label>
                    <label>
                      City
                      <input
                        value={address.city || ""}
                        onChange={(event) => setAddress({ ...address, city: event.target.value })}
                      />
                    </label>
                    <label>
                      State
                      <input
                        value={address.state || ""}
                        onChange={(event) => setAddress({ ...address, state: event.target.value })}
                      />
                    </label>
                    <label>
                      ZIP
                      <input
                        value={address.postalCode || ""}
                        onChange={(event) => setAddress({ ...address, postalCode: event.target.value })}
                      />
                    </label>
                  </div>
                  </>
                ) : null}
                <WorkflowPipeline
                  plan={plan}
                  running={working === "plan"}
                  confirmOpen={confirmRun}
                  onAskExecute={() => setConfirmRun(true)}
                  onCancelExecute={() => setConfirmRun(false)}
                  onConfirmExecute={approvePlan}
                />
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </RequireAuth>
  );
}
