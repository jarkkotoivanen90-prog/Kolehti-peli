import React, { useMemo, useState } from "react";
import AiTraceReplay from "./AiTraceReplay";
import AiTraceCompare from "./AiTraceCompare";

export default function AiTraceHistory({ rows = [] }) {
  const [selectedRow, setSelectedRow] = useState(null);
  const [compareIds, setCompareIds] = useState([]);

  const compareRows = useMemo(() => {
    return rows.filter((row) => compareIds.includes(row.id)).slice(0, 2);
  }, [rows, compareIds]);

  function toggleCompare(rowId) {
    setCompareIds((prev) => {
      if (prev.includes(rowId)) {
        return prev.filter((id) => id !== rowId);
      }
      if (prev.length >= 2) {
        return [prev[1], rowId];
      }
      return [...prev, rowId];
    });
  }

  return (
    <div className="space-y-5">
      {selectedRow ? (
        <AiTraceReplay
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
        />
      ) : null}

      {compareRows.length === 2 ? (
        <AiTraceCompare
          leftRow={compareRows[0]}
          rightRow={compareRows[1]}
          onClose={() => setCompareIds([])}
        />
      ) : null}

      <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-black text-white">
              AI Trace History
            </div>
            <div className="text-sm text-white/55">
              Valitse yksi replayhin tai kaksi compareen
            </div>
          </div>

          <div className="text-sm text-white/60">
            compare selected: {compareIds.length}/2
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-white/55">Ei vielä trace-historiaa.</div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const selectedForCompare = compareIds.includes(row.id);

              return (
                <div
                  key={row.id}
                  className={`rounded-[20px] border p-4 ${
                    selectedForCompare
                      ? "border-fuchsia-400/30 bg-fuchsia-400/10"
                      : "border-white/10 bg-black/20"
                  }`}
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

                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedRow(row)}
                        className="rounded-[16px] border border-white/10 bg-white/5 px-4 py-2 font-bold text-white"
                      >
                        Replay
                      </button>

                      <button
                        onClick={() => toggleCompare(row.id)}
                        className={`rounded-[16px] px-4 py-2 font-bold ${
                          selectedForCompare
                            ? "bg-fuchsia-400 text-slate-950"
                            : "border border-white/10 bg-white/5 text-white"
                        }`}
                      >
                        {selectedForCompare ? "Selected" : "Compare"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-white/65">
                    output: {JSON.stringify(row.outputs || {})}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
