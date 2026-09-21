"use client";

import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { TeamUser, apiRequest } from "./api";
import { getFirebaseAuth } from "./firebase";

function authErrorMessage(err: unknown) {
  const code = typeof err === "object" && err && "code" in err ? String(err.code) : "";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Email or password is incorrect";
  }
  if (code === "auth/too-many-requests") return "Too many attempts. Try again in a few minutes.";
  if (code === "auth/expired-action-code" || code === "auth/invalid-action-code") {
    return "This reset link is invalid or expired. Request a new one from the sign-in page.";
  }
  if (code === "auth/weak-password") return "Use a stronger password (at least 8 characters).";
  if (code === "auth/operation-not-allowed") {
    return "Email/password sign-in is not enabled for this project yet.";
  }
  if (err instanceof Error) return err.message;
  return "Could not sign in";
}

type AuthState = {
  loading: boolean;
  user: User | null;
  profile: TeamUser | null;
  error: string;
  token: string;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<TeamUser | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  async function loadProfile(current: User) {
    const idToken = await current.getIdToken();
    setToken(idToken);
    const result = await apiRequest<{
      uid: string;
      email: string;
      role: TeamUser["role"];
      displayName: string;
    }>(idToken, { action: "me" });
    setProfile({
      uid: result.uid,
      email: result.email,
      role: result.role,
      displayName: result.displayName,
    });
  }

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (current) => {
      if (!current) {
        setUser(null);
        setProfile(null);
        setToken("");
        setLoading(false);
        return;
      }
      setUser(current);
      try {
        await loadProfile(current);
        setError("");
      } catch (err) {
        setProfile(null);
        setError(err instanceof Error ? err.message : "Could not load your account");
        await signOut(auth).catch(() => undefined);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      user,
      profile,
      error,
      token,
      signIn: async (email, password) => {
        const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
        try {
          await loadProfile(credential.user);
          setError("");
        } catch (err) {
          await signOut(getFirebaseAuth()).catch(() => undefined);
          throw err;
        }
      },
      logOut: async () => {
        await signOut(getFirebaseAuth());
      },
    }),
    [loading, user, profile, error, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export { authErrorMessage };
