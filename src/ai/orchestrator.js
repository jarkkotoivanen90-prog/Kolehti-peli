import { getBoostDecision } from "./engines/boostEngine";
import { getVisibilityDecision } from "./engines/visibilityEngine";
import { getAutopilotDecision } from "./engines/autopilotEngine";
import { getRuntimeState } from "./engines/runtimeEngine";

export function runAiOrchestrator({
  profile,
  optimization,
  economy,
  policy,
  control,
  analytics,
  context,
}) {
  const boost = getBoostDecision({
    ...context,
    profile,
    optimization,
    economy,
  });

  const visibility = getVisibilityDecision({
    ...context,
    economy,
  });

  const autopilot = getAutopilotDecision({
    summary: analytics,
    controlMode: control.mode,
  });

  const runtime = getRuntimeState({
    summary: analytics,
    optimization,
    economy,
    controlMode: control.mode,
  });

  return {
    boost,
    visibility,
    autopilot,
    runtime,
  };
}
