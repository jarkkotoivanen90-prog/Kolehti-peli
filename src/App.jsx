import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Flame,
  Eye,
  Vote,
  Rocket,
  RefreshCw,
  LogOut,
  Crown,
  Sparkles,
  Wallet,
  Activity,
  ChevronRight,
  ShieldCheck,
  BrainCircuit,
  Gauge,
  Bug,
  CalendarDays,
  BarChart3,
} from "lucide-react";

import { supabase } from "./supabase";
import { useGameData } from "./hooks/useGameData";
import { useAiSystem } from "./hooks/useAiSystem";

const DRAW_TYPES = [
  { key: "day", label: "Päivä" },
  { key: "week", label: "Viikko" },
  { key: "month", label: "Kuukausi" },
];

const DEFAULT_AI_PROFILE = {
  mode: "balanced",
};

const DEFAULT_AI_OPTIMIZATION = {
  aggressiveness: 0.5,
  priceBias: 0,
};

const DEFAULT_AI_ECONOMY = {
  visibilityMultiplier: 1,
};

const DEFAULT_AI_POLICY = {
  maxAggressiveness: 0.85,
  minPriceModifier: -2,
  maxPriceModifier: 2,
  maxVisibilityMultiplier: 1.5,
  policyBlocksAutomation: false,
};

const DEFAULT_AI_CONTROL = {
  mode: "balanced",
  globalAggressivenessOverride: 0,
  globalPriceBiasOverride: 0,
  globalVisibilityBiasOverride: 0,
};

const DEFAULT_AI_AUTOPILOT = {
  minConfidence: 0.5,
};

const DEFAULT_BOOST_ANALYTICS = {
  ignoreRate: 0,
  purchaseRate: 0,
  clickRate: 0,
};

function euro(value) {
  return `${Number(value || 0).toFixed(2)} €`;
}

function formatDateTime(dateString) {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleString("fi-FI");
}

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function AppShell({ children }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.30),rgba(3,7,18,1)_38%),linear-gradient(180deg,#081225_0%,#07101f_100%)] text-white">
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-8 md:px-6">
        {children}
      </div>
    </div>
  );
}

function GlassCard({ children, className = "" }) {
  return (
    <div
      className={cn(
        "rounded-[30px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon, title, right }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-white/90">
          {icon}
        </div>
        <h2 className="text-2xl font-black tracking-tight">{title}</h2>
      </div>
      {right}
    </div>
  );
}

function StatRow({ icon, label, value, accent = "text-white" }) {
  return (
    <div className="flex items-center justify-between border-b border-white/8 py-4 last:border-b-0">
      <div className="flex items-center gap-3 text-white/80">
        <div className="text-white/65">{icon}</div>
        <span className="text-lg">{label}</span>
      </div>
      <div className={cn("text-2xl font-black", accent)}>{value}</div>
    </div>
  );
}

function StatusBadge({ label, tone = "default" }) {
  const tones = {
    default: "border-white/10 bg-white/5 text-white/90",
    success: "border-emerald-400/25 bg-emerald-400/15 text-emerald-100",
    warn: "border-amber-400/25 bg-amber-400/15 text-amber-100",
    danger: "border-rose-400/25 bg-rose-400/15 text-rose-100",
    info: "border-cyan-400/25 bg-cyan-400/15 text-cyan-100",
  };

  return (
    <div
      className={cn(
        "inline-flex rounded-full border px-4 py-2 text-sm font-bold capitalize",
        tones[tone] || tones.default
      )}
    >
      {label}
    </div>
  );
}

function DrawTypeSelector({ selectedType, onSelect }) {
  return (
    <GlassCard>
      <SectionTitle
        icon={<CalendarDays size={20} />}
        title="Arvonnan tyyppi"
      />

      <div className="grid grid-cols-3 gap-3">
        {DRAW_TYPES.map((draw) => {
          const active = selectedType === draw.key;
          return (
            <motion.button
              key={draw.key}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(draw.key)}
              className={cn(
                "rounded-[22px] px-4 py-5 text-center text-xl font-black transition",
                active
                  ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-[0_10px_30px_rgba(251,146,60,0.35)]"
                  : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
              )}
            >
              {draw.label}
            </motion.button>
          );
        })}
      </div>
    </GlassCard>
  );
}

function TopHeader({ email, onRefresh, onLogout, refreshing }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="text-sm font-black tracking-[0.35em] text-white/75">
        KOLEHTI
      </div>

      <div className="mt-3 text-5xl font-black leading-none md:text-7xl">
        Kolehti AI
      </div>

      <div className="mt-4 max-w-full break-all text-xl text-white/75 md:text-2xl">
        {email}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-lg font-black text-white transition hover:bg-white/10 disabled:opacity-60"
        >
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          Päivitä
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-[22px] border border-rose-300/10 bg-rose-300/5 px-5 py-4 text-lg font-black text-rose-100 transition hover:bg-rose-300/10"
        >
          <LogOut size={18} />
          Logout
        </motion.button>
      </div>
    </motion.div>
  );
}

