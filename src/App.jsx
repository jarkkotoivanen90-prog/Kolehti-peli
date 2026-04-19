import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

import { useGameData } from "./hooks/useGameData";
import { useAiStack } from "./hooks/useAiStack";

import PageShell from "./components/layout/PageShell";
import AppHeader from "./components/layout/AppHeader";

import { PrimaryActionCard, BoostCard, LeaderboardCard, ToolsCard } from "./components/cards";

import FounderDashboard from "./components/ui/FounderDashboard";
import AiDebugPanel from "./components/ui/AiDebugPanel";
import AiTraceHistory from "./components/ui/AiTraceHistory";

import { summarizeBoostAnalytics } from "./ai/analytics/analyticsEngine";
import { buildEffectiveControl } from "./ai/control/controlEngine";
import { applyPolicyLayer } from "./ai/policy/policyEngine";
import { getRankingScore } from "./ai/ranking/rankingEngine";
import { getAiState } from "./ai/state/aiState";

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

function euro(value) {
  return `${Number(value || 0).toFixed(2)} €`;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [selectedType, setSelectedType] = useState("week");

  const [debugOpen, setDebugOpen] = useState(false);
  const [traceHistory] = useState([]);
  const [boostAnalytics] = useState([]);

  const [aiProfile] = useState(DEFAULT_AI_PROFILE);
  const [aiOptimization] = useState(DEFAULT_AI_OPTIMIZATION);
  const [aiEconomy] = useState(DEFAULT_AI_ECONOMY);
  const [aiPolicy] = useState(DEFAULT_AI_POLICY);
  const [aiControlCenter] = useState(DEFAULT_AI_CONTROL);
  const [aiAutopilot] = useState(DEFAULT_AI_AUTOPILOT);
  const [aiReleaseMode] = useState("balanced_production");

  const {
    myPost,
    leaderboard,
    loading,
    voting,
    boosting,
    error,
    loadData,
    handleVote,
    handleBoost,
  } = useGameData(user, selectedType);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const isFounder = FOUNDER_EMAILS.includes(user?.email || "");

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
    return policyAdjusted?.optimization || aiOptimization;
  }, [policyAdjusted, aiOptimization]);

  const effectiveEconomy = useMemo(() => {
    return policyAdjusted?.economy || aiEconomy;
  }, [policyAdjusted, aiEconomy]);

  const rankedLeaderboard = useMemo(() => {
    return [...(leaderboard || [])]
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
      .sort((a, b) => Number(b.rankingScore || 0) - Number(a.rankingScore || 0));
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

  const boostAnalyticsSummary = useMemo(() => {
    return summarizeBoostAnalytics(boostAnalytics);
  }, [boostAnalytics]);

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
      drawTypes: DRAW_TYPES,
    },
  });

  const boostDecision = ai?.boost || {};
  const visibilityDecision = ai?.visibility || {};
  const runtime = ai?.runtime || {};

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        Kirjaudu sisään
      </div>
    );
  }

  return (
    <PageShell>
      <AppHeader email={user.email} />

      <div className="mb-5 rounded-[30px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-2xl">
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
      </div>

      {error ? (
        <div className="mb-5 rounded-[28px] border border-red-400/20 bg-red-500/10 px-5 py-4 text-center font-bold text-red-100 backdrop-blur">
          {error}
        </div>
      ) : null}

      <div className="mb-5 rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-2xl">
        <div className="mb-4 text-lg text-white/85">Oma tilanne</div>

        <div className="text-5xl font-black leading-none md:text-7xl">
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
          Kulutus: {euro(myPost?.spent_total ?? 0)}
        </div>
      </div>

      <div className="mb-5 rounded-[30px] border border-amber-300/10 bg-gradient-to-br from-amber-500/10 via-transparent to-violet-500/10 p-5 backdrop-blur-xl shadow-2xl">
        <div className="mb-2 text-lg font-bold text-amber-300">Kolehti AI</div>

        <div className="text-3xl font-black">
          {typeof aiState === "string" ? aiState : aiState?.title || "AI state"}
        </div>

        <div className="mt-2 text-white/80">
          {typeof aiState === "string" ? "AI state aktiivinen." : aiState?.message || ""}
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
            {boostDecision?.urgency || "-"}
          </div>

          <div className="mt-2 text-lg font-bold text-amber-300">
            Suositushinta: {boostDecision?.recommendedPrice ?? 0} €
          </div>
        </div>

        <div className="mt-4 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
          <div className="text-sm font-bold uppercase tracking-wide text-white/60">
            Visibility engine
          </div>

          <div className="mt-2 text-2xl font-black">
            {visibilityDecision?.visibilityIntent || "-"}
          </div>

          <div className="mt-2 text-white/80">
            {visibilityDecision?.visibilityMessage || "Ei viestiä"}
          </div>
        </div>
      </div>

      <PrimaryActionCard
        onVote={handleVote}
        voting={voting}
        disabled={!myPost || loading}
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

      <ToolsCard
        onRefresh={loadData}
        onSignOut={signOut}
      />

      {isFounder ? (
        <div className="space-y-5">
          <FounderDashboard
            ai={ai}
            profile={aiProfile}
            releaseMode={aiReleaseMode}
            aiOptimization={aiOptimization}
            aiEconomy={aiEconomy}
          />

          <AiDebugPanel
            isOpen={debugOpen}
            onToggle={() => setDebugOpen((prev) => !prev)}
            ai={ai}
            inputs={{
              gap,
              momentum: Number(myPost?.momentum || 0),
              visibility: Number(myPost?.visibility || 0),
              boostsUsed: Number(myPost?.boosts_used || myPost?.boosts || 0),
              selectedType,
              rank: currentRankNumber,
            }}
            models={{
              optimization: effectiveOptimization,
              economy: effectiveEconomy,
              policy: aiPolicy,
              control: effectiveControl,
            }}
            profile={aiProfile}
            releaseMode={aiReleaseMode}
          />

          <AiTraceHistory rows={traceHistory} />
        </div>
      ) : null}

      <div className="mt-6 text-sm text-white/50">
        Runtime health: {runtime?.health || "-"}
      </div>
    </PageShell>
  );
}
