export default function StatusCard({ rank, gap, myPost, euro }) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-2xl mb-5 relative overflow-hidden">
      <div className="mb-4 text-lg text-white/85">Oma tilanne</div>
      <div className="text-5xl md:text-7xl font-black leading-none">
        Sijoitus: {rank}
      </div>
      <div className="mt-4 flex items-center gap-2 text-3xl font-extrabold">
        <span>👍</span>
        <span>Tilanne auki</span>
      </div>
      <div className="mt-4 text-2xl text-white/80">
        Ero: {gap} · Momentum: {myPost?.momentum ?? 0}
      </div>
      <div className="mt-3 text-2xl text-white/90">
        Omat äänet: {myPost?.votes ?? 0}
      </div>
      <div className="mt-2 text-2xl text-white/90">
        Näkyvyys: {myPost?.visibility ?? 0}
      </div>
      <div className="mt-2 text-2xl text-white/90">
        Ostot yhteensä: {euro(myPost?.spent_total ?? 0)}
      </div>
    </div>
  );
}
