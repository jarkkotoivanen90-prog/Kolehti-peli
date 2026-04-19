import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { useAiStack } from "./hooks/useAiStack";
import { useGameData } from "./hooks/useGameData"; 

// Layout
import PageShell from "./components/layout/PageShell";
import AppHeader from "./components/layout/AppHeader";

// Cards
import PrimaryActionCard from "./components/cards/PrimaryActionCard";
import BoostCard from "./components/cards/BoostCard";
import LeaderboardCard from "./components/cards/LeaderboardCard";
import ToolsCard from "./components/cards/ToolsCard";

// UI / Founder
import FounderDashboard from "./components/ui/FounderDashboard";
import AiDebugPanel from "./components/ui/AiDebugPanel";
import AiTraceHistory from "./components/ui/AiTraceHistory";

// AI
import { summarizeBoostAnalytics } from "./ai/analytics/analyticsEngine";
import { buildEffectiveControl } from "./ai/control/controlEngine";
import { applyPolicyLayer } from "./ai/policy/policyEngine";
import { getRankingScore } from "./ai/ranking/rankingEngine";
import { getAiState } from "./ai/state/aiState";

// Utils
function euro(value) {
  return `${Number(value || 0).toFixed(2)} €`;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [selectedType, setSelectedType] = useState("week");

  const {
  myPost,
  leaderboard,
  loading,
  voting,
  boosting,
  error,
  loadData,
  handleVote,
  handleBoost,
} = useGameData(user, selectedType);

  const [debugOpen, setDebugOpen] = useState(false);
  const [traceHistory, setTraceHistory] = useState([]);

  // --- AUTH ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // --- AI ---
  const ai = useAiStack({
    context: {
      momentum: myPost?.momentum || 0,
      visibility: myPost?.visibility || 0,
      boostsUsed: myPost?.boosts_used || 0,
    },
  });

  const boostDecision = ai?.boost || {};

  const rankedLeaderboard = useMemo(() => {
    return [...leaderboard]
      .map((row) => ({
        ...row,
        rankingScore: getRankingScore({
          votes: row.votes,
          momentum: row.momentum,
          visibility: row.visibility,
        }),
      }))
      .sort((a, b) => b.rankingScore - a.rankingScore);
  }, [leaderboard]);

  const aiState = getAiState({
    momentum: myPost?.momentum || 0,
    visibility: myPost?.visibility || 0,
  });


  async function signOut() {
    await supabase.auth.signOut();
  }

  // --- LOGIN SCREEN ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Kirjaudu sisään
      </div>
    );
  }

  // --- MAIN UI ---
  return (
    <PageShell>
      <AppHeader user={user} />

      {/* Primary Action */}
      <PrimaryActionCard
        onVote={handleVote}
        voting={voting}
        disabled={loading}
      />

      {/* Boost */}
      <BoostCard
        myPost={myPost}
        boosting={boosting}
        onBoost={handleBoost}
      />

      {/* Leaderboard */}
      <LeaderboardCard
        rankedLeaderboard={rankedLeaderboard}
        euro={euro}
      />

      {/* Tools */}
      <ToolsCard
        onRefresh={loadData}
        onSignOut={signOut}
      />

      {/* Founder */}
      <FounderDashboard ai={ai} />

      <AiDebugPanel
        isOpen={debugOpen}
        onToggle={() => setDebugOpen(!debugOpen)}
        ai={ai}
      />

      <AiTraceHistory rows={traceHistory} />
    </PageShell>
  );
}
