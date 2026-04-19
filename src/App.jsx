import React from "react";

import { useAuth } from "./hooks/useAuth";
import { useUiState } from "./hooks/useUiState";
import { useGameData } from "./hooks/useGameData";
import { useAiSystem } from "./hooks/useAiSystem";

import PageShell from "./components/layout/PageShell";
import AppHeader from "./components/layout/AppHeader";

import {
  PrimaryActionCard,
  BoostCard,
  LeaderboardCard,
  ToolsCard,
} from "./components/cards";

import FounderDashboard from "./components/ui/FounderDashboard";
import AiDebugPanel from "./components/ui/AiDebugPanel";
import AiTraceHistory from "./components/ui/AiTraceHistory";

const FOUNDER_EMAILS = ["jarkko.toivanen90@gmail.com"];

export default function App() {
  const { user, authLoading, signOut } = useAuth();

  const {
    selectedType,
    setSelectedType,
    debugOpen,
    setDebugOpen,
    traceHistory,
    setTraceHistory,
  } = useUiState();

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

  const isFounder = FOUNDER_EMAILS.includes(user?.email || "");

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        Ladataan...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        Kirjaudu sisään
      </div>
    );
  }

  return (
    <PageShell>
      <AppHeader email={user.email} />

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-red-100">
          {error}
        </div>
      ) : null}

      <div className="space-y-5">
        <PrimaryActionCard
          onVote={handleVote}
          voting={voting}
          disabled={!myPost || loading}
        />

        <BoostCard
          myPost={myPost}
          boosting={boosting}
          onBoost={handleBoost}
          decision={boostDecision}
        />

        <LeaderboardCard
          rankedLeaderboard={rankedLeaderboard}
          myPost={myPost}
          rank={rank}
          gap={gap}
        />

        <ToolsCard
          selectedType={selectedType}
          onChangeType={setSelectedType}
          onRefresh={loadData}
          onSignOut={signOut}
          loading={loading}
        />

        {isFounder ? (
          <>
            <FounderDashboard ai={ai} aiState={aiState} />

            <AiDebugPanel
              isOpen={debugOpen}
              onToggle={() => setDebugOpen((prev) => !prev)}
              ai={ai}
              aiState={aiState}
              myPost={myPost}
              leaderboard={rankedLeaderboard}
            />

            <AiTraceHistory
              rows={traceHistory}
              onChangeRows={setTraceHistory}
            />
          </>
        ) : null}
      </div>
    </PageShell>
  );
}
