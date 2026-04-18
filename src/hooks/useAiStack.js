import { useMemo } from "react";
import { runAiOrchestrator } from "../ai/orchestrator";

export function useAiStack({
  aiProfile,
  aiOptimization,
  aiEconomy,
  aiControlCenter,
  boostAnalyticsSummary,
  context,
  helpers,
}) {
  return useMemo(() => {
    return runAiOrchestrator({
      profile: aiProfile,
      optimization: aiOptimization,
      economy: aiEconomy,
      control: aiControlCenter,
      analytics: boostAnalyticsSummary,
      context,
      helpers,
    });
  }, [
    aiProfile,
    aiOptimization,
    aiEconomy,
    aiControlCenter,
    boostAnalyticsSummary,
    context,
    helpers,
  ]);
}
