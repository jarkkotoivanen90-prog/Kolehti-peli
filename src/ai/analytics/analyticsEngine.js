export function summarizeBoostAnalytics(events) {
  const total = events.length || 1;

  const clicks = events.filter((e) => e.type === "click").length;
  const purchases = events.filter((e) => e.type === "purchase").length;
  const ignores = events.filter((e) => e.type === "ignore").length;

  return {
    clickRate: (clicks / total) * 100,
    purchaseRate: (purchases / total) * 100,
    ignoreRate: (ignores / total) * 100,
  };
}
