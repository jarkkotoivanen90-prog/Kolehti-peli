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
  const { data, error } = await supabase
    .from("ai_trace_history")
    .insert({
      user_id: userId,
      decision_type: decisionType,
      trace: trace || [],
      inputs: { ...(inputs || {}), eventType },
      outputs: outputs || {},
      context_snapshot: contextSnapshot || {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
