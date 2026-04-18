export function getAutopilotDecision({ summary, controlMode }) {
  const trace = [];
  const ignoreRate = Number(summary?.ignoreRate || 0);
  const purchaseRate = Number(summary?.purchaseRate || 0);

  trace.push({
    label: "ignoreRate",
    value: ignoreRate,
    effect: 0,
  });

  trace.push({
    label: "purchaseRate",
    value: purchaseRate,
    effect: 0,
  });

  if (ignoreRate >= 65) {
    trace.push({
      label: "rule",
      value: "ignoreRate >= 65",
      effect: 1,
    });

    return {
      recommendedMode: "safe",
      automationAction: "tighten",
      autopilotReason: "Ignore rate on liian korkea.",
      autopilotConfidence: 0.85,
      trace,
    };
  }

  if (purchaseRate >= 18 && ignoreRate <= 35) {
    trace.push({
      label: "rule",
      value: "purchaseRate >= 18 && ignoreRate <= 35",
      effect: 1,
    });

    return {
      recommendedMode: "growth",
      automationAction: "expand",
      autopilotReason: "Konversio on vahva ja ignore matala.",
      autopilotConfidence: 0.8,
      trace,
    };
  }

  trace.push({
    label: "rule",
    value: "fallback",
    effect: 1,
  });

  return {
    recommendedMode: controlMode || "balanced",
    automationAction: "hold",
    autopilotReason: "Data ei tue vielä suurempaa muutosta.",
    autopilotConfidence: 0.55,
    trace,
  };
}
