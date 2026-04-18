import React from "react";

function TraceMiniCard({ row, color = "white", onReplay }) {
  const meta = row?.winnerMeta || {};
  const borderClass =
    color === "emerald"
      ? "border-emerald-400/30 bg-emerald-400/10"
      : color === "red"
      ? "border-red-400/30 bg-red-400/10"
      : "border-white/10 bg-black/20";

  return (
    <div className={`rounded-[20px] border p-4 ${borderClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-bold text-white">
            {row.decision_type}
          </div>
          <div className="text-sm text-white/55">
            {meta.eventType} · {new Date(row.created_at).toLocaleString()}
          </div>
        </div>

        <button
          onClick={() => onReplay(row)}
          className="rounded-[14px] border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white"
        >
          Replay
        </button>
      </div>

      <div className="mt-3 grid gap-2 text-sm text-white/80 sm:grid-cols-2">
        <div>score: {meta.score}</div>
        <div>urgency: {meta.urgency}</div>
        <div>price: {meta.price} €</div>
        <div>rankScore: {Number(row.winnerRankScore || 0).toFixed(1)}</div>
      </div>

      <div className="mt-3 text-xs text-white/60">
        outputs: {JSON.stringify(row.outputs || {})}
      </div>
    </div>
  );
}

function Section({ title, rows, color, onReplay }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div className="mb-4 text-base font-black text-white">{title}</div>

      {rows.length === 0 ? (
        <div className="text-sm text-white/50">Ei tapauksia.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <TraceMiniCard
              key={row.id}
              row={row}
              color={color}
              onReplay={onReplay}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AiWinnerTrace({ data, onReplay }) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-4 text-lg font-black text-white">Winner Trace</div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Section
          title="Top Winners"
          rows={data?.winners || []}
          color="emerald"
          onReplay={onReplay}
        />
        <Section
          title="Top Losers"
          rows={data?.losers || []}
          color="red"
          onReplay={onReplay}
        />
        <Section
          title="Interesting Cases"
          rows={data?.interesting || []}
          color="white"
          onReplay={onReplay}
        />
      </div>
    </div>
  );
}
