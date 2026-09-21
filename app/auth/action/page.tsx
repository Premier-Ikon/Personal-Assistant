"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { getFirebaseAuth } from "../../../lib/firebase";
import { authErrorMessage } from "../../../lib/AuthProvider";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const oobCode = params.get("oobCode") || "";
  const mode = params.get("mode") || "resetPassword";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  const invalidMode = Boolean(mode && mode !== "resetPassword");

  useEffect(() => {
    if (!oobCode || invalidMode) {
      setChecked(true);
      return;
    }
    let cancelled = false;
    verifyPasswordResetCode(getFirebaseAuth(), oobCode)
      .then((value) => {
        if (cancelled) return;
        setEmail(value);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(authErrorMessage(err) || "This reset link is invalid or expired.");
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [oobCode, invalidMode]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await confirmPasswordReset(getFirebaseAuth(), oobCode, password);
      router.replace("/login");
    } catch (err) {
      setError(authErrorMessage(err) || "Could not set password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="brand-mark">PA</div>
        <h1>Set password</h1>
        <p>
          {email
            ? `Choose a password for ${email}, then sign in to Personal Assistant.`
            : "Choose a password for info@necti.io, then sign in to Personal Assistant."}
        </p>
        {invalidMode ? <p className="error">This link is not a password reset link.</p> : null}
        {!oobCode ? (
          <p className="error">
            Open the reset link from the email while this app is running, or request a new one from the sign-in page.
          </p>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        <label>
          New password
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
            disabled={!oobCode || Boolean(invalidMode)}
          />
        </label>
        <label>
          Confirm password
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            minLength={8}
            required
            disabled={!oobCode || Boolean(invalidMode)}
          />
        </label>
        <button className="primary full" disabled={busy || !checked || !oobCode || Boolean(invalidMode)} type="submit">
          {busy ? "Saving…" : "Save password"}
        </button>
        <p style={{ marginTop: 16, marginBottom: 0 }}>
          <Link href="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense fallback={<div className="status">Opening password reset…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
