export default function PageShell({ children }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(59,76,202,0.28),rgba(2,6,23,1)_42%)] text-white">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 md:px-6">
        {children}
      </div>
    </div>
  );
}
