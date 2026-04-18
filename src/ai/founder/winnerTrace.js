export function buildWinnerTrace(rows = []) {
  function buildLabels(row) {
    const labels = [];

    const eventType = row?.inputs?.eventType;
    const outputs = row?.outputs || {};
    const score = Number(outputs.score || 0);
    const price = Number(outputs.recommendedPrice || 0);
    const urgency = outputs.urgency || "low";

    const visibility = Number(row?.inputs?.visibility || 0);
    const momentum = Number(row?.inputs?.momentum || 0);

    // 🎯 Core logic

    if (eventType === "boost_purchased" && score >= 60) {
      labels.push({ type: "success", text: "🎯 Korkea score → ostettu" });
    }

    if (eventType === "boost_ignored" && score >= 60) {
      labels.push({ type: "problem", text: "🚨 Korkea score mutta ignoorattu" });
    }

    if (eventType === "boost_purchased" && urgency === "high") {
      labels.push({ type: "insight", text: "⚡ Urgency toimi" });
    }

    if (eventType === "boost_ignored" && urgency === "low") {
      labels.push({ type: "insight", text: "😴 Liian heikko urgency" });
    }

    if (price >= 10 && eventType === "boost_ignored") {
      labels.push({ type: "problem", text: "💰 Todennäköisesti liian kallis" });
    }

    if (price <= 3 && eventType === "boost_purchased") {
      labels.push({ type: "success", text: "💸 Halpa → konvertoi hyvin" });
    }

    if (visibility <= 2 && eventType === "boost_purchased") {
      labels.push({ type: "insight", text: "👀 Matala näkyvyys mutta ostettiin" });
    }

    if (momentum >= 25 && eventType === "boost_purchased") {
      labels.push({ type: "insight", text: "🔥 Korkea momentum auttoi" });
    }

    if (labels.length === 0) {
      labels.push({ type: "neutral", text: "ℹ️ Ei selkeää patternia" });
    }

    return labels;
  }

  const normalized = rows.map((row) => {
    const eventType = row?.inputs?.eventType || "";
    const outputs = row?.outputs || {};
    const score = Number(outputs.score || 0);
    const price = Number(outputs.recommendedPrice || 0);

    let label = "interesting";
    let rankScore = score;

    if (eventType === "boost_purchased") {
      label = "winner";
      rankScore = score + 20 - price;
    } else if (eventType === "boost_ignored") {
      label = "loser";
      rankScore = score;
    }

    return {
      ...row,
      winnerLabel: label,
      winnerRankScore: rankScore,
      winnerMeta: {
        eventType,
        score,
        price,
        urgency: outputs.urgency,
      },
      labels: buildLabels(row),
    };
  });

  return {
    winners: normalized
      .filter((r) => r.winnerLabel === "winner")
      .sort((a, b) => b.winnerRankScore - a.winnerRankScore)
      .slice(0, 5),

    losers: normalized
      .filter((r) => r.winnerLabel === "loser")
      .sort((a, b) => b.winnerRankScore - a.winnerRankScore)
      .slice(0, 5),

    interesting: normalized
      .filter((r) => r.winnerLabel === "interesting")
      .slice(0, 5),
  };
}
