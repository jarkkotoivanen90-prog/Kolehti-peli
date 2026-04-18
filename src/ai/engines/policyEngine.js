function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function applyPolicyLayer({
  optimization,
  economy,
  policy,
  autopilot,
}) {
  return {
    aiOptimization: {
      ...optimization,
      aggressiveness: clamp(
        optimization.aggressiveness,
        0.2,
        policy.maxAggressiveness
      ),
      priceBias: clamp(
        optimization.priceBias,
        policy.minPriceModifier,
        policy.maxPriceModifier
      ),
    },
    aiEconomy: {
      ...economy,
      visibilityMultiplier: clamp(
        economy.visibilityMultiplier,
        0.8,
        policy.maxVisibilityMultiplier
      ),
    },
    aiAutopilot: {
      ...autopilot,
      recommendedMode:
        autopilot.recommendedMode === "growth" &&
        !policy.allowGrowthMode
          ? "balanced"
          : autopilot.recommendedMode,
    },
  };
}
