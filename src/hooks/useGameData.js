import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase";

export function useGameData(user, selectedType) {
  const [currentDraw, setCurrentDraw] = useState(null);
  const [myPost, setMyPost] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [recentPurchases, setRecentPurchases] = useState([]);

  const [loadingData, setLoadingData] = useState(false);
  const [voting, setVoting] = useState(false);
  const [boosting, setBoosting] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const fetchActiveDraw = useCallback(async (type) => {
    const { data, error } = await supabase
      .from("draws")
      .select("*")
      .eq("type", type)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      throw new Error(`Arvonnan haku epäonnistui: ${error.message}`);
    }

    return data;
  }, []);

  const ensureMyPost = useCallback(async (drawId, activeUser) => {
    const { data: existing, error: existingError } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", activeUser.id)
      .eq("draw_id", drawId)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Oman kolehdin haku epäonnistui: ${existingError.message}`);
    }

    if (existing) return existing;

    const { data: created, error: createError } = await supabase
      .from("posts")
      .insert({
        user_id: activeUser.id,
        draw_id: drawId,
        title: `${activeUser.email || "käyttäjä"}n kolehti`,
        votes: 0,
        momentum: 20,
        visibility: 0,
        spent_total: 0,
        boosts_used: 0,
        status: "active",
      })
      .select("*")
      .single();

    if (createError) {
      throw new Error(`Oman kolehdin luonti epäonnistui: ${createError.message}`);
    }

    return created;
  }, []);

  const loadLeaderboard = useCallback(async (drawId) => {
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, votes, momentum, visibility, spent_total, boosts_used, boosts, user_id")
      .eq("draw_id", drawId)
      .order("votes", { ascending: false })
      .order("momentum", { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(`Leaderboardin haku epäonnistui: ${error.message}`);
    }

    setLeaderboard(data || []);
    return data || [];
  }, []);

  const loadRecentPurchases = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from("purchases")
      .select("id, type, amount, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      const msg = error.message || "";
      if (
        msg.includes("does not exist") ||
        msg.includes("relation") ||
        msg.includes("schema cache")
      ) {
        setRecentPurchases([]);
        return [];
      }
      throw new Error(`Ostojen haku epäonnistui: ${error.message}`);
    }

    setRecentPurchases(data || []);
    return data || [];
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;

    setLoadingData(true);
    setError("");
    setInfo("");

    try {
      const draw = await fetchActiveDraw(selectedType);

      if (!draw) {
        setCurrentDraw(null);
        setMyPost(null);
        setLeaderboard([]);
        setError("Omaa kolehtia ei löytynyt");
        return;
      }

      setCurrentDraw(draw);

      const post = await ensureMyPost(draw.id, user);
      setMyPost(post);

      await Promise.all([
        loadLeaderboard(draw.id),
        loadRecentPurchases(user.id),
      ]);
    } catch (err) {
      setError(err.message || "Datan lataus epäonnistui.");
    } finally {
      setLoadingData(false);
    }
  }, [
    user,
    selectedType,
    fetchActiveDraw,
    ensureMyPost,
    loadLeaderboard,
    loadRecentPurchases,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVote = useCallback(async () => {
    if (!myPost || !currentDraw) return;

    setVoting(true);
    setError("");
    setInfo("");

    try {
      const { data, error } = await supabase
        .from("posts")
        .update({
          votes: Number(myPost.votes || 0) + 1,
          momentum: Number(myPost.momentum || 0) + 1,
          visibility: Number(myPost.visibility || 0) + 1,
        })
        .eq("id", myPost.id)
        .select("*")
        .single();

      if (error) throw error;

      setMyPost(data);
      setInfo("Ääni lisätty.");

      await loadLeaderboard(currentDraw.id);
    } catch (err) {
      setError(`Äänen tallennus epäonnistui: ${err.message}`);
    } finally {
      setVoting(false);
    }
  }, [myPost, currentDraw, loadLeaderboard]);

  const handleBoost = useCallback(async () => {
    if (!myPost || !currentDraw) return;

    setBoosting(true);
    setError("");
    setInfo("");

    try {
      const { data, error } = await supabase
        .from("posts")
        .update({
          momentum: Number(myPost.momentum || 0) + 5,
          visibility: Number(myPost.visibility || 0) + 3,
          spent_total: Number(myPost.spent_total || 0) + 1,
          boosts_used: Number(myPost.boosts_used || myPost.boosts || 0) + 1,
        })
        .eq("id", myPost.id)
        .select("*")
        .single();

      if (error) throw error;

      const { error: purchaseError } = await supabase.from("purchases").insert({
        user_id: user.id,
        type: "BOOST_PUSH",
        amount: 1,
      });

      if (purchaseError) {
        const msg = purchaseError.message || "";
        if (
          !msg.includes("does not exist") &&
          !msg.includes("relation") &&
          !msg.includes("schema cache")
        ) {
          throw purchaseError;
        }
      }

      setMyPost(data);
      setInfo("Boost käytetty.");

      await Promise.all([
        loadLeaderboard(currentDraw.id),
        loadRecentPurchases(user.id),
      ]);
    } catch (err) {
      setError(`Boost epäonnistui: ${err.message}`);
    } finally {
      setBoosting(false);
    }
  }, [myPost, currentDraw, user, loadLeaderboard, loadRecentPurchases]);

  return {
    currentDraw,
    myPost,
    leaderboard,
    recentPurchases,

    loadingData,
    voting,
    boosting,

    error,
    info,

    setMyPost,
    setError,
    setInfo,

    loadData,
    loadLeaderboard,
    loadRecentPurchases,

    handleVote,
    handleBoost,
  };
}
