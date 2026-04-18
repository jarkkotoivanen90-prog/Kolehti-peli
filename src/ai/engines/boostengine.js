export function getBoostDecision({ optimization, economy, context }) {
  let score = 0;

  const gap = context.gap || 0;
  const momentum = context.momentum || 0;

  score += momentum * 0.5;
  score -= gap * 2;

  score += (optimization?.aggressiveness || 0.5) * 10;

  let urgency = "low";
  if (score > 15) urgency = "high";
  else if (score > 8) urgency = "medium";

  let price = 2 + (optimization?.priceBias || 0);

  return {
    score,
    urgency,
    recommendedPrice: Math.max(1, Math.min(price, 10)),
  };
}
