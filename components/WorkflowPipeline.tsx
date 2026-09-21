"use client";

import { ActionPlan, ActionStep } from "../lib/api";

function normalizeStatus(status?: string) {
  if (status === "ok") return "ok";
  if (status === "running") return "running";
  if (status === "failed") return "failed";
  if (status === "blocked") return "blocked";
  if (status === "skipped") return "skipped";
  return "queued";
}

function statusLabel(status?: string) {
  const key = normalizeStatus(status);
  if (status === "planned") return "Pending";
  if (key === "ok") return "Success";
  if (key === "queued") return status === "planned" ? "Pending" : "Queued";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function runSummary(plan: ActionPlan) {
  const result = plan.execution?.result;
  if (result === "running" || plan.steps.some((step) => step.status === "running")) return "running";
  if (result === "ok") return "ok";
  if (result === "failed") return "failed";
  if (result === "needs_address") return "blocked";
  if (plan.status === "completed") return "ok";
  return "queued";
}

export default function WorkflowPipeline({
  plan,
  running,
  confirmOpen,
  onAskExecute,
  onCancelExecute,
  onConfirmExecute,
}: {
  plan: ActionPlan;
  running: boolean;
  confirmOpen: boolean;
  onAskExecute: () => void;
  onCancelExecute: () => void;
  onConfirmExecute: () => void;
}) {
  const summary = running ? "running" : runSummary(plan);
  const done = summary === "ok";
  const canExecute = plan.type === "address_change" ? !done : plan.status === "needs_review";

  return (
    <div className="ci-panel">
      <div className="ci-head">
        <div>
          <p className="ci-kicker">Workflow</p>
          <h3>{plan.typeLabel} pipeline</h3>
          <p className="snippet" style={{ margin: "6px 0 0" }}>
            {plan.summary}
          </p>
        </div>
        <span className={`ci-badge ${summary}`}>{running ? "Running" : statusLabel(summary)}</span>
      </div>
      <ol className="ci-jobs">
        {plan.steps.map((step: ActionStep, index) => {
          const status = normalizeStatus(step.status);
          return (
            <li className={`ci-job ${status}`} key={step.id || `${step.title}-${index}`}>
              <span className="ci-index">{String(index + 1).padStart(2, "0")}</span>
              <div className="ci-job-copy">
                <b>{step.title}</b>
                <span>
                  {step.detail ||
                    (status === "queued"
                      ? "Waiting to run"
                      : status === "running"
                        ? "In progress"
                        : statusLabel(step.status))}
                </span>
              </div>
              <em className="ci-job-status">{statusLabel(step.status)}</em>
            </li>
          );
        })}
      </ol>
      {plan.execution?.note ? (
        <p className={plan.execution.result === "ok" ? "notice" : plan.execution.result === "failed" ? "error" : "snippet"} style={{ marginTop: 12 }}>
          {plan.execution.note}
        </p>
      ) : null}
      {canExecute ? (
        <div className="actions" style={{ marginTop: 14 }}>
          <button className="primary" disabled={running} onClick={onAskExecute}>
            {running ? "Running pipeline…" : plan.type === "address_change" ? "Execute pipeline" : "Approve roadmap"}
          </button>
        </div>
      ) : (
        <p className="notice" style={{ marginTop: 14 }}>
          Pipeline finished.
        </p>
      )}
      {confirmOpen ? (
        <div className="ci-confirm" role="dialog" aria-modal="true" aria-labelledby="ci-confirm-title">
          <div className="ci-confirm-card">
            <p className="ci-kicker">Ready to execute</p>
            <h3 id="ci-confirm-title">Run these jobs?</h3>
            <p>
              {plan.type === "address_change"
                ? "This will update ShipStation, tag the shipment, take the order off hold, and write the confirmed address on the Shopify customer. Shopify orders are not edited."
                : "This marks the checklist approved. These jobs are not automated yet."}
            </p>
            <ul>
              {plan.steps.map((step) => (
                <li key={step.id || step.title}>{step.title}</li>
              ))}
            </ul>
            <div className="actions">
              <button className="primary" onClick={onConfirmExecute}>
                Yes, execute
              </button>
              <button className="ghost" type="button" onClick={onCancelExecute}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
