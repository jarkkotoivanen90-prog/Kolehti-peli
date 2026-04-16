import { useEffect, useMemo, useState } from "react";

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

function loadProfile() {
  return safeParse(localStorage.getItem("kolehti_ai_profile"), defaultProfile);
}

function saveProfile(profile) {
  localStorage.setItem("kolehti_ai_profile", JSON.stringify(profile));
}

function useKolehtiAI() {
  const [profile, setProfile] = useState(loadProfile);

  useEffect(() => {
    saveProfile(profile);
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

function getSmartCTA({ rank, gapToNext, justLost, momentum, profile }) {
  if (justLost && profile.reactsToLoss > 0.4) {
    return {
      title: "⚠️ Sinut ohitettiin",
      cta: "🔥 Ota paikka takaisin",
    };
  }

  if (rank > 1 && gapToNext <= 1 && profile.reactsToAlmostWin > 0.4) {
    return {
      title: "⚡ Yksi ääni riittää",
      cta: "🚀 Nosta sijoitusta",
    };
  }

  if (momentum > 50 && profile.reactsToMomentum > 0.4) {
    return {
      title: "🔥 Olet vauhdissa",
      cta: "⚡ Jatka nousua",
    };
  }

  return {
    title: "👍 Tilanne auki",
    cta: "👍 Anna ääni",
  };
}

function pickOffer({ justLost, gapToNext, momentum, profile }) {
  if (justLost && profile.reactsToLoss > 0.45) {
    return {
      code: "BOOST_DOMINANCE",
      price: 5,
      title: "🔥 Ota paikka takaisin",
      cta: "⚔️ Vastaa nyt",
    };
  }

  if (gapToNext <= 1 && profile.reactsToAlmostWin > 0.45) {
    return {
      code: "BOOST_PUSH",
      price: 2,
      title: "⚡ Yksi ääni riittää",
      cta: "🚀 Nosta sijoitusta",
    };
  }

  if (momentum >= 60 && profile.reactsToMomentum > 0.45) {
    return {
      code: "BOOST_STD",
      price: 1,
      title: "🔥 Olet vauhdissa",
      cta: "⚡ Jatka nousua",
    };
  }

  return null;
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

export default function App() {
  const ai = useKolehtiAI();

  const [rank, setRank] = useState(3);
  const [gap, setGap] = useState(2);
  const [momentum, setMomentum] = useState(20);
  const [lastEvent, setLastEvent] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.background = "#05070D";
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const smart = useMemo(
    () =>
      getSmartCTA({
        rank,
        gapToNext: gap,
        justLost: lastEvent === "lost",
        momentum,
        profile: ai.profile,
      }),
    [rank, gap, momentum, lastEvent, ai.profile]
  );

  const offer = useMemo(
    () =>
      pickOffer({
        justLost: lastEvent === "lost",
        gapToNext: gap,
        momentum,
        profile: ai.profile,
      }),
    [lastEvent, gap, momentum, ai.profile]
  );

  function vote() {
    setRank((r) => Math.max(1, r - 1));
    setGap((g) => Math.max(0, g - 1));
    setMomentum((m) => Math.min(100, m + 10));
    setLastEvent("vote");
    setToast("👍 Ääni annettu");

    if (gap <= 1) {
      ai.learnAlmost();
    }
  }

  function lose() {
    setRank((r) => r + 1);
    setGap(1);
    setLastEvent("lost");
    setToast("⚠️ Sinut ohitettiin");
    ai.learnLoss();
  }

  function buyOffer() {
    if (!offer) return;
    setMomentum((m) => Math.min(100, m + 20));
    setLastEvent("purchase");
    setToast(`💰 Ostit: ${offer.cta} (${offer.price} €)`);
    ai.learnPurchase(offer.code);
  }

  function ignoreOffer() {
    setToast("👌 Tarjous ohitettu");
    ai.learnIgnore();
  }

  function resetAll() {
    setRank(3);
    setGap(2);
    setMomentum(20);
    setLastEvent(null);
    setToast("↺ Tila resetoitu");
    ai.resetProfile();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(99,102,241,0.16), transparent 30%), #05070D",
        color: "#fff",
        padding: 20,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {toast ? (
          <div
            style={{
              ...cardStyle({
                marginBottom: 12,
                textAlign: "center",
                fontWeight: 800,
                background: "rgba(17,24,39,0.92)",
              }),
            }}
          >
            {toast}
          </div>
        ) : null}

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: "0.18em",
              opacity: 0.7,
            }}
          >
            KOLEHTI
          </div>
          <h1 style={{ margin: "8px 0 0", fontSize: 42, lineHeight: 1, fontWeight: 900 }}>
            Kolehti AI
          </h1>
          <div style={{ marginTop: 10, opacity: 0.75 }}>Kilpailu käynnissä juuri nyt</div>
        </div>

        <div style={{ ...cardStyle(), marginBottom: 12 }}>
          <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 10 }}>Tilanne</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>Sijoitus: #{rank}</div>
          <div style={{ marginTop: 8, fontSize: 20, fontWeight: 800 }}>{smart.title}</div>
          <div style={{ marginTop: 10, opacity: 0.82 }}>
            Ero: {gap} · Momentum: {momentum}
          </div>
        </div>

        <div style={{ ...cardStyle(), marginBottom: 12 }}>
          <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 12 }}>Päätoiminto</div>
          <button onClick={vote} style={buttonStyle()}>
            {smart.cta}
          </button>
        </div>

        {offer ? (
          <div
            style={{
              ...cardStyle({
                marginBottom: 12,
                background:
                  "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(99,102,241,0.10))",
              }),
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 900, color: "#f59e0b" }}>🎯 AI tarjous</div>
            <div style={{ marginTop: 8, fontSize: 22, fontWeight: 900 }}>{offer.title}</div>
            <div style={{ marginTop: 8, opacity: 0.82 }}>
              AI arvioi tämän parhaaksi hetkeksi juuri nyt.
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <button onClick={buyOffer} style={buttonStyle("accent")}>
                {offer.cta} ({offer.price} €)
              </button>
              <button onClick={ignoreOffer} style={buttonStyle("ghost")}>
                Ei nyt
              </button>
            </div>
          </div>
        ) : null}

        <div style={{ ...cardStyle(), marginBottom: 12 }}>
          <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 12 }}>Testaus</div>
          <div style={{ display: "grid", gap: 10 }}>
            <button onClick={lose} style={buttonStyle("ghost")}>
              Simuloi häviö
            </button>
            <button onClick={resetAll} style={buttonStyle("ghost")}>
              Resetoi tila
            </button>
          </div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 12 }}>AI profiili</div>
          <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
            <div>reactsToLoss: {ai.profile.reactsToLoss.toFixed(2)}</div>
            <div>reactsToAlmostWin: {ai.profile.reactsToAlmostWin.toFixed(2)}</div>
            <div>reactsToMomentum: {ai.profile.reactsToMomentum.toFixed(2)}</div>
            <div>paysInCriticalMoments: {ai.profile.paysInCriticalMoments.toFixed(2)}</div>
            <div>ignoresOffers: {ai.profile.ignoresOffers.toFixed(2)}</div>
            <div>preferredOffer: {ai.profile.preferredOffer}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
