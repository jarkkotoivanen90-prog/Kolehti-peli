export async function saveTraceHistoryEntry({
  supabase,
  userId,
  decisionType,
  eventType,
  trace,
  inputs,
  outputs,
  contextSnapshot,
}) {
  if (!userId) return;

  const payload = {
    user_id: userId,
    decision_type: decisionType,
    trace: trace || [],
    inputs: {
      ...(inputs || {}),
      eventType,
    },
    outputs: outputs || {},
    context_snapshot: contextSnapshot || {},
  };

  const { error } = await supabase
    .from("ai_trace_history")
    .insert(payload);

  if (error) {
    console.error("Trace history insert failed:", error.message);
  }
}
