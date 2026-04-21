import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { useGameData } from "./hooks/useGameData";
import { useAiSystem } from "./hooks/useAiSystem";
import "./index.css";

const DRAW_TYPES = [
  { key: "day", label: "Päivä" },
  { key: "week", label: "Viikko" },
  { key: "month", label: "Kuukausi" },
];

const FOUNDER_EMAILS = ["jarkko.toivanen90@gmail.com"];

function euro(value) {
  return `${Number(value || 0).toFixed(2)} €`;
}

function SectionCard({ title, children, right }) {
  return (
    <section className="card">
      <div className="card-header">
        <h2>{title}</h2>
        {right ? <div>{right}</div> : null}
      </div>
      {children}
    </section>
  );
}

function MessageBar({ error, info }) {
  if (!error && !info) return null;

  return (
    <div className={error ? "message message-error" : "message message-info"}>
      {error || info}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [sendingLink, setSendingLink] = useState(false);
  const [selectedType, setSelectedType] = useState("week");
  const [debugOpen, setDebugOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!mounted) return;

        const nextUser = data?.session?.user ?? null;
        setUser(nextUser);
        setEmail(nextUser?.email ?? "");
      } catch (err) {
        console.error("Auth init failed:", err);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        setEmail(nextUser?.email ?? "");
        setAuthLoading(false);
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const {
    currentDraw,
    myPost,
    leaderboard,
    recentPurchases,

    loadingData,
    voting,
    boosting,

    error,
    info,

    setError,
    setInfo,

    loadData,
    handleVote,
    handleBoost,
  } = useGameData(user, selectedType);

  const {
    ai,
    aiState,
    rankedLeaderboard,
    gap,
    currentRankNumber,
  } = useAiSystem({
    myPost,
    leaderboard,
    selectedType,
  });

  const isFounder = FOUNDER_EMAILS.includes(user?.email || "");

  const leaderboardRows = useMemo(() => {
    return (rankedLeaderboard || []).map((row, index) => ({
      ...row,
      place: index + 1,
    }));
  }, [rankedLeaderboard]);

  async function sendMagicLink(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    const nextEmail = email.trim();

    if (!nextEmail) {
      setError("Anna sähköpostiosoite.");
      return;
    }

    setSendingLink(true);

    try {
      const redirectTo =
        import.meta.env.VITE_APP_URL || window.location.origin;

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: nextEmail,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (signInError) throw signInError;

      setInfo("Kirjautumislinkki lähetetty sähköpostiin.");
    } catch (err) {
      setError(`Virhe: ${err.message}`);
    } finally {
      setSendingLink(false);
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out failed:", err);
      setError("Uloskirjautuminen epäonnistui.");
    }
  }

  if (authLoading) {
    return (
      <div className="app-shell center-screen">
        <div className="loading-box">Ladataan...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-shell center-screen">
        <form className="login-card" onSubmit={sendMagicLink}>
          <div className="eyebrow">KOLEHTI</div>
          <h1 className="login-title">Kirjaudu sisään</h1>
          <p className="login-subtitle">
            Saat sähköpostiisi kirjautumislinkin.
          </p>

          <MessageBar error={error} info={info} />

          <input
            className="text-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sinä@esimerkki.fi"
            type="email"
          />

          <button className="primary-button big-button" type="submit" disabled={sendingLink}>
            {sendingLink ? "Lähetetään..." : "Lähetä kirjautumislinkki"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="container">
        <header className="hero">
          <div>
            <div className="eyebrow">KOLEHTI</div>
            <h1 className="hero-title">Kolehti AI</h1>
            <div className="hero-subtitle">{user.email}</div>
          </div>

          <div className="header-actions">
            <button className="secondary-button" onClick={loadData}>
              Päivitä
            </button>
            <button className="secondary-button danger-button" onClick={signOut}>
              Logout
            </button>
          </div>
        </header>

        <MessageBar error={error} info={info} />

        <SectionCard title="Arvonnan tyyppi">
          <div className="tabs">
            {DRAW_TYPES.map((draw) => (
              <button
                key={draw.key}
                className={
                  selectedType === draw.key
                    ? "tab-button tab-button-active"
                    : "tab-button"
                }
                onClick={() => setSelectedType(draw.key)}
              >
                {draw.label}
              </button>
            ))}
          </div>
        </SectionCard>

        <div className="grid-two">
          <SectionCard title="Oma tilanne">
            <div className="stat-hero">
              {currentRankNumber > 0 ? `#${currentRankNumber}` : "-"}
            </div>

            <div className="status-chip">
              {typeof aiState === "string"
                ? aiState
                : aiState?.title || "Tilanne auki"}
            </div>

            <div className="stats-list">
              <div className="stat-row">
                <span>Ero</span>
                <strong>{gap}</strong>
              </div>
              <div className="stat-row">
                <span>Momentum</span>
                <strong>{myPost?.momentum ?? 0}</strong>
              </div>
              <div className="stat-row">
                <span>Omat äänet</span>
                <strong>{myPost?.votes ?? 0}</strong>
              </div>
              <div className="stat-row">
                <span>Näkyvyys</span>
                <strong>{myPost?.visibility ?? 0}</strong>
              </div>
              <div className="stat-row">
                <span>Kulutus</span>
                <strong>{euro(myPost?.spent_total ?? 0)}</strong>
              </div>
              <div className="stat-row">
                <span>Aktiivinen draw</span>
                <strong>{currentDraw?.type || selectedType}</strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Toiminnot">
            <div className="action-stack">
              <button
                className="primary-button"
                onClick={handleVote}
                disabled={!myPost || loadingData || voting}
              >
                {voting ? "Äänestetään..." : "Äänestä"}
              </button>

              <button
                className="accent-button"
                onClick={handleBoost}
                disabled={!myPost || loadingData || boosting}
              >
                {boosting ? "Boostataan..." : "Boostaa"}
              </button>
            </div>

            <div className="mini-note">
              {loadingData
                ? "Data latautuu..."
                : "Voit nostaa sijoitusta äänillä ja boosteilla."}
            </div>
          </SectionCard>
        </div>

        <div className="grid-two">
          <SectionCard title="Leaderboard">
            {leaderboardRows.length === 0 ? (
              <div className="empty-state">Ei vielä rivejä.</div>
            ) : (
              <div className="leaderboard-list">
                {leaderboardRows.map((row) => (
                  <div
                    key={row.id}
                    className={
                      row.id === myPost?.id
                        ? "leader-row leader-row-me"
                        : "leader-row"
                    }
                  >
                    <div className="leader-main">
                      <div className="leader-rank">#{row.place}</div>
                      <div>
                        <div className="leader-title">{row.title || "Kolehti"}</div>
                        <div className="leader-meta">
                          Äänet {row.votes ?? 0} · Momentum {row.momentum ?? 0} ·
                          Näkyvyys {row.visibility ?? 0}
                        </div>
                      </div>
                    </div>

                    <div className="leader-score">
                      {typeof row.rankingScore === "number"
                        ? row.rankingScore.toFixed(2)
                        : "0.00"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="AI status">
            <div className="stats-list">
              <div className="stat-row">
                <span>AI state</span>
                <strong>
                  {typeof aiState === "string"
                    ? aiState
                    : aiState?.title || "active"}
                </strong>
              </div>
              <div className="stat-row">
                <span>Boost urgency</span>
                <strong>{ai?.boost?.urgency ?? "-"}</strong>
              </div>
              <div className="stat-row">
                <span>Autopilot mode</span>
                <strong>{ai?.autopilot?.recommendedMode ?? "-"}</strong>
              </div>
              <div className="stat-row">
                <span>Runtime health</span>
                <strong>{ai?.runtime?.health ?? "-"}</strong>
              </div>
              <div className="stat-row">
                <span>Recommended price</span>
                <strong>{euro(ai?.boost?.recommendedPrice ?? 0)}</strong>
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Viimeisimmät ostot">
          {recentPurchases.length === 0 ? (
            <div className="empty-state">Ei vielä ostoja.</div>
          ) : (
            <div className="purchase-list">
              {recentPurchases.map((purchase) => (
                <div className="purchase-row" key={purchase.id}>
                  <div>
                    <div className="purchase-type">{purchase.type || "Osto"}</div>
                    <div className="purchase-date">
                      {purchase.created_at
                        ? new Date(purchase.created_at).toLocaleString("fi-FI")
                        : "-"}
                    </div>
                  </div>
                  <strong>{euro(purchase.amount || 0)}</strong>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {isFounder ? (
          <SectionCard
            title="Founder Dashboard"
            right={
              <button
                className="secondary-button"
                onClick={() => setDebugOpen((prev) => !prev)}
              >
                {debugOpen ? "Piilota debug" : "Näytä debug"}
              </button>
            }
          >
            <div className="stats-list founder-grid">
              <div className="stat-row">
                <span>Health</span>
                <strong>{ai?.runtime?.health ?? "-"}</strong>
              </div>
              <div className="stat-row">
                <span>Ignore</span>
                <strong>
                  {Number(ai?.runtime?.ignoreRate ?? 0).toFixed(1)}%
                </strong>
              </div>
              <div className="stat-row">
                <span>Purchase</span>
                <strong>
                  {Number(ai?.runtime?.purchaseRate ?? 0).toFixed(1)}%
                </strong>
              </div>
              <div className="stat-row">
                <span>Boost urgency</span>
                <strong>{ai?.boost?.urgency ?? "-"}</strong>
              </div>
              <div className="stat-row">
                <span>Autopilot</span>
                <strong>{ai?.autopilot?.automationAction ?? "-"}</strong>
              </div>
            </div>

            {debugOpen ? (
              <div className="debug-box">
                <pre>{JSON.stringify({ ai, aiState, myPost }, null, 2)}</pre>
              </div>
            ) : null}
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
