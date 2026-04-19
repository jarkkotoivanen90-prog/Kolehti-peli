import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "./supabase";
import { useAiSystem } from "./hooks/useAiSystem";
import { useGameData } from "./hooks/useGameData";


import PageShell from "./components/layout/PageShell";
import AppHeader from "./components/layout/AppHeader";

import {
  PrimaryActionCard,
  BoostCard,
  LeaderboardCard,
  ToolsCard,
} from "./components/cards";

import FounderDashboard from "./components/ui/FounderDashboard";
import AiDebugPanel from "./components/ui/AiDebugPanel";
import AiTraceHistory from "./components/ui/AiTraceHistory";

const DRAW_TYPES = [
  { key: "day", label: "Päivä", boostLimit: 2 },
  { key: "week", label: "Viikko", boostLimit: 4 },
  { key: "month", label: "Kuukausi", boostLimit: 6 },
];

const FOUNDER_EMAILS = ["jarkko.toivanen90@gmail.com"];

const DEFAULT_AI_PROFILE = {
  reactsToLoss: 0.5,
  reactsToAlmostWin: 0.5,
  reactsToMomentum: 0.5,
  paysInCriticalMoments: 0.5,
  ignoresOffers: 0.5,
};

const DEFAULT_AI_OPTIMIZATION = {
  aggressiveness: 0.5,
  priceBias: 0,
  highThreshold: 65,
  mediumThreshold: 42,
  softThreshold: 25,
};

const DEFAULT_AI_ECONOMY = {
  priceModifier: 0,
  boostStrengthMultiplier: 1,
  visibilityMultiplier: 1,
  urgencyBias: 0,
  fairnessGuard: 1,
};

const DEFAULT_AI_POLICY = {
  minPriceModifier: -2,
  maxPriceModifier: 2,
  maxBoostStrengthMultiplier: 1.5,
  maxVisibilityMultiplier: 1.5,
  maxAggressiveness: 0.85,
  allowGrowthMode: true,
  allowAutopilotApply: false,
  fairnessFloor: 0.8,
  notes: "",
};

const DEFAULT_AI_CONTROL = {
  automationEnabled: true,
  mode: "balanced",
  globalAggressivenessOverride: 0,
  globalPriceBiasOverride: 0,
  globalVisibilityBiasOverride: 0,
  notes: "",
};

