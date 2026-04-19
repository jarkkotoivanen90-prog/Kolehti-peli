export function getVisibilityDecision({
  gap = 0,
  momentum = 0,
  visibility = 0,
  selectedType = "week",
  economy = {},
}) {
  const visibilityMultiplier = Number(economy?.visibilityMultiplier || 1);
  const urgencyBias = Number(economy?.urgencyBias || 0);

  let score =
    Number(gap || 0) * 6 +
    Number(momentum || 0) * 0.4 +
    Number(visibility || 0) * 0.25 +
    urgencyBias;

  score = Math.max(0, Math.round(score));

  let visibilityIntent = "hold";

  if (score >= 60) {
    visibilityIntent = "push";
  } else if (score >= 30) {
    visibilityIntent = "watch";
  }

  const trace = [
    { label: "gap", value: Number(gap || 0) },
    { label: "momentum", value: Number(momentum || 0) },
    { label: "visibility", value: Number(visibility || 0) },
    { label: "selectedType", value: selectedType },
    { label: "visibilityMultiplier", value: visibilityMultiplier },
    { label: "score", value: score },
    { label: "visibilityIntent", value: visibilityIntent },
  ];

  return {
    score,
    visibilityIntent,
    visibilityMultiplier,
    trace,
  };
}
