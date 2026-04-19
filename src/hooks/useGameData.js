import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export function useGameData(user, selectedType) {
  const [myPost, setMyPost] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  const [loading, setLoading] = useState(false);
  const [voting, setVoting] = useState(false);
  const [boosting, setBoosting] = useState(false);

  const [error, setError] = useState("");

  // --- LOAD ---
  async function loadData() {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .limit(20);

      if (error) throw error;

      setLeaderboard(data || []);
      setMyPost(data?.[0] || null);
    } catch (err) {
      setError(err.message || "Datan lataus epäonnistui");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user, selectedType]);

  // --- VOTE ---
  async function handleVote() {
    if (!myPost) return;

    setVoting(true);
    setError("");

    try {
      const { error } = await supabase
        .from("posts")
        .update({
          votes: Number(myPost.votes || 0) + 1,
          momentum: Number(myPost.momentum || 0) + 1,
        })
        .eq("id", myPost.id);

      if (error) throw error;

      await loadData();
    } catch (err) {
      setError(err.message || "Vote epäonnistui");
    } finally {
      setVoting(false);
    }
  }

  // --- BOOST ---
  async function handleBoost() {
    if (!myPost) return;

    setBoosting(true);
    setError("");

    try {
      const { error } = await supabase
        .from("posts")
        .update({
          momentum: Number(myPost.momentum || 0) + 5,
          visibility: Number(myPost.visibility || 0) + 3,
          boosts_used: Number(myPost.boosts_used || 0) + 1,
        })
        .eq("id", myPost.id);

      if (error) throw error;

      await loadData();
    } catch (err) {
      setError(err.message || "Boost epäonnistui");
    } finally {
      setBoosting(false);
    }
  }

  return {
    myPost,
    leaderboard,

    loading,
    voting,
    boosting,

    error,

    loadData,
    handleVote,
    handleBoost,
  };
}
