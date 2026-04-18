function TraceTable({ title, items = [] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 text-sm font-bold uppercase tracking-wide text-white/50">
        {title}
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-white/50">Ei trace-dataa.</div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={`${title}-${index}`}
              className="rounded-xl bg-white/5 px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-white">{item.label}</div>
                <div
                  className={`font-mono text-sm ${
                    Number(item.effect || 0) > 0
                      ? "text-emerald-300"
                      : Number(item.effect || 0) < 0
                      ? "text-red-300"
                      : "text-white/70"
                  }`}
                >
                  {typeof item.effect === "number"
                    ? item.effect > 0
                      ? `+${item.effect.toFixed(2)}`
                      : item.effect.toFixed(2)
                    : String(item.effect)}
                </div>
              </div>

              <div className="mt-1 text-sm text-white/60">
                value: {typeof item.value === "object"
                  ? JSON.stringify(item.value)
                  : String(item.value)}
              </div>

              {item.meta ? (
                <pre className="mt-2 overflow-auto rounded-lg bg-black/20 p-2 text-xs text-white/55">
                  {JSON.stringify(item.meta, null, 2)}
                </pre>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
