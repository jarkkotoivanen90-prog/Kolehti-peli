import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const DRAW_TYPES = [
  { key: "day", label: "Päivä", title: "päiväarvonta" },
  { key: "week", label: "Viikko", title: "viikkoarvonta" },
  { key: "month", label: "Kuukausi", title: "kuukausiarvonta" },
];

function getDrawTypeLabel(type) {
  if (type === "day") return "Päivä";
  if (type === "week") return "Viikko";
  if (type === "month") return "Kuukausi";
  return type || "-";
}

function euro(amount) {
  const value = Number(amount || 0);
  return `${value.toFixed(2)} €`;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  const [email, setEmail] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [sendingLink, setSendingLink] = useState(false);

  const [selectedType, setSelectedType] = useState("week");

  const [topError, setTopError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const [currentDraw, setCurrentDraw] = useState(null);
  const [myPost, setMyPost] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [recentPurchases, setRecentPurchases] = useState([]);

  const [loadingData, setLoadingData] = useState(false);
  const [voting, setVoting] = useState(false);

  const selectedDrawMeta = useMemo(() => {
    return DRAW_TYPES.find((d) => d.key === selectedType) || DRAW_TYPES[1];
  }, [selectedType]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      setEmail(session?.user?.email ?? "");
      setLoadingAuth(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setEmail(session?.user?.email ?? "");
      setLoadingAuth(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedType]);

  async function sendMagicLink(e) {
    e.preventDefault();
    setTopError("");
    setInfoMessage("");

    if (!email.trim()) {
      setTopError("Anna sähköpostiosoite.");
      return;
    }

    try {
      setSendingLink(true);

      const redirectTo =
        import.meta.env.VITE_APP_URL || window.location.origin;

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        setTopError(`Virhe: ${error.message}`);
        return;
      }

      setInfoMessage("Kirjautumislinkki lähetetty sähköpostiin.");
    } catch (err) {
      setTopError(`Virhe: ${err.message}`);
    } finally {
      setSendingLink(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setCurrentDraw(null);
    setMyPost(null);
    setLeaderboard([]);
    setRecentPurchases([]);
    setTopError("");
    setInfoMessage("");
  }

  async function loadAll() {
    if (!user) return;

    setLoadingData(true);
    setTopError("");
    setInfoMessage("");

    try {
      const draw = await fetchActiveDraw(selectedType);

      if (!draw) {
        setCurrentDraw(null);
        setMyPost(null);
        setLeaderboard([]);
        setRecentPurchases([]);
        setTopError("Omaa kolehtia ei löytynyt");
        return;
      }

      setCurrentDraw(draw);
      setTopError("");

      const post = await ensureMyPost(draw.id);
      setMyPost(post);

      await Promise.all([
        fetchLeaderboard(draw.id),
        fetchRecentPurchases(user.id),
      ]);
    } catch (err) {
      setTopError(err.message || "Datan lataus epäonnistui.");
    } finally {
      setLoadingData(false);
    }
  }

  async function fetchActiveDraw(type) {
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
  }

  async function ensureMyPost(drawId) {
    const { data: existing, error: existingError } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .eq("draw_id", drawId)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Oman kolehdin haku epäonnistui: ${existingError.message}`);
    }

    if (existing) {
      return existing;
    }

    const defaultTitle = `${user.email || "käyttäjä"}n kolehti`;

    const { data: created, error: createError } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        draw_id: drawId,
        title: defaultTitle,
        votes: 0,
        momentum: 20,
        visibility: 0,
        spent_total: 0,
        status: "active",
      })
      .select("*")
      .single();

    if (createError) {
      throw new Error(`Oman kolehdin luonti epäonnistui: ${createError.message}`);
    }

    return created;
  }

  async function fetchLeaderboard(drawId) {
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, votes, momentum, visibility, spent_total, user_id")
      .eq("draw_id", drawId)
      .order("votes", { ascending: false })
      .order("momentum", { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(`Leaderboardin haku epäonnistui: ${error.message}`);
    }

    setLeaderboard(data || []);
  }

  async function fetchRecentPurchases(userId) {
    const { data, error } = await supabase
      .from("purchases")
      .select("id, type, amount, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      const msg = error.message || "";
      if (
        msg.includes("relation") ||
        msg.includes("does not exist") ||
        msg.includes("schema cache")
      ) {
        setRecentPurchases([]);
        return;
      }
      throw new Error(`Ostojen haku epäonnistui: ${error.message}`);
    }

    setRecentPurchases(data || []);
  }

  async function handleVote() {
    if (!myPost || !currentDraw) return;

    try {
      setVoting(true);
      setTopError("");
      setInfoMessage("");

      const nextVotes = Number(myPost.votes || 0) + 1;
      const nextMomentum = Number(myPost.momentum || 0) + 5;
      const nextVisibility = Number(myPost.visibility || 0) + 1;

      const { data, error } = await supabase
        .from("posts")
        .update({
          votes: nextVotes,
          momentum: nextMomentum,
          visibility: nextVisibility,
        })
        .eq("id", myPost.id)
        .select("*")
        .single();

      if (error) {
        throw new Error(`Äänen tallennus epäonnistui: ${error.message}`);
      }

      setMyPost(data);
      await fetchLeaderboard(currentDraw.id);
      setInfoMessage("Ääni lisätty.");
    } catch (err) {
      setTopError(err.message || "Äänen lisäys epäonnistui.");
    } finally {
      setVoting(false);
    }
  }

  function getRank() {
    if (!myPost || !leaderboard.length) return "-";
    const index = leaderboard.findIndex((item) => item.id === myPost.id);
    return index >= 0 ? `#${index + 1}` : "-";
  }

  function getGapToLeader() {
    if (!myPost || !leaderboard.length) return 0;
    const leader = leaderboard[0];
    if (!leader) return 0;
    return Math.max(0, Number(leader.votes || 0) - Number(myPost.votes || 0));
  }

  const rank = getRank();
  const gap = getGapToLeader();

  if (loadingAuth) {
    return (
      <div style={styles.page}>
        <div style={styles.centerWrap}>
          <div style={styles.card}>Ladataan...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.page}>
        <div style={styles.centerWrap}>
          <form style={styles.card} onSubmit={sendMagicLink}>
            <div style={styles.logo}>KOLEHTI</div>
            <h1 style={styles.title}>Kirjaudu sisään</h1>
            <p style={styles.subtitle}>Saat sähköpostiisi kirjautumislinkin.</p>

            <input
              style={styles.input}
              type="email"
              placeholder="sinä@esimerkki.fi"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button type="submit" style={styles.primaryButton} disabled={sendingLink}>
              {sendingLink ? "Lähetetään..." : "Lähetä kirjautumislinkki"}
            </button>

            {topError ? <div style={styles.errorText}>{topError}</div> : null}
            {infoMessage ? <div style={styles.infoText}>{infoMessage}</div> : null}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {topError ? <div style={styles.bannerError}>{topError}</div> : null}
        {infoMessage ? <div style={styles.bannerInfo}>{infoMessage}</div> : null}

        <div style={styles.logo}>KOLEHTI</div>
        <h1 style={styles.hero}>Kolehti AI</h1>
        <div style={styles.email}>{user.email}</div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Arvonnan tyyppi</div>
          <div style={styles.tabRow}>
            {DRAW_TYPES.map((draw) => (
              <button
                key={draw.key}
                onClick={() => setSelectedType(draw.key)}
                style={{
                  ...styles.tabButton,
                  ...(selectedType === draw.key ? styles.tabButtonActive : {}),
                }}
              >
                {draw.label}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Oma tilanne</div>
          <div style={styles.bigRank}>Sijoitus: {rank}</div>
          <div style={styles.statusRow}>👍 Tilanne auki</div>
          <div style={styles.statLine}>Ero: {gap} · Momentum: {myPost?.momentum ?? 0}</div>
          <div style={styles.statLine}>Omat äänet: {myPost?.votes ?? 0}</div>
          <div style={styles.statLine}>Näkyvyys: {myPost?.visibility ?? 0}</div>
          <div style={styles.statLine}>Ostot yhteensä: {euro(myPost?.spent_total ?? 0)}</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Päätoiminto</div>
          <button
            onClick={handleVote}
            style={styles.primaryButton}
            disabled={!myPost || voting || loadingData}
          >
            {voting ? "Tallennetaan..." : "👍 Anna ääni"}
          </button>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Boostit</div>
          <div style={styles.statLine}>
            {selectedType === "day" ? "0/2 käytetty" : selectedType === "week" ? "0/4 käytetty" : "0/6 käytetty"}
          </div>
          <div style={styles.smallMuted}>Seuraava boosti: 1 €</div>
          <div style={styles.smallMuted}>Perushinta: 2 €</div>
          <div style={styles.smallMuted}>AI suosittelee odottamaan parempaa hetkeä.</div>
          <div style={styles.smallMuted}>
            Seuraavan boostin vaikutus olisi: +20 momentum · gap -1
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Leaderboard</div>
          {leaderboard.length === 0 ? (
            <div style={styles.smallMuted}>Ei vielä rivejä.</div>
          ) : (
            <div style={styles.list}>
              {leaderboard.map((item, index) => (
                <div key={item.id} style={styles.listItem}>
                  <div>
                    <strong>#{index + 1} {item.title || "kolehti"}</strong>
                  </div>
                  <div style={styles.listMeta}>
                    {item.votes || 0} ääntä
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Viimeisimmät ostot</div>
          {recentPurchases.length === 0 ? (
            <div style={styles.smallMuted}>Ei ostoja.</div>
          ) : (
            <div style={styles.list}>
              {recentPurchases.map((item) => (
                <div key={item.id} style={styles.listItem}>
                  <div><strong>{item.type}</strong></div>
                  <div style={styles.listMeta}>{euro(item.amount || 0)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Testaus</div>
          <button style={styles.secondaryButton} onClick={loadAll}>
            Päivitä tila
          </button>
          <button style={styles.secondaryButton} onClick={signOut}>
            Kirjaudu ulos
          </button>
        </div>

        <div style={styles.footerSpace}>
          <div style={styles.smallMuted}>
            Aktiivinen arvonta: {selectedDrawMeta.label} ({selectedType})
          </div>
          <div style={styles.smallMuted}>
            Draw ID: {currentDraw?.id || "-"}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, rgba(31,45,120,0.45), rgba(4,6,18,1) 40%)",
    color: "#fff",
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  centerWrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  container: {
    maxWidth: 720,
    margin: "0 auto",
    padding: 24,
  },
  logo: {
    letterSpacing: 4,
    fontWeight: 800,
    fontSize: 18,
    opacity: 0.9,
    marginBottom: 8,
  },
  hero: {
    fontSize: 60,
    lineHeight: 1,
    margin: "0 0 10px 0",
    fontWeight: 800,
  },
  email: {
    fontSize: 18,
    opacity: 0.9,
    marginBottom: 20,
  },
  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    boxShadow: "0 8px 30px rgba(0,0,0,0.22)",
    backdropFilter: "blur(8px)",
  },
  cardLabel: {
    fontSize: 16,
    opacity: 0.9,
    marginBottom: 14,
  },
  title: {
    fontSize: 56,
    lineHeight: 1,
    margin: "0 0 12px 0",
    fontWeight: 800,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.85,
    marginBottom: 20,
  },
  input: {
    width: "100%",
    fontSize: 18,
    padding: "18px 20px",
    borderRadius: 20,
    outline: "none",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    boxSizing: "border-box",
    marginBottom: 18,
  },
  primaryButton: {
    width: "100%",
    border: "none",
    borderRadius: 22,
    padding: "18px 20px",
    fontSize: 18,
    fontWeight: 800,
    color: "#fff",
    background: "linear-gradient(90deg, #6c63ff 0%, #9b5cff 100%)",
    cursor: "pointer",
    marginBottom: 10,
  },
  secondaryButton: {
    width: "100%",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 22,
    padding: "16px 20px",
    fontSize: 18,
    fontWeight: 700,
    color: "#fff",
    background: "rgba(255,255,255,0.06)",
    cursor: "pointer",
    marginBottom: 12,
  },
  bannerError: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: "18px 20px",
    marginBottom: 20,
    textAlign: "center",
    fontSize: 16,
    fontWeight: 700,
  },
  bannerInfo: {
    background: "rgba(87, 201, 126, 0.14)",
    border: "1px solid rgba(87, 201, 126, 0.28)",
    borderRadius: 24,
    padding: "14px 18px",
    marginBottom: 20,
    textAlign: "center",
    fontSize: 15,
  },
  errorText: {
    color: "#ffb4b4",
    marginTop: 6,
    fontSize: 15,
  },
  infoText: {
    color: "#b7ffcf",
    marginTop: 6,
    fontSize: 15,
  },
  tabRow: {
    display: "flex",
    gap: 14,
  },
  tabButton: {
    flex: 1,
    padding: "16px 12px",
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    fontSize: 18,
    fontWeight: 800,
    cursor: "pointer",
  },
  tabButtonActive: {
    background: "#f4a11a",
    color: "#111",
    border: "1px solid transparent",
  },
  bigRank: {
    fontSize: 54,
    lineHeight: 1.05,
    fontWeight: 900,
    marginBottom: 12,
  },
  statusRow: {
    fontSize: 20,
    fontWeight: 800,
    marginBottom: 10,
  },
  statLine: {
    fontSize: 18,
    opacity: 0.92,
    marginBottom: 8,
  },
  smallMuted: {
    fontSize: 16,
    opacity: 0.82,
    marginBottom: 8,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    background: "rgba(96, 90, 255, 0.18)",
    borderRadius: 18,
    padding: "14px 16px",
  },
  listMeta: {
    opacity: 0.9,
    fontSize: 16,
    whiteSpace: "nowrap",
  },
  footerSpace: {
    paddingBottom: 28,
  },
};
