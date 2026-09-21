"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  {
    eyebrow: "Step 1",
    title: "Connect a client mailbox",
    body: "Add a Gmail account for each client. Replies send as that mailbox, so customers hear from the brand they already know.",
    accent: "lemon",
  },
  {
    eyebrow: "Step 2",
    title: "We read sent and received mail",
    body: "After a mailbox is connected, we study the inbox and the replies you already sent. That is how the agent learns this client’s voice, not a generic template.",
    accent: "mint",
  },
  {
    eyebrow: "Step 3",
    title: "AI drafts, you push send",
    body: "Open a thread, generate a reply, edit anything that feels off, then send. The agent suggests. You stay in control.",
    accent: "blue",
  },
  {
    eyebrow: "Step 4",
    title: "Roadmaps wait for your OK",
    body: "If a request needs more than a reply — like an address change — you get a step-by-step plan to approve before anything is automated.",
    accent: "lavender",
  },
] as const;

function storageKey(email: string) {
  return `pa-walkthrough-v1:${email.trim().toLowerCase()}`;
}

export default function Walkthrough({
  email,
  forceOpen,
  onClose,
}: {
  email: string;
  forceOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  useEffect(() => {
    if (!email) return;
    if (forceOpen) {
      setStep(0);
      setOpen(true);
      return;
    }
    setOpen(window.localStorage.getItem(storageKey(email)) !== "1");
  }, [email, forceOpen]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") finish(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, email]);

  function finish(goToSettings: boolean) {
    if (email) window.localStorage.setItem(storageKey(email), "1");
    setOpen(false);
    onClose();
    if (goToSettings) router.push("/settings");
  }

  if (!open) return null;

  return (
    <div className="walkthrough-backdrop" role="dialog" aria-modal="true" aria-labelledby="walkthrough-title">
      <div className="walkthrough-modal">
        <div className={`walkthrough-art ${current.accent}`}>
          <span className="walkthrough-kicker">{current.eyebrow}</span>
          <div className="walkthrough-dots" aria-hidden="true">
            {STEPS.map((item, index) => (
              <span key={item.title} className={index === step ? "on" : ""} />
            ))}
          </div>
        </div>
        <div className="walkthrough-copy">
          <h2 id="walkthrough-title">{current.title}</h2>
          <p>{current.body}</p>
          <div className="walkthrough-actions">
            <button className="ghost" type="button" onClick={() => finish(false)}>
              Skip
            </button>
            <div className="walkthrough-nav">
              {step > 0 ? (
                <button className="ghost" type="button" onClick={() => setStep((value) => value - 1)}>
                  Back
                </button>
              ) : null}
              {last ? (
                <button className="primary" type="button" onClick={() => finish(true)}>
                  Connect a mailbox
                </button>
              ) : (
                <button className="primary" type="button" onClick={() => setStep((value) => value + 1)}>
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
