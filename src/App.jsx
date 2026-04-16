import { useState } from "react";

export default function App() {
  const [rank, setRank] = useState(3);
  const [gap, setGap] = useState(2);
  const [momentum, setMomentum] = useState(20);

  function vote() {
    setRank((r) => Math.max(1, r - 1));
    setGap((g) => Math.max(0, g - 1));
    setMomentum((m) => Math.min(100, m + 10));
  }

  function lose() {
    setRank((r) => r + 1);
    setGap(1);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#05070D",
      color: "#fff",
      padding: 20,
      fontFamily: "system-ui"
    }}>
      <h1>Kolehti AI</h1>

      <p>Sijoitus: #{rank}</p>
      <p>Ero: {gap}</p>
      <p>Momentum: {momentum}</p>

      <button onClick={vote}>👍 Äänestä</button>
      <br /><br />
      <button onClick={lose}>⚠️ Häviö</button>
    </div>
  );
}
