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
  const trace = [];

  let score = 0;

  const momentumEffect = Number(momentum || 0) * 0.7;
  score += momentumEffect;
  trace.push({
    label: "momentum",
    value: Number(momentum || 0),
    effect: momentumEffect,
  });

  const visibilityEffect = Number(visibility || 0) * 0.25;
  score += visibilityEffect;
  trace.push({
    label: "visibility",
    value: Number(visibility || 0),
    effect: visibilityEffect,
  });

  const gapEffect = Number(gap || 0) * -10;
  score += gapEffect;
  trace.push({
    label: "gap",
    value: Number(gap || 0),
    effect: gapEffect,
  });

  const almostWinEffect = Number(profile?.reactsToAlmostWin || 0.5) * 10;
  score += almostWinEffect;
  trace.push({
    label: "reactsToAlmostWin",
    value: Number(profile?.reactsToAlmostWin || 0.5),
    effect: almostWinEffect,
  });

  const momentumProfileEffect = Number(profile?.reactsToMomentum || 0.5) * 8;
  score += momentumProfileEffect;
  trace.push({
    label: "reactsToMomentum",
    value: Number(profile?.reactsToMomentum || 0.5),
    effect: momentumProfileEffect,
  });

  const criticalMomentEffect =
    Number(profile?.paysInCriticalMoments || 0.5) * 12;
  score += criticalMomentEffect;
  trace.push({
    label: "paysInCriticalMoments",
    value: Number(profile?.paysInCriticalMoments || 0.5),
    effect: criticalMomentEffect,
  });

  const ignoreEffect = Number(profile?.ignoresOffers || 0.5) * -10;
  score += ignoreEffect;
  trace.push({
    label: "ignoresOffers",
    value: Number(profile?.ignoresOffers || 0.5),
    effect: ignoreEffect,
  });

  const aggressivenessEffect =
    Number(optimization?.aggressiveness || 0.5) * 12;
  score += aggressivenessEffect;
  trace.push({
    label: "aggressiveness",
    value: Number(optimization?.aggressiveness || 0.5),
    effect: aggressivenessEffect,
  });

  const urgencyBiasEffect = Number(economy?.urgencyBias || 0);
  score += urgencyBiasEffect;
  trace.push({
    label: "urgencyBias",
    value: Number(economy?.urgencyBias || 0),
    effect: urgencyBiasEffect,
  });

  const fairnessGuard = Number(economy?.fairnessGuard || 1);
  const beforeFairness = score;
  score *= fairnessGuard;
  trace.push({
    label: "fairnessGuard",
    value: fairnessGuard,
    effect: score - beforeFairness,
    meta: {
      before: beforeFairness,
      after: score,
      multiplier: fairnessGuard,
    },
  });

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
    message = "Voit
