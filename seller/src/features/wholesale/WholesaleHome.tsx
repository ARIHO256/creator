import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import {
  ArrowRight,
  BarChart3,
  Bolt,
  Calendar,
  CheckCheck,
  ChevronRight,
  FileText,
  Globe,
  Layers,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";

void sellerBackendApi.getWorkflowScreenState("seller-feature:wholesale/WholesaleHome").catch(() => undefined);


const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function fmtPct(n) {
  if (!Number.isFinite(n)) return "-";
  return `${Math.round(n)}%`;
}

function fmtMinutes(mins) {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h <= 0) return `${r}m`;
  return `${h}h ${r}m`;
}

function fmtMoney(n, currency = "USD") {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
  } catch {
    return `${currency} ${Math.round(v)}`;
  }
}

function scoreFromAvgMinutes(avg) {
  const m = Math.max(0, Number(avg || 0));

  if (m <= 30) return clamp(Math.round(100 - (m / 30) * 5), 0, 100);
  if (m <= 120) return clamp(Math.round(95 - ((m - 30) / 90) * 15), 0, 100);
  if (m <= 360) return clamp(Math.round(80 - ((m - 120) / 240) * 30), 0, 100);
  if (m <= 1440) return clamp(Math.round(50 - ((m - 360) / 1080) * 40), 0, 100);
  return clamp(Math.round(10 - ((m - 1440) / 1440) * 10), 0, 100);
}

function toneFromScore(s) {
  if (s >= 85) return "good";
  if (s >= 65) return "mid";
  return "risk";
}

