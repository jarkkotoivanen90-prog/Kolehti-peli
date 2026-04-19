export default function LeaderboardCard({
  rankedLeaderboard,
  euro,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-5">
      <div className="mb-3 text-lg">Leaderboard</div>

      {rankedLeaderboard.map((item, i) => (
        <div
          key={i}
          className="flex justify-between py-1 text-sm"
        >
          <span>#{i + 1}</span>
          <span>{item.votes}</span>
          <span>{euro(item.spent_total)}</span>
        </div>
      ))}
    </div>
  );
}