const DEFAULT_AI_AUTOPILOT = {
  enabled: true,
  recommendedMode: "balanced",
  automationAction: "hold",
  autopilotReason: "",
  autopilotConfidence: 0.5,
  lastAppliedAt: null,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function euro(value) {
  return `${Number(value || 0).toFixed(2)} €`;
}

function getBoostPrice(usedCount = 0) {
  const prices = [1, 2, 4, 7, 11, 16];
  return prices[Math.min(usedCount, prices.length - 1)];
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [sendingLink, setSendingLink] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authInfo, setAuthInfo] = useState("");

  const [selectedType, setSelectedType] = useState("week");
  const [debugOpen, setDebugOpen] = useState(false);
  const [traceHistory, setTraceHistory] = useState([]);

  const [boostAnalytics, setBoostAnalytics] = useState([]);

  const [aiProfile, setAiProfile] = useState(DEFAULT_AI_PROFILE);
  const [aiOptimization, setAiOptimization] = useState(DEFAULT_AI_OPTIMIZATION);
  const [aiEconomy, setAiEconomy] = useState(DEFAULT_AI_ECONOMY);
  const [aiPolicy] = useState(DEFAULT_AI_POLICY);
  const [aiControlCenter] = useState(DEFAULT_AI_CONTROL);
  const [aiAutopilot] = useState(DEFAULT_AI_AUTOPILOT);
  const [aiReleaseMode] = useState("balanced_production");

  const isFounder = FOUNDER_EMAILS.includes(user?.email || "");

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

  aiProfile,
  aiOptimization,
  aiEconomy,
  aiPolicy,
  aiControlCenter,
  aiAutopilot,
  aiReleaseMode,

  boostAnalytics,
});
  
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user || null);
      setEmail(data.session?.user?.email || "");
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setEmail(session?.user?.email || "");
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function sendMagicLink(e) {
    e.preventDefault();
    setAuthError("");
    setAuthInfo("");

    if (!email.trim()) {
      setAuthError("Anna sähköpostiosoite.");
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
      setAuthInfo("Kirjautumislinkki lähetetty sähköpostiin.");
    } catch (err) {
      setAuthError(`Virhe: ${err.message}`);
    } finally {
      setSendingLink(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const effectiveControl = useMemo(() => {
    return buildEffectiveControl(aiControlCenter, aiReleaseMode);
  }, [aiControlCenter, aiReleaseMode]);

  const policyAdjusted = useMemo(() => {
    return applyPolicyLayer({
      optimization: aiOptimization,
      economy: aiEconomy,
      policy: aiPolicy,
    });
  }, [aiOptimization, aiEconomy, aiPolicy]);

  const effectiveOptimization = useMemo(() => {
    return {
      ...policyAdjusted.optimization,
      aggressiveness: clamp(
        Number(policyAdjusted.optimization?.aggressiveness || 0.5) +
          Number(effectiveControl?.globalAggressivenessOverride || 0),
        0.2,
        Number(aiPolicy?.maxAggressiveness || 0.85)
      ),
      priceBias: clamp(
        Number(policyAdjusted.optimization?.priceBias || 0) +
          Number(effectiveControl?.globalPriceBiasOverride || 0),
        Number(aiPolicy?.minPriceModifier || -2),
        Number(aiPolicy?.maxPriceModifier || 2)
      ),
    };
  }, [policyAdjusted, effectiveControl, aiPolicy]);

  const effectiveEconomy = useMemo(() => {
    return {
      ...policyAdjusted.economy,
      visibilityMultiplier: clamp(
        Number(policyAdjusted.economy?.visibilityMultiplier || 1) +
          Number(effectiveControl?.globalVisibilityBiasOverride || 0),
        0.8,
        Number(aiPolicy?.maxVisibilityMultiplier || 1.5)
      ),
    };
  }, [policyAdjusted, effectiveControl, aiPolicy]);

  const boostAnalyticsSummary = useMemo(() => {
    return summarizeBoostAnalytics(boostAnalytics);
  }, [boostAnalytics]);

  const rankedLeaderboard = useMemo(() => {
    return [...leaderboard]
      .map((row) => ({
        ...row,
        rankingScore: getRankingScore({
          votes: row.votes,
          momentum: row.momentum,
          visibility: row.visibility,
          boostSpent: row.boosts_used || row.boosts || 0,
          selectedType,
          optimization: effectiveOptimization,
        }),
      }))
      .sort((a, b) => {
        if (b.rankingScore !== a.rankingScore) {
          return b.rankingScore - a.rankingScore;
        }
        if (Number(b.votes || 0) !== Number(a.votes || 0)) {
          return Number(b.votes || 0) - Number(a.votes || 0);
        }
        return Number(b.momentum || 0) - Number(a.momentum || 0);
      });
  }, [leaderboard, selectedType, effectiveOptimization]);

  const currentRankNumber = useMemo(() => {
    if (!myPost || !rankedLeaderboard.length) return 0;
    return rankedLeaderboard.findIndex((row) => row.id === myPost.id) + 1 || 0;
  }, [myPost, rankedLeaderboard]);

  const rank = useMemo(() => {
    return currentRankNumber > 0 ? `#${currentRankNumber}` : "-";
  }, [currentRankNumber]);

  const gap = useMemo(() => {
    if (!myPost || !rankedLeaderboard.length) return 0;
    const leader = rankedLeaderboard[0];
    const me = rankedLeaderboard.find((row) => row.id === myPost.id);
    if (!leader || !me) return 0;
    return Math.max(
      0,
      Math.ceil(Number(leader.rankingScore || 0) - Number(me.rankingScore || 0))
    );
  }, [myPost, rankedLeaderboard]);

  const aiState = useMemo(() => {
    return getAiState({
      rank: currentRankNumber,
      gap,
      momentum: Number(myPost?.momentum || 0),
      visibility: Number(myPost?.visibility || 0),
      boostsUsed: Number(myPost?.boosts_used || myPost?.boosts || 0),
      votes: Number(myPost?.votes || 0),
    });
  }, [currentRankNumber, gap, myPost]);

  const ai = useAiStack({
    aiProfile,
    aiOptimization: effectiveOptimization,
    aiEconomy: effectiveEconomy,
    aiPolicy,
    aiControlCenter: effectiveControl,
    aiAutopilot,
    boostAnalyticsSummary,
    context: {
      gap,
      momentum: Number(myPost?.momentum || 0),
      visibility: Number(myPost?.visibility || 0),
      boostsUsed: Number(myPost?.boosts_used || myPost?.boosts || 0),
      selectedType,
    },
    helpers: {
      getBoostPrice,
      drawTypes: DRAW_TYPES,
    },
  });

  const boostDecision = ai?.boost || {};
  const visibilityDecision = ai?.visibility || {};
  const autopilotDecision = ai?.autopilot || {};
  const runtime = ai?.runtime || {};

  const aiDebugInputs = useMemo(() => {
    return {
      gap,
      momentum: Number(myPost?.momentum || 0),
      visibility: Number(myPost?.visibility || 0),
      boostsUsed: Number(myPost?.boosts_used || myPost?.boosts || 0),
      selectedType,
      rank: currentRankNumber,
    };
  }, [gap, myPost, selectedType, currentRankNumber]);

  const aiDebugModels = useMemo(() => {
    return {
      optimization: effectiveOptimization,
      economy: effectiveEconomy,
      policy: aiPolicy,
      control: effectiveControl,
    };
  }, [effectiveOptimization, effectiveEconomy, aiPolicy, effectiveControl]);

  async function onBoost() {
    await handleBoost();

    setAiProfile((prev) => ({
      ...prev,
      paysInCriticalMoments: clamp(
        Number(prev.paysInCriticalMoments || 0.5) + 0.05,
        0,
        1
      ),
      ignoresOffers: clamp(Number(prev.ignoresOffers || 0.5) - 0.03, 0, 1),
    }));

    setBoostAnalytics((prev) => [
      {
        id: crypto.randomUUID(),
        action: "purchased",
        created_at: new Date().toISOString(),
        urgency: boostDecision?.urgency,
        recommended_price: boostDecision?.recommendedPrice,
        ai_score: boostDecision?.score,
      },
      ...prev,
    ].slice(0, 100));
  }

  async function onVote() {
    await handleVote();

    setAiProfile((prev) => ({
      ...prev,
      reactsToAlmostWin: clamp(
        Number(prev.reactsToAlmostWin || 0.5) + (gap <= 1 ? 0.03 : 0.01),
        0,
        1
      ),
      reactsToMomentum: clamp(
        Number(prev.reactsToMomentum || 0.5) +
          (Number(myPost?.momentum || 0) >= 10 ? 0.03 : 0.01),
        0,
        1
      ),
    }));
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
            {authError ? (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-red-300"
              >
                {authError}
              </motion.div>
            ) : null}

            {authInfo ? (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-emerald-300"
              >
                {authInfo}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.form>
      </div>
    );
  }

  return (
    <PageShell>
      <AnimatePresence>
        {error ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-5 rounded-[28px] border border-white/10 bg-white/5 px-5 py-4 text-center font-bold text-white/95 backdrop-blur"
          >
            {error}
          </motion.div>
        ) : null}

        {info ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-5 rounded-[28px] border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-center font-semibold text-emerald-100 backdrop-blur"
          >
            {info}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AppHeader email={user.email} />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[30px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-2xl mb-5"
      >
        <div className="mb-4 text-lg text-white/85">Arvonnan tyyppi</div>
        <div className="grid grid-cols-3 gap-3">
          {DRAW_TYPES.map((draw) => (
            <button
              key={draw.key}
              onClick={() => setSelectedType(draw.key)}
              className={`rounded-[22px] px-4 py-4 text-xl font-extrabold transition ${
                selectedType === draw.key
                  ? "bg-orange-400 text-slate-950"
                  : "border border-white/10 bg-white/5 text-white"
              }`}
            >
              {draw.label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-[30px] border border-amber-300/10 bg-gradient-to-br from-amber-500/10 via-transparent to-violet-500/10 p-5 backdrop-blur-xl shadow-2xl mb-5">
          <div className="mb-2 flex items-center gap-2 text-amber-300 text-lg font-bold">
            Kolehti AI
          </div>

          <div className="text-4xl font-black leading-tight">
            {typeof aiState === "string" ? aiState : aiState?.title || "AI state"}
          </div>

          <div className="mt-2 text-white/80">
            {typeof aiState === "string"
              ? "AI state aktiivinen."
              : aiState?.message || ""}
          </div>

          <div className="mt-4 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div className="text-sm font-bold uppercase tracking-wide text-white/60">
              Boost-suositus
            </div>
            <div className="mt-2 text-2xl font-black">
              {boostDecision?.showBoost ? "🚀 Boost kannattaa nyt" : "⏳ Odota vielä"}
            </div>
            <div className="mt-2 text-white/80">{boostDecision?.message}</div>
            <div className="mt-3 text-sm text-white/60">
              AI score: {Math.round(Number(boostDecision?.score || 0))} · urgency:{" "}
              {boostDecision?.urgency}
            </div>
            <div className="mt-2 text-lg font-bold text-amber-300">
              Suositushinta: {boostDecision?.recommendedPrice} €
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div className="text-sm font-bold uppercase tracking-wide text-white/60">
              Visibility engine
            </div>
            <div className="mt-2 text-2xl font-black">
              {visibilityDecision?.visibilityIntent}
            </div>
            <div className="mt-2 text-white/80">
              {visibilityDecision?.visibilityMessage}
            </div>
            <div className="mt-3 text-sm text-white/60">
              score: {Math.round(Number(visibilityDecision?.score || 0))} ·
              multiplier:{" "}
              {Number(visibilityDecision?.visibilityMultiplier || 1).toFixed(2)}x
            </div>
          </div>
        </div>
      </motion.div>

      <StatusBlock
        rank={rank}
        gap={gap}
        myPost={myPost}
        euro={euro}
      />

      <PrimaryActionCard
        onVote={onVote}
        voting={voting}
        disabled={!myPost || voting || loadingData}
      />

      <BoostCard
        myPost={myPost}
        boosting={boosting}
        onBoost={onBoost}
        recommendation={boostDecision}
      />

      <LeaderboardCard
        rankedLeaderboard={rankedLeaderboard}
        myPost={myPost}
        euro={euro}
      />

      <RecentPurchasesBlock recentPurchases={recentPurchases} euro={euro} />

      {isFounder ? (
        <>
          <FounderDashboard
            ai={ai}
            profile={aiProfile}
            releaseMode={aiReleaseMode}
            aiOptimization={aiOptimization}
            aiEconomy={aiEconomy}
          />

          <div className="mb-5">
            <AiDebugPanel
              isOpen={debugOpen}
              onToggle={() => setDebugOpen((prev) => !prev)}
              ai={ai}
              inputs={aiDebugInputs}
              models={aiDebugModels}
              profile={aiProfile}
              releaseMode={aiReleaseMode}
            />
          </div>

          <div className="mb-5">
            <AiTraceHistory rows={traceHistory} />
          </div>
        </>
      ) : null}

      <ToolsCard onRefresh={loadData} onSignOut={signOut} />

      <div className="mt-5 space-y-1 text-sm text-white/55">
        <div>Aktiivinen arvonta: {selectedType}</div>
        <div>Draw ID: {currentDraw?.id || "-"}</div>
        <div>Release mode: {aiReleaseMode}</div>
        <div>Trace rows: {traceHistory.length}</div>
        <div>Autopilot mode: {autopilotDecision?.recommendedMode || "-"}</div>
        <div>Runtime health: {runtime?.health || "-"}</div>
      </div>
    </PageShell>
  );
}

function StatusBlock({ rank, gap, myPost, euro }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-2xl mb-5 relative overflow-hidden"
    >
      <div className="mb-4 text-lg text-white/85">Oma tilanne</div>
      <div className="text-5xl md:text-7xl font-black leading-none">
        Sijoitus: {rank}
      </div>
      <div className="mt-4 flex items-center gap-2 text-3xl font-extrabold">
        <span>👍</span>
        <span>Tilanne auki</span>
      </div>
      <div className="mt-4 text-2xl text-white/80">
        Ero: {gap} · Momentum: {myPost?.momentum ?? 0}
      </div>
      <div className="mt-3 text-2xl text-white/90">
        Omat äänet: {myPost?.votes ?? 0}
      </div>
      <div className="mt-2 text-2xl text-white/90">
        Näkyvyys: {myPost?.visibility ?? 0}
      </div>
      <div className="mt-2 text-2xl text-white/90">
        Ostot yhteensä: {euro(myPost?.spent_total ?? 0)}
      </div>
    </motion.div>
  );
}

function RecentPurchasesBlock({ recentPurchases, euro }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[30px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-2xl mb-5"
    >
      <div className="mb-4 text-lg text-white/85">Viimeisimmät ostot</div>

      <div className="space-y-3">
        {recentPurchases.length === 0 ? (
          <div className="text-white/65">Ei ostoja.</div>
        ) : (
          recentPurchases.map((purchase) => (
            <div
              key={purchase.id}
              className="flex items-center justify-between rounded-[18px] bg-white/5 px-4 py-4"
            >
              <div className="text-xl font-bold">{purchase.type}</div>
              <div className="text-xl text-white/85">
                {euro(purchase.amount || 0)}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
