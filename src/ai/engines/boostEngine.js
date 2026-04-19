function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getBoostDecision({
  gap = 0,
  momentum = 0,
  visibility = 0,
  boostsUsed = 0,
  selectedType = "week",
  profile = {},
  optimization = {},
  economy = {},
  getBoostPrice,
  drawTypes = [],
}) {
  const reactsToLoss = Number(profile?.reactsToLoss || 0.5);
  const reactsToAlmostWin = Number(profile?.reactsToAlmostWin || 0.5);
  const reactsToMomentum = Number(profile?.reactsToMomentum || 0.5);
  const paysInCriticalMoments = Number(profile?.paysInCriticalMoments || 0.5);
  const ignoresOffers = Number(profile?.ignoresOffers || 0.5);

  const aggressiveness = Number(optimization?.aggressiveness || 0.5);
  const priceBias = Number(optimization?.priceBias || 0);

  const boostStrengthMultiplier = Number(economy?.boostStrengthMultiplier || 1);
  const visibilityMultiplier = Number(economy?.visibilityMultiplier || 1);
  const urgencyBias = Number(economy?.urgencyBias || 0);

  const drawConfig =
    drawTypes.find((item) => item.key === selectedType) || { boostLimit: 4 };

  const boostLimit = Number(drawConfig.boostLimit || 4);

  const baseScore =
    gap * (8 + reactsToLoss * 8) +
    (gap <= 2 ? 12 * reactsToAlmostWin : 0) +
    momentum * (0.6 + reactsToMomentum * 0.8) +
    visibility * 0.35 +
    paysInCriticalMoments * 10 -
    ignoresOffers * 8 +
    aggressiveness * 18 +
    urgencyBias;

  const score = Math.round(clamp(baseScore, 0, 100));

  let urgency = "low";
  if (score >= Number(optimization?.highThreshold || 65)) {
    urgency = "high";
  } else if (score >= Number(optimization?.mediumThreshold || 42)) {
    urgency = "medium";
  }

  const showBoost = score >= Number(optimization?.softThreshold || 25);

  const rawPrice = typeof getBoostPrice === "function" ? getBoostPrice(boostsUsed) : 1;

  const recommendedPrice = Math.max(
    1,
    Math.round((Number(rawPrice || 1) + priceBias) * 100) / 100
  );

  const estimatedMomentumGain = Math.max(
    1,
    Math.round((2 + momentum * 0.08 + score * 0.03) * boostStrengthMultiplier)
  );

  const estimatedVisibilityGain = Math.max(
    1,
    Math.round((1 + visibility * 0.05 + score * 0.02) * visibilityMultiplier)
  );

  const message = showBoost
    ? urgency === "high"
      ? "Nyt on vahva boost-ikkuna."
      : urgency === "medium"
      ? "Boost voi auttaa nousemaan."
      : "Kevyt boost kannattaa harkita."
    : "Tilanne ei vielä vaadi boostia.";

  const trace = [
    { label: "gap", value: gap },
    { label: "momentum", value: momentum },
    { label: "visibility", value: visibility },
    { label: "boostsUsed", value: boostsUsed },
    { label: "aggressiveness", value: aggressiveness },
    { label: "priceBias", value: priceBias },
    { label: "score", value: score },
    { label: "urgency", value: urgency },
    { label: "recommendedPrice", value: recommendedPrice },
  ];

  return {
    score,
    urgency,
    showBoost,
    recommendedPrice,
    estimatedMomentumGain,
    estimatedVisibilityGain,
    boostLimit,
    message,
    trace,
  };
}
