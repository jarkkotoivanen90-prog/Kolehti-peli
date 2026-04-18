export function getAiState({
  rank,
  gap,
  momentum,
  visibility,
  boostsUsed,
}) {
  if (rank === 1) return "winning";
  if (gap <= 1 && momentum >= 20) return "almost-winning";
  if (momentum >= 25) return "hot";
  if (visibility <= 2 && boostsUsed === 0) return "hidden-opportunity";
  if (gap >= 5) return "behind";
  return "neutral";
}
