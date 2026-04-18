const visibility = safeRun(
  "visibilityEngine",
  () =>
    getVisibilityDecision({
      gap: Number(safeContext.gap || 0),
      momentum: Number(safeContext.momentum || 0),
      visibility: Number(safeContext.visibility || 0),
      selectedType: safeContext.selectedType || "week",
      economy: aiEconomy || {},
    }),
  {
    score: 0,
    visibilityIntent: "hold",
    visibilityMultiplier: 1,
  }
);
