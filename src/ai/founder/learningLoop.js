function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((sum, n) => sum + Number(n || 0), 0) / arr.length;
}

export function buildLearningLoop({
  traceRows = [],
  aiOptimization,
  aiEconomy,
  aiPolicy,
}) {
  const purchases = traceRows.filter(
    (row) => row?.inputs?.eventType === "boost_purchased"
  );

  const ignores = traceRows.filter(
    (row) => row?.inputs?.eventType === "boost_ignored"
  );

  const purchaseScores = purchases.map((r) => Number(r?.outputs?.score || 0));
  const ignoreScores = ignores.map((r) => Number(r?.outputs?.score || 0));

  const purchasePrices = purchases.map((r) =>
    Number(r?.outputs?.recommendedPrice || 0)
  );
  const ignorePrices = ignores.map((r) =>
    Number(r?.outputs?.recommendedPrice || 0)
  );

  const purchaseUrgencyHigh = purchases.filter(
    (r) => r?.outputs?.urgency === "high"
  ).length;
  const ignoreUrgencyHigh = ignores.filter(
    (r) => r?.outputs?.urgency === "high"
  ).length;

  const avgPurchaseScore = avg(purchaseScores);
  const avgIgnoreScore = avg(ignoreScores);
  const avgPurchasePrice = avg(purchasePrices);
  const avgIgnorePrice = avg(ignorePrices);

  let nextOptimization = { ...aiOptimization };
  let nextEconomy = { ...aiEconomy };
  const reasons = [];

  // 1. Aggressiveness
  if (ignores.length >= 5 && avgIgnoreScore >= 60) {
    nextOptimization.aggressiveness = clamp(
      Number(aiOptimization.aggressiveness || 0.5) - 0.03,
      0.2,
      aiPolicy.maxAggressiveness
    );
    reasons.push("Korkean score:n ignoret → aggressiivisuutta alas.");
  } else if (purchases.length >= 5 && avgPurchaseScore >= 55) {
    nextOptimization.aggressiveness = clamp(
      Number(aiOptimization.aggressiveness || 0.5) + 0.02,
      0.2,
      aiPolicy.maxAggressiveness
    );
    reasons.push("Korkean score:n ostot → aggressiivisuutta hieman ylös.");
  }

  // 2. Price bias
  if (ignores.length >= 5 && avgIgnorePrice > avgPurchasePrice && avgIgnorePrice >= 8) {
    nextOptimization.priceBias = clamp(
      Number(aiOptimization.priceBias || 0) - 0.25,
      aiPolicy.minPriceModifier,
      aiPolicy.maxPriceModifier
    );
    reasons.push("Korkeammat hinnat ignoorataan → priceBias alas.");
  } else if (purchases.length >= 5 && avgPurchasePrice >= 5) {
    nextOptimization.priceBias = clamp(
      Number(aiOptimization.priceBias || 0) + 0.15,
      aiPolicy.minPriceModifier,
      aiPolicy.maxPriceModifier
    );
    reasons.push("Keskihintaiset boostit konvertoivat → priceBias hieman ylös.");
  }

  // 3. Thresholds
  if (purchaseUrgencyHigh >= 5 && ignoreUrgencyHigh <= 2) {
    nextOptimization.highThreshold = clamp(
      Number(aiOptimization.highThreshold || 65) - 1,
      45,
      90
    );
    reasons.push("High urgency toimii → highThreshold hieman alas.");
  }

  if (ignoreUrgencyHigh >= 5) {
    nextOptimization.highThreshold = clamp(
      Number(aiOptimization.highThreshold || 65) + 1,
      45,
      90
    );
    reasons.push("High urgency ignoorataan → highThreshold hieman ylös.");
  }

  // 4. Visibility multiplier
  const purchaseLowVisibility = purchases.filter(
    (r) => Number(r?.inputs?.visibility || 0) <= 2
  ).length;

  if (purchaseLowVisibility >= 4) {
    nextEconomy.visibilityMultiplier = clamp(
      Number(aiEconomy.visibilityMultiplier || 1) + 0.03,
      0.8,
      aiPolicy.maxVisibilityMultiplier
    );
    reasons.push("Matala näkyvyys + ostot → visibilityMultiplier hieman ylös.");
  }

  // 5. Urgency bias
  if (purchaseUrgencyHigh >= 5) {
    nextEconomy.urgencyBias = clamp(
      Number(aiEconomy.urgencyBias || 0) + 0.5,
      -10,
      10
    );
    reasons.push("High urgency konvertoi → urgencyBias ylös.");
  } else if (ignoreUrgencyHigh >= 5) {
    nextEconomy.urgencyBias = clamp(
      Number(aiEconomy.urgencyBias || 0) - 0.5,
      -10,
      10
    );
    reasons.push("High urgency ignoorataan → urgencyBias alas.");
  }

  const changed =
    JSON.stringify(nextOptimization) !== JSON.stringify(aiOptimization) ||
    JSON.stringify(nextEconomy) !== JSON.stringify(aiEconomy);

  return {
    changed,
    reasons,
    metrics: {
      purchases: purchases.length,
      ignores: ignores.length,
      avgPurchaseScore,
      avgIgnoreScore,
      avgPurchasePrice,
      avgIgnorePrice,
      purchaseUrgencyHigh,
      ignoreUrgencyHigh,
    },
    nextOptimization,
    nextEconomy,
  };
}
