import { useMemo } from "react";
import { runAiOrchestrator } from "../ai/orchestrator";

export function useAiStack({
  aiProfile,
  aiOptimization,
  aiEconomy,
  aiPolicy,
  aiControlCenter,
  boostAnalyticsSummary,
  context,
}) {
  return useMemo(() => {
    return runAiOrchestrator({
      profile: aiProfile,
      optimization: aiOptimization,
      economy: aiEconomy,
      policy: aiPolicy,
      control: aiControlCenter,
      analytics: boostAnalyticsSummary,
      context,
    });
  }, [
    aiProfile,
    aiOptimization,
    aiEconomy,
    aiPolicy,
    aiControlCenter,
    boostAnalyticsSummary,
    context,
  ]);
}
