export default function PrimaryActionCard({
  onVote,
  voting,
  disabled,
}) {
  return (
    <div className="mb-5">
      <button
        onClick={onVote}
        disabled={disabled}
        className="w-full rounded-2xl bg-orange-400 py-5 text-2xl font-black text-black disabled:opacity-50"
      >
        {voting ? "Äänestetään..." : "Äänestä"}
      </button>
    </div>
  );
}
