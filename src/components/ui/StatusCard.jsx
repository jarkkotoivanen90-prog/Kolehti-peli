export default function StatusCard({
  rank,
  gap,
  myPost,
  euro,
}) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-2xl mb-5">
      <div className="mb-4 text-lg text-white/85">
        Oma tilanne
      </div>

      <div className="text-5xl md:text-7xl font-black leading-none">
        Sijoitus: {rank}
      </div>

      <div className="mt-4 text-2xl font-extrabold">
        👍 Tilanne auki
      </div>

      <div className="mt-4 text-xl text-white/80">
        Ero: {gap} · Momentum: {myPost?.momentum ?? 0}
      </div>

      <div className="mt-3 text-xl text-white/90">
        Omat äänet: {myPost?.votes ?? 0}
      </div>

      <div className="mt-2 text-xl text-white/90">
        Näkyvyys: {myPost?.visibility ?? 0}
      </div>

      <div className="mt-2 text-xl text-white/90">
        Kulutus: {euro(myPost?.spent_total ?? 0)}
      </div>
    </div>
  );
}
