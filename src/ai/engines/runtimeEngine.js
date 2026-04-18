export function getRuntimeState({
  summary,
  optimization,
  economy,
  controlMode,
}) {
  const ignoreRate = Number(summary?.ignoreRate || 0);
  const purchaseRate = Number(summary?.purchaseRate || 0);
  const clickRate = Number(summary?.clickRate || 0);

  let health = "stable";
  let lastAlert = "";
  let recommendedAction = "hold";

  if (ignoreRate >= 70) {
    health = "critical";
    lastAlert = "Ignore rate erittäin korkea.";
    recommendedAction = "freeze";
  } else if (purchaseRate <= 5 && clickRate <= 10 && ignoreRate >= 55) {
    health = "risky";
    lastAlert = "Konversio heikko ja ignore korkea.";
    recommendedAction = "tighten";
  } else if (
    Number(optimization?.aggressiveness || 0.5) >= 0.82 &&
    Number(economy?.fairnessGuard || 1) <= 0.85
  ) {
    health = "risky";
    lastAlert = "AI liian aggressiivinen fairnessiin nähden.";
    recommendedAction = "tighten";
  } else if (
    controlMode === "growth" &&
    purchaseRate >= 15 &&
    ignoreRate <= 35
  ) {
    health = "strong";
    lastAlert = "Growth mode toimii hyvin.";
  }

  return {
    health,
    lastAlert,
    recommendedAction,
    ignoreRate,
    purchaseRate,
    clickRate,
    aggressiveness: Number(optimization?.aggressiveness || 0.5),
    priceBias: Number(optimization?.priceBias || 0),
    fairnessGuard: Number(economy?.fairnessGuard || 1),
    growthModeActive: controlMode === "growth",
  };
}
