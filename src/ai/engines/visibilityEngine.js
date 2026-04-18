export function getVisibilityDecision({
  gap,
  momentum,
  visibility,
  selectedType,
  economy,
}) {
  const trace = [];
  let score = 0;

  const momentumEffect = Number(momentum || 0) * 0.8;
  score += momentumEffect;
  trace.push({
    label: "momentum",
    value: Number(momentum || 0),
    effect: momentumEffect,
  });

  const gapEffect = Number(gap || 0) * -8;
  score += gapEffect;
  trace.push({
    label: "gap",
    value: Number(gap || 0),
    effect: gapEffect,
  });

  if (Number(visibility || 0) <= 2) {
    score += 12;
    trace.push({
      label: "lowVisibilityBonus",
      value: Number(visibility || 0),
      effect: 12,
    });
  }

  if (selectedType === "day") {
    score += 6;
    trace.push({
      label: "dayDrawBonus",
      value: selectedType,
      effect: 6,
    });
  }

  let visibilityIntent = "hold";
  let visibilityMultiplier = 1;
  let visibilityMessage = "AI pitää näkyvyyden nyt maltillisena.";

  if (score >= 35) {
    visibilityIntent = "spotlight";
    visibilityMultiplier = 1.8 * Number(economy?.visibilityMultiplier || 1);
    visibilityMessage =
