import { useMemo } from "react";
import { useAiStack } from "./useAiStack";

import { summarizeBoostAnalytics } from "../ai/analytics/analyticsEngine";
import { buildEffectiveControl } from "../ai/control/controlEngine";
import { applyPolicyLayer } from "../ai/policy/policyEngine";
import { getRankingScore } from "../ai/ranking/rankingEngine";
import { getAiState } from "../ai/state/aiState";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function defaultBoostPrice(usedCount = 0) {
  const prices = [1, 2, 4, 7, 11, 16];
  return prices[Math.min(usedCount, prices.length - 1)];
}

export function useAiSystem({
  myPost,
  leaderboard = [],
  boostAnalytics = [],
  selectedType = "week",

  aiProfile,
  aiOptimization,
  aiEconomy,
  aiPolicy,
  aiControlCenter,
  aiAutopilot,
  aiReleaseMode = "balanced_production",

  drawTypes = [],
  getBoostPrice = defaultBoostPrice,
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
      drawTypes,
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

  return {
    ai,
    aiState,

    rankedLeaderboard,
    currentRankNumber,
    rank,
    gap,

    boostDecision,
    visibilityDecision,
    autopilotDecision,
    runtime,

    effectiveControl,
    policyAdjusted,
    effectiveOptimization,
    effectiveEconomy,
    boostAnalyticsSummary,

    aiDebugInputs,
    aiDebugModels,
  };
}
