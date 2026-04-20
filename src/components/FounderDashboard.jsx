export default function FounderDashboard({ ai, profile, releaseMode, onSafe }) {
  if (!ai) {
    return (
      <div className="p-5 rounded-2xl bg-black/30 text-white">
        Founder Dashboard loading...
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-black/30 text-white">
      <h2 className="text-xl font-bold mb-4">Founder Dashboard</h2>

      <div>Health: {ai?.runtime?.health ?? "-"}</div>
      <div>Ignore: {ai?.runtime?.ignoreRate?.toFixed?.(1) ?? "0.0"}%</div>
      <div>Purchase: {ai?.runtime?.purchaseRate?.toFixed?.(1) ?? "0.0"}%</div>

      <div className="mt-4">
        Boost urgency: {ai?.boost?.urgency ?? "-"}
      </div>

      <div className="mt-4">
        Autopilot: {ai?.autopilot?.recommendedMode ?? "-"}
      </div>

      <button onClick={onSafe} className="mt-4">
        Safe mode
      </button>
    </div>
  );
}
