"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { getFirebaseAuth } from "../../lib/firebase";
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
              await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
              setNotice("Reset email sent. Google’s page will error — replace the host with http://localhost:3002/auth/action and keep everything after the question mark.");
            } catch (err) {
              setError(authErrorMessage(err));
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
