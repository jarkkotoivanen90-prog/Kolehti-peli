export function getVisibilityDecision({
  gap = 0,
  momentum = 0,
  visibility = 0,
  selectedType = "default",
  economy = {},
}) {
  const score = gap + momentum + visibility;

  let visibilityIntent = "hold";
  let visibilityMultiplier = 1;

  if (score > 50) {
    visibilityIntent = "boost";
    visibilityMultiplier = 1.5;
  }

  if (score < -50) {
    visibilityIntent = "reduce";
    visibilityMultiplier = 0.5;
  }

  return {
    score,
    visibilityIntent,
    visibilityMultiplier,
  };
}
