import React, { useMemo, useState } from "react";
import { PayoutMethodsDialog } from "./PayoutMethodsDialog";

type EarningsPanelProps = {
  onClose: () => void;
  onChangePage?: (pageId: PageId) => void;
};

type TabType = "overview" | "payouts" | "forecast";

type Payout = {
  id: number;
  seller: string;
  when: string;
  amount: number;
  status: string;
  method: string;
  ref?: string;
};

type Breakdown = {
  flat: number;
  commission: number;
  bonuses: number;
};

type Forecast = {
  projected: number;
  note: string;
};

import { PageId } from "../layouts/CreatorShellLayout";

export const EarningsPanel: React.FC<EarningsPanelProps> = ({ onClose, onChangePage }) => {
  const [extraLives, setExtraLives] = useState<number>(0); // 0..6
  const [watchTimeBoost, setWatchTimeBoost] = useState<number>(0); // 0..30 (% points)
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isPayoutMethodsOpen, setIsPayoutMethodsOpen] = useState(false);

  const base = {
    available: 720,
    pending: 1980,
    projectedMonth: 3400,
    currency: "USD"
  };

  const forecast: Forecast = useMemo(() => {
    const addLive = 190; // demo: average incremental value per extra live
    const watchBoostMultiplier = 1 + watchTimeBoost / 200; // 0..30 => 1..1.15

    const projected = Math.round((base.projectedMonth + extraLives * addLive) * watchBoostMultiplier);

    const noteParts: string[] = [];
    if (extraLives > 0) noteParts.push(`+${extraLives} live${extraLives === 1 ? "" : "s"}`);
    if (watchTimeBoost > 0) noteParts.push(`+${watchTimeBoost}s avg watch time`);

    return {
      projected,
      note: noteParts.length ? noteParts.join(" · ") : "Baseline"
    };
  }, [base.projectedMonth, extraLives, watchTimeBoost]);

  const payouts: { upcoming: Payout[]; recent: Payout[] } = {
    upcoming: [
      { id: 1, seller: "GlowUp Hub", when: "Nov 15", amount: 260, status: "Scheduled", method: "Bank" },
      { id: 2, seller: "GadgetMart Africa", when: "Nov 20", amount: 150, status: "Pending", method: "Wallet" }
    ],
    recent: [
      { id: 10, seller: "GlowUp Hub", when: "Oct 31", amount: 420, status: "Paid", method: "Bank", ref: "TX-8A2F" },
      { id: 11, seller: "Grace Living Store", when: "Oct 28", amount: 180, status: "Paid", method: "Mobile money", ref: "TX-19QK" },
      { id: 12, seller: "GadgetMart Africa", when: "Oct 22", amount: 610, status: "Paid", method: "Bank", ref: "TX-7Z1C" }
    ]
  };

  const breakdown: Breakdown = {
    flat: 1240,
    commission: 1760,
    bonuses: 400
  };

  const breakdownTotal = breakdown.flat + breakdown.commission + breakdown.bonuses;
  const pct = (v: number): number => Math.round((v / Math.max(1, breakdownTotal)) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end transition-opacity duration-200">
      <div
        className="absolute inset-0 bg-black/30 dark:bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="relative w-full max-w-md h-full bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col transition-colors overflow-hidden z-50"
        role="dialog"
        aria-modal="true"
        aria-label="Earnings drawer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <div className="text-sm font-semibold dark:text-slate-100">Earnings overview</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Money-first snapshot, payout schedule and forecasting.
            </div>
          </div>
          <button
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            onClick={onClose}
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3 flex-shrink-0">
          <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full p-1 text-xs">
            <TabBtn label="Overview" active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
            <TabBtn label="Payouts" active={activeTab === "payouts"} onClick={() => setActiveTab("payouts")} />
            <TabBtn label="Forecast" active={activeTab === "forecast"} onClick={() => setActiveTab("forecast")} />
          </div>
        </div>

        <div className="px-4 py-3 overflow-y-auto overflow-x-hidden flex-1">
          {/* SUMMARY ROW */}
          <div className="grid grid-cols-3 gap-2">
            <MiniMoneyCard label="Available" value={`${base.currency} ${base.available.toLocaleString()}`} accent />
            <MiniMoneyCard label="Pending" value={`${base.currency} ${base.pending.toLocaleString()}`} />
            <MiniMoneyCard label="Projected" value={`${base.currency} ${base.projectedMonth.toLocaleString()}`} />
          </div>

          {activeTab === "overview" && (
            <>
              {/* Earnings breakdown */}
              <div className="mt-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold dark:text-slate-100">Earnings mix (this month)</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Flat fees vs commission vs bonuses</div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Total: {base.currency} {breakdownTotal.toLocaleString()}</div>
                </div>

                <div className="mt-2">
                  <div className="h-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 overflow-hidden flex">
                    <div className="h-full bg-[#f77f00]" style={{ width: `${pct(breakdown.commission)}%` }} />
                    <div className="h-full bg-slate-900 dark:bg-slate-600" style={{ width: `${pct(breakdown.flat)}%` }} />
                    <div className="h-full bg-emerald-500" style={{ width: `${pct(breakdown.bonuses)}%` }} />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <LegendDot color="bg-[#f77f00]" label={`Commission · ${base.currency} ${breakdown.commission.toLocaleString()}`} />
                    <LegendDot color="bg-slate-900 dark:bg-slate-600" label={`Flat fees · ${base.currency} ${breakdown.flat.toLocaleString()}`} />
                    <LegendDot color="bg-emerald-500" label={`Bonuses · ${base.currency} ${breakdown.bonuses.toLocaleString()}`} />
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  className="px-3 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors"
                  onClick={() => {
                    console.log("Download statement");
                    // Implement CSV logic
                  }}
                >
                  <div className="text-sm font-semibold">Download statement</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">CSV export for accounting</div>
                </button>
                <button
                  className="px-3 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors"
                  onClick={() => setIsPayoutMethodsOpen(true)}
                >
                  <div className="text-sm font-semibold">Payout methods</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Bank, wallet, mobile money</div>
                </button>
              </div>

              {/* Mini what-if teaser */}
              <div className="mt-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold dark:text-slate-100">What-if planning</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Quick projections for serious creators</div>
                  </div>
                  <button
                    className="text-xs px-2.5 py-1 rounded-full bg-[#f77f00] text-white hover:bg-[#e26f00] transition-colors"
                    onClick={() => setActiveTab("forecast")}
                  >
                    Open
                  </button>
                </div>
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  If you add 2 extra lives and improve watch time, you can increase projected earnings.
                </div>
              </div>
            </>
          )}

          {activeTab === "payouts" && (
            <>
              {/* Upcoming payouts */}
              <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold dark:text-slate-100">Upcoming payouts</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Expected settlement windows</div>
                  </div>
                  <button
                    className="text-xs text-[#f77f00] hover:underline"
                    onClick={() => {
                      onChangePage?.("payout-history");
                      onClose();
                    }}
                  >
                    View all
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {payouts.upcoming.map((p) => (
                    <div key={p.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{p.seller}</div>
                        <div className="text-sm font-semibold text-[#f77f00]">{base.currency} {p.amount.toLocaleString()}</div>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <span>{p.when}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span>{p.method}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-tiny text-slate-600 dark:text-slate-300">{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent payouts */}
              <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3">
                <div className="text-sm font-semibold dark:text-slate-100">Recent payouts</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Reference IDs for reconciliation</div>
                <div className="mt-2 space-y-2">
                  {payouts.recent.map((p) => (
                    <div key={p.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-2 bg-white dark:bg-slate-800/50">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold dark:text-slate-100">{p.seller}</div>
                        <div className="text-sm font-semibold dark:text-slate-100">{base.currency} {p.amount.toLocaleString()}</div>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>{p.when} · {p.method} · {p.status}</span>
                        {p.ref && <span className="font-mono text-xs">{p.ref}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="mt-3 w-full px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors"
                  onClick={() => {
                    console.log("Export payout history");
                    // Implement CSV logic
                  }}
                >
                  Export payout history (CSV)
                </button>
              </div>
            </>
          )}

          {activeTab === "forecast" && (
            <>
              {/* Forecast controls */}
              <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold dark:text-slate-100">Forecast tools</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Adjust inputs and see projected earnings</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#fff4e5] dark:bg-[#8a4b00]/30 text-[#8a4b00] dark:text-[#ffd19a] border border-[#ffd19a] dark:border-[#8a4b00] text-xs">
                    {forecast.note}
                  </span>
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                      <span>Extra lives this month</span>
                      <span className="font-semibold">{extraLives}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={6}
                      value={extraLives}
                      onChange={(e) => setExtraLives(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                      <span>Avg watch time improvement</span>
                      <span className="font-semibold">+{watchTimeBoost}s</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      value={watchTimeBoost}
                      onChange={(e) => setWatchTimeBoost(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Projected earnings this month</div>
                    <div className="text-lg font-semibold text-[#f77f00]">
                      {base.currency} {forecast.projected.toLocaleString()}
                    </div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      This is a projection based on your recent performance patterns and selected inputs.
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="px-3 py-2 rounded-2xl bg-slate-900 dark:bg-slate-700 text-white text-sm hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
                      onClick={() => {
                        console.log("Generate plan");
                        // Logic to generate a custom plan
                      }}
                    >
                      Generate plan
                    </button>
                    <button
                      className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors"
                      onClick={() => {
                        setExtraLives(0);
                        setWatchTimeBoost(0);
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* Region clarity */}
              <div className="mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3">
                <div className="text-sm font-semibold dark:text-slate-100">Multi-region clarity</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Auto-convert to base currency for payouts</div>
                <div className="mt-2 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <RowKV k="Africa" v="USD 1,200 ≈ UGX 4.4M" />
                  <RowKV k="Asia" v="USD 850 ≈ CNY 6,000" />
                  <RowKV k="Europe & North America" v="USD 560" />
                </div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  FX impact is shown for clarity. Settlement follows your chosen payout method.
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      <PayoutMethodsDialog
        isOpen={isPayoutMethodsOpen}
        onClose={() => setIsPayoutMethodsOpen(false)}
      />
    </div>
  );
};

type TabBtnProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function TabBtn({ label, active, onClick }: TabBtnProps) {
  return (
    <button
      className={`px-3 py-1 rounded-full transition-colors ${active
        ? "bg-slate-900 dark:bg-slate-600 text-white"
        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

type MiniMoneyCardProps = {
  label: string;
  value: string;
  accent?: boolean;
};

function MiniMoneyCard({ label, value, accent }: MiniMoneyCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-md font-semibold mt-0.5 ${accent ? "text-[#f77f00]" : "text-slate-900 dark:text-slate-100"}`}>
        {value}
      </div>
    </div>
  );
}

type LegendDotProps = {
  color: string;
  label: string;
};

function LegendDot({ color, label }: LegendDotProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-xs text-slate-600 dark:text-slate-300">{label}</span>
    </div>
  );
}

type RowKVProps = {
  k: string;
  v: string;
};

function RowKV({ k, v }: RowKVProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600 dark:text-slate-400">{k}</span>
      <span className="font-medium text-slate-900 dark:text-slate-100">{v}</span>
    </div>
  );
}
