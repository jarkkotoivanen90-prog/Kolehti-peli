import { useMemo } from "react";

import { getBoostDecision } from "../ai/engines/boostEngine";
import { getVisibilityDecision } from "../ai/engines/visibilityEngine";
import { getAutopilotDecision } from "../ai/engines/autopilotEngine";
import { getRuntimeState } from "../ai/engines/runtimeEngine";

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

    const boost = getBoostDecision({
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
    });

    const visibility = getVisibilityDecision({
      gap: Number(safeContext.gap || 0),
      momentum: Number(safeContext.momentum || 0),
      visibility: Number(safeContext.visibility || 0),
      selectedType: safeContext.selectedType || "week",
      economy: aiEconomy || {},
    });

    const autopilot = getAutopilotDecision({
      summary: boostAnalyticsSummary || {},
      controlMode: aiControlCenter?.mode || "balanced",
      autopilotModel: aiAutopilot || {},
      policy: aiPolicy || {},
    });

    const runtime = getRuntimeState({
      summary: boostAnalyticsSummary || {},
      optimization: aiOptimization || {},
      economy: aiEconomy || {},
      controlMode: aiControlCenter?.mode || "balanced",
    });

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
