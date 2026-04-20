import { useMemo } from "react";

import { summarizeBoostAnalytics } from "../ai/analytics/analyticsEngine";
import { buildEffectiveControl } from "../ai/control/controlEngine";
import { applyPolicyLayer } from "../ai/policy/policyEngine";
import { getRankingScore } from "../ai/ranking/rankingEngine";
import { getAiState } from "../ai/state/aiState";

import { useAiStack } from "./useAiStack";

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

export function useAiSystem({
  myPost = null,
  leaderboard = [],
  selectedType = "week",

  aiProfile = DEFAULT_AI_PROFILE,
  aiOptimization = DEFAULT_AI_OPTIMIZATION,
  aiEconomy = DEFAULT_AI_ECONOMY,
  aiPolicy = DEFAULT_AI_POLICY,
  aiControlCenter = DEFAULT_AI_CONTROL,
  aiAutopilot = DEFAULT_AI_AUTOPILOT,
  aiReleaseMode = "balanced_production",

  boostAnalytics = [],
}) {
  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];

  const effectiveControl = useMemo(() => {
    try {
      return buildEffectiveControl(
        aiControlCenter || DEFAULT_AI_CONTROL,
        aiReleaseMode || "balanced_production"
      );
    } catch (err) {
      console.error("buildEffectiveControl failed:", err);
      return DEFAULT_AI_CONTROL;
    }
  }, [aiControlCenter, aiReleaseMode]);

  const policyAdjusted = useMemo(() => {
    try {
      return applyPolicyLayer({
        optimization: aiOptimization || DEFAULT_AI_OPTIMIZATION,
        economy: aiEconomy || DEFAULT_AI_ECONOMY,
        policy: aiPolicy || DEFAULT_AI_POLICY,
      });
    } catch (err) {
      console.error("applyPolicyLayer failed:", err);
      return {
        optimization: aiOptimization || DEFAULT_AI_OPTIMIZATION,
        economy: aiEconomy || DEFAULT_AI_ECONOMY,
      };
    }
  }, [aiOptimization, aiEconomy, aiPolicy]);

  const effectiveOptimization = useMemo(() => {
    const optimization =
      policyAdjusted?.optimization || aiOptimization || DEFAULT_AI_OPTIMIZATION;
    const policy = aiPolicy || DEFAULT_AI_POLICY;

    return {
      ...optimization,
      aggressiveness: clamp(
        Number(optimization?.aggressiveness || 0.5) +
          Number(effectiveControl?.globalAggressivenessOverride || 0),
        0.2,
        Number(policy?.maxAggressiveness || 0.85)
      ),
      priceBias: clamp(
        Number(optimization?.priceBias || 0) +
          Number(effectiveControl?.globalPriceBiasOverride || 0),
        Number(policy?.minPriceModifier || -2),
        Number(policy?.maxPriceModifier || 2)
      ),
    };
  }, [policyAdjusted, effectiveControl, aiOptimization, aiPolicy]);

  const effectiveEconomy = useMemo(() => {
    const economy =
      policyAdjusted?.economy || aiEconomy || DEFAULT_AI_ECONOMY;
    const policy = aiPolicy || DEFAULT_AI_POLICY;

    return {
      ...economy,
      visibilityMultiplier: clamp(
        Number(economy?.visibilityMultiplier || 1) +
          Number(effectiveControl?.globalVisibilityBiasOverride || 0),
        0.8,
        Number(policy?.maxVisibilityMultiplier || 1.5)
      ),
    };
  }, [policyAdjusted, effectiveControl, aiEconomy, aiPolicy]);

  const boostAnalyticsSummary = useMemo(() => {
    try {
      return summarizeBoostAnalytics(Array.isArray(boostAnalytics) ? boostAnalytics : []);
    } catch (err) {
      console.error("summarizeBoostAnalytics failed:", err);
      return {};
    }
  }, [boostAnalytics]);

  const rankedLeaderboard = useMemo(() => {
    try {
      return [...safeLeaderboard]
        .map((row) => ({
          ...row,
          rankingScore: getRankingScore({
            votes: row?.votes,
            momentum: row?.momentum,
            visibility: row?.visibility,
            boostSpent: row?.boosts_used || row?.boosts || 0,
            selectedType,
            optimization: effectiveOptimization,
          }),
        }))
        .sort((a, b) => {
          if (Number(b.rankingScore || 0) !== Number(a.rankingScore || 0)) {
            return Number(b.rankingScore || 0) - Number(a.rankingScore || 0);
          }
          if (Number(b.votes || 0) !== Number(a.votes || 0)) {
            return Number(b.votes || 0) - Number(a.votes || 0);
          }
          return Number(b.momentum || 0) - Number(a.momentum || 0);
        });
    } catch (err) {
      console.error("rankedLeaderboard failed:", err);
      return safeLeaderboard;
    }
  }, [safeLeaderboard, selectedType, effectiveOptimization]);

  const currentRankNumber = useMemo(() => {
    if (!myPost?.id || !rankedLeaderboard.length) return 0;

    const index = rankedLeaderboard.findIndex((row) => row?.id === myPost.id);
    return index >= 0 ? index + 1 : 0;
  }, [myPost, rankedLeaderboard]);

  const gap = useMemo(() => {
    if (!myPost?.id || !rankedLeaderboard.length) return 0;

    const leader = rankedLeaderboard[0];
    const me = rankedLeaderboard.find((row) => row?.id === myPost.id);

    if (!leader || !me) return 0;

    return Math.max(
      0,
      Math.ceil(
        Number(leader?.rankingScore || 0) - Number(me?.rankingScore || 0)
      )
    );
  }, [myPost, rankedLeaderboard]);

  const aiState = useMemo(() => {
    try {
      return getAiState({
        rank: currentRankNumber,
        gap,
        momentum: Number(myPost?.momentum || 0),
        visibility: Number(myPost?.visibility || 0),
        boostsUsed: Number(myPost?.boosts_used || myPost?.boosts || 0),
        votes: Number(myPost?.votes || 0),
      });
    } catch (err) {
      console.error("getAiState failed:", err);
      return "AI aktiivinen";
    }
  }, [currentRankNumber, gap, myPost]);

  const ai = useAiStack({
    aiProfile: aiProfile || DEFAULT_AI_PROFILE,
    aiOptimization: effectiveOptimization,
    aiEconomy: effectiveEconomy,
    aiPolicy: aiPolicy || DEFAULT_AI_POLICY,
    aiControlCenter: effectiveControl,
    aiAutopilot: aiAutopilot || DEFAULT_AI_AUTOPILOT,
    boostAnalyticsSummary,
    context: {
      gap,
      momentum: Number(myPost?.momentum || 0),
      visibility: Number(myPost?.visibility || 0),
      boostsUsed: Number(myPost?.boosts_used || myPost?.boosts || 0),
      selectedType,
    },
  });

  return {
    ai: ai || {},
    aiState,
    rankedLeaderboard,
    gap,
    currentRankNumber,
    effectiveOptimization,
    effectiveEconomy,
    effectiveControl,
  };
}