function AlertBanner({ error, info }) {
  return (
    <AnimatePresence mode="wait">
      {error ? (
        <motion.div
          key={`error-${error}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mb-5 rounded-[28px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-lg font-bold text-rose-100 backdrop-blur"
        >
          {error}
        </motion.div>
      ) : info ? (
        <motion.div
          key={`info-${info}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mb-5 rounded-[28px] border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-lg font-bold text-emerald-100 backdrop-blur"
        >
          {info}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function StatusCard({ rank, gap, myPost, currentDraw }) {
  const stateTone =
    rank === 1 ? "success" : rank > 0 && rank <= 3 ? "info" : "default";

  const stateLabel =
    rank === 1 ? "winning" : rank > 0 && rank <= 3 ? "pushing" : "open";

  return (
    <GlassCard className="overflow-hidden">
      <SectionTitle icon={<Trophy size={20} />} title="Oma tilanne" />

      <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
        <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5">
          <div className="text-7xl font-black leading-none md:text-8xl">
            {rank > 0 ? `#${rank}` : "-"}
          </div>

          <div className="mt-5">
            <StatusBadge label={stateLabel} tone={stateTone} />
          </div>

          <div className="mt-5 text-sm text-white/50">
            Ranking perustuu ääniin, momentumiin ja näkyvyyteen.
          </div>
        </div>

        <div className="rounded-[26px] border border-white/10 bg-black/10 p-2">
          <div className="rounded-[22px] px-4">
            <StatRow
              icon={<BarChart3 size={18} />}
              label="Ero"
              value={gap}
              accent={gap === 0 ? "text-white" : "text-amber-300"}
            />
            <StatRow
              icon={<Flame size={18} />}
              label="Momentum"
              value={myPost?.momentum ?? 0}
              accent={(myPost?.momentum || 0) >= 20 ? "text-emerald-300" : "text-white"}
            />
            <StatRow
              icon={<Vote size={18} />}
              label="Omat äänet"
              value={myPost?.votes ?? 0}
            />
            <StatRow
              icon={<Eye size={18} />}
              label="Näkyvyys"
              value={myPost?.visibility ?? 0}
            />
            <StatRow
              icon={<Wallet size={18} />}
              label="Kulutus"
              value={euro(myPost?.spent_total ?? 0)}
            />
            <StatRow
              icon={<CalendarDays size={18} />}
              label="Aktiivinen draw"
              value={currentDraw?.type || "-"}
            />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function ActionCard({
  onVote,
  onBoost,
  voting,
  boosting,
  disabled,
  boostPrice = "1.00 €",
}) {
  return (
    <GlassCard>
      <SectionTitle icon={<Sparkles size={20} />} title="Toiminnot" />

      <div className="space-y-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.01 }}
          onClick={onVote}
          disabled={disabled || voting}
          className="w-full rounded-[24px] bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-5 text-2xl font-black text-white shadow-[0_18px_40px_rgba(99,102,241,0.35)] transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {voting ? "Tallennetaan..." : "Äänestä"}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.01 }}
          onClick={onBoost}
          disabled={disabled || boosting}
          className="w-full rounded-[24px] bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-5 text-2xl font-black text-slate-950 shadow-[0_18px_40px_rgba(249,115,22,0.35)] transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {boosting ? "Boostataan..." : `Boostaa`}
        </motion.button>

        <div className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-base text-white/75">
          <span>Voit nostaa sijoitusta äänillä ja boosteilla.</span>
          <span className="font-black text-white">{boostPrice}</span>
        </div>
      </div>
    </GlassCard>
  );
}

function LeaderboardCard({ rows, myPostId }) {
  return (
    <GlassCard>
      <SectionTitle
        icon={<Crown size={20} />}
        title="Leaderboard"
        right={
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-bold text-white/70">
            Top {rows.length}
          </div>
        }
      />

      {!rows.length ? (
        <div className="rounded-[22px] border border-white/10 bg-white/5 px-5 py-6 text-white/65">
          Ei leaderboard-dataa.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => {
            const isMe = row.id === myPostId;
            return (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex items-center justify-between rounded-[22px] border px-4 py-4",
                  isMe
                    ? "border-indigo-400/30 bg-indigo-500/10"
                    : "border-white/10 bg-white/5"
                )}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-black",
                      index === 0
                        ? "bg-amber-400 text-slate-950"
                        : index === 1
                        ? "bg-slate-200 text-slate-950"
                        : index === 2
                        ? "bg-orange-700 text-white"
                        : "border border-white/10 bg-white/5 text-white"
                    )}
                  >
                    #{index + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-lg font-black">
                      {row.title || "Nimetön kolehti"}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-white/60">
                      <span>👍 {row.votes ?? 0}</span>
                      <span>🔥 {row.momentum ?? 0}</span>
                      <span>👁 {row.visibility ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="ml-4 text-right">
                  <div className="text-2xl font-black">
                    {euro(row.spent_total ?? 0)}
                  </div>
                  {isMe && (
                    <div className="mt-1 text-xs font-bold uppercase tracking-widest text-indigo-200">
                      Sinä
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}

function PurchasesCard({ purchases }) {
  return (
    <GlassCard>
      <SectionTitle icon={<Wallet size={20} />} title="Viimeisimmät ostot" />

      {!purchases.length ? (
        <div className="rounded-[22px] border border-white/10 bg-white/5 px-5 py-6 text-white/65">
          Ei vielä ostoja.
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map((purchase) => (
            <motion.div
              key={purchase.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 transition hover:bg-white/10"
            >
              <div className="min-w-0">
                <div className="truncate text-2xl font-black">
                  {purchase.type}
                </div>
                <div className="mt-1 text-lg text-white/65">
                  {formatDateTime(purchase.created_at)}
                </div>
              </div>
              <div className="ml-4 shrink-0 text-2xl font-black">
                {euro(purchase.amount)}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function FounderDashboard({ ai, aiState, onToggleDebug, debugOpen }) {
  return (
    <GlassCard>
      <SectionTitle
        icon={<ShieldCheck size={20} />}
        title="Founder Dashboard"
        right={
          <button
            onClick={onToggleDebug}
            className="inline-flex items-center gap-2 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-lg font-black text-white transition hover:bg-white/10"
          >
            <Bug size={18} />
            {debugOpen ? "Piilota debug" : "Näytä debug"}
          </button>
        }
      />

      <div className="rounded-[24px] border border-white/10 bg-black/10 px-4">
        <StatRow
          icon={<Gauge size={18} />}
          label="Health"
          value={ai?.runtime?.health || "unknown"}
        />
        <StatRow
          icon={<BrainCircuit size={18} />}
          label="Ignore"
          value={`${((ai?.autopilot?.ignoreRate || 0) * 100).toFixed(1)}%`}
        />
        <StatRow
          icon={<Wallet size={18} />}
          label="Purchase"
          value={`${((ai?.autopilot?.purchaseRate || 0) * 100).toFixed(1)}%`}
        />
        <StatRow
          icon={<Rocket size={18} />}
          label="Boost urgency"
          value={ai?.boost?.urgency || "low"}
        />
        <StatRow
          icon={<Sparkles size={18} />}
          label="Autopilot"
          value={ai?.autopilot?.automationAction || "hold"}
        />
      </div>

      <AnimatePresence>
        {debugOpen && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4"
          >
            <div className="mb-3 text-lg font-black text-white/90">AI debug</div>

            <div className="space-y-3 text-sm text-white/75">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                <div className="font-bold text-white">AI status</div>
                <div className="mt-1">{aiState || "-"}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                <div className="font-bold text-white">Boost</div>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-white/70">
                  {JSON.stringify(ai?.boost || {}, null, 2)}
                </pre>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                <div className="font-bold text-white">Visibility</div>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-white/70">
                  {JSON.stringify(ai?.visibility || {}, null, 2)}
                </pre>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                <div className="font-bold text-white">Runtime</div>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-white/70">
                  {JSON.stringify(ai?.runtime || {}, null, 2)}
                </pre>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                <div className="font-bold text-white">Autopilot</div>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-white/70">
                  {JSON.stringify(ai?.autopilot || {}, null, 2)}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

function LoginView({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  async function handleMagicLink(e) {
    e.preventDefault();
    setLoading(true);
    setInfo("");
    setError("");

    try {
      const redirectTo =
        typeof window !== "undefined" ? window.location.origin : undefined;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;

      setInfo("Kirjautumislinkki lähetetty sähköpostiin.");
    } catch (err) {
      setError(err.message || "Kirjautuminen epäonnistui.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) onLoggedIn(session);
    });

    return () => subscription?.unsubscribe();
  }, [onLoggedIn]);

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-xl pt-10"
      >
        <div className="text-sm font-black tracking-[0.35em] text-white/75">
          KOLEHTI
        </div>

        <div className="mt-3 text-5xl font-black md:text-7xl">Kirjaudu sisään</div>

        <div className="mt-4 text-xl text-white/70">
          Saat sähköpostiisi kirjautumislinkin.
        </div>

        <AlertBanner error={error} info={info} />

        <GlassCard className="mt-6">
          <form onSubmit={handleMagicLink} className="space-y-4">
            <input
              type="email"
              placeholder="Sinun sähköposti"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-lg text-white outline-none placeholder:text-white/35"
              required
            />

            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="w-full rounded-[22px] bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-4 text-xl font-black text-white shadow-[0_18px_40px_rgba(99,102,241,0.35)] disabled:opacity-60"
            >
              {loading ? "Lähetetään..." : "Lähetä kirjautumislinkki"}
            </motion.button>
          </form>
        </GlassCard>
      </motion.div>
    </AppShell>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);
  const [selectedType, setSelectedType] = useState("week");
  const [debugOpen, setDebugOpen] = useState(false);
  const [boostFx, setBoostFx] = useState(false);

  const user = session?.user || null;

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setBooting(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const {
    currentDraw,
    myPost,
    leaderboard,
    recentPurchases,
    loadingData,
    voting,
    boosting,
    error,
    info,
    loadData,
    handleVote,
    handleBoost,
  } = useGameData(user, selectedType);

  const boostAnalytics = useMemo(() => {
    const count = recentPurchases?.length || 0;
    return {
      ...DEFAULT_BOOST_ANALYTICS,
      purchaseRate: count > 0 ? Math.min(1, count / 10) : 0,
    };
  }, [recentPurchases]);

  const {
    ai,
    aiState,
    rankedLeaderboard,
    gap,
    currentRankNumber,
  } = useAiSystem({
    myPost,
    leaderboard,
    selectedType,

    aiProfile: DEFAULT_AI_PROFILE,
    aiOptimization: DEFAULT_AI_OPTIMIZATION,
    aiEconomy: DEFAULT_AI_ECONOMY,
    aiPolicy: DEFAULT_AI_POLICY,
    aiControlCenter: DEFAULT_AI_CONTROL,
    aiAutopilot: DEFAULT_AI_AUTOPILOT,
    aiReleaseMode: "stable",

    boostAnalytics,
  });

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  async function onBoostClick() {
    await handleBoost();
    setBoostFx(true);
    setTimeout(() => setBoostFx(false), 900);
  }

  if (booting) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="rounded-[28px] border border-white/10 bg-white/5 px-6 py-5 text-xl font-bold text-white/80 backdrop-blur-xl">
            Ladataan...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!session?.user) {
    return <LoginView onLoggedIn={setSession} />;
  }

  return (
    <AppShell>
      <AnimatePresence>
        {boostFx && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[2px]"
          >
            <div className="rounded-[32px] border border-orange-300/20 bg-gradient-to-br from-orange-400 to-pink-500 px-8 py-6 text-3xl font-black text-slate-950 shadow-[0_30px_80px_rgba(249,115,22,0.45)]">
              🚀 BOOST!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TopHeader
        email={user?.email}
        onRefresh={loadData}
        onLogout={handleLogout}
        refreshing={loadingData}
      />

      <AlertBanner error={error} info={info} />

      <div className="space-y-5">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <DrawTypeSelector
            selectedType={selectedType}
            onSelect={setSelectedType}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <StatusCard
            rank={currentRankNumber}
            gap={gap}
            myPost={myPost}
            currentDraw={currentDraw}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <ActionCard
            onVote={handleVote}
            onBoost={onBoostClick}
            voting={voting}
            boosting={boosting}
            disabled={!currentDraw || !myPost}
            boostPrice={euro(1)}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <LeaderboardCard rows={rankedLeaderboard} myPostId={myPost?.id} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <PurchasesCard purchases={recentPurchases} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <FounderDashboard
            ai={ai}
            aiState={aiState}
            debugOpen={debugOpen}
            onToggleDebug={() => setDebugOpen((v) => !v)}
          />
        </motion.div>

        <div className="pt-2 text-center text-sm text-white/35">
          Kolehti AI V3 UI
        </div>
      </div>
    </AppShell>
  );
}
