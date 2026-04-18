import React from "react";

export default function AiTraceHistory({ rows = [] }) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-4 text-lg font-black text-white">AI Trace History</div>

      {rows.length === 0 ? (
        <div className="text-white/55">Ei vielä trace-historiaa.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-[20px] border border-white/10 bg-black/20 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-white">
                    {row.decision_type}
                  </div>
                  <div className="text-sm text-white/50">
                    {new Date(row.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-white/70">
                  Näytä trace
                </summary>

                <div className="mt-3 grid gap-3 xl:grid-cols-3">
                  <pre className="overflow-auto rounded-xl bg-white/5 p-3 text-xs text-white/75">
                    {JSON.stringify(row.inputs || {}, null, 2)}
                  </pre>
                  <pre className="overflow-auto rounded-xl bg-white/5 p-3 text-xs text-white/75">
                    {JSON.stringify(row.outputs || {}, null, 2)}
                  </pre>
                  <pre className="overflow-auto rounded-xl bg-white/5 p-3 text-xs text-white/75">
                    {JSON.stringify(row.context_snapshot || {}, null, 2)}
                  </pre>
                </div>

                <pre className="mt-3 overflow-auto rounded-xl bg-white/5 p-3 text-xs text-white/75">
                  {JSON.stringify(row.trace || [], null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
