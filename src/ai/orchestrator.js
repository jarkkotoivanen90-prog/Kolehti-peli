import { getBoostDecision } from "./engines/boostEngine";
import { getVisibilityDecision } from "./engines/visibilityEngine";
import { getAutopilotDecision } from "./engines/autopilotEngine";
import { getRuntimeState } from "./engines/runtimeEngine";

export function runAiOrchestrator({
  profile,
  optimization,
  economy,
  control,
  analytics,
  context,
  helpers,
}) {
  const boost = getBoostDecision({
    gap: context.gap,
    momentum: context.momentum,
    visibility: context.visibility,
    boostsUsed: context.boostsUsed,
    selectedType: context.selectedType,
    profile,
    optimization,
    economy,
    getBoostPrice: helpers.getBoostPrice,
    drawTypes: helpers.drawTypes,
  });

  const visibility = getVisibilityDecision({
    gap: context.gap,
    momentum: context.momentum,
    visibility: context.visibility,
    selectedType: context.selectedType,
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
