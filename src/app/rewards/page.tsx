"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Reward = {
  id: string;
  title: string;
  description: string | null;
  points_cost: number;
  eligibility_text: string | null;
  fulfilment_terms: string | null;
  vendor_name: string;
  available_quantity: number;
};

const formatPoints = (value: number | string) =>
  new Intl.NumberFormat("en-GH").format(Number(value));

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "available">("all");
  const [selected, setSelected] = useState<Reward | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [notice, setNotice] = useState("");

  const loadRewards = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/rewards", { cache: "no-store" });
      const payload: unknown = await response.json();
      if (!response.ok || typeof payload !== "object" || payload === null || !("rewards" in payload) || !Array.isArray(payload.rewards)) {
        throw new Error("The rewards catalogue is not available right now.");
      }
      setRewards(payload.rewards as Reward[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load rewards.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBalance = useCallback(async (activeSession: Session | null) => {
    if (!activeSession?.access_token) {
      setBalance(null);
      return;
    }
    try {
      const response = await fetch("/api/me/points", {
        headers: { Authorization: `Bearer ${activeSession.access_token}` },
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      if (response.ok && typeof payload === "object" && payload !== null && "pointsBalance" in payload && typeof payload.pointsBalance === "string") {
        setBalance(Number(payload.pointsBalance));
      } else {
        setBalance(null);
      }
    } catch {
      setBalance(null);
    }
  }, []);

  useEffect(() => {
    void loadRewards();
    let active = true;
    try {
      const client = getSupabaseBrowserClient();
      client.auth.getSession().then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        void loadBalance(data.session);
      });
      const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
        if (!active) return;
        setSession(nextSession);
        void loadBalance(nextSession);
      });
      return () => {
        active = false;
        listener.subscription.unsubscribe();
      };
    } catch {
      return () => { active = false; };
    }
  }, [loadRewards, loadBalance]);

  const visibleRewards = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rewards.filter((reward) => {
      const matchesQuery = !normalized || [reward.title, reward.description ?? "", reward.vendor_name].join(" ").toLowerCase().includes(normalized);
      const matchesFilter = filter === "all" || reward.available_quantity > 0;
      return matchesQuery && matchesFilter;
    });
  }, [rewards, query, filter]);

  function chooseReward(reward: Reward) {
    if (!session) {
      window.location.href = "/auth";
      return;
    }
    setNotice("");
    setIdempotencyKey(window.crypto.randomUUID());
    setSelected(reward);
  }

  async function confirmRedemption() {
    if (!selected || !session?.access_token || !idempotencyKey) return;
    setRedeeming(true);
    setNotice("");
    try {
      const response = await fetch(`/api/rewards/${selected.id}/redeem`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idempotencyKey }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string" ? payload.error : "Redemption could not be completed.";
        throw new Error(message);
      }
      setSelected(null);
      setNotice("Your reward has been reserved. Check your account for the redemption details.");
      await Promise.all([loadRewards(), loadBalance(session)]);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Redemption could not be completed. You can safely retry.");
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <main className="marketplace-shell">
      <header className="topbar marketplace-topbar">
        <Link className="brand" href="/"><span className="brand-mark">W</span> WheelofWinners</Link>
        <nav aria-label="Main navigation" className="market-nav">
          <Link href="/">Home</Link>
          <Link className="nav-current" href="/rewards">Rewards</Link>
          {session ? <span className="nav-balance">{balance === null ? "Points loading" : `${formatPoints(balance)} pts`}</span> : <Link className="nav-cta" href="/auth">Sign in</Link>}
        </nav>
      </header>

      <section className="market-hero">
        <div>
          <p className="eyebrow"><span className="dot" /> THE REWARDS MARKETPLACE</p>
          <h1>Good choices.<br /><em>Great rewards.</em></h1>
          <p>Browse fixed-price rewards from approved vendors. Every listing shows its points cost, availability and fulfilment terms before you commit.</p>
          <div className="market-trust"><span>✓ Clear point prices</span><span>✓ Verified availability</span><span>✓ No chance-based prizes</span></div>
        </div>
        <div className="market-hero-art" aria-hidden="true"><div className="market-orbit"/><div className="market-gift"><span>✳</span><strong>YOUR<br/>REWARD</strong><small>Earned, never random.</small></div><i className="market-spark spark-a">✦</i><i className="market-spark spark-b">✳</i></div>
      </section>

      <section className="market-content">
        <div className="market-heading">
          <div><p className="eyebrow">THE COLLECTION</p><h2>Explore rewards</h2><p>Choose something useful. Know exactly what it costs.</p></div>
          {session ? <div className="points-chip"><span>YOUR BALANCE</span><strong>{balance === null ? "--" : formatPoints(balance)} <small>PTS</small></strong></div> : <Link className="market-signin" href="/auth">Sign in to see your points ↗</Link>}
        </div>

        <div className="market-controls">
          <label className="market-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search rewards or vendors" aria-label="Search rewards or vendors" /></label>
          <div className="market-filters" aria-label="Reward filters">
            <button className={filter === "all" ? "filter-active" : ""} onClick={() => setFilter("all")}>All rewards</button>
            <button className={filter === "available" ? "filter-active" : ""} onClick={() => setFilter("available")}>In stock</button>
          </div>
        </div>

        {notice && <p className="market-notice" role="status">{notice}</p>}
        {loading ? <div className="market-state"><span className="loading-dot"/><strong>Loading the collection</strong><p>Checking currently published rewards and availability.</p></div> :
          error ? <div className="market-state"><strong>We couldn’t load the marketplace.</strong><p>{error}</p><button className="button button-primary" onClick={() => void loadRewards()}>Try again</button></div> :
          visibleRewards.length === 0 ? <div className="market-state"><span className="empty-symbol">✳</span><strong>{rewards.length === 0 ? "The shelves are being prepared." : "No rewards match that search."}</strong><p>{rewards.length === 0 ? "There are no published rewards yet. Check back when approved vendors add their first listings." : "Try another search or switch back to all rewards."}</p>{query && <button className="market-clear" onClick={() => setQuery("")}>Clear search</button>}</div> :
          <div className="market-grid">{visibleRewards.map((reward, index) => <article className="market-card" key={reward.id}>
            <div className={`market-card-art market-art-${index % 4}`}><span>{["✳", "⌂", "◈", "✦"][index % 4]}</span><small>{reward.vendor_name}</small><b>{reward.available_quantity > 0 ? "AVAILABLE" : "OUT OF STOCK"}</b></div>
            <div className="market-card-body"><h3>{reward.title}</h3><p>{reward.description || "A vendor-listed reward with clear redemption terms."}</p>
              <div className="market-card-meta"><strong>{formatPoints(reward.points_cost)} <small>PTS</small></strong><span>{reward.available_quantity} available</span></div>
              {reward.eligibility_text && <p className="market-terms">{reward.eligibility_text}</p>}
              <button className="market-redeem" disabled={reward.available_quantity < 1} onClick={() => chooseReward(reward)}>{session ? "View redemption" : "Sign in to redeem"} <span>↗</span></button>
            </div>
          </article>)}</div>
        }
      </section>

      <section className="market-bottom"><div><p className="eyebrow">FAIR BY DESIGN</p><h2>Points with purpose.<br/><em>Rewards with clarity.</em></h2></div><p>Points are credited only after eligible activities are independently verified. Reward redemptions use published prices and available stock. Points cannot be purchased, transferred or exchanged for cash.</p></section>

      <footer className="market-footer"><Link className="brand" href="/"><span className="brand-mark">W</span> WheelofWinners</Link><span>Earn fairly. Redeem clearly.</span><Link href="/auth">Your account</Link></footer>

      {selected && <div className="redeem-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !redeeming) setSelected(null); }}>
        <section className="redeem-dialog" role="dialog" aria-modal="true" aria-labelledby="redeem-title">
          <button className="dialog-close" onClick={() => setSelected(null)} aria-label="Close" disabled={redeeming}>×</button>
          <p className="eyebrow">REDEMPTION REVIEW</p><h2 id="redeem-title">{selected.title}</h2><p>{selected.description}</p>
          <div className="redeem-summary"><span>Points required</span><strong>{formatPoints(selected.points_cost)} pts</strong><span>Your current balance</span><strong>{balance === null ? "Unavailable" : `${formatPoints(balance)} pts`}</strong><span>Available stock</span><strong>{selected.available_quantity}</strong></div>
          {selected.fulfilment_terms && <p className="redeem-terms">{selected.fulfilment_terms}</p>}
          {balance !== null && balance < selected.points_cost && <p className="redeem-warning">Your current balance is not enough for this reward.</p>}
          <button className="button button-primary redeem-confirm" disabled={redeeming || balance === null || balance < selected.points_cost || selected.available_quantity < 1} onClick={() => void confirmRedemption()}>{redeeming ? "Reserving reward…" : "Confirm redemption"}</button>
          <button className="dialog-cancel" disabled={redeeming} onClick={() => setSelected(null)}>Not now</button>
          <p className="dialog-footnote">Confirming reserves one available item and deducts the published points cost. This action cannot be undone from this screen.</p>
        </section>
      </div>}
    </main>
  );
}
