import { useState } from "react";

export function useUiState() {
  const [selectedType, setSelectedType] = useState("day");
  const [debugOpen, setDebugOpen] = useState(false);
  const [traceHistory, setTraceHistory] = useState([]);

  return {
    selectedType,
    setSelectedType,
    debugOpen,
    setDebugOpen,
    traceHistory,
    setTraceHistory,
  };
}
