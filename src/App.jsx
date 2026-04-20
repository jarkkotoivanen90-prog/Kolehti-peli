
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

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setEmail(data.session?.user?.email ?? "");
      setAuthLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setEmail(session?.user?.email ?? "");
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
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

    setMyPost,
    setError,
    setInfo,

    loadData,
    loadLeaderboard,
    loadRecentPurchases,

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

  async function sendMagicLink(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!email.trim()) {
      setError("Anna sähköpostiosoite.");
      return;
    }

    setSendingLink(true);

    try {
      const redirectTo = import.meta.env.VITE_APP_URL || window.location.origin;

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;
      setInfo("Kirjautumislinkki lähetetty sähköpostiin.");
    } catch (err) {
      setError(`Virhe: ${err.message}`);
    } finally {
      setSendingLink(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
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
  <div style={{ padding: "24px", color: "white", background: "black", minHeight: "100vh" }}>
    APP OK
  </div>
);
