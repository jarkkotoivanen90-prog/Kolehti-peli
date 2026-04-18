const autopilot = safeRun(
  "autopilotEngine",
  () =>
    getAutopilotDecision({
      summary: boostAnalyticsSummary || {},
      controlMode: aiControlCenter?.mode || "balanced",
      autopilotModel: aiAutopilot || {},
      policy: aiPolicy || {},
    }),
  {
    recommendedMode: "balanced",
    automationAction: "hold",
    autopilotConfidence: 0.5,
  }
);
