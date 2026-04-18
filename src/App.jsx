import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, LogOut, Target, Eye, TrendingUp, Coins } from "lucide-react";

import { supabase } from "./supabase";
import { useAiStack } from "./hooks/useAiStack";

import FounderDashboard from "./components/FounderDashboard";
import AiDebugPanel from "./components/AiDebugPanel";
import AiTraceHistory from "./components/AiTraceHistory";

import { summarizeBoostAnalytics } from "./ai/analytics/analyticsEngine";
import { buildEffectiveControl } from "./ai/control/controlEngine";
import { applyPolicyLayer } from "./ai/policy/policyEngine";
import { getRankingScore } from "./ai/ranking/rankingEngine";
import { getAiState } from "./ai/state/aiState";
import { buildLearningLoop } from "./ai/founder/learningLoop";
import { saveTraceHistoryEntry } from "./ai/founder/traceLogger";

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

function trackLocalEvent(events, action, payload = {}) {
  return [
    {
      id: crypto.randomUUID(),
      action,
      created_at: new Date().toISOString(),
      ...payload,
    },
    ...events,
  ].slice(0, 100);
}

export default function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  const [sendingLink, setSendingLink] = useState(false);
  const [selectedType, setSelectedType] = useState("week");
  const [currentDraw, setCurrentDraw] = useState(null);
  const [myPost, setMyPost] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [boostAnalytics, setBoostAnalytics] = useState([]);

  const [traceHistory, setTraceHistory] = useState([]);
  const [traceHistoryLoaded, setTraceHistoryLoaded] = useState(false);

  const [topError, setTopError] = useState("");
  const [info, setInfo] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [voting, setVoting] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

  const [aiProfile, setAiProfile] = useState(DEFAULT_AI_PROFILE);
  const [aiOptimization, setAiOptimization] = useState(DEFAULT_AI_OPTIMIZATION);
  const [aiEconomy, setAiEconomy] = useState(DEFAULT_AI_ECONOMY);
  const [aiPolicy, setAiPolicy] = useState(DEFAULT_AI_POLICY);
  const [aiControlCenter, setAiControlCenter] = useState(DEFAULT_AI_CONTROL);
  const [aiAutopilot, setAiAutopilot] = useState(DEFAULT_AI_AUTOPILOT);
  const [aiReleaseMode, setAiReleaseMode] = useState("balanced_production");

  const [learningLoopResult, setLearningLoopResult] = useState(null);
  const [runningLearningLoop, setRunningLearningLoop] = useState(false);

  const isFounder = FOUNDER_EMAILS.includes(user?.email || "");

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setEmail(session?.user?.email ?? "");
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setEmail(nextSession?.user?.email ?? "");
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    loadEverything();
  }, [user, selectedType]);

  useEffect(() => {
    if (!user?.id) return;

    async function loadTraceHistory() {
      try {
        const { data, error } = await supabase
          .from("ai_trace_history")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        setTraceHistory(data || []);
      } catch (err) {
        console.error("Trace history load failed:", err.message);
      } finally {
        setTraceHistoryLoaded(true);
      }
    }

    loadTraceHistory();
  }, [user?.id]);

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

  async function sendMagicLink(e) {
    e.preventDefault();
    setTopError("");
    setInfo("");

    if (!email.trim()) {
      setTopError("Anna sähköpostiosoite.");
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
      setTopError(`Virhe: ${err.message}`);
    } finally {
      setSendingLink(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function loadEverything() {
    if (!user) return;

    setLoadingData(true);
    setTopError("");

    try {
      const draw = await fetchActiveDraw(selectedType);

      if (!draw) {
        setCurrentDraw(null);
        setMyPost(null);
        setLeaderboard([]);
        setTopError("Omaa kolehtia ei löytynyt");
        return;
      }

      setCurrentDraw(draw);

      const post = await ensureMyPost(draw.id);
      setMyPost(post);

      await Promise.all([loadLeaderboard(draw.id), loadRecentPurchases(user.id)]);
    } catch (err) {
      setTopError(err.message || "Datan lataus epäonnistui.");
    } finally {
      setLoadingData(false);
    }
  }

  async function fetchActiveDraw(type) {
    const { data, error } = await supabase
      .from("draws")
      .select("*")
      .eq("type", type)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      throw new Error(`Arvonnan haku epäonnistui: ${error.message}`);
    }

    return data;
  }

  async function ensureMyPost(drawId) {
    const { data: existing, error: existingError } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .eq("draw_id", drawId)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Oman kolehdin haku epäonnistui: ${existingError.message}`);
    }

    if (existing) return existing;

    const { data: created, error: createError } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        draw_id: drawId,
        title: `${user.email || "käyttäjä"}n kolehti`,
        votes: 0,
        momentum: 20,
        visibility: 0,
        spent_total: 0,
        boosts_used: 0,
        status: "active",
      })
      .select("*")
      .single();

    if (createError) {
      throw new Error(`Oman kolehdin luonti epäonnistui: ${createError.message}`);
    }

    return created;
  }

  async function loadLeaderboard(drawId) {
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, votes, momentum, visibility, spent_total, boosts_used, boosts, user_id")
      .eq("draw_id", drawId)
      .order("votes", { ascending: false })
      .order("momentum", { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(`Leaderboardin haku epäonnistui: ${error.message}`);
    }

    setLeaderboard(data || []);
  }

  async function loadRecentPurchases(userId) {
    const { data, error } = await supabase
      .from("purchases")
      .select("id, type, amount, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      const msg = error.message || "";
      if (
        msg.includes("does not exist") ||
        msg.includes("relation") ||
        msg.includes("schema cache")
      ) {
        setRecentPurchases([]);
        return;
      }
      throw new Error(`Ostojen haku epäonnistui: ${error.message}`);
    }

    setRecentPurchases(data || []);
  }

  async function logDecisionTrace({
    decisionType,
    eventType,
    trace,
    inputs,
    outputs,
  }) {
    if (!user?.id) return;

    try {
      const payload = await saveTraceHistoryEntry({
        supabase,
        userId: user.id,
        decisionType,
        eventType,
        trace,
        inputs,
        outputs,
        contextSnapshot: {
          releaseMode: aiReleaseMode,
          controlMode: effectiveControl?.mode,
          runtimeHealth: runtime?.health,
          drawId: currentDraw?.id || null,
          drawType: selectedType,
          postId: myPost?.id || null,
        },
      });

      if (payload) {
        setTraceHistory((prev) => [payload, ...prev].slice(0, 100));
      }
    } catch (err) {
      console.error("Trace logging failed:", err.message);
    }
  }

  async function handleVote() {
    if (!myPost) return;

    setVoting(true);
    setTopError("");
    setInfo("");

    try {
      const { data, error } = await supabase
        .from("posts")
        .update({
          votes: Number(myPost.votes || 0) + 1,
          momentum: Number(myPost.momentum || 0) + 1,
          visibility: Number(myPost.visibility || 0) + 1,
        })
        .eq("id", myPost.id)
        .select("*")
        .single();

      if (error) throw error;

      setMyPost(data);

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

      setInfo("Ääni lisätty.");
      await loadLeaderboard(currentDraw.id);
    } catch (err) {
      setTopError(`Äänen tallennus epäonnistui: ${err.message}`);
    } finally {
      setVoting(false);
    }
  }

  async function handleBoost() {
    if (!myPost || !currentDraw) return;

    if (
      Number(myPost?.boosts_used || myPost?.boosts || 0) >=
      Number(boostDecision?.boostLimit || 0)
    ) {
      setTopError("Boost-kiintiö täynnä tässä arvonnassa.");
      return;
    }

    setBoosting(true);
    setTopError("");
    setInfo("");

    const price = Number(boostDecision?.recommendedPrice || 1);
    const finalMomentumGain = Math.round(
      Number(boostDecision?.estimatedMomentumGain || 0)
    );
    const finalVisibilityGain = Math.round(
      Number(boostDecision?.estimatedVisibilityGain || 0)
    );

    try {
      await logDecisionTrace({
        decisionType: "boost",
        eventType: "boost_clicked",
        trace: boostDecision?.trace || [],
        inputs: {
          gap,
          momentum: Number(myPost?.momentum || 0),
          visibility: Number(myPost?.visibility || 0),
          boostsUsed: Number(myPost?.boosts_used || myPost?.boosts || 0),
          selectedType,
        },
        outputs: {
          score: boostDecision?.score,
          urgency: boostDecision?.urgency,
          recommendedPrice: boostDecision?.recommendedPrice,
        },
      });

      setBoostAnalytics((prev) =>
        trackLocalEvent(prev, "clicked", {
          urgency: boostDecision?.urgency,
          recommended_price: boostDecision?.recommendedPrice,
          ai_score: boostDecision?.score,
        })
      );

      const { data, error } = await supabase
        .from("posts")
        .update({
          momentum: Number(myPost.momentum || 0) + finalMomentumGain,
          visibility: Number(myPost.visibility || 0) + finalVisibilityGain,
          spent_total: Number(myPost.spent_total || 0) + price,
          boosts_used: Number(myPost.boosts_used || myPost.boosts || 0) + 1,
        })
        .eq("id", myPost.id)
        .select("*")
        .single();

      if (error) throw error;

      const { error: purchaseError } = await supabase.from("purchases").insert({
        user_id: user.id,
        type: "BOOST_PUSH",
        amount: price,
      });

      if (purchaseError) {
        const msg = purchaseError.message || "";
        if (
          !msg.includes("does not exist") &&
          !msg.includes("relation") &&
          !msg.includes("schema cache")
        ) {
          throw purchaseError;
        }
      }

      setMyPost(data);

      setAiProfile((prev) => ({
        ...prev,
        paysInCriticalMoments: clamp(
          Number(prev.paysInCriticalMoments || 0.5) + 0.05,
          0,
          1
        ),
        ignoresOffers: clamp(Number(prev.ignoresOffers || 0.5) - 0.03, 0, 1),
      }));

      await logDecisionTrace({
        decisionType: "boost",
        eventType: "boost_purchased",
        trace: boostDecision?.trace || [],
        inputs: {
          gap,
          momentum: Number(myPost?.momentum || 0),
          visibility: Number(myPost?.visibility || 0),
          boostsUsed: Number(myPost?.boosts_used || myPost?.boosts || 0),
          selectedType,
        },
        outputs: {
          score: boostDecision?.score,
          urgency: boostDecision?.urgency,
          recommendedPrice: boostDecision?.recommendedPrice,
          finalMomentumGain,
          finalVisibilityGain,
        },
      });

      setBoostAnalytics((prev) =>
        trackLocalEvent(prev, "purchased", {
          urgency: boostDecision?.urgency,
          recommended_price: boostDecision?.recommendedPrice,
          ai_score: boostDecision?.score,
        })
      );

      setInfo(`Boost käytetty (${price} €).`);
      await Promise.all([loadLeaderboard(currentDraw.id), loadRecentPurchases(user.id)]);
    } catch (err) {
      setTopError(`Boost epäonnistui: ${err.message}`);
    } finally {
      setBoosting(false);
    }
  }

  async function handleIgnoreAi() {
    await logDecisionTrace({
      decisionType: "boost",
      eventType: "boost_ignored",
      trace: boostDecision?.trace || [],
      inputs: {
        gap,
        momentum: Number(myPost?.momentum || 0),
        visibility: Number(myPost?.visibility || 0),
        boostsUsed: Number(myPost?.boosts_used || myPost?.boosts || 0),
        selectedType,
      },
      outputs: {
        score: boostDecision?.score,
        urgency: boostDecision?.urgency,
        recommendedPrice: boostDecision?.recommendedPrice,
      },
    });

    setAiProfile((prev) => ({
      ...prev,
      ignoresOffers: clamp(Number(prev.ignoresOffers || 0.5) + 0.05, 0, 1),
    }));

    setBoostAnalytics((prev) =>
      trackLocalEvent(prev, "ignored", {
        urgency: boostDecision?.urgency,
        recommended_price: boostDecision?.recommendedPrice,
        ai_score: boostDecision?.score,
      })
    );

    setInfo("AI ottaa tämän huomioon.");
  }

  async function runAiLearningLoop() {
    if (!isFounder) return;

    setRunningLearningLoop(true);

    try {
      const result = buildLearningLoop({
        traceRows: traceHistory,
        aiOptimization,
        aiEconomy,
        aiPolicy,
      });

      setLearningLoopResult(result);

      if (!result?.changed) {
        setInfo("AI learning loop ei löytänyt vielä tarpeeksi vahvaa muutosta.");
        return;
      }

      const nextOptimization = result.nextOptimization;
      const nextEconomy = result.nextEconomy;

      const [{ error: optimizationError }, { error: economyError }] =
        await Promise.all([
          supabase
            .from("ai_optimization_models")
            .update({
              aggressiveness: nextOptimization.aggressiveness,
              price_bias: nextOptimization.priceBias,
              high_threshold: nextOptimization.highThreshold,
              medium_threshold: nextOptimization.mediumThreshold,
              soft_threshold: nextOptimization.softThreshold,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id),

          supabase
            .from("ai_economy_models")
            .update({
              price_modifier: nextEconomy.priceModifier,
              boost_strength_multiplier: nextEconomy.boostStrengthMultiplier,
              visibility_multiplier: nextEconomy.visibilityMultiplier,
              urgency_bias: nextEconomy.urgencyBias,
              fairness_guard: nextEconomy.fairnessGuard,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id),
        ]);

      if (optimizationError) throw optimizationError;
      if (economyError) throw economyError;

      setAiOptimization(nextOptimization);
      setAiEconomy(nextEconomy);

      setInfo("AI learning loop päivitti malleja.");
    } catch (err) {
      console.error("AI learning loop failed:", err.message);
      setTopError(`AI learning loop epäonnistui: ${err.message}`);
    } finally {
      setRunningLearningLoop(false);
    }
  }

  useEffect(() => {
    if (!boostDecision?.showBoost) return;

    setBoostAnalytics((prev) => {
      const latest = prev[0];

      if (
        latest?.action === "shown" &&
        latest?.urgency === boostDecision?.urgency &&
        Number(latest?.recommended_price || 0) ===
          Number(boostDecision?.recommendedPrice || 0)
      ) {
        return prev;
      }

      logDecisionTrace({
        decisionType: "boost",
        eventType: "boost_shown",
        trace: boostDecision?.trace || [],
        inputs: {
          gap,
          momentum: Number(myPost?.momentum || 0),
          visibility: Number(myPost?.visibility || 0),
          boostsUsed: Number(myPost?.boosts_used || myPost?.boosts || 0),
          selectedType,
        },
        outputs: {
          score: boostDecision?.score,
          urgency: boostDecision?.urgency,
          showBoost: boostDecision?.showBoost,
          recommendedPrice: boostDecision?.recommendedPrice,
        },
      });

      return trackLocalEvent(prev, "shown", {
        urgency: boostDecision?.urgency,
        recommended_price: boostDecision?.recommendedPrice,
        ai_score: boostDecision?.score,
      });
    });
  }, [
    boostDecision?.showBoost,
    boostDecision?.urgency,
    boostDecision?.recommendedPrice,
    boostDecision?.score,
    gap,
    myPost,
    selectedType,
  ]);

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
            {topError ? (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-red-300"
              >
                {topError}
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
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(59,76,202,0.28),_rgba(2,6,23,1)_42%)] text-white">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 md:px-6">
        <AnimatePresence>
          {topError ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-5 rounded-[28px] border border-white/10 bg-white/5 px-5 py-4 text-center font-bold text-white/95 backdrop-blur"
            >
              {topError}
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

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="text-sm font-black tracking-[0.3em] text-white/80">
            KOLEHTI
          </div>
          <div className="mt-2 text-5xl font-black leading-none md:text-7xl">
            Kolehti AI
          </div>
          <div className="mt-3 text-lg text-white/75">{user.email}</div>
        </motion.div>

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

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[30px] border border-amber-300/10 bg-gradient-to-br from-amber-500/10 via-transparent to-violet-500/10 p-5 backdrop-blur-xl shadow-2xl mb-5"
        >
          <div className="mb-2 flex items-center gap-2 text-amber-300 text-lg font-bold">
            <Target className="h-5 w-5" />
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
              multiplier: {Number(visibilityDecision?.visibilityMultiplier || 1).toFixed(2)}x
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[30px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-2xl mb-5"
        >
          <div className="mb-4 text-lg text-white/85">Päätoiminto</div>
          <motion.button
            whileTap={{ scale: 0.985 }}
            onClick={handleVote}
            disabled={!myPost || voting || loadingData}
            className="w-full rounded-[24px] bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-5 text-2xl font-extrabold shadow-lg shadow-violet-900/30 disabled:opacity-60"
          >
            {voting ? "Tallennetaan..." : "👍 Anna ääni"}
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[30px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-2xl mb-5"
        >
          <div className="mb-4 text-lg text-white/85">Boost</div>
          <div className="text-white/75 mb-3">
            Boostit: {Number(myPost?.boosts_used || myPost?.boosts || 0)}/
            {Number(boostDecision?.boostLimit || 0)}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {boostDecision?.showBoost ? (
              <motion.button
                whileTap={{ scale: 0.985 }}
                onClick={handleBoost}
                disabled={
                  !myPost ||
                  boosting ||
                  Number(myPost?.boosts_used || myPost?.boosts || 0) >=
                    Number(boostDecision?.boostLimit || 0)
                }
                className="rounded-[22px] bg-orange-400 px-5 py-4 text-xl font-black text-slate-950 disabled:opacity-50"
              >
                {boosting
                  ? "Käytetään..."
                  : `🚀 Käytä boosti (${boostDecision?.recommendedPrice} €)`}
              </motion.button>
            ) : (
              <button
                onClick={handleIgnoreAi}
                className="rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-xl font-black text-white/70"
              >
                Ei vielä boostia
              </button>
            )}

            <button
              onClick={handleIgnoreAi}
              className="rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-xl font-black text-white"
            >
              Ei nyt
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[30px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-2xl mb-5"
        >
          <div className="mb-4 text-lg text-white/85">Leaderboard</div>
          <div className="space-y-3">
            <AnimatePresence>
              {rankedLeaderboard.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/65">
                  Ei vielä rivejä.
                </motion.div>
              ) : (
                rankedLeaderboard.map((item, index) => {
                  const mine = item.id === myPost?.id;

                  return (
                    <motion.div
                      layout
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center justify-between rounded-[20px] px-4 py-4 ${
                        mine
                          ? "bg-violet-500/30 ring-1 ring-violet-300/30"
                          : "bg-indigo-500/20"
                      }`}
                    >
                      <div>
                        <div className="text-2xl font-extrabold">
                          #{index + 1} {item.title || "kolehti"}
                        </div>

                        <div className="mt-1 text-sm text-white/65 inline-flex items-center gap-3">
                          <span className="inline-flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            {item.momentum || 0}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {item.visibility || 0}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Coins className="h-4 w-4" />
                            {euro(item.spent_total || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {Number(item.rankingScore || 0).toFixed(1)}
                        </div>
                        <div className="text-white/65">AI rank score</div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </motion.div>

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
                  <div className="text-xl text-white/85">{euro(purchase.amount || 0)}</div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {isFounder ? (
          <>
            <FounderDashboard
              ai={ai}
              profile={aiProfile}
              releaseMode={aiReleaseMode}
              onRunLearningLoop={runAiLearningLoop}
              runningLearningLoop={runningLearningLoop}
              learningLoopResult={learningLoopResult}
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

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[30px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-2xl"
        >
          <div className="mb-4 text-lg text-white/85">Testaus</div>

          <div className="grid gap-3">
            <button
              onClick={loadEverything}
              className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-xl font-black"
            >
              <RefreshCw className="h-5 w-5" />
              Päivitä tila
            </button>

            <button
              onClick={signOut}
              className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-xl font-black"
            >
              <LogOut className="h-5 w-5" />
              Kirjaudu ulos
            </button>
          </div>

          <div className="mt-5 space-y-1 text-sm text-white/55">
            <div>Aktiivinen arvonta: {selectedType}</div>
            <div>Draw ID: {currentDraw?.id || "-"}</div>
            <div>Release mode: {aiReleaseMode}</div>
            <div>Trace rows: {traceHistoryLoaded ? traceHistory.length : "..."}</div>
            <div>Autopilot mode: {autopilotDecision?.recommendedMode || "-"}</div>
            <div>Runtime health: {runtime?.health || "-"}</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
