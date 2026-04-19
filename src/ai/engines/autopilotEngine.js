export function getAutopilotDecision({
  summary = {},
  controlMode = "balanced",
  autopilotModel = {},
  policy = {},
}) {
  const purchaseRate = Number(summary?.purchaseRate || 0);
  const ignoreRate = Number(summary?.ignoreRate || 0);
  const clickRate = Number(summary?.clickRate || 0);

  const minConfidence = Number(autopilotModel?.minConfidence || 0.5);
  const policyBlocksAutomation = Boolean(policy?.disableAutopilot);

  let autopilotConfidence =
    purchaseRate * 0.5 +
    clickRate * 0.3 +
    (1 - ignoreRate) * 0.2;

  autopilotConfidence = Math.max(
    0,
    Math.min(1, Number(autopilotConfidence.toFixed(2)))
  );

  let recommendedMode = controlMode || "balanced";
  let automationAction = "hold";

  if (policyBlocksAutomation) {
    automationAction = "blocked";
  } else if (autopilotConfidence >= minConfidence) {
    automationAction = "assist";
  }

  const trace = [
    { label: "purchaseRate", value: purchaseRate },
    { label: "ignoreRate", value: ignoreRate },
    { label: "clickRate", value: clickRate },
    { label: "controlMode", value: controlMode },
    { label: "minConfidence", value: minConfidence },
    { label: "policyBlocksAutomation", value: policyBlocksAutomation },
    { label: "autopilotConfidence", value: autopilotConfidence },
    { label: "automationAction", value: automationAction },
  ];

  return {
    recommendedMode,
    automationAction,
    autopilotConfidence,
    trace,
  };
}
