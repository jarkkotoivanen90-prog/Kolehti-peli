export function getVisibilityDecision({
  gap,
  momentum,
  visibility,
  selectedType,
  economy,
}) {
  let score = 0;

  score += Number(momentum || 0) * 0.8;
  score -= Number(gap || 0) * 8;

  if (Number(visibility || 0) <= 2) score += 12;
  if (selectedType === "day") score += 6;

  let visibilityIntent = "hold";
  let visibilityMultiplier = 1;
  let visibilityMessage = "AI pitää näkyvyyden nyt maltillisena.";

  if (score >= 35) {
    visibilityIntent = "spotlight";
    visibilityMultiplier = 1.8 * Number(economy?.visibilityMultiplier || 1);
    visibilityMessage = "Täysi näkyvyys kannattaa juuri nyt.";
  } else if (score >= 20) {
    visibilityIntent = "push";
    visibilityMultiplier = 1.4 * Number(economy?.visibilityMultiplier || 1);
    visibilityMessage = "Nyt kannattaa nostaa näkyvyyttä selvästi.";
  } else if (score >= 10) {
    visibilityIntent = "nudge";
    visibilityMultiplier = 1.15 * Number(economy?.visibilityMultiplier || 1);
    visibilityMessage = "Kevyt näkyvyyden nosto riittää tässä vaiheessa.";
  }

  return {
    score,
    visibilityIntent,
    visibilityMultiplier,
    visibilityMessage,
  };
}
