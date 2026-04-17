import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const defaultProfile = {
  reactsToLoss: 0.5,
  reactsToAlmostWin: 0.5,
  reactsToMomentum: 0.5,
  paysInCriticalMoments: 0.5,
  ignoresOffers: 0.5,
  preferredOffer: "BOOST_PUSH",
};

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function loadAiProfile() {
  return safeParse(localStorage.getItem("kolehti_ai_profile"), defaultProfile);
}

function saveAiProfile(profile) {
  localStorage.setItem("kolehti_ai_profile", JSON.stringify(profile));
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function isFounderEmail(email) {
  const founderEmails = ["sun@email.com"];
  return founderEmails.includes(email || "");
}

async function logAppError({ userId, area, message, meta = {} }) {
  try {
    await supabase.from("app_errors").insert({
      user_id: userId || null,
      area,
      message,
      meta,
    });
  } catch {
    // no-op
  }
}

async function ensureProfileAndPost(currentUser) {
  if (!currentUser?.id || !currentUser?.email) return null;

  await supabase.from("profiles").upsert({
    id: currentUser.id,
    email: currentUser.email,
  });

  const { data: existingPost, error: postError } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (postError) throw postError;
  if (existingPost) return existingPost;

  const { data: newPost, error: insertError } = await supabase
    .from("posts")
    .insert({
      user_id: currentUser.id,
      title: `${currentUser.email.split("@")[0]}n kolehti`,
      votes: 0,
      visibility_score: 0,
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return newPost;
}

function useKolehtiAI() {
  const [profile, setProfile] = useState(loadAiProfile);

  useEffect(() => {
    saveAiProfile(profile);
  }, [profile]);

  return {
    profile,
    learnLoss() {
      setProfile((p) => ({
        ...p,
        reactsToLoss: Math.min(1, p.reactsToLoss + 0.08),
      }));
    },
    learnAlmost() {
      setProfile((p) => ({
        ...p,
        reactsToAlmostWin: Math.min(1, p.reactsToAlmostWin + 0.08),
      }));
    },
    learnPurchase(offerCode) {
      setProfile((p) => ({
        ...p,
        paysInCriticalMoments: Math.min(1, p.paysInCriticalMoments + 0.12),
        preferredOffer: offerCode,
        ignoresOffers: Math.max(0, p.ignoresOffers - 0.08),
      }));
    },
    learnIgnore() {
      setProfile((p) => ({
        ...p,
        ignoresOffers: Math.min(1, p.ignoresOffers + 0.06),
      }));
    },
    resetProfile() {
      setProfile(defaultProfile);
    },
  };
}

function getBoostConfig(drawType) {
  if (drawType === "day") return { limit: 2, prices: [2, 5] };
  if (drawType === "week") return { limit: 4, prices: [2, 4, 7, 11] };
  if (drawType === "month") return { limit: 6, prices: [2, 4, 6, 9, 13, 18] };
  return { limit: 2, prices: [2, 5] };
}

function getNextBoost(drawType, used) {
  const config = getBoostConfig(drawType);
  if (used >= config.limit) return null;
  return {
    price: config.prices[used],
    remaining: config.limit - used,
    limit: config.limit,
    used,
  };
}

function getBoostCooldown(drawType) {
  if (drawType === "day") return 2 * 60 * 1000;
  if (drawType === "week") return 10 * 60 * 1000;
  if (drawType === "month") return 30 * 60 * 1000;
  return 5 * 60 * 1000;
}

function getRemainingCooldown(lastBoostAt, drawType) {
  if (!lastBoostAt) return 0;
  const cooldown = getBoostCooldown(drawType);
  const elapsed = Date.now() - new Date(lastBoostAt).getTime();
  return Math.max(0, cooldown - elapsed);
}

function formatCooldown(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function scoreBoostMoment({ justLost, gapToNext, momentum, boostsRemaining, boostsUsed, profile }) {
  if (boostsRemaining <= 0) return 0;
  let score = 0;
  if (justLost) score += 45 + profile.reactsToLoss * 30;
  if (gapToNext <= 1) score += 30 + profile.reactsToAlmostWin * 25;
  else if (gapToNext === 2) score += 12;
  if (momentum >= 70) score += 18 + profile.reactsToMomentum * 15;
  else if (momentum >= 50) score += 10;
  if (boostsRemaining === 1) score -= 8;
  if (boostsUsed === 0) score += 6;
  return score;
}

function shouldSuppressBoost({ boostsRemaining, ignoresOffers }) {
  if (boostsRemaining <= 0) return true;
  if (ignoresOffers >= 0.85) return true;
  return false;
}

function getTimingLevel(score, drawType, nextBoostPrice) {
  let goodThreshold = 40;
  let perfectThreshold = 62;

  if (drawType === "day") {
    goodThreshold = 36;
    perfectThreshold = 58;
  }
  if (drawType === "week") {
    goodThreshold = 42;
    perfectThreshold = 64;
  }
  if (drawType === "month") {
    goodThreshold = 46;
    perfectThreshold = 68;
  }

  if (nextBoostPrice >= 10) {
    goodThreshold += 6;
    perfectThreshold += 8;
  } else if (nextBoostPrice >= 5) {
    goodThreshold += 3;
    perfectThreshold += 4;
  }

  if (score >= perfectThreshold) return "perfect";
  if (score >= goodThreshold) return "good";
  return "wait";
}

function getTimingMessage(level, justLost, gapToNext, momentum) {
  if (level === "perfect") {
    if (justLost) return "Täydellinen vastaiskun hetki.";
    if (gapToNext <= 1) return "Täydellinen nousuikkuna on auki.";
    if (momentum >= 70) return "Täydellinen hetki vahvistaa momentumia.";
    return "Täydellinen boost-ikkuna juuri nyt.";
  }
  if (level === "good") {
    if (justLost) return "Hyvä hetki vastata tilanteeseen.";
    if (gapToNext <= 1) return "Hyvä hetki yrittää nousua.";
    return "Boosti voi auttaa tässä kohdassa.";
  }
  return "AI suosittelee odottamaan parempaa hetkeä.";
}

function getTimingMultiplier(level) {
  if (level === "perfect") return { momentumMultiplier: 1.5, gapBonus: 1 };
  if (level === "good") return { momentumMultiplier: 1.15, gapBonus: 0 };
  return { momentumMultiplier: 1, gapBonus: 0 };
}

function getBoostEffect(drawType, currentGap, currentRank) {
  if (drawType === "day") return { momentumGain: 25, gapReduction: currentRank > 1 ? 1 : 0, visibilityBonus: 1 };
  if (drawType === "week") return { momentumGain: 20, gapReduction: currentRank > 1 && currentGap <= 2 ? 1 : 0, visibilityBonus: currentGap <= 1 ? 1 : 0 };
  if (drawType === "month") return { momentumGain: 15, gapReduction: currentRank > 1 && currentGap <= 1 ? 1 : 0, visibilityBonus: 1 };
  return { momentumGain: 20, gapReduction: currentRank > 1 ? 1 : 0, visibilityBonus: 0 };
}

function getBoostEffectLabel(drawType) {
  if (drawType === "day") return "Nopea nousuboosti";
  if (drawType === "week") return "Tasapainoinen nousuboosti";
  if (drawType === "month") return "Pitkän pelin vahvistus";
  return "Boosti";
}

function getVisibilityEffect(drawType, timing) {
  let base = 0;
  if (drawType === "day") base = 18;
  if (drawType === "week") base = 12;
  if (drawType === "month") base = 8;
  if (timing === "perfect") return base + 8;
  if (timing === "good") return base + 3;
  return base;
}

function decayVisibility(score, updatedAt) {
  if (!updatedAt) return score || 0;
  const elapsedMs = Date.now() - new Date(updatedAt).getTime();
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
  const decay = elapsedMinutes * 2;
  return Math.max(0, (score || 0) - decay);
}

function clampPrice(price, min, max) {
  return Math.max(min, Math.min(max, price));
}

function getBaseBoostPrice(drawType, boostsUsed) {
  const nextBoost = getNextBoost(drawType, boostsUsed);
  return nextBoost ? nextBoost.price : null;
}

function getAdaptivePriceLevel3({ drawType, boostsUsed, timing, score, conversionStats, aiModel }) {
  const basePrice = getBaseBoostPrice(drawType, boostsUsed);
  if (basePrice == null) return null;

  let adjusted = basePrice;
  if (timing === "perfect") adjusted += 1;
  else if (timing === "wait") adjusted -= 1;
  if (score >= 75) adjusted += 1;
  else if (score < 40) adjusted -= 1;

  const purchaseRate = conversionStats?.purchaseRate || 0;
  if (purchaseRate >= 35) adjusted += 1;
  else if (purchaseRate <= 10) adjusted -= 1;

  if (aiModel) {
    if (Number(aiModel.price_sensitivity) > 0.7) adjusted -= 1;
    if (Number(aiModel.price_sensitivity) < 0.3) adjusted += 1;
    if (drawType === "day" && Number(aiModel.prefers_day_draws) > 0.7) adjusted += 1;
    if (drawType === "week" && Number(aiModel.prefers_week_draws) > 0.7) adjusted += 1;
    if (drawType === "month" && Number(aiModel.prefers_month_draws) > 0.7) adjusted += 1;
  }

  return clampPrice(adjusted, Math.max(1, basePrice - 1), basePrice + 2);
}

function shouldShowOfferLevel3({ boostDecision, aiModel }) {
  if (!boostDecision?.show) return false;
  if (!aiModel) return boostDecision.show;

  if (Number(aiModel.ignores_offers) > 0.8 && boostDecision.timing !== "perfect") {
    return false;
  }
  if (
    Number(aiModel.price_sensitivity) > 0.8 &&
    (boostDecision.nextBoost?.price || 0) >= 5 &&
    boostDecision.timing !== "perfect"
  ) {
    return false;
  }
  return true;
}

function safeRate(num, den) {
  if (!den || den <= 0) return 0;
  return Math.min(100, (num / den) * 100);
}

function getAIBoostDecision({ drawType, boostsUsed, justLost, gapToNext, momentum, profile, lastBoostAt }) {
  const nextBoost = getNextBoost(drawType, boostsUsed);

  if (!nextBoost) {
    return {
      show: false,
      reason: "no_boosts_left",
      score: 0,
      timing: "wait",
      message: "Boostit käytetty tässä arvonnassa.",
      nextBoost: null,
      multiplier: { momentumMultiplier: 1, gapBonus: 0 },
    };
  }

  const cooldown = getRemainingCooldown(lastBoostAt, drawType);
  if (cooldown > 0) {
    return {
      show: false,
      reason: "cooldown",
      score: 0,
      timing: "wait",
      message: `Odota ${formatCooldown(cooldown)} ennen seuraavaa boostia`,
      nextBoost,
      multiplier: { momentumMultiplier: 1, gapBonus: 0 },
    };
  }

  if (shouldSuppressBoost({ boostsRemaining: nextBoost.remaining, ignoresOffers: profile.ignoresOffers })) {
    return {
      show: false,
      reason: "suppressed",
      score: 0,
      timing: "wait",
      message: "AI ei suosittele boostia vielä tässä hetkessä.",
      nextBoost,
      multiplier: { momentumMultiplier: 1, gapBonus: 0 },
    };
  }

  const score = scoreBoostMoment({
    justLost,
    gapToNext,
    momentum,
    boostsRemaining: nextBoost.remaining,
    boostsUsed,
    profile,
  });

  const timing = getTimingLevel(score, drawType, nextBoost.price);
  const show = timing === "good" || timing === "perfect";
  const message = getTimingMessage(timing, justLost, gapToNext, momentum);
  const multiplier = getTimingMultiplier(timing);

  return {
    show,
    score,
    timing,
    multiplier,
    nextBoost,
    message,
  };
}

function getSmartCTA({ rank, gapToNext, justLost, momentum, profile }) {
  if (justLost && profile.reactsToLoss > 0.4) {
    return { title: "⚠️ Sinut ohitettiin", cta: "🔥 Ota paikka takaisin" };
  }
  if (rank > 1 && gapToNext <= 1 && profile.reactsToAlmostWin > 0.4) {
    return { title: "⚡ Yksi ääni riittää", cta: "🚀 Nosta sijoitusta" };
  }
  if (momentum > 50 && profile.reactsToMomentum > 0.4) {
    return { title: "🔥 Olet vauhdissa", cta: "⚡ Jatka nousua" };
  }
  return { title: "👍 Tilanne auki", cta: "👍 Anna ääni" };
}

function getShareLink(user) {
  return `${window.location.origin}?ref=${user.id}`;
}

function getTimeLeft(drawType) {
  if (drawType === "day") return "päättyy tänään";
  if (drawType === "week") return "päättyy tällä viikolla";
  if (drawType === "month") return "päättyy tässä kuussa";
  return "päättyy pian";
}

function cardStyle(extra = {}) {
  return {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
    ...extra,
  };
}

function buttonStyle(kind = "primary") {
  const base = {
    width: "100%",
    border: "none",
    borderRadius: 14,
    padding: "14px 16px",
    fontWeight: 800,
    fontSize: 16,
    cursor: "pointer",
  };

  if (kind === "accent") {
    return {
      ...base,
      background: "linear-gradient(135deg,#f59e0b,#f97316)",
      color: "#111827",
    };
  }

  if (kind === "ghost") {
    return {
      ...base,
      background: "rgba(255,255,255,0.06)",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.1)",
    };
  }

  return {
    ...base,
    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    color: "#fff",
  };
}

function inputStyle() {
  return {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontSize: 16,
    boxSizing: "border-box",
    outline: "none",
  };
}

function LoginScreen({ email, setEmail, onLogin, loading, message }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(99,102,241,0.16), transparent 30%), #05070D",
        color: "#fff",
        padding: 20,
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={cardStyle()}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.18em", opacity: 0.7 }}>
            KOLEHTI
          </div>
          <h1 style={{ margin: "8px 0 0", fontSize: 38, lineHeight: 1, fontWeight: 900 }}>
            Kirjaudu sisään
          </h1>
          <div style={{ marginTop: 10, opacity: 0.75 }}>
            Saat sähköpostiisi kirjautumislinkin.
          </div>

          <div style={{ marginTop: 18 }}>
            <input
              type="email"
              placeholder="sinä@esimerkki.fi"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle()}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <button onClick={onLogin} style={buttonStyle()} disabled={loading}>
              {loading ? "Lähetetään..." : "Lähetä kirjautumislinkki"}
            </button>
          </div>

          {message ? <div style={{ marginTop: 14, opacity: 0.85, fontSize: 14 }}>{message}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const ai = useKolehtiAI();

  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");

  const [posts, setPosts] = useState([]);
  const [postsLoaded, setPostsLoaded] = useState(false);

  const [drawType, setDrawType] = useState("day");
  const [drawId, setDrawId] = useState(null);
  const [boostsUsed, setBoostsUsed] = useState(0);
  const [lastBoostAt, setLastBoostAt] = useState(null);
  const [boostLoaded, setBoostLoaded] = useState(false);

  const [purchases, setPurchases] = useState([]);
  const [purchasesLoaded, setPurchasesLoaded] = useState(false);

  const [offerStats, setOfferStats] = useState([]);
  const [offerStatsLoaded, setOfferStatsLoaded] = useState(false);
  const [lastShownOfferKey, setLastShownOfferKey] = useState(null);

  const [aiModel, setAiModel] = useState(null);
  const [aiModelLoaded, setAiModelLoaded] = useState(false);

  const [rank, setRank] = useState(3);
  const [gap, setGap] = useState(2);
  const [momentum, setMomentum] = useState(20);
  const [lastEvent, setLastEvent] = useState(null);
  const [toast, setToast] = useState("");
  const [voteBusy, setVoteBusy] = useState(false);
  const [isFounder, setIsFounder] = useState(false);

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.background = "#05070D";
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
      setAuthLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoaded(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setIsFounder(isFounderEmail(user?.email));
  }, [user?.email]);

  useEffect(() => {
    if (!user?.id || !user?.email) return;

    ensureProfileAndPost(user).catch((err) => {
      setToast("Postin luonti epäonnistui");
      logAppError({ userId: user.id, area: "ensure_profile_post", message: err.message });
    });
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!user?.id) return;

    async function applySafeReferral() {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (!ref) return;
      if (ref === user.id) return;

      const { data: me } = await supabase
        .from("profiles")
        .select("id, referred_by")
        .eq("id", user.id)
        .maybeSingle();

      if (!me) return;
      if (me.referred_by) return;

      await supabase.from("profiles").update({ referred_by: ref }).eq("id", user.id);
    }

    applySafeReferral().catch((err) => {
      logAppError({ userId: user.id, area: "referral_apply", message: err.message });
    });
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    async function loadAiModel() {
      try {
        const { data: existing } = await supabase
          .from("ai_user_models")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!existing) {
          await supabase.from("ai_user_models").insert({ user_id: user.id });
        }

        const { data } = await supabase
          .from("ai_user_models")
          .select("*")
          .eq("user_id", user.id)
          .single();

        setAiModel(data);
      } catch (err) {
        await logAppError({ userId: user.id, area: "load_ai_model", message: err.message });
      } finally {
        setAiModelLoaded(true);
      }
    }

    loadAiModel();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    async function loadPosts() {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("id, user_id, title, votes, visibility_score, visibility_updated_at, created_at")
          .order("votes", { ascending: false })
          .order("visibility_score", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(20);

        if (error) throw error;

        const rows = (data || []).map((post) => ({
          ...post,
          effective_visibility: decayVisibility(post.visibility_score, post.visibility_updated_at),
        }));

        setPosts(rows);

        const myIndex = rows.findIndex((p) => p.user_id === user.id);
        if (myIndex >= 0) {
          const myRank = myIndex + 1;
          const myVotes = rows[myIndex].votes || 0;
          const aboveVotes = myIndex > 0 ? rows[myIndex - 1].votes || 0 : myVotes;
          setRank(myRank);
          setGap(myRank === 1 ? 0 : Math.max(1, aboveVotes - myVotes));
        }
      } catch (err) {
        setToast("Postien lataus epäonnistui");
        await logAppError({ userId: user.id, area: "load_posts", message: err.message });
      } finally {
        setPostsLoaded(true);
      }
    }

    loadPosts();

    const channel = supabase
      .channel("posts")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) => {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === payload.new.id
                ? { ...payload.new, effective_visibility: decayVisibility(payload.new.visibility_score, payload.new.visibility_updated_at) }
                : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    async function loadDrawState() {
      try {
        let { data: draw } = await supabase
          .from("draws")
          .select("*")
          .eq("type", drawType)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!draw) {
          const { data: newDraw, error: drawError } = await supabase
            .from("draws")
            .insert({ type: drawType, title: drawType, is_active: true })
            .select()
            .single();

          if (drawError) throw drawError;
          draw = newDraw;
        }

        setDrawId(draw.id);

        let { data: userDraw } = await supabase
          .from("user_draws")
          .select("*")
          .eq("user_id", user.id)
          .eq("draw_id", draw.id)
          .maybeSingle();

        if (!userDraw) {
          const { data: newUserDraw, error: userDrawError } = await supabase
            .from("user_draws")
            .insert({ user_id: user.id, draw_id: draw.id, boosts_used: 0 })
            .select()
            .single();

          if (userDrawError) throw userDrawError;
          userDraw = newUserDraw;
        }

        setBoostsUsed(userDraw?.boosts_used || 0);
        setLastBoostAt(userDraw?.last_boost_at || null);
      } catch (err) {
        setToast("Boost-tilan lataus epäonnistui");
        await logAppError({ userId: user.id, area: "load_draw_state", message: err.message });
      } finally {
        setBoostLoaded(true);
      }
    }

    setBoostLoaded(false);
    loadDrawState();
  }, [user?.id, drawType]);

  useEffect(() => {
    if (!user?.id) return;

    async function loadPurchases() {
      try {
        const { data, error } = await supabase
          .from("purchases")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setPurchases(data || []);
      } catch (err) {
        setPurchases([]);
        await logAppError({ userId: user.id, area: "load_purchases", message: err.message });
      } finally {
        setPurchasesLoaded(true);
      }
    }

    loadPurchases();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    async function loadOfferStats() {
      try {
        const { data, error } = await supabase
          .from("boost_offer_events")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setOfferStats(data || []);
      } catch (err) {
        setOfferStats([]);
        await logAppError({ userId: user.id, area: "load_offer_stats", message: err.message });
      } finally {
        setOfferStatsLoaded(true);
      }
    }

    loadOfferStats();
  }, [user?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const effectiveProfile = aiModel
    ? {
        reactsToLoss: Number(aiModel.reacts_to_loss),
        reactsToAlmostWin: Number(aiModel.reacts_to_almost_win),
        reactsToMomentum: Number(aiModel.reacts_to_momentum),
        paysInCriticalMoments: Number(aiModel.pays_in_critical_moments),
        ignoresOffers: Number(aiModel.ignores_offers),
        preferredOffer: "BOOST",
      }
    : ai.profile;

  const smart = useMemo(
    () =>
      getSmartCTA({
        rank,
        gapToNext: gap,
        justLost: lastEvent === "lost",
        momentum,
        profile: effectiveProfile,
      }),
    [rank, gap, momentum, lastEvent, effectiveProfile]
  );

  const conversionStats = useMemo(() => {
    const shown = offerStats.filter((e) => e.action === "shown").length;
    const clicked = offerStats.filter((e) => e.action === "clicked").length;
    const purchased = offerStats.filter((e) => e.action === "purchased").length;
    const ignored = offerStats.filter((e) => e.action === "ignored").length;

    const byTiming = ["perfect", "good", "wait"].reduce((acc, timing) => {
      const timingRows = offerStats.filter((e) => e.timing === timing);
      const timingShown = timingRows.filter((e) => e.action === "shown").length;
      const timingPurchased = timingRows.filter((e) => e.action === "purchased").length;

      acc[timing] = {
        shown: timingShown,
        purchased: timingPurchased,
        conversion: safeRate(timingPurchased, timingShown),
      };

      return acc;
    }, {});

    const byDrawType = ["day", "week", "month"].reduce((acc, type) => {
      const rows = offerStats.filter((e) => e.draw_type === type);
      const typeShown = rows.filter((e) => e.action === "shown").length;
      const typePurchased = rows.filter((e) => e.action === "purchased").length;

      acc[type] = {
        shown: typeShown,
        purchased: typePurchased,
        conversion: safeRate(typePurchased, typeShown),
      };

      return acc;
    }, {});

    return {
      shown,
      clicked,
      purchased,
      ignored,
      clickRate: safeRate(clicked, shown),
      purchaseRate: safeRate(purchased, shown),
      ignoreRate: safeRate(ignored, shown),
      byTiming,
      byDrawType,
    };
  }, [offerStats]);

  const founderStats = useMemo(() => {
    if (!isFounder) return null;

    const purchasesCompleted = purchases.filter((p) => p.status === "completed");
    const revenue = purchasesCompleted.reduce((sum, p) => sum + Number(p.price_eur || 0), 0);
    const totalUsers = new Set(purchasesCompleted.map((p) => p.user_id)).size;

    const shown = offerStats.filter((e) => e.action === "shown").length;
    const clicked = offerStats.filter((e) => e.action === "clicked").length;
    const purchased = offerStats.filter((e) => e.action === "purchased").length;
    const ignored = offerStats.filter((e) => e.action === "ignored").length;

    const avgPrice = purchasesCompleted.length > 0 ? revenue / purchasesCompleted.length : 0;

    const byTiming = ["perfect", "good", "wait"].reduce((acc, t) => {
      const rows = offerStats.filter((e) => e.timing === t);
      const s = rows.filter((e) => e.action === "shown").length;
      const p = rows.filter((e) => e.action === "purchased").length;
      acc[t] = { shown: s, purchased: p, conversion: safeRate(p, s) };
      return acc;
    }, {});

    const byDraw = ["day", "week", "month"].reduce((acc, d) => {
      const rows = offerStats.filter((e) => e.draw_type === d);
      const s = rows.filter((e) => e.action === "shown").length;
      const p = rows.filter((e) => e.action === "purchased").length;
      acc[d] = { shown: s, purchased: p, conversion: safeRate(p, s) };
      return acc;
    }, {});

    return {
      revenue,
      totalUsers,
      purchases: purchasesCompleted.length,
      arpu: totalUsers ? revenue / totalUsers : 0,
      avgPrice,
      funnel: {
        shown,
        clicked,
        purchased,
        ignored,
        clickRate: safeRate(clicked, shown),
        purchaseRate: safeRate(purchased, shown),
      },
      byTiming,
      byDraw,
    };
  }, [isFounder, purchases, offerStats]);

  const boostDecision = useMemo(() => {
    return getAIBoostDecision({
      drawType,
      boostsUsed,
      justLost: lastEvent === "lost",
      gapToNext: gap,
      momentum,
      profile: effectiveProfile,
      lastBoostAt,
    });
  }, [drawType, boostsUsed, lastEvent, gap, momentum, effectiveProfile, lastBoostAt]);

  const showBoostCard = useMemo(() => {
    return shouldShowOfferLevel3({ boostDecision, aiModel });
  }, [boostDecision, aiModel]);

  const cooldownLeft = useMemo(() => {
    return getRemainingCooldown(lastBoostAt, drawType);
  }, [lastBoostAt, drawType]);

  const baseBoostEffect = useMemo(() => {
    return getBoostEffect(drawType, gap, rank);
  }, [drawType, gap, rank]);

  const adaptivePrice = useMemo(() => {
    return getAdaptivePriceLevel3({
      drawType,
      boostsUsed,
      timing: boostDecision?.timing,
      score: boostDecision?.score || 0,
      conversionStats,
      aiModel,
    });
  }, [drawType, boostsUsed, boostDecision?.timing, boostDecision?.score, conversionStats, aiModel]);

  useEffect(() => {
    if (!user?.id) return;
    if (!boostDecision?.show) return;
    if (!boostDecision?.nextBoost) return;
    if (!showBoostCard) return;

    const offerKey = [
      drawType,
      boostsUsed,
      boostDecision.timing,
      adaptivePrice ?? boostDecision.nextBoost.price,
      Math.round(boostDecision.score),
    ].join(":");

    if (lastShownOfferKey === offerKey) return;

    async function logShown() {
      try {
        await supabase.from("boost_offer_events").insert({
          user_id: user.id,
          draw_type: drawType,
          timing: boostDecision.timing,
          price_eur: adaptivePrice ?? boostDecision.nextBoost.price,
          action: "shown",
          ai_score: Math.round(boostDecision.score),
          meta: {
            boosts_used: boostsUsed,
            gap,
            momentum,
          },
        });
        setLastShownOfferKey(offerKey);
      } catch (err) {
        await logAppError({ userId: user.id, area: "offer_shown", message: err.message });
      }
    }

    logShown();
  }, [
    user?.id,
    boostDecision?.show,
    boostDecision?.timing,
    boostDecision?.score,
    boostDecision?.nextBoost?.price,
    adaptivePrice,
    drawType,
    boostsUsed,
    gap,
    momentum,
    lastShownOfferKey,
    showBoostCard,
  ]);

  async function login() {
    if (!email) {
      setLoginMessage("Lisää sähköposti");
      return;
    }

    setLoginLoading(true);
    setLoginMessage("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });

      if (error) {
        setLoginMessage(`Virhe: ${error.message}`);
        await logAppError({ area: "login", message: error.message });
      } else {
        setLoginMessage("Tarkista sähköposti");
      }
    } finally {
      setLoginLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setToast("Kirjauduit ulos");
  }

  async function vote() {
    if (voteBusy) return;
    setVoteBusy(true);

    try {
      const { data: recentVotes, error: rateError } = await supabase
        .from("vote_logs")
        .select("id, created_at")
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 2000).toISOString());

      if (rateError) throw rateError;
      if ((recentVotes || []).length > 0) {
        setToast("⏳ Odota hetki ennen seuraavaa ääntä");
        return;
      }

      let activePost = posts.find((p) => p.user_id === user.id);
      if (!activePost) {
        await ensureProfileAndPost(user);
        activePost = posts.find((p) => p.user_id === user.id);
      }

      if (!activePost?.id) {
        setToast("Omaa kolehtia ei löytynyt");
        return;
      }

      const nextVotes = (activePost.votes || 0) + 1;

      const { error: updateError } = await supabase
        .from("posts")
        .update({ votes: nextVotes })
        .eq("id", activePost.id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      await supabase.from("vote_logs").insert({ user_id: user.id });
      await supabase.from("events").insert({
        user_id: user.id,
        type: "vote",
        value: 1,
        meta: { draw_type: drawType },
      });

      setPosts((prev) => prev.map((post) => (post.id === activePost.id ? { ...post, votes: nextVotes } : post)));
      setMomentum((m) => Math.min(100, m + 10));
      setLastEvent("vote");
      setToast("👍 Ääni annettu");

      if (gap <= 1) ai.learnAlmost();

      const { data: me } = await supabase
        .from("profiles")
        .select("referred_by, referral_reward_granted")
        .eq("id", user.id)
        .maybeSingle();

      if (me?.referred_by && !me?.referral_reward_granted) {
        const { data: refPost } = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", me.referred_by)
          .maybeSingle();

        if (refPost) {
          await supabase.from("posts").update({ votes: (refPost.votes || 0) + 1 }).eq("id", refPost.id);
          await supabase.from("profiles").update({ referral_reward_granted: true }).eq("id", user.id);
        }
      }
    } catch (err) {
      setToast("Äänestys epäonnistui");
      await logAppError({ userId: user?.id, area: "vote", message: err.message });
    } finally {
      setVoteBusy(false);
    }
  }

  function lose() {
    setLastEvent("lost");
    setGap(1);
    setToast("⚠️ Sinut ohitettiin");
    ai.learnLoss();
  }

  async function buyBoost() {
    const nextBoost = boostDecision?.nextBoost;
    if (!nextBoost || !drawId) {
      setToast("🚫 Boostit käytetty tässä arvonnassa");
      return;
    }

    const remaining = getRemainingCooldown(lastBoostAt, drawType);
    if (remaining > 0) {
      setToast(`⏳ Odota ${formatCooldown(remaining)}`);
      return;
    }

    try {
      const { data: authData } = await supabase.auth.getSession();
      const accessToken = authData?.session?.access_token;
      if (!accessToken) {
        setToast("Kirjaudu uudelleen");
        return;
      }

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          drawType,
          drawId,
          timing: boostDecision.timing,
          aiScore: Math.round(boostDecision.score),
          purchaseRate: conversionStats.purchaseRate || 0,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setToast(json.error || "Virhe checkoutissa");
        await logAppError({ userId: user.id, area: "create_checkout", message: json.error || "checkout failed" });
        return;
      }

      await supabase.from("boost_offer_events").insert({
        user_id: user.id,
        draw_type: drawType,
        timing: boostDecision.timing,
        price_eur: adaptivePrice ?? nextBoost.price,
        action: "clicked",
        ai_score: Math.round(boostDecision.score),
        meta: {
          boosts_used: boostsUsed,
          gap,
          momentum,
          stripe_session_id: json.sessionId,
        },
      });

      window.location.href = json.url;
    } catch (err) {
      setToast("Checkout epäonnistui");
      await logAppError({ userId: user.id, area: "buy_boost", message: err.message });
    }
  }

  async function ignoreBoost() {
    const finalPrice = adaptivePrice ?? boostDecision.nextBoost?.price ?? 0;

    try {
      if (boostDecision.nextBoost) {
        await supabase.from("boost_offer_events").insert({
          user_id: user.id,
          draw_type: drawType,
          timing: boostDecision.timing || "wait",
          price_eur: finalPrice,
          action: "ignored",
          ai_score: Math.round(boostDecision.score || 0),
          meta: {
            boosts_used: boostsUsed,
            gap,
            momentum,
          },
        });

        await supabase.from("events").insert({
          user_id: user.id,
          type: "boost_ignored",
          value: 0,
          meta: {
            draw_type: drawType,
            next_price: finalPrice,
            ai_score: Math.round(boostDecision.score || 0),
          },
        });

        if (aiModel) {
          const patch = {
            ignores_offers: clamp01(Number(aiModel.ignores_offers || 0.5) + 0.05),
            price_sensitivity: clamp01(Number(aiModel.price_sensitivity || 0.5) + (finalPrice >= 5 ? 0.04 : 0.01)),
            updated_at: new Date().toISOString(),
          };

          await supabase.from("ai_user_models").update(patch).eq("user_id", user.id);
          setAiModel((prev) => (prev ? { ...prev, ...patch } : prev));
        }
      }

      setToast("👌 Boost ohitettu");
      ai.learnIgnore();
    } catch (err) {
      await logAppError({ userId: user.id, area: "ignore_boost", message: err.message });
    }
  }

  function resetAll() {
    setMomentum(20);
    setLastEvent(null);
    setToast("↺ Tila resetoitu");
    ai.resetProfile();
  }

  const leaderboard = posts.slice(0, 20);
  const myPost = posts.find((p) => p.user_id === user?.id);
  const totalSpent = purchases.reduce((sum, item) => sum + Number(item.price_eur || 0), 0);

  if (!authLoaded) {
    return (
      <div style={{ minHeight: "100vh", background: "#05070D", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        Ladataan...
      </div>
    );
  }

  if (!user) {
    return <LoginScreen email={email} setEmail={setEmail} onLogin={login} loading={loginLoading} message={loginMessage} />;
  }

  if (!postsLoaded || !purchasesLoaded || !boostLoaded || !offerStatsLoaded || !aiModelLoaded) {
    return (
      <div style={{ minHeight: "100vh", background: "#05070D", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        Ladataan dataa...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, rgba(99,102,241,0.16), transparent 30%), #05070D",
        color: "#fff",
        padding: 20,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {toast ? (
          <div style={{ ...cardStyle({ marginBottom: 12, textAlign: "center", fontWeight: 800, background: "rgba(17,24,39,0.92)" }) }}>
            {toast}
          </div>
        ) : null}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.18em", opacity: 0.7 }}>KOLEHTI</div>
          <h1 style={{ margin: "8px 0 0", fontSize: 42, lineHeight: 1, fontWeight: 900 }}>Kolehti AI</h1>
          <div style={{ marginTop: 10, opacity: 0.75 }}>{user.email || "Kirjautunut käyttäjä"}</div>
        </div>

        <div style={{ ...cardStyle(), marginBottom: 12 }}>
          <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 10 }}>Arvonnan tyyppi</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {["day", "week", "month"].map((type) => (
              <button
                key={type}
                onClick={() => setDrawType(type)}
                style={{ ...buttonStyle(type === drawType ? "accent" : "ghost"), padding: "12px 10px", fontSize: 14 }}
              >
                {type === "day" ? "Päivä" : type === "week" ? "Viikko" : "Kuukausi"}
              </button>
            ))}
          </div>
          <div style={{ color: "#f87171", fontSize: 13, marginTop: 10 }}>⏳ {getTimeLeft(drawType)}</div>
        </div>

        <div style={{ ...cardStyle(), marginBottom: 12 }}>
          <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 10 }}>Oma tilanne</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>Sijoitus: #{rank}</div>
          <div style={{ marginTop: 8, fontSize: 20, fontWeight: 800 }}>{smart.title}</div>
          <div style={{ marginTop: 10, opacity: 0.82 }}>Ero: {gap} · Momentum: {momentum}</div>
          <div style={{ marginTop: 10, opacity: 0.82 }}>Omat äänet: {myPost?.votes ?? 0}</div>
          <div style={{ marginTop: 10, opacity: 0.82 }}>Näkyvyys: {myPost?.effective_visibility ?? myPost?.visibility_score ?? 0}</div>
          <div style={{ marginTop: 10, opacity: 0.82 }}>Ostot yhteensä: {totalSpent.toFixed(2)} €</div>
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => {
                const link = getShareLink(user);
                navigator.clipboard.writeText(link);
                setToast("🔗 Linkki kopioitu");
              }}
              style={buttonStyle("ghost")}
            >
              Jaa oma kolehti
            </button>
          </div>
        </div>

        <div style={{ ...cardStyle(), marginBottom: 12 }}>
          <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 12 }}>Päätoiminto</div>
          <button onClick={vote} style={buttonStyle()} disabled={voteBusy}>
            {smart.cta}
          </button>
          {gap === 1 ? (
            <div style={{ color: "#f59e0b", fontWeight: 900, marginTop: 12 }}>
              🔥 YKSI ÄÄNI RIITTÄÄ VOITTOON
            </div>
          ) : null}
        </div>

        {showBoostCard ? (
          <div
            style={{
              ...cardStyle({
                marginBottom: 12,
                background:
                  boostDecision.timing === "perfect"
                    ? "linear-gradient(135deg, rgba(245,158,11,0.20), rgba(239,68,68,0.18))"
                    : "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(99,102,241,0.10))",
              }),
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 900, color: "#f59e0b" }}>🚀 AI boost-ehdotus</div>
            <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900 }}>{boostDecision.message}</div>

            <div style={{ marginTop: 10, opacity: 0.82 }}>Boostit: {boostsUsed}/{getBoostConfig(drawType).limit}</div>
            <div style={{ marginTop: 6, opacity: 0.82 }}>Seuraava boosti: {adaptivePrice} €</div>
            <div style={{ marginTop: 6, opacity: 0.65, fontSize: 13 }}>Perushinta: {boostDecision.nextBoost?.price} €</div>
            <div style={{ marginTop: 6, opacity: 0.72, fontSize: 13 }}>
              +{baseBoostEffect.momentumGain} momentum
              {baseBoostEffect.gapReduction > 0 ? ` · gap -${baseBoostEffect.gapReduction}` : ""}
              {boostDecision.timing ? ` · näkyvyys +${getVisibilityEffect(drawType, boostDecision.timing)}` : ""}
            </div>
            <div style={{ color: "#f87171", fontSize: 13, marginTop: 6 }}>
              Vain {getBoostConfig(drawType).limit - boostsUsed} jäljellä
            </div>
            {boostDecision.timing === "perfect" ? (
              <div style={{ color: "#f59e0b", fontWeight: 800, marginTop: 6 }}>🔥 Paras hetki juuri nyt</div>
            ) : null}
            {cooldownLeft > 0 ? (
              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>⏳ Seuraava boosti: {formatCooldown(cooldownLeft)}</div>
            ) : null}
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <button
                onClick={buyBoost}
                disabled={cooldownLeft > 0}
                style={{
                  ...buttonStyle("accent"),
                  opacity: cooldownLeft > 0 ? 0.5 : 1,
                  cursor: cooldownLeft > 0 ? "not-allowed" : "pointer",
                }}
              >
                Käytä boosti ({adaptivePrice} €)
              </button>
              <button onClick={ignoreBoost} style={buttonStyle("ghost")}>Ei nyt</button>
            </div>
          </div>
        ) : (
          <div style={{ ...cardStyle(), marginBottom: 12, opacity: 0.85 }}>
            <div style={{ fontWeight: 800 }}>Boostit</div>
            <div style={{ marginTop: 8 }}>{boostsUsed}/{getBoostConfig(drawType).limit} käytetty</div>
            <div style={{ marginTop: 8, fontSize: 14 }}>
              {boostDecision.nextBoost ? `Seuraava boosti: ${adaptivePrice} €` : "Ei boosteja jäljellä tässä arvonnassa"}
            </div>
            {boostDecision.nextBoost ? <div style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>Perushinta: {boostDecision.nextBoost.price} €</div> : null}
            <div style={{ marginTop: 8, fontSize: 14 }}>{boostDecision.message}</div>
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.72 }}>
              Seuraavan boostin vaikutus olisi: +{baseBoostEffect.momentumGain} momentum
              {baseBoostEffect.gapReduction > 0 ? ` · gap -${baseBoostEffect.gapReduction}` : ""}
            </div>
          </div>
        )}

        <div style={cardStyle({ marginBottom: 12 })}>
          <div style={{ fontWeight: 800 }}>🎁 Kutsu kaveri</div>
          <div style={{ marginTop: 6 }}>Saat referral-edun kun uusi käyttäjä liittyy ja äänestää.</div>
          <button
            onClick={() => {
              const link = getShareLink(user);
              navigator.clipboard.writeText(link);
              setToast("🔗 Linkki kopioitu");
            }}
            style={{ ...buttonStyle(), marginTop: 12 }}
          >
            Kopioi linkki
          </button>
        </div>

        <div style={{ ...cardStyle(), marginBottom: 12 }}>
          <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 12 }}>Leaderboard</div>
          <div style={{ display: "grid", gap: 8 }}>
            {leaderboard.map((post, index) => (
              <div
                key={post.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: post.user_id === user.id ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  #{index + 1} {post.title}
                  {post.user_id === user.id ? <div style={{ color: "#f59e0b", fontSize: 12 }}>SINÄ</div> : null}
                  {index === 0 ? <div style={{ color: "#fbbf24", fontSize: 12 }}>👑 Johtaa</div> : null}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ opacity: 0.85 }}>{post.votes} ääntä</div>
                  <div style={{ opacity: 0.6, fontSize: 12 }}>näkyvyys {post.effective_visibility ?? post.visibility_score ?? 0}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle(), marginBottom: 12 }}>
          <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 12 }}>Viimeisimmät ostot</div>
          <div style={{ display: "grid", gap: 8 }}>
            {purchases.length === 0 ? (
              <div style={{ opacity: 0.7 }}>Ei vielä ostoja</div>
            ) : (
              purchases.slice(0, 5).map((purchase) => (
                <div
                  key={purchase.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>
                    {purchase.meta?.label || purchase.offer_code} {purchase.meta?.boost_number ? `#${purchase.meta.boost_number}` : ""}
                  </div>
                  <div style={{ opacity: 0.85 }}>{purchase.price_eur} €</div>
                </div>
              ))
            )}
          </div>
        </div>

        {isFounder && founderStats ? (
          <div style={{ ...cardStyle(), marginBottom: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>📊 Founder Dashboard</div>
            <div style={{ marginTop: 12 }}>
              <div>💰 Revenue: {founderStats.revenue.toFixed(2)} €</div>
              <div>🧾 Purchases: {founderStats.purchases}</div>
              <div>👥 Paying users: {founderStats.totalUsers}</div>
              <div>📈 ARPU: {founderStats.arpu.toFixed(2)} €</div>
              <div>💳 Avg price: {founderStats.avgPrice.toFixed(2)} €</div>
            </div>
            <div style={{ marginTop: 14, fontWeight: 800 }}>Funnel</div>
            <div style={{ fontSize: 13 }}>
              <div>Shown: {founderStats.funnel.shown}</div>
              <div>Clicked: {founderStats.funnel.clicked}</div>
              <div>Purchased: {founderStats.funnel.purchased}</div>
              <div>Ignored: {founderStats.funnel.ignored}</div>
              <div>Click rate: {founderStats.funnel.clickRate.toFixed(1)}%</div>
              <div>Purchase rate: {founderStats.funnel.purchaseRate.toFixed(1)}%</div>
            </div>
            <div style={{ marginTop: 14, fontWeight: 800 }}>Timing performance</div>
            {Object.entries(founderStats.byTiming).map(([k, v]) => (
              <div key={k} style={{ fontSize: 13 }}>
                {k.toUpperCase()}: {v.purchased}/{v.shown} ({v.conversion.toFixed(1)}%)
              </div>
            ))}
            <div style={{ marginTop: 14, fontWeight: 800 }}>Draw performance</div>
            {Object.entries(founderStats.byDraw).map(([k, v]) => (
              <div key={k} style={{ fontSize: 13 }}>
                {k}: {v.purchased}/{v.shown} ({v.conversion.toFixed(1)}%)
              </div>
            ))}
          </div>
        ) : null}

        {isFounder ? (
          <div style={{ ...cardStyle(), marginBottom: 12 }}>
            <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 12 }}>Conversion</div>
            <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
              <div>Näytetty: {conversionStats.shown}</div>
              <div>Klikattu: {conversionStats.clicked}</div>
              <div>Ostettu: {conversionStats.purchased}</div>
              <div>Ohitettu: {conversionStats.ignored}</div>
              <div>Click rate: {conversionStats.clickRate.toFixed(1)}%</div>
              <div>Purchase rate: {conversionStats.purchaseRate.toFixed(1)}%</div>
              <div>Ignore rate: {conversionStats.ignoreRate.toFixed(1)}%</div>
            </div>
          </div>
        ) : null}

        <div style={{ ...cardStyle(), marginBottom: 12 }}>
          <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 12 }}>Testaus</div>
          <div style={{ display: "grid", gap: 10 }}>
            <button onClick={lose} style={buttonStyle("ghost")}>Simuloi häviö</button>
            <button onClick={resetAll} style={buttonStyle("ghost")}>Resetoi tila</button>
            <button onClick={logout} style={buttonStyle("ghost")}>Kirjaudu ulos</button>
          </div>
        </div>

        {isFounder ? (
          <div style={cardStyle()}>
            <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 12 }}>AI profiili</div>
            <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
              <div>reactsToLoss: {effectiveProfile.reactsToLoss.toFixed(2)}</div>
              <div>reactsToAlmostWin: {effectiveProfile.reactsToAlmostWin.toFixed(2)}</div>
              <div>reactsToMomentum: {effectiveProfile.reactsToMomentum.toFixed(2)}</div>
              <div>paysInCriticalMoments: {effectiveProfile.paysInCriticalMoments.toFixed(2)}</div>
              <div>ignoresOffers: {effectiveProfile.ignoresOffers.toFixed(2)}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
