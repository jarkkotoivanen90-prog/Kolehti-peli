export function getRankingScore({
  votes,
  momentum,
  visibility,
  boostSpent,
}) {
  return (
    Number(votes || 0) * 1 +
    Number(momentum || 0) * 0.6 +
    Number(visibility || 0) * 2 -
    Number(boostSpent || 0) * 0.4
  );
}
