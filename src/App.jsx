import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "./supabase";
import { useGameData } from "./hooks/useGameData";
import { useAiSystem } from "./hooks/useAiSystem";

import PageShell from "./components/layout/PageShell";
import AppHeader from "./components/layout/AppHeader";

import {
  PrimaryActionCard,
  BoostCard,
  LeaderboardCard,
  ToolsCard,
} from "./components/cards";

import AlertBanner from "./components/ui/AlertBanner";
import DrawTypeSelector from "./components/ui/DrawTypeSelector";
import StatusCard from "./components/ui/StatusCard";

import FounderDashboard from "./components/FounderDashboard";
import AiDebugPanel from "./components/AiDebugPanel";
import AiTraceHistory from "./components/AiTraceHistory";

const DRAW_TYPES = [
  { key: "day", label: "Päivä", boostLimit: 2 },
  { key: "week", label: "Viikko", boostLimit: 4 },
  { key: "month", label: "Kuukausi", boostLimit: 6 },
];

const FOUNDER_EMAILS = ["jarkko.toivanen90@gmail.com"];

function euro(value) {
  return `${Number(value || 0).toFixed(2)} €`;
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
        if (mounted) {
          setAuthLoading(false);
        }
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

  const game = useGameData(user, selectedType) || {};

  const {
    currentDraw = null,
    myPost = null,
    leaderboard = [],
    recentPurchases = [],
    loadingData = false,
    voting = false,
    boosting = false,
    error = "",
    info = "",
    setError = () => {},
    setInfo = () => {},
    loadData = async () => {},
    handleVote = async () => {},
    handleBoost = async () => {},
  } = game;

  const aiSystem =
    useAiSystem({
      myPost,
      leaderboard,
      selectedType,
    }) || {};

  const {
    ai = {},
    aiState = "",
    rankedLeaderboard = [],
    gap = 0,
    currentRankNumber = 0,
  } = aiSystem;

  const isFounder = FOUNDER_EMAILS.includes(user?.email || "");

  const boostTrace = ai?.boost?.trace || [];
  const visibilityTrace = ai?.visibility?.trace || [];
  const runtimeTrace = ai?.runtime?.trace || [];
  const autopilotTrace = ai?.autopilot?.trace || [];

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
      const redirectTo = import.meta.env.VITE_APP_URL || window.location.origin;

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

  async function handleSafeMode() {
    setInfo("Safe mode aktivoitu.");
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-6 backdrop-blur">
          Ladataan...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,76,202,0.28),_rgba(2,6,23,1)_42%)] text-white flex items-center justify-center p-6">
        <motion.form
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={sendMagicLink}
          className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-2 text-sm font-black tracking-[0.3em] text-white/80">
            KOLEHTI
          </div>

          <h1 className="text-5xl font-black leading-none md:text-7xl">
            Kirjaudu sisään
          </h1>

          <p className="mt-3 text-lg text-white/70">
            Saat sähköpostiisi kirjautumislinkin.
          </p>

          <input
            className="mt-8 w-full rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-xl outline-none placeholder:text-white/35"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sinä@esimerkki.fi"
            type="email"
          />

          <button
            type="submit"
            disabled={sendingLink}
            className="mt-5 w-full rounded-[24px] bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-4 text-xl font-extrabold shadow-lg shadow-violet-900/30 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
          >
            {sendingLink ? "Lähetetään..." : "Lähetä kirjautumislinkki"}
          </button>

          <AnimatePresence>
            {error ? (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-red-300"
              >
                {error}
              </motion.div>
            ) : null}

            {info ? (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-emerald-300"
              >
                {info}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.form>
      </div>
    );
  }

  return (
    <PageShell>
      <AppHeader email={user.email} />

      <AlertBanner error={error} info={info} />

      <DrawTypeSelector
        drawTypes={DRAW_TYPES}
        selectedType={selectedType}
        onSelect={setSelectedType}
      />

      <StatusCard
        rank={currentRankNumber > 0 ? `#${currentRankNumber}` : "-"}
        gap={gap}
        myPost={myPost}
        euro={euro}
      />

      <PrimaryActionCard
        onVote={handleVote}
        voting={voting}
        disabled={!myPost || loadingData}
      />

      <BoostCard
        myPost={myPost}
        boosting={boosting}
        onBoost={handleBoost}
      />

      <LeaderboardCard
        rankedLeaderboard={rankedLeaderboard}
        euro={euro}
      />

      <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-2xl mb-5">
        <div className="mb-4 text-lg text-white/85">AI status</div>

        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white/90">
          {typeof aiState === "string"
            ? aiState
            : aiState?.title || "AI aktiivinen"}
        </div>

        <div className="mt-4 grid gap-3 text-sm text-white/70">
          <div>
            Boost urgency: <span className="text-white">{ai?.boost?.urgency ?? "-"}</span>
          </div>
          <div>
            Autopilot mode:{" "}
            <span className="text-white">
              {ai?.autopilot?.recommendedMode ?? "-"}
            </span>
          </div>
          <div>
            Runtime health:{" "}
            <span className="text-white">{ai?.runtime?.health ?? "-"}</span>
          </div>
          <div>
            Aktiivinen draw:{" "}
            <span className="text-white">{currentDraw?.type || selectedType}</span>
          </div>
        </div>
      </div>

      <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-2xl mb-5">
        <div className="mb-4 text-lg text-white/85">Viimeisimmät ostot</div>

        {recentPurchases.length === 0 ? (
          <div className="text-white/60">Ei vielä ostoja.</div>
        ) : (
          <div className="space-y-3">
            {recentPurchases.map((purchase) => (
              <div
                key={purchase.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <div className="text-white font-semibold">
                  {purchase.type || "Osto"}
                </div>
                <div className="text-white/80">
                  {euro(purchase.amount || 0)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isFounder ? (
        <>
          <FounderDashboard
            ai={ai}
            profile={ai?.profile || {}}
            releaseMode={ai?.releaseMode || "balanced"}
            onSafe={handleSafeMode}
          />

          <div className="mb-5">
            <button
              onClick={() => setDebugOpen((prev) => !prev)}
              className="w-full rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-left text-lg font-bold text-white"
            >
              {debugOpen ? "Piilota debug" : "Näytä debug"}
            </button>
          </div>

          {debugOpen ? (
            <div className="mb-5">
              <AiDebugPanel
                boostTrace={boostTrace}
                visibilityTrace={visibilityTrace}
                runtimeTrace={runtimeTrace}
                autopilotTrace={autopilotTrace}
              />
            </div>
          ) : null}

          <div className="mb-5">
            <AiTraceHistory rows={ai?.traceHistory || []} />
          </div>
        </>
      ) : null}

      <ToolsCard onRefresh={loadData} onSignOut={signOut} />
    </PageShell>
  );
}
