import { runBoostEngine } from "../ai/engines/boostEngine";
import { runVisibilityEngine } from "../ai/engines/visibilityEngine";
import { runAutopilotEngine } from "../ai/engines/autopilotEngine";
import { runRuntimeEngine } from "../ai/engines/runtimeEngine";
import { applyPolicy } from "../ai/policy/policyEngine";

export function useAiStack({
  inputs,
  aiOptimization,
  aiEconomy,
  aiPolicy,
}) {
  const boost = runBoostEngine(inputs, aiOptimization);
  const visibility = runVisibilityEngine(inputs, aiEconomy);
  const autopilot = runAutopilotEngine(inputs, aiOptimization);
  const runtime = runRuntimeEngine(inputs);

  const result = {
    ...boost,
    ...visibility,
    ...autopilot,
    ...runtime,
  };

  return applyPolicy(result, aiPolicy);
}
