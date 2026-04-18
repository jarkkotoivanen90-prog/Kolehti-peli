export function buildWinnerTrace(rows = []) {
  const normalized = rows.map((row) => {
    const eventType = row?.inputs?.eventType || "";
    const outputs = row?.outputs || {};
    const score = Number(outputs.score || 0);
    const price = Number(outputs.recommendedPrice || 0);
    const urgency = outputs.urgency || "low";

    let label = "interesting";
    let rankScore = score;

    if (eventType === "boost_purchased") {
      label = "winner";
      rankScore = score + 20 - price;
    } else if (eventType === "boost_ignored") {
      label = "loser";
      rankScore = score;
    } else if (eventType === "boost_clicked") {
      label = "interesting";
      rankScore = score + 5;
    }

    return {
      ...row,
      winnerLabel: label,
      winnerRankScore: rankScore,
      winnerMeta: {
        eventType,
        score,
        price,
        urgency,
      },
    };
  });

  const winners = normalized
    .filter((r) => r.winnerLabel === "winner")
    .sort((a, b) => b.winnerRankScore - a.winnerRankScore)
    .slice(0, 5);

  const losers = normalized
    .filter((r) => r.winnerLabel === "loser")
    .sort((a, b) => b.winnerRankScore - a.winnerRankScore)
    .slice(0, 5);

  const interesting = normalized
    .filter((r) => r.winnerLabel === "interesting")
    .sort((a, b) => b.winnerRankScore - a.winnerRankScore)
    .slice(0, 5);

  return {
    winners,
    losers,
    interesting,
  };
}
