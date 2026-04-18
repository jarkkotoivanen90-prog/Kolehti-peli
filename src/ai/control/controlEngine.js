export function buildEffectiveControl(control) {
  if (control.overrideMode === "safe") {
    return {
      ...control,
      mode: "safe",
      globalAggressivenessOverride: -0.3,
      globalPriceBiasOverride: -2,
      globalVisibilityBiasOverride: -0.2,
    };
  }

  if (control.overrideMode === "growth") {
    return {
      ...control,
      mode: "growth",
      globalAggressivenessOverride: 0.2,
      globalPriceBiasOverride: 2,
      globalVisibilityBiasOverride: 0.3,
    };
  }

  return control;
}
