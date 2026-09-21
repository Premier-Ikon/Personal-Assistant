"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { publicApiRequest } from "../../lib/api";
import { authErrorMessage, useAuth } from "../../lib/AuthProvider";

export default function LoginPage() {
  const { signIn, error: authError } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("info@necti.io");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
      router.replace("/");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="brand-mark">PA</div>
        <h1>Personal Assistant</h1>
        <p>Sign in to draft client replies from the way each mailbox already talks.</p>
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error || authError ? <p className="error">{error || authError}</p> : null}
        {notice ? <p className="status">{notice}</p> : null}
        <button className="primary full" disabled={busy} type="submit">
          {busy ? "Signing in…" : "Continue"}
        </button>
        <button
          className="ghost full"
          disabled={busy}
          type="button"
          onClick={async () => {
            setBusy(true);
            setError("");
            setNotice("");
            try {
              await publicApiRequest({ action: "sendPasswordReset", email: email.trim() });
              setNotice("Check your email for a password link. It opens this app so you can choose a new password.");
            } catch (err) {
              setError(err instanceof Error ? err.message : authErrorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          Email me a reset link
        </button>
      </form>
    </div>
  );
}
