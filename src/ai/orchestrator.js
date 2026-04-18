import { getBoostDecision } from "./engines/boostEngine";
import { getVisibilityDecision } from "./engines/visibilityEngine";
import { getRanking } from "./engines/rankingEngine";
import { applyPolicyLayer } from "./engines/policyEngine";
import { getAutopilotDecision } from "./engines/autopilotEngine";
import { getRuntimeState } from "./engines/runtimeEngine";

export function runAiOrchestrator({
  raw,
}) {
  // 1. base models
  let {
    controlCenter,
    optimization,
    economy,
    policy,
    autopilot,
    analytics,
    context,
  } = raw;

  // 2. boost
  const boost = getBoostDecision({
    optimization,
    economy,
    context,
  });

  // 3. visibility
  const visibility = getVisibilityDecision({
    economy,
    context,
  });

  // 4. ranking
  const ranking = getRanking({
    context,
    visibility,
  });

  // 5. autopilot
  const autopilotDecision = getAutopilotDecision({
    analytics,
    controlCenter,
  });

  // 6. policy clamp
  const safeModels = applyPolicyLayer({
    optimization,
    economy,
    policy,
    autopilot: autopilotDecision,
  });

  // 7. runtime monitor
  const runtime = getRuntimeState({
    analytics,
    models: safeModels,
    controlCenter,
  });

  return {
    decisions: {
      boost,
      visibility,
      ranking,
    },
    models: safeModels,
    autopilot: autopilotDecision,
    runtime,
  };
}
