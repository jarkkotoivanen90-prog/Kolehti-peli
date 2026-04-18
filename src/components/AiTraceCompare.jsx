import React from "react";

function Card({ title, children }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
      <div className="mb-3 text-sm font-bold uppercase tracking-wide text-white/50">
        {title}
      </div>
      {children}
    </div>
  );
}

function DiffRow({ label, left, right }) {
  const changed = JSON.stringify(left) !== JSON.stringify(right);

  return (
    <div
      className={`grid grid-cols-3 gap-3 rounded-xl px-3 py-2 ${
        changed ? "bg-orange-400/10" : "bg-white/5"
      }`}
    >
      <div className="text-white/55">{label}</div>
      <div className="font-mono text-sm text-white/85 break-all">
        {typeof left === "object" ? JSON.stringify(left) : String(left)}
      </div>
      <div className="font-mono text-sm text-white/85 break-all">
        {typeof right === "object" ? JSON.stringify(right) : String(right)}
      </div>
    </div>
  );
}

function normalizeTrace(trace = []) {
  const map = new Map();
  trace.forEach((item) => {
    map.set(item.label, item);
  });
  return map;
}

function TraceDiffTable({ leftTrace = [], rightTrace = [] }) {
  const leftMap = normalizeTrace(leftTrace);
  const rightMap = normalizeTrace(rightTrace);

  const labels = Array.from(
    new Set([...leftMap.keys(), ...rightMap.keys()])
  );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3 px-3 text-xs font-bold uppercase tracking-wide text-white/45">
        <div>Step</div>
        <div>Left</div>
        <div>Right</div>
      </div>

      {labels.map((label) => {
        const left = leftMap.get(label);
        const right = rightMap.get(label);

        return (
          <div
            key={label}
            className={`rounded-xl border px-3 py-3 ${
              JSON.stringify(left) !== JSON.stringify(right)
                ? "border-orange-400/20 bg-orange-400/5"
                : "border-white/10 bg-white/5"
            }`}
          >
            <div className="mb-2 font-bold text-white">{label}</div>

            <div className="grid grid-cols-2 gap-3">
              <pre className="overflow-auto rounded-lg bg-black/20 p-2 text-xs text-white/70">
                {JSON.stringify(left || {}, null, 2)}
              </pre>
              <pre className="overflow-auto rounded-lg bg-black/20 p-2 text-xs text-white/70">
                {JSON.stringify(right || {}, null, 2)}
              </pre>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getChangedKeys(a = {}, b = {}) {
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
  return keys.filter(
    (key) => JSON.stringify(a?.[key]) !== JSON.stringify(b?.[key])
  );
}

export default function AiTraceCompare({ leftRow, rightRow, onClose }) {
  if (!leftRow || !rightRow) return null;

  const inputDiffs = getChangedKeys(leftRow.inputs || {}, rightRow.inputs || {});
  const outputDiffs = getChangedKeys(leftRow.outputs || {}, rightRow.outputs || {});
  const contextDiffs = getChangedKeys(
    leftRow.context_snapshot || {},
    rightRow.context_snapshot || {}
  );

  return (
    <div className="rounded-[30px] border border-fuchsia-400/20 bg-fuchsia-400/5 p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-black text-white">Trace Compare</div>
          <div className="text-sm text-white/55">
            {leftRow.decision_type} vs {rightRow.decision_type}
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
        <Card title="Left trace">
          <div className="text-sm text-white/75">
            {leftRow.inputs?.eventType || "unknown"} ·{" "}
            {new Date(leftRow.created_at).toLocaleString()}
          </div>
          <pre className="mt-3 overflow-auto rounded-xl bg-white/5 p-3 text-xs text-white/70">
            {JSON.stringify(leftRow.outputs || {}, null, 2)}
          </pre>
        </Card>

        <Card title="Right trace">
          <div className="text-sm text-white/75">
            {rightRow.inputs?.eventType || "unknown"} ·{" "}
            {new Date(rightRow.created_at).toLocaleString()}
          </div>
          <pre className="mt-3 overflow-auto rounded-xl bg-white/5 p-3 text-xs text-white/70">
            {JSON.stringify(rightRow.outputs || {}, null, 2)}
          </pre>
        </Card>

        <Card title="Input diffs">
          <div className="space-y-2">
            {inputDiffs.length === 0 ? (
              <div className="text-sm text-white/55">Ei input-eroja.</div>
            ) : (
              inputDiffs.map((key) => (
                <DiffRow
                  key={key}
                  label={key}
                  left={leftRow.inputs?.[key]}
                  right={rightRow.inputs?.[key]}
                />
              ))
            )}
          </div>
        </Card>

        <Card title="Output diffs">
          <div className="space-y-2">
            {outputDiffs.length === 0 ? (
              <div className="text-sm text-white/55">Ei output-eroja.</div>
            ) : (
              outputDiffs.map((key) => (
                <DiffRow
                  key={key}
                  label={key}
                  left={leftRow.outputs?.[key]}
                  right={rightRow.outputs?.[key]}
                />
              ))
            )}
          </div>
        </Card>

        <Card title="Context diffs">
          <div className="space-y-2">
            {contextDiffs.length === 0 ? (
              <div className="text-sm text-white/55">Ei context-eroja.</div>
            ) : (
              contextDiffs.map((key) => (
                <DiffRow
                  key={key}
                  label={key}
                  left={leftRow.context_snapshot?.[key]}
                  right={rightRow.context_snapshot?.[key]}
                />
              ))
            )}
          </div>
        </Card>

        <Card title="Trace step diffs">
          <TraceDiffTable
            leftTrace={leftRow.trace || []}
            rightTrace={rightRow.trace || []}
          />
        </Card>
      </div>
    </div>
  );
}
