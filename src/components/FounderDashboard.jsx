export default function FounderDashboard({ ai }) {
  return (
    <div>
      <h2>AI Runtime</h2>

      <div>Health: {ai.runtime.health}</div>
      <div>Recommended action: {ai.runtime.recommendedAction}</div>

      <h3>Boost</h3>
      <div>Score: {ai.decisions.boost.score}</div>
      <div>Urgency: {ai.decisions.boost.urgency}</div>

      <h3>Autopilot</h3>
      <div>Mode: {ai.autopilot.recommendedMode}</div>
    </div>
  );
}
