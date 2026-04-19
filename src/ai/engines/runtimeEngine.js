export function getRuntimeState({
  summary = {},
  optimization = {},
  economy = {},
  controlMode = "balanced",
}) {
  const trace = [];

  const ignoreRate = Number(summary?.ignoreRate || 0);
  const purchaseRate = Number(summary?.purchaseRate || 0);
  const clickRate = Number(summary?.clickRate || 0);

  trace.push({ label: "ignoreRate", value: ignoreRate });
  trace.push({ label: "purchaseRate", value: purchaseRate });
  trace.push({ label: "clickRate", value: clickRate });

  const aggressiveness = Number(optimization?.aggressiveness || 0.5);
  const budgetPressure = Number(economy?.budgetPressure || 0);

  trace.push({ label: "aggressiveness", value: aggressiveness });
  trace.push({ label: "budgetPressure", value: budgetPressure });
  trace.push({ label: "controlMode", value: controlMode });

  let health = "healthy";
  let recommendedAction = "hold";

  if (ignoreRate > 0.7 || budgetPressure > 0.8) {
    health = "warning";
    recommendedAction = "slow_down";
  }

  if (purchaseRate < 0.1 && clickRate < 0.15) {
    health = "weak";
    recommendedAction = "recalibrate";
  }

  if (purchaseRate > 0.35 && clickRate > 0.3 && ignoreRate < 0.4) {
    health = "strong";
    recommendedAction = "scale";
  }

  trace.push({ label: "health", value: health });
  trace.push({ label: "recommendedAction", value: recommendedAction });

  return {
    health,
    recommendedAction,
    trace,
  };
}
