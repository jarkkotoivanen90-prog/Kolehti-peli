export default function BoostCard({
  myPost,
  boosting,
  onBoost,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-5">
      <div className="mb-3 text-lg">Boost</div>

      <button
        onClick={onBoost}
        disabled={!myPost || boosting}
        className="w-full rounded-xl bg-emerald-400 py-3 text-black font-bold disabled:opacity-50"
      >
        {boosting ? "Boostataan..." : "Boostaa"}
      </button>
    </div>
  );
}
