import { useMemo } from "react";

import { summarizeBoostAnalytics } from "../ai/analytics/analyticsEngine";
import { buildEffectiveControl } from "../ai/control/controlEngine";
import { applyPolicyLayer } from "../ai/policy/policyEngine";
import { getRankingScore } from "../ai/ranking/rankingEngine";
import { getAiState } from "../ai/state/aiState";

import { useAiStack } from "./useAiStack";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function useAiSystem({
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
}) {
  // --- CONTROL ---
  const effectiveControl = useMemo(() => {
    return buildEffectiveControl(aiControlCenter, aiReleaseMode);
  }, [aiControlCenter, aiReleaseMode]);

  // --- POLICY ---
  const policyAdjusted = useMemo(() => {
    return applyPolicyLayer({
      optimization: aiOptimization,
      economy: aiEconomy,
      policy: aiPolicy,
    });
  }, [aiOptimization, aiEconomy, aiPolicy]);

  // --- OPTIMIZATION ---
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

  // --- ECONOMY ---
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

  // --- ANALYTICS ---
  const boostAnalyticsSummary = useMemo(() => {
    return summarizeBoostAnalytics(boostAnalytics);
  }, [boostAnalytics]);

  // --- RANKING ---
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

  // --- RANK ---
  const currentRankNumber = useMemo(() => {
    if (!myPost || !rankedLeaderboard.length) return 0;
    return rankedLeaderboard.findIndex((r) => r.id === myPost.id) + 1 || 0;
  }, [myPost, rankedLeaderboard]);

  const gap = useMemo(() => {
    if (!myPost || !rankedLeaderboard.length) return 0;

    const leader = rankedLeaderboard[0];
    const me = rankedLeaderboard.find((r) => r.id === myPost.id);

    if (!leader || !me) return 0;

    return Math.max(
      0,
      Math.ceil(
        Number(leader.rankingScore || 0) - Number(me.rankingScore || 0)
      )
    );
  }, [myPost, rankedLeaderboard]);

  // --- AI STATE ---
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

  // --- AI STACK ---
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
  });

  return {
    ai,
    aiState,
    rankedLeaderboard,
    gap,
    currentRankNumber,
    effectiveOptimization,
    effectiveEconomy,
    effectiveControl,
  };
}
