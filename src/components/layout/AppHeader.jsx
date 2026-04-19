export default function AppHeader({ email }) {
  return (
    <div className="mb-6">
      <div className="text-sm font-black tracking-[0.3em] text-white/80">
        KOLEHTI
      </div>
      <div className="mt-2 text-5xl font-black leading-none md:text-7xl">
        Kolehti AI
      </div>
      <div className="mt-3 text-lg text-white/75">{email}</div>
    </div>
  );
}
