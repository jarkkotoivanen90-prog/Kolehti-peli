import { useMemo } from "react";

import { getBoostDecision } from "../ai/engines/boostEngine";
import { getVisibilityDecision } from "../ai/engines/visibilityEngine";
import { getAutopilotDecision } from "../ai/engines/autopilotEngine";
import { getRuntimeState } from "../ai/engines/runtimeEngine";
import { safeRun } from "../ai/utils/aiGuard";

export function useAiStack({
  aiProfile,
  aiOptimization,
  aiEconomy,
  aiPolicy,
  aiControlCenter,
  aiAutopilot,
  boostAnalyticsSummary,
  context,
  helpers,
}) {
  return useMemo(() => {
    const safeContext = context || {};
    const safeHelpers = helpers || {};

    const boost = safeRun(
      "boostEngine",
      () =>
        getBoostDecision({
          gap: Number(safeContext.gap || 0),
          momentum: Number(safeContext.momentum || 0),
          visibility: Number(safeContext.visibility || 0),
          boostsUsed: Number(safeContext.boostsUsed || 0),
          selectedType: safeContext.selectedType || "week",
          profile: aiProfile || {},
          optimization: aiOptimization || {},
          economy: aiEconomy || {},
          getBoostPrice: safeHelpers.getBoostPrice,
          drawTypes: safeHelpers.drawTypes || [],
        }),
      {
        score: 0,
        urgency: "low",
        showBoost: false,
        recommendedPrice: 1,
        trace: [],
      }
    );

    const visibility = safeRun(
      "visibilityEngine",
      () =>
        getVisibilityDecision({
          gap: Number(safeContext.gap || 0),
          momentum: Number(safeContext.momentum || 0),
          visibility: Number(safeContext.visibility || 0),
          selectedType: safeContext.selectedType || "week",
          economy: aiEconomy || {},
        }),
      {
        score: 0,
        visibilityIntent: "hold",
        visibilityMultiplier: 1,
      }
    );

    const autopilot = safeRun(
      "autopilotEngine",
      () =>
        getAutopilotDecision({
          summary: boostAnalyticsSummary || {},
          controlMode: aiControlCenter?.mode || "balanced",
          autopilotModel: aiAutopilot || {},
          policy: aiPolicy || {},
        }),
      {
        recommendedMode: "balanced",
        automationAction: "hold",
        autopilotConfidence: 0.5,
      }
    );

    const runtime = safeRun(
      "runtimeEngine",
      () =>
        getRuntimeState({
          summary: boostAnalyticsSummary || {},
          optimization: aiOptimization || {},
          economy: aiEconomy || {},
          controlMode: aiControlCenter?.mode || "balanced",
        }),
      {
        health: "unknown",
        recommendedAction: "hold",
      }
    );

    return {
      boost,
      visibility,
      autopilot,
      runtime,
    };
  }, [
    aiProfile,
    aiOptimization,
    aiEconomy,
    aiPolicy,
    aiControlCenter,
    aiAutopilot,
    boostAnalyticsSummary,
    context,
    helpers,
  ]);
}
