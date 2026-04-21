import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Trophy,
  Zap,
  RefreshCw,
  LogOut,
  Brain,
  Shield,
  Wallet,
  Flame,
  Gauge,
  Crown,
  BarChart3,
  CalendarRange,
} from "lucide-react";

function euro(v) {
  return `${Number(v || 0).toFixed(2)} €`;
}

function cx(...c) {
  return c.filter(Boolean).join(" ");
}

export default function KolehtiV2GameUI({
  email,
  selectedType,
  setSelectedType,
  info,
  error,
  currentDraw,
  myPost,
  rankedLeaderboard,
  ai,
  aiState,
  gap,
  currentRankNumber,
  recentPurchases,
  voting,
  boosting,
  isFounder,
  debugOpen,
  setDebugOpen,
  onRefresh,
  onLogout,
  handleVote,
  handleBoost,
}) {
  const leaderboard = useMemo(() => rankedLeaderboard || [], [rankedLeaderboard]);

  return (
    <div className="min-h-screen text-white bg-[radial-gradient(circle_at_top,rgba(59,76,202,0.3),rgba(2,6,23,1)_42%)]">
      
      {/* HEADER */}
      <div className="p-5">
        <div className="text-xs tracking-[0.3em] text-white/60">KOLEHTI</div>

        <div className="flex justify-between items-end mt-2">
          <div>
            <h1 className="text-5xl font-black">Kolehti AI</h1>
            <div className="text-white/70 mt-1">{email}</div>
          </div>

          <div className="flex gap-2">
            <button onClick={onRefresh} className="px-4 py-2 bg-white/10 rounded-xl">
              <RefreshCw size={16} />
            </button>
            <button onClick={onLogout} className="px-4 py-2 bg-white/10 rounded-xl">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ALERT */}
      <AnimatePresence>
        {error && (
          <motion.div className="mx-5 mb-3 p-3 bg-red-500/20 rounded-xl">
            {error}
          </motion.div>
        )}
        {info && (
          <motion.div className="mx-5 mb-3 p-3 bg-green-500/20 rounded-xl">
            {info}
          </motion.div>
        )}
      </AnimatePresence>

      {/* STATUS */}
      <div className="mx-5 p-5 bg-white/5 rounded-2xl mb-4">
        <div className="text-4xl font-black">#{currentRankNumber}</div>
        <div className="mt-2 text-white/70">Gap: {gap}</div>

        <div className="mt-3 text-white/90">
          Votes: {myPost?.votes} · Momentum: {myPost?.momentum}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="mx-5 grid grid-cols-2 gap-3 mb-5">
        <button
          onClick={handleVote}
          className="bg-blue-500 p-4 rounded-xl font-bold"
        >
          {voting ? "..." : "Vote"}
        </button>

        <button
          onClick={handleBoost}
          className="bg-orange-500 p-4 rounded-xl font-bold"
        >
          {boosting ? "..." : "Boost"}
        </button>
      </div>

      {/* LEADERBOARD */}
      <div className="mx-5 mb-5">
        <div className="text-xl font-bold mb-2">Leaderboard</div>

        {leaderboard.map((row, i) => (
          <div key={row.id} className="p-3 bg-white/5 rounded-xl mb-2 flex justify-between">
            <div>
              #{i + 1} {row.title}
            </div>
            <div>{row.votes}</div>
          </div>
        ))}
      </div>

      {/* PURCHASES */}
      <div className="mx-5 mb-5">
        <div className="text-xl font-bold mb-2">Purchases</div>

        {recentPurchases.map((p) => (
          <div key={p.id} className="p-3 bg-white/5 rounded-xl mb-2 flex justify-between">
            <div>{p.type}</div>
            <div>{euro(p.amount)}</div>
          </div>
        ))}
      </div>

      {/* FOUNDER */}
      {isFounder && (
        <div className="mx-5 mb-10">
          <button
            onClick={() => setDebugOpen(!debugOpen)}
            className="mb-3 px-4 py-2 bg-white/10 rounded-xl"
          >
            Debug
          </button>

          {debugOpen && (
            <pre className="text-xs bg-black p-3 rounded-xl overflow-auto">
              {JSON.stringify({ ai, myPost }, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* STICKY BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 flex gap-3">
        <button onClick={handleVote} className="flex-1 bg-blue-500 p-3 rounded-xl">
          Vote
        </button>
        <button onClick={handleBoost} className="flex-1 bg-orange-500 p-3 rounded-xl">
          Boost
        </button>
      </div>
    </div>
  );
}
