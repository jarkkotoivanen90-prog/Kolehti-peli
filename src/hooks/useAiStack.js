import { useMemo } from "react";
import { runAiOrchestrator } from "../ai/orchestrator";

export function useAiStack({
  aiControlCenter,
  aiOptimization,
  aiEconomy,
  aiPolicy,
  aiAutopilot,
  boostAnalyticsSummary,
  context,
}) {
  const ai = useMemo(() => {
    return runAiOrchestrator({
      raw: {
        controlCenter: aiControlCenter,
        optimization: aiOptimization,
        economy: aiEconomy,
        policy: aiPolicy,
        autopilot: aiAutopilot,
        analytics: boostAnalyticsSummary,
        context,
      },
    });
  }, [
    aiControlCenter,
    aiOptimization,
    aiEconomy,
    aiPolicy,
    aiAutopilot,
    boostAnalyticsSummary,
    context,
  ]);

  return ai;
}
