import React, { useState } from "react";
import AiTraceReplay from "./AiTraceReplay";

export default function AiTraceHistory({ rows = [] }) {
  const [selectedRow, setSelectedRow] = useState(null);

  return (
    <div className="space-y-5">
      {selectedRow ? (
        <AiTraceReplay
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
        />
      ) : null}

      <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
        <div className="mb-4 text-lg font-black text-white">
          AI Trace History
        </div>

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
                      {row.inputs?.eventType || "unknown"} ·{" "}
                      {new Date(row.created_at).toLocaleString()}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedRow(row)}
                    className="rounded-[16px] border border-white/10 bg-white/5 px-4 py-2 font-bold text-white"
                  >
                    Replay
                  </button>
                </div>

                <div className="mt-3 text-sm text-white/65">
                  output: {JSON.stringify(row.outputs || {})}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
