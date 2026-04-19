import { useMemo } from "react";

import { useAiStack } from "./useAiStack";
import { summarizeBoostAnalytics } from "../ai/analytics/analyticsEngine";
import { buildEffectiveControl } from "../ai/control/controlEngine";
import { applyPolicyLayer } from "../ai/policy/policyEngine";
import { getRankingScore } from "../ai/ranking/rankingEngine";
import { getAiState } from "../ai/state/aiState";

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

const DRAW_TYPES = [
  { key: "day", label: "Päivä", boostLimit: 2 },
  { key: "week", label: "Viikko", boostLimit: 4 },
  { key: "month", label: "Kuukausi", boostLimit: 6 },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getBoostPrice(usedCount = 0) {
  const prices = [1, 2, 4, 7, 11, 16];
  return prices[Math.min(usedCount, prices.length - 1)];
}

export function useAiSystem({
  myPost,
  leaderboard,
  selectedType,
  aiProfile = DEFAULT_AI_PROFILE,
  aiOptimization = DEFAULT_AI_OPTIMIZATION,
  aiEconomy = DEFAULT_AI_ECONOMY,
  aiPolicy = DEFAULT_AI_POLICY,
  aiControlCenter = DEFAULT_AI_CONTROL,
  aiAutopilot = DEFAULT_AI_AUTOPILOT,
  aiReleaseMode = "balanced_production",
  boostAnalytics = [],
}) {
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

  return {
    ai,
    aiState,
    rankedLeaderboard,
    rank,
    gap,
    boostDecision: ai?.boost || {},
    visibilityDecision: ai?.visibility || {},
    autopilotDecision: ai?.autopilot || {},
    runtime: ai?.runtime || {},
    effectiveOptimization,
    effectiveEconomy,
    effectiveControl,
  };
}
