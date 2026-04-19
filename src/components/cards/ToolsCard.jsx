export default function ToolsCard({
  onRefresh,
  onSignOut,
}) {
  return (
    <div className="mt-6 flex gap-3">
      <button
        onClick={onRefresh}
        className="flex-1 rounded-xl bg-white/10 py-3"
      >
        Refresh
      </button>

      <button
        onClick={onSignOut}
        className="flex-1 rounded-xl bg-red-400 py-3 text-black"
      >
        Logout
      </button>
    </div>
  );
}
