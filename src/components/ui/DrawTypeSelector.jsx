export default function DrawTypeSelector({
  drawTypes,
  selectedType,
  onSelect,
}) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-2xl mb-5">
      <div className="mb-4 text-lg text-white/85">Arvonnan tyyppi</div>
      <div className="grid grid-cols-3 gap-3">
        {drawTypes.map((draw) => (
          <button
            key={draw.key}
            onClick={() => onSelect(draw.key)}
            className={`rounded-[22px] px-4 py-4 text-xl font-extrabold transition ${
              selectedType === draw.key
                ? "bg-orange-400 text-slate-950"
                : "border border-white/10 bg-white/5 text-white"
            }`}
          >
            {draw.label}
          </button>
        ))}
      </div>
    </div>
  );
}
