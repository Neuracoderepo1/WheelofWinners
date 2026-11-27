"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthStage = "email" | "code";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<AuthStage>("email");
  const [session, setSession] = useState<Session | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let client: ReturnType<typeof getSupabaseBrowserClient>;
    try {
      client = getSupabaseBrowserClient();
    } catch {
      setError("Authentication is not configured yet. Please try again later.");
      return;
    }

    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError("We could not restore your session. Please sign in again.");
      setSession(data.session);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadBalance() {
      if (!session?.access_token) {
        setBalance(null);
        return;
      }
      try {
        const response = await fetch("/api/me/points", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const payload: unknown = await response.json();
        if (!active) return;
        if (response.ok && typeof payload === "object" && payload !== null && "pointsBalance" in payload && typeof payload.pointsBalance === "string") {
          setBalance(payload.pointsBalance);
        } else {
          setBalance(null);
        }
      } catch {
        if (active) setBalance(null);
      }
    }
    void loadBalance();
    return () => { active = false; };
  }, [session?.access_token]);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const client = getSupabaseBrowserClient();
      const { error: requestError } = await client.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (requestError) throw requestError;
      setStage("code");
      setMessage("A one-time code has been requested. Check your inbox and spam folder.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not send your code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const client = getSupabaseBrowserClient();
      const { error: verifyError } = await client.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: "email",
      });
      if (verifyError) throw verifyError;
      setMessage("Email verified. Your session is now active.");
      setCode("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That code could not be verified. Request a fresh one.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const { error: signOutError } = await getSupabaseBrowserClient().auth.signOut();
      if (signOutError) throw signOutError;
      setBalance(null);
      setStage("email");
      setMessage("You have been signed out.");
    } catch {
      setError("We could not complete sign-out. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <header className="topbar auth-topbar">
        <Link className="brand" href="/"><span className="brand-mark">W</span> WheelofWinners</Link>
        <Link className="text-link" href="/">Back to home</Link>
      </header>

      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow"><span className="dot" /> Your rewards account</p>
        {session ? (
          <>
            <h1 id="auth-title">You’re <em>signed in.</em></h1>
            <p className="auth-intro">Your email is verified and your account session is active.</p>
            <div className="account-panel">
              <span className="account-label">SIGNED IN AS</span>
              <strong>{session.user.email ?? "Verified account"}</strong>
              <span className="account-label">AVAILABLE POINTS</span>
              <strong className="points-value">{balance === null ? "Not available yet" : balance}</strong>
              <p>Points are credited only after an eligible activity is independently verified. Your balance may be empty while the marketplace is being prepared.</p>
            </div>
            <button className="button button-primary auth-submit" type="button" onClick={signOut} disabled={busy}>{busy ? "Please wait…" : "Sign out"}</button>
          </>
        ) : (
          <>
            <h1 id="auth-title">A simpler way<br /><em>to sign in.</em></h1>
            <p className="auth-intro">Use your email address. We’ll send a one-time code, so there’s no password to remember.</p>
            {stage === "email" ? (
              <form className="auth-form" onSubmit={requestCode}>
                <label htmlFor="email">Email address</label>
                <input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
                <button className="button button-primary auth-submit" type="submit" disabled={busy || !email.trim()}>{busy ? "Sending code…" : "Send one-time code"}</button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={verifyCode}>
                <label htmlFor="otp">Six-digit email code</label>
                <input id="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" />
                <button className="button button-primary auth-submit" type="submit" disabled={busy || code.length !== 6}>{busy ? "Verifying…" : "Verify and continue"}</button>
                <button className="auth-secondary" type="button" onClick={() => { setStage("email"); setCode(""); setError(""); }}>Use a different email</button>
              </form>
            )}
          </>
        )}
        {message && <p className="auth-message" role="status">{message}</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <p className="auth-footnote">By continuing, you agree to use WheelofWinners fairly. No paid entries, random prize draws, or cash-out features.</p>
      </section>
    </main>
  );
}
