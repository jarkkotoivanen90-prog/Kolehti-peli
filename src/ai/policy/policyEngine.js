export function applyPolicyLayer({ optimization, economy, policy }) {
  return {
    optimization: {
      ...optimization,
      aggressiveness: Math.min(
        optimization.aggressiveness,
        policy.maxAggressiveness
      ),
      priceBias: Math.max(
        policy.minPriceModifier,
        Math.min(optimization.priceBias, policy.maxPriceModifier)
      ),
    },
    economy: {
      ...economy,
      visibilityMultiplier: Math.min(
        economy.visibilityMultiplier,
        policy.maxVisibilityMultiplier
      ),
      fairnessGuard: Math.max(economy.fairnessGuard, policy.minFairnessGuard),
    },
  };
}
