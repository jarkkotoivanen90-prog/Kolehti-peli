import React from "react";

function EffectBadge({ effect }) {
  const num = Number(effect || 0);
  const cls =
    num > 0
      ? "bg-emerald-400/15 text-emerald-300"
      : num < 0
      ? "bg-red-400/15 text-red-300"
      : "bg-white/10 text-white/65";

  const text =
    typeof effect === "number"
      ? num > 0
        ? `+${num.toFixed(2)}`
        : num.toFixed(2)
      : String(effect);

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>
      {text}
    </span>
  );
}

function JsonCard({ title, value }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
      <div className="mb-3 text-sm font-bold uppercase tracking-wide text-white/50">
        {title}
      </div>
      <pre className="overflow-auto rounded-xl bg-white/5 p-3 text-xs text-white/75">
        {JSON.stringify(value || {}, null, 2)}
      </pre>
    </div>
  );
}

function ReplayStep({ item, index }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-white/45">Step {index + 1}</div>
          <div className="text-base font-bold text-white">{item.label}</div>
        </div>
        <EffectBadge effect={item.effect} />
      </div>

      <div className="mt-2 text-sm text-white/65">
        value:{" "}
        {typeof item.value === "object"
          ? JSON.stringify(item.value)
          : String(item.value)}
      </div>

      {item.meta ? (
        <pre className="mt-3 overflow-auto rounded-lg bg-black/20 p-3 text-xs text-white/55">
          {JSON.stringify(item.meta, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function getReplaySummary(row) {
  const trace = Array.isArray(row?.trace) ? row.trace : [];
  const strongestPositive = [...trace]
    .filter((x) => Number(x.effect || 0) > 0)
    .sort((a, b) => Number(b.effect || 0) - Number(a.effect || 0))[0];

  const strongestNegative = [...trace]
    .filter((x) => Number(x.effect || 0) < 0)
    .sort((a, b) => Number(a.effect || 0) - Number(b.effect || 0))[0];

  return {
    strongestPositive,
    strongestNegative,
  };
}

export default function AiTraceReplay({ row, onClose }) {
  if (!row) return null;

  const summary = getReplaySummary(row);

  return (
    <div className="rounded-[30px] border border-cyan-400/20 bg-cyan-400/5 p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-black text-white">Trace Replay</div>
          <div className="text-sm text-white/55">
            {row.decision_type} · {row.inputs?.eventType || "unknown"} ·{" "}
            {new Date(row.created_at).toLocaleString()}
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded-[16px] border border-white/10 bg-white/5 px-4 py-2 font-bold text-white"
        >
          Sulje
        </button>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
          <div className="mb-3 text-sm font-bold uppercase tracking-wide text-white/50">
            Replay summary
          </div>

          <div className="space-y-3 text-sm text-white/80">
            <div>
              <span className="text-white/50">Decision type:</span>{" "}
              {row.decision_type}
            </div>
            <div>
              <span className="text-white/50">Event:</span>{" "}
              {row.inputs?.eventType || "unknown"}
            </div>

            <div>
              <span className="text-white/50">Strongest positive:</span>{" "}
              {summary.strongestPositive
                ? `${summary.strongestPositive.label} (${Number(
                    summary.strongestPositive.effect
                  ).toFixed(2)})`
                : "none"}
            </div>

            <div>
              <span className="text-white/50">Strongest negative:</span>{" "}
              {summary.strongestNegative
                ? `${summary.strongestNegative.label} (${Number(
                    summary.strongestNegative.effect
                  ).toFixed(2)})`
                : "none"}
            </div>
          </div>
        </div>

        <JsonCard title="Outputs" value={row.outputs} />
        <JsonCard title="Inputs" value={row.inputs} />
        <JsonCard title="Context snapshot" value={row.context_snapshot} />
      </div>

      <div className="mt-5 rounded-[20px] border border-white/10 bg-black/20 p-4">
        <div className="mb-4 text-sm font-bold uppercase tracking-wide text-white/50">
          Decision steps
        </div>

        {Array.isArray(row.trace) && row.trace.length > 0 ? (
          <div className="space-y-3">
            {row.trace.map((item, index) => (
              <ReplayStep
                key={`${row.id}-trace-${index}`}
                item={item}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-white/55">Ei trace-dataa.</div>
        )}
      </div>
    </div>
  );
}
