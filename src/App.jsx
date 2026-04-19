import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";

import { useGameData } from "./hooks/useGameData";
import { useAiSystem } from "./hooks/useAiSystem";

// Layout
import PageShell from "./components/layout/PageShell";
import AppHeader from "./components/layout/AppHeader";

// Cards
import {
  PrimaryActionCard,
  BoostCard,
  LeaderboardCard,
  ToolsCard,
} from "./components/cards";

export default function App() {
  const [user, setUser] = useState(null);
  const [selectedType, setSelectedType] = useState("day");

  const [debugOpen, setDebugOpen] = useState(false);
  const [traceHistory, setTraceHistory] = useState([]);

  // --- AUTH ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // --- GAME DATA ---
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

  // --- AI SYSTEM ---
  const {
    ai,
    aiState,
    rankedLeaderboard,
    rank,
    gap,
    boostDecision,
  } = useAiSystem({
    myPost,
    leaderboard,
    selectedType,
  });

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
      <AppHeader
        user={user}
        onLogout={() => supabase.auth.signOut()}
      />

      <div className="grid gap-4">

        <PrimaryActionCard
          myPost={myPost}
          onVote={handleVote}
          voting={voting}
        />

        <BoostCard
          myPost={myPost}
          onBoost={handleBoost}
          boosting={boosting}
          decision={boostDecision}
        />

        <LeaderboardCard
          leaderboard={rankedLeaderboard}
          myPost={myPost}
          rank={rank}
        />

        <ToolsCard
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          gap={gap}
        />

      </div>

      {/* DEBUG */}
      {debugOpen && (
        <div className="mt-6 text-xs text-gray-400">
          <pre>{JSON.stringify({ aiState, ai }, null, 2)}</pre>
        </div>
      )}
    </PageShell>
  );
}
