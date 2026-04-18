export function getRuntimeState({
  summary,
  optimization,
  economy,
  controlMode,
}) {
  const trace = [];

  const ignoreRate = Number(summary?.ignoreRate || 0);
  const purchaseRate = Number(summary?.purchaseRate || 0);
  const clickRate = Number(summary?.clickRate || 0);

  trace.push({ label: "ignoreRate", value: ignoreRate, effect: 0 });
  trace.push({ label: "purchaseRate", value: purchaseRate, effect: 0 });
  trace.push({ label: "clickRate", value: clickRate, effect: 0 });
  trace.push({
    label: "aggressiveness",
    value: Number(optimization?.aggressiveness || 0.5),
    effect: 0,
  });
  trace.push({
    label: "fairnessGuard",
    value: Number(economy?.fairnessGuard || 1),
    effect: 0,
  });
  trace.push({
    label: "controlMode",
    value: controlMode,
    effect: 0,
  });

  let health = "stable";
  let lastAlert = "";
  let recommendedAction = "hold";

  if (ignoreRate >= 70) {
    health = "critical";
    lastAlert = "Ignore rate erittäin korkea.";
    recommendedAction = "freeze";
    trace.push({ label: "rule", value: "ignoreRate >= 70", effect: 1 });
  } else if (purchaseRate <= 5 && clickRate <= 10 && ignoreRate >= 55) {
    health = "risky";
    lastAlert = "Konversio heikko ja ignore korkea.";
    recommendedAction = "tighten";
    trace.push({
      label: "rule",
      value: "purchaseRate <= 5 && clickRate <= 10 && ignoreRate >= 55",
      effect: 1,
    });
  } else if (
    Number(optimization?.aggressiveness || 0.5) >= 0.82 &&
    Number(economy?.fairnessGuard || 1) <= 0.85
  ) {
    health = "risky";
    lastAlert = "AI liian aggressiivinen fairnessiin nähden.";
    recommendedAction = "tighten";
    trace.push({
      label: "rule",
      value: "aggressiveness high + fairness low",
      effect: 1,
    });
  } else if (
    controlMode === "growth" &&
    purchaseRate >= 15 &&
    ignoreRate <= 35
  ) {
    health = "strong";
    lastAlert = "Growth mode toimii hyvin.";
    trace.push({
      label: "rule",
      value: "growth success",
      effect: 1,
    });
  } else {
    trace.push({
      label: "rule",
      value: "stable fallback",
      effect: 1,
    });
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
    trace,
  };
}
