const boost = safeRun(
  "boostEngine",
  () =>
    getBoostDecision({
      gap: Number(safeContext.gap || 0),
      momentum: Number(safeContext.momentum || 0),
      visibility: Number(safeContext.visibility || 0),
      boostsUsed: Number(safeContext.boostsUsed || 0),
      selectedType: safeContext.selectedType || "week",
      profile: aiProfile || {},
      optimization: aiOptimization || {},
      economy: aiEconomy || {},
      getBoostPrice: safeHelpers.getBoostPrice,
      drawTypes: safeHelpers.drawTypes || [],
    }),
  {
    score: 0,
    urgency: "low",
    showBoost: false,
    recommendedPrice: 1,
    trace: [],
  }
);