function RingGauge({ value, label, sublabel }) {
  const v = clamp(Number(value || 0), 0, 100);
  const r = 36;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  const tone = toneFromScore(v);

  const stroke = tone === "good" ? TOKENS.green : tone === "mid" ? TOKENS.orange : "#E11D48";

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-center gap-3">
        <div className="relative grid h-20 w-20 place-items-center">
          <svg width="80" height="80" viewBox="0 0 96 96" className="block">
            <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(15, 23, 42, 0.10)" strokeWidth="10" />
            <circle
              cx="48"
              cy="48"
              r={r}
              fill="none"
              stroke={stroke}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c - dash}`}
              transform="rotate(-90 48 48)"
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-lg font-black text-slate-900">{Math.round(v)}</div>
            <div className="text-[10px] font-extrabold text-slate-500">/ 100</div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-slate-900">{label}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">{sublabel}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Pill tone={tone === "good" ? "green" : tone === "mid" ? "orange" : "danger"}>
              {tone === "good" ? "Great" : tone === "mid" ? "Improving" : "At risk"}
            </Pill>
            <Pill tone="slate">Target: ≤ 4h</Pill>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pill({ children, tone = "slate" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "orange" && "bg-orange-50 text-orange-700",
        tone === "danger" && "bg-rose-50 text-rose-700",
        tone === "slate" && "bg-slate-100 text-slate-700"
      )}
    >
      {children}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, hint, trend }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</div>
          {hint ? <div className="mt-1 text-xs font-semibold text-slate-500">{hint}</div> : null}
        </div>
        {trend ? (
          <div className="text-right">
            <div className={cx("text-xs font-black", trend.startsWith("+") ? "text-emerald-700" : "text-rose-700")}>{trend}</div>
            <div className="text-[10px] font-semibold text-slate-500">vs last 7d</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Sparkline({ points }) {
  const w = 220;
  const h = 56;
  const pad = 6;
  const rawPoints = Array.isArray(points)
    ? points.map((value) => Number(value)).filter((value) => Number.isFinite(value))
    : [];
  const safePoints =
    rawPoints.length >= 2
      ? rawPoints
      : rawPoints.length === 1
        ? [rawPoints[0], rawPoints[0]]
        : [0, 0];
  const xs = safePoints.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(1, safePoints.length - 1));
  const min = Math.min(...safePoints);
  const max = Math.max(...safePoints);
  const ys = safePoints.map((p) => {
    const t = max === min ? 0.5 : (p - min) / (max - min);
    return h - pad - t * (h - pad * 2);
  });
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block text-slate-800">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      <path d={`${d} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`} fill="currentColor" opacity="0.08" />
    </svg>
  );
}

function SectionCard({ title, subtitle, icon: Icon, children, right }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-slate-900">{title}</div>
          {subtitle ? <div className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</div> : null}
        </div>
        {right ? <div className="ml-auto">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Row({ left, right, sub }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
      <div className="min-w-0">
        <div className="truncate text-xs font-extrabold text-slate-900">{left}</div>
        {sub ? <div className="mt-1 text-[11px] font-semibold text-slate-500">{sub}</div> : null}
      </div>
      <div className="text-right text-xs font-black text-slate-800">{right}</div>
    </div>
  );
}

function PrimaryButton({ children, onClick, tone = "green" }) {
  const bg = tone === "orange" ? TOKENS.orange : TOKENS.green;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:opacity-95"
      style={{ background: bg }}
    >
      {children}
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}

function GhostButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 transition hover:bg-gray-50 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}

export default function WholesaleHomePage() {
  const navigate = useNavigate();
  const [range, setRange] = useState("7d");

  const data = useMemo(() => {
    const now = Date.now();
    const minsAgo = (m) => new Date(now - m * 60_000).toISOString();

    const rfqs = [
      { id: "RFQ-24091", buyer: "Kampala Fleet Co.", intent: 92, value: 16800, currency: "USD", dueAt: minsAgo(-220), status: "Open", tags: ["Urgent", "Batteries"] },
      { id: "RFQ-24090", buyer: "Lagos EV Parts", intent: 78, value: 9200, currency: "USD", dueAt: minsAgo(-980), status: "Open", tags: ["Chargers"] },
      { id: "RFQ-24089", buyer: "Nairobi Logistics", intent: 64, value: 5300, currency: "USD", dueAt: minsAgo(-1440), status: "Needs Review", tags: ["Cables"] },
      { id: "RFQ-24088", buyer: "Accra Mobility", intent: 88, value: 12200, currency: "USD", dueAt: minsAgo(-3000), status: "Open", tags: ["Wallbox"] },
      { id: "RFQ-24087", buyer: "Dar EV Center", intent: 55, value: 4100, currency: "USD", dueAt: minsAgo(-5200), status: "Open", tags: ["Adapters"] },
    ];

    const quotes = [
      { id: "QT-77120", createdAt: minsAgo(620), sentAt: minsAgo(460), status: "Sent", amount: 16800, currency: "USD", buyer: "Kampala Fleet Co.", competitiveness: 0.82 },
      { id: "QT-77118", createdAt: minsAgo(1800), sentAt: minsAgo(1500), status: "Won", amount: 9200, currency: "USD", buyer: "Lagos EV Parts", competitiveness: 0.90 },
      { id: "QT-77116", createdAt: minsAgo(3800), sentAt: minsAgo(3440), status: "Lost", amount: 5300, currency: "USD", buyer: "Nairobi Logistics", competitiveness: 0.62 },
      { id: "QT-77114", createdAt: minsAgo(510), sentAt: null, status: "Draft", amount: 12200, currency: "USD", buyer: "Accra Mobility", competitiveness: 0.78 },
      { id: "QT-77112", createdAt: minsAgo(9800), sentAt: minsAgo(8200), status: "Won", amount: 4100, currency: "USD", buyer: "Dar EV Center", competitiveness: 0.74 },
      { id: "QT-77111", createdAt: minsAgo(260), sentAt: minsAgo(120), status: "Negotiating", amount: 6800, currency: "USD", buyer: "Kigali ChargeOps", competitiveness: 0.86 },
    ];

    const openRfqs = rfqs.filter((r) => r.status === "Open" || r.status === "Needs Review");
    const activeQuotes = quotes.filter((q) => ["Draft", "Sent", "Negotiating"].includes(q.status));
    const closed = quotes.filter((q) => ["Won", "Lost"].includes(q.status));
    const won = quotes.filter((q) => q.status === "Won");

    const deltas = quotes
      .filter((q) => q.sentAt)
      .map((q) => (new Date(q.sentAt ?? q.createdAt).getTime() - new Date(q.createdAt).getTime()) / 60_000);

    const avgMins = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
    const speedScore = scoreFromAvgMinutes(avgMins);

    const hiIntent = rfqs.filter((r) => r.intent >= 80);
    const respondedHiIntent = Math.max(0, hiIntent.length - 1);

    const comp = quotes.filter((q) => Number.isFinite(q.competitiveness)).map((q) => q.competitiveness);
    const compPct = comp.length ? Math.round((comp.filter((x) => x >= 0.75).length / comp.length) * 100) : 0;

    const spark = {
      rfqs: range === "30d" ? [4, 6, 5, 7, 8, 9, 6, 8, 7, 9, 10, 8] : range === "90d" ? [3, 5, 6, 4, 7, 9, 8, 10, 7, 9, 11, 10] : [2, 4, 3, 5, 6, 7, 5, 6, 7, 6, 8, 7],
      win: range === "30d" ? [52, 54, 55, 56, 58, 59, 58, 60, 61, 62, 63, 62] : range === "90d" ? [48, 50, 52, 51, 53, 55, 56, 57, 58, 59, 60, 61] : [55, 56, 57, 56, 58, 59, 60, 61, 60, 62, 63, 64],
    };

    return {
      rfqs,
      quotes,
      openRfqs,
      activeQuotes,
      winRate: closed.length ? (won.length / closed.length) * 100 : 0,
      avgMins,
      speedScore,
      hiIntent,
      respondedHiIntent,
      compPct,
      spark,
    };
  }, [range]);

  const exportSnapshot = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      range,
      summary: {
        openRfqs: data.openRfqs.length,
        activeQuotes: data.activeQuotes.length,
        winRate: data.winRate,
        avgResponseMinutes: data.avgMins,
        speedScore: data.speedScore,
        highIntent: data.hiIntent.length,
        respondedHighIntent: data.respondedHiIntent,
        competitivenessPct: data.compPct,
      },
      rfqs: data.rfqs,
      quotes: data.quotes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wholesale_home_${range}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), var(--page-gradient-base)",
      }}
    >
      <div className="shell-container-wide px-3 py-6 md:px-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Wholesale Home</div>
                <Pill tone="slate">/wholesale</Pill>
                <Pill tone="green">B2B</Pill>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                Your command center for RFQs, quotes, pricing and conversion health.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
                {[
                  { k: "7d", label: "Last 7 days" },
                  { k: "30d", label: "Last 30 days" },
                  { k: "90d", label: "Last 90 days" },
                ].map((t) => (
                  <button
                    key={t.k}
                    type="button"
                    onClick={() => setRange(t.k)}
                    className={cx(
                      "px-4 py-2 text-xs font-extrabold transition",
                      range === t.k ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <GhostButton onClick={exportSnapshot}>
                <FileText className="h-4 w-4" /> Export
              </GhostButton>
              <PrimaryButton onClick={() => navigate("/wholesale/rfq")}>
                <Bolt className="h-4 w-4" /> Open RFQ Inbox
              </PrimaryButton>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="grid gap-3 md:grid-cols-3">
              <KpiCard
                icon={FileText}
                label="Open RFQs"
                value={String(data.openRfqs.length)}
                hint="Needs response or review"
                trend={range === "7d" ? "+12%" : range === "30d" ? "+6%" : "+18%"}
              />
              <KpiCard
                icon={Layers}
                label="Active Quotes"
                value={String(data.activeQuotes.length)}
                hint="Draft, sent, negotiating"
                trend={range === "7d" ? "+4%" : range === "30d" ? "+9%" : "+11%"}
              />
              <KpiCard
                icon={Target}
                label="Win Rate"
                value={fmtPct(data.winRate)}
                hint="Closed quotes only"
                trend={range === "7d" ? "+3%" : range === "30d" ? "+2%" : "+5%"}
              />
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <RingGauge
                value={data.speedScore}
                label="Quote Speed Score"
                sublabel={`Avg send time: ${fmtMinutes(data.avgMins)} (created → sent)`}
              />

              <SectionCard
                title="Signals trend"
                subtitle="High-signal view of RFQ flow and win rate"
                icon={TrendingUp}
                right={<Pill tone="slate">{range}</Pill>}
              >
                <div className="grid gap-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-extrabold text-slate-600">RFQ flow</div>
                        <div className="mt-1 text-sm font-black text-slate-900">Inbound RFQs</div>
                      </div>
                      <Pill tone="slate">{data.openRfqs.length} open</Pill>
                    </div>
                    <div className="mt-3">
                      <Sparkline points={data.spark.rfqs} />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-extrabold text-slate-600">Conversion</div>
                        <div className="mt-1 text-sm font-black text-slate-900">Win rate trend</div>
                      </div>
                      <Pill tone="green">{fmtPct(data.winRate)}</Pill>
                    </div>
                    <div className="mt-3">
                      <Sparkline points={data.spark.win} />
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

          {/* Insights + Daily Command */}
          <div className="lg:col-span-4">
            <SectionCard
              title="Insights"
              subtitle="What matters most today"
              icon={Sparkles}
              right={<Pill tone="slate">Premium</Pill>}
            >
              <div className="grid gap-2">
                <Row
                  left="Quote speed"
                  right={fmtMinutes(data.avgMins)}
                  sub={data.speedScore >= 80 ? "Excellent response velocity" : data.speedScore >= 60 ? "Improve follow-ups" : "Risk: responses too slow"}
                />
                <Row
                  left="High-intent coverage"
                  right={`${data.respondedHiIntent}/${data.hiIntent.length}`}
                  sub="Responded to high-intent RFQs"
                />
                <Row
                  left="Competitiveness"
                  right={`${data.compPct}%`}
                  sub="Quotes within market-competitive range"
                />
              </div>

              <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <Timer className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-orange-900">Daily Command</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">
                      Suggested next actions
                    </div>
                    <div className="mt-3 space-y-2">
                      <Row left="Respond to urgent RFQs" right="2" sub="1 expires today" />
                      <Row left="Follow up negotiating quotes" right="1" sub="Send revised terms" />
                      <Row left="Update tier pricing" right="1" sub="West Africa segment" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <PrimaryButton tone="orange" onClick={() => navigate("/wholesale/rfq")}>
                        <CheckCheck className="h-4 w-4" /> Run Actions
                      </PrimaryButton>
                      <GhostButton onClick={() => navigate("/wholesale/quotes")}>
                        <Calendar className="h-4 w-4" /> Schedule Follow-ups
                      </GhostButton>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        {/* Quick lists */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <SectionCard
              title="Recent RFQs"
              subtitle="High signal requests and urgency tags"
              icon={FileText}
              right={<Pill tone="slate">Open</Pill>}
            >
              <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-4">
                {data.rfqs.slice(0, 4).map((r) => (
                  <motion.button
                    key={r.id}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    type="button"
                    onClick={() => navigate("/wholesale/rfq")}
                    className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4 text-left transition hover:bg-gray-50 dark:bg-slate-950"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-black text-slate-900">{r.id}</div>
                          {r.tags.includes("Urgent") ? <Pill tone="danger">Urgent</Pill> : <Pill tone="slate">Open</Pill>}
                          <span className="ml-auto text-[11px] font-extrabold text-slate-500">Intent {r.intent}</span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Buyer: {r.buyer}</div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-xs font-extrabold text-slate-700">{fmtMoney(r.value, r.currency)}</div>
                          <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                            <ArrowRight className="h-4 w-4" /> Open
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="lg:col-span-6">
            <SectionCard
              title="Recent Quotes"
              subtitle="Active quotes and closed outcomes"
              icon={BarChart3}
              right={<Pill tone="slate">{range}</Pill>}
            >
              <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-4">
                {data.quotes.slice(0, 4).map((q) => {
                  const mins = q.sentAt ? (new Date(q.sentAt).getTime() - new Date(q.createdAt).getTime()) / 60_000 : null;
                  const speed = mins == null ? null : scoreFromAvgMinutes(mins);
                  const t = q.status === "Won" ? "green" : q.status === "Lost" ? "danger" : q.status === "Draft" ? "slate" : "orange";

                  return (
                    <motion.button
                      key={q.id}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      type="button"
                      onClick={() => navigate("/wholesale/quotes")}
                      className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4 text-left transition hover:bg-gray-50 dark:bg-slate-950"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", t === "green" ? "bg-emerald-50 text-emerald-700" : t === "danger" ? "bg-rose-50 text-rose-700" : t === "orange" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700")}>
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-black text-slate-900">{q.id}</div>
                            <Pill tone={t}>{q.status}</Pill>
                            <span className="ml-auto text-[11px] font-extrabold text-slate-500">{speed != null ? `Speed ${speed}` : "Not sent"}</span>
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">Buyer: {q.buyer}</div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="text-xs font-extrabold text-slate-700">{fmtMoney(q.amount, q.currency)}</div>
                            <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                              <ArrowRight className="h-4 w-4" /> Open
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </SectionCard>
          </div>
        </div>

        {/* Footer quick links */}
        <div className="mt-5 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-black text-slate-900">Quick links</div>
            <span className="text-xs font-semibold text-slate-500">Jump to key wholesale tools</span>
            <div className="ml-auto flex flex-wrap gap-2">
              <GhostButton onClick={() => navigate("/wholesale/price-lists")}>
                <Layers className="h-4 w-4" /> Price Lists
              </GhostButton>
              <GhostButton onClick={() => navigate("/wholesale/rfq")}>
                <FileText className="h-4 w-4" /> RFQ Inbox
              </GhostButton>
              <GhostButton onClick={() => navigate("/wholesale/quotes")}>
                <BarChart3 className="h-4 w-4" /> Quotes
              </GhostButton>
              <GhostButton onClick={() => navigate("/wholesale/templates")}>
                <Sparkles className="h-4 w-4" /> Templates
              </GhostButton>
              <GhostButton onClick={() => navigate("/wholesale/incoterms")}>
                <Globe className="h-4 w-4" /> Incoterms
              </GhostButton>
            </div>
          </div>
        </div>
      </div>

      {/* subtle motion */}
      <AnimatePresence>
        <motion.div
          key={range}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-x-0 bottom-0 h-24"
          style={{ background: `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(3,205,140,0.06) 100%)` }}
        />
      </AnimatePresence>
    </div>
  );
}
