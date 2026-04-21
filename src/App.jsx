import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "./supabase";
import { useGameData } from "./hooks/useGameData";
import { useAiSystem } from "./hooks/useAiSystem";
import KolehtiV2GameUI from "./components/KolehtiV2GameUI";

const FOUNDER_EMAILS = ["jarkko.toivanen90@gmail.com"];

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [sendingLink, setSendingLink] = useState(false);
  const [selectedType, setSelectedType] = useState("day");
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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,76,202,0.30),_rgba(2,6,23,1)_42%)] text-white flex items-center justify-center p-6">
        <div className="rounded-[28px] border border-white/10 bg-white/5 px-8 py-6 text-lg font-bold backdrop-blur-xl">
          Ladataan...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,76,202,0.30),_rgba(2,6,23,1)_42%)] text-white flex items-center justify-center p-6">
        <motion.form
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={sendMagicLink}
          className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-2 text-sm font-black tracking-[0.35em] text-white/80">
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
            className="mt-5 w-full rounded-[24px] bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-4 text-xl font-extrabold text-white shadow-lg shadow-violet-900/30 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
          >
            {sendingLink ? "Lähetetään..." : "Lähetä kirjautumislinkki"}
          </button>

          <AnimatePresence mode="wait">
            {error ? (
              <motion.div
                key={`error-${error}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 rounded-[18px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-rose-100"
              >
                {error}
              </motion.div>
            ) : info ? (
              <motion.div
                key={`info-${info}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-emerald-100"
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
    <KolehtiV2GameUI
      email={user.email}
      selectedType={selectedType}
      setSelectedType={setSelectedType}
      info={info}
      error={error}
      currentDraw={currentDraw}
      myPost={myPost}
      rankedLeaderboard={rankedLeaderboard}
      ai={ai}
      aiState={typeof aiState === "string" ? aiState : aiState?.title || "active"}
      gap={gap}
      currentRankNumber={currentRankNumber}
      recentPurchases={recentPurchases}
      voting={voting || loadingData}
      boosting={boosting || loadingData}
      isFounder={isFounder}
      debugOpen={debugOpen}
      setDebugOpen={setDebugOpen}
      onRefresh={loadData}
      onLogout={signOut}
      handleVote={handleVote}
      handleBoost={handleBoost}
    />
  );
}
