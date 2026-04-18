export function getBoostDecision({
  gap,
  momentum,
  visibility,
  boostsUsed,
  selectedType,
  profile,
  optimization,
  economy,
  getBoostPrice,
  drawTypes,
}) {
  const draw = drawTypes.find((d) => d.key === selectedType) || drawTypes[1];

  let score = 0;
  score += Number(momentum || 0) * 0.7;
  score += Number(visibility || 0) * 0.25;
  score -= Number(gap || 0) * 10;

  score += Number(profile?.reactsToAlmostWin || 0.5) * 10;
  score += Number(profile?.reactsToMomentum || 0.5) * 8;
  score += Number(profile?.paysInCriticalMoments || 0.5) * 12;
  score -= Number(profile?.ignoresOffers || 0.5) * 10;

  score += Number(optimization?.aggressiveness || 0.5) * 12;
  score += Number(economy?.urgencyBias || 0);
  score *= Number(economy?.fairnessGuard || 1);

  let urgency = "low";
  let showBoost = false;
  let message = "AI suosittelee vielä odottamaan.";

  if (score >= Number(optimization?.highThreshold || 65)) {
    urgency = "high";
    showBoost = true;
    message = "Nyt on paras hetki boostata.";
  } else if (score >= Number(optimization?.mediumThreshold || 42)) {
    urgency = "medium";
    showBoost = true;
    message = "Boosti voi auttaa juuri tässä hetkessä.";
  } else if (score >= Number(optimization?.softThreshold || 25)) {
    urgency = "soft";
    showBoost = true;
    message = "Voit boostata, mutta odottaminenkin on vielä vaihtoehto.";
  }

  let price =
    Number(getBoostPrice(boostsUsed || 0)) +
    Number(optimization?.priceBias || 0) +
    Number(economy?.priceModifier || 0);

  price = Math.max(1, Math.min(Math.round(price), 20));

  return {
    score,
    urgency,
    showBoost,
    boostLimit: draw.boostLimit,
    message,
    recommendedPrice: price,
    estimatedMomentumGain: Math.round(
      12 * Number(economy?.boostStrengthMultiplier || 1)
    ),
    estimatedVisibilityGain: Math.round(
      10 * Number(economy?.visibilityMultiplier || 1)
    ),
  };
}
