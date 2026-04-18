export function getAutopilotDecision({ summary, controlMode }) {
  const ignoreRate = Number(summary?.ignoreRate || 0);
  const purchaseRate = Number(summary?.purchaseRate || 0);

  if (ignoreRate >= 65) {
    return {
      recommendedMode: "safe",
      automationAction: "tighten",
      autopilotReason: "Ignore rate on liian korkea.",
      autopilotConfidence: 0.85,
    };
  }

  if (purchaseRate >= 18 && ignoreRate <= 35) {
    return {
      recommendedMode: "growth",
      automationAction: "expand",
      autopilotReason: "Konversio on vahva ja ignore matala.",
      autopilotConfidence: 0.8,
    };
  }

  return {
    recommendedMode: controlMode || "balanced",
    automationAction: "hold",
    autopilotReason: "Data ei tue vielä suurempaa muutosta.",
    autopilotConfidence: 0.55,
  };
}
