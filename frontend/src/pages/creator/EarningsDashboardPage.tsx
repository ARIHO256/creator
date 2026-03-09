// Round 6 – Page 16: Earnings Dashboard (Creator View)
// Purpose: Full overview of revenue streams.
// Sections:
// 1) Summary row: balance available, pending, lifetime earnings.
// 2) Earnings breakdown: graph-style blocks (by month / campaign / seller) + composition.
// 3) Payouts & history: table with status, method, reference IDs.
// 4) Payout actions: Request payout, Setup / edit payout method.
// Premium extras: Forecast card, Tax/export tools.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "../../components/PageHeader";
import { PayoutMethodsDialog } from "../../shell/PayoutMethodsDialog";
import { useNotification } from "../../contexts/NotificationContext";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { CircularProgress } from "@mui/material";
import { backendApi, type PayoutRecord } from "../../lib/api";

type BreakdownRow = {
  label: string;
  total: number;
};

type EarningsComposition = {
  flatFees: number;
  commission: number;
  bonuses: number;
};

type Summary = {
  available: number;
  pending: number;
  lifetime: number;
};

type Forecast = {
  month: string;
  current: number;
  projected: number;
  growth: number;
};

type Payout = {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  reference: string;
};

// Monthly earnings (demo)
const monthlyEarnings = [
  { label: "Aug 2025", total: 3400 },
  { label: "Sep 2025", total: 4200 },
  { label: "Oct 2025", total: 5200 }
];

// By campaign (demo)
const campaignEarnings = [
  { label: "Autumn Beauty Flash", total: 3200 },
  { label: "Tech Friday Mega Live", total: 2800 },
  { label: "Faith & Wellness Morning", total: 1600 }
];

// By seller (demo)
const sellerEarnings = [
  { label: "GlowUp Hub", total: 2800 },
  { label: "GadgetMart Africa", total: 2500 },
  { label: "Grace Living Store", total: 1500 }
];

// Composition (pie-style breakdown)
const earningsComposition = {
  flatFees: 4800,
  commission: 2800,
  bonuses: 600
};

const fallbackPayouts = [
  {
    id: "P-2025-010",
    date: "Oct 12, 2025",
    amount: 820.5,
    currency: "USD",
    status: "Paid",
    method: "Bank transfer",
    reference: "BNK-847392"
  },
  {
    id: "P-2025-009",
    date: "Oct 05, 2025",
    amount: 420.0,
    currency: "USD",
    status: "Processing",
    method: "Mobile money",
    reference: "MOMO-239475"
  },
  {
    id: "P-2025-008",
    date: "Sep 28, 2025",
    amount: 600.0,
    currency: "USD",
    status: "Failed",
    method: "PayPal",
    reference: "PP-998233"
  }
];

const normalizePayoutStatus = (status?: string) => {
  const value = String(status || "").toLowerCase();
  if (value === "paid") return "Paid";
  if (value === "failed") return "Failed";
  return "Processing";
};

const normalizePayoutRow = (item: PayoutRecord, index: number): Payout => ({
  id: String(item.id || item.reference || `payout-${index + 1}`),
  date: item.date || item.requestedAt || "—",
  amount: Number(item.amount || 0),
  currency: item.currency || "USD",
  status: normalizePayoutStatus(item.status),
  method: item.method || "Payout",
  reference: item.reference || String(item.id || `payout-${index + 1}`)
});

function EarningsDashboardPage() {
  const navigate = useNavigate();
  const { showSuccess, showNotification } = useNotification();
  const { run, isPending } = useAsyncAction();

  const [viewMode, setViewMode] = useState("month"); // month | campaign | seller
  const [dateRange, setDateRange] = useState("last-3-months");
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);

  const [summary, setSummary] = useState<Summary>({
    available: 1243.5,
    pending: 620.75,
    lifetime: 18240.25
  });
  const [payoutRows, setPayoutRows] = useState<Payout[]>(fallbackPayouts);
  const [financeError, setFinanceError] = useState<string | null>(null);

  const [payoutStatusFilter, setPayoutStatusFilter] = useState("All");

  useEffect(() => {
    let cancelled = false;

    const loadFinanceData = async () => {
      setFinanceError(null);
      try {
        const [summaryData, payoutsData] = await Promise.all([
          backendApi.getEarningsSummary(),
          backendApi.getPayouts()
        ]);
        if (cancelled) return;

        setSummary({
          available: Number(summaryData.available || 0),
          pending: Number(summaryData.pending || 0),
          lifetime: Number(summaryData.lifetime || 0)
        });

        const mappedPayouts = (Array.isArray(payoutsData) ? payoutsData : []).map(normalizePayoutRow);
        if (mappedPayouts.length > 0) {
          setPayoutRows(mappedPayouts);
        }
      } catch (err) {
        if (cancelled) return;
        setFinanceError(err instanceof Error ? err.message : "Failed to load backend finance data");
        setPayoutRows(fallbackPayouts);
      }
    };

    void loadFinanceData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Forecast: simple extrapolation based on monthly data
  const forecast = useMemo(() => {
    const thisMonth = monthlyEarnings[monthlyEarnings.length - 1];
    const lastMonth = monthlyEarnings[monthlyEarnings.length - 2];
    const growth = thisMonth && lastMonth ? thisMonth.total - lastMonth.total : 0;
    const projected = thisMonth.total + Math.max(0, growth * 0.5);
    return {
      month: thisMonth?.label || "This month",
      current: thisMonth?.total || 0,
      projected,
      growth
    };
  }, []);

  const filteredPayouts = useMemo(() => {
    if (payoutStatusFilter === "All") return payoutRows;
    return payoutRows.filter((p) => p.status === payoutStatusFilter);
  }, [payoutRows, payoutStatusFilter]);

  const breakdownData =
    viewMode === "campaign"
      ? campaignEarnings
      : viewMode === "seller"
        ? sellerEarnings
        : monthlyEarnings;

  const breakdownLabel =
    viewMode === "campaign"
      ? "By campaign"
      : viewMode === "seller"
        ? "By seller"
        : "By month";

  const totalComposition =
    earningsComposition.flatFees +
    earningsComposition.commission +
    earningsComposition.bonuses;

  const percent = (value: number): number =>
    totalComposition > 0 ? Math.round((value / totalComposition) * 100) : 0;

  const handleRequestPayout = () => {
    navigate("/request-payout");
  };

  const handleSetupPayoutMethod = () => {
    setIsPayoutDialogOpen(true);
  };

  const handleDownloadCsv = () => {
    run(async () => {
      // Simulate export delay
      await new Promise(r => setTimeout(r, 1000));
      const headers = ["Month", "Total Earnings"];
      const rows = monthlyEarnings.map(m => [m.label, m.total.toString()]);
      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `earnings_export_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    }, { successMessage: "CSV Export complete! 📊" });
  };

  const handleDownloadStatement = () => {
    run(async () => {
      // Simulate generation delay
      await new Promise(r => setTimeout(r, 1500));
      const content = `OFFICIAL EARNINGS STATEMENT\nDate: ${new Date().toLocaleDateString()}\n\nCreator: You\nLifetime Earnings: $${summary.lifetime}\nAvailable Balance: $${summary.available}\n\nThis is a generated statement for your records.`;
      const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `statement_${new Date().toISOString().slice(0, 10)}.txt`;
      link.click();
    }, { successMessage: "Statement generated! 📄" });
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="Earnings Dashboard"
        mobileViewType="hide"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 font-medium border border-slate-200 dark:border-slate-800 transition-colors">
            <span>💸</span>
            <span>Live earnings · Payouts · Forecast</span>
          </span>
        }
      />

      <main className="flex-1 flex flex-col w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 gap-6 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-4">
          {/* Summary row */}
          <SummaryRow summary={summary} onRequestPayout={handleRequestPayout} />
          {financeError && (
            <div className="text-xs text-amber-600 dark:text-amber-400">
              Backend request failed: {financeError}. Showing fallback values.
            </div>
          )}

          {/* Earnings breakdown + forecast */}
          <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] gap-3 items-start">
            <EarningsBreakdownPanel
              breakdownData={breakdownData}
              breakdownLabel={breakdownLabel}
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
              dateRange={dateRange}
              onChangeDateRange={setDateRange}
              earningsComposition={earningsComposition}
              percent={percent}
            />
            <ForecastAndTaxPanel
              forecast={forecast}
              onDownloadCsv={handleDownloadCsv}
              onDownloadStatement={handleDownloadStatement}
              isPending={isPending}
            />
          </section>

          {/* Payouts & actions */}
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] gap-3 items-start">
            <PayoutsTable
              payouts={filteredPayouts}
              filter={payoutStatusFilter}
              onFilterChange={setPayoutStatusFilter}
            />
            <PayoutActionsPanel
              summary={summary}
              onRequestPayout={handleRequestPayout}
              onSetupPayoutMethod={handleSetupPayoutMethod}
            />
          </section>

          {/* Payout Methods Dialog */}
          <PayoutMethodsDialog
            isOpen={isPayoutDialogOpen}
            onClose={() => setIsPayoutDialogOpen(false)}
          />
        </div>
      </main>
    </div>
  );
}

/* Summary row component */
type SummaryRowProps = {
  summary: Summary;
  onRequestPayout: () => void;
};

function SummaryRow({ summary, onRequestPayout }: SummaryRowProps) {
  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Earnings summary</h2>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            Overview of your available balance, pending payouts and lifetime earnings.
          </p>
        </div>
        <button
          className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#f77f00] text-white text-sm font-semibold dark:font-bold hover:bg-[#e26f00]"
          onClick={onRequestPayout}
        >
          <span>Request payout</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
        <SummaryCard
          label="Available to withdraw"
          value={summary.available}
          accent
        />
        <SummaryCard label="Pending" value={summary.pending} accent={false} />
        <SummaryCard label="Lifetime earnings" value={summary.lifetime} accent={false} />
      </div>
      <button
        className="md:hidden mt-2 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-[#f77f00] text-white text-sm font-semibold dark:font-bold hover:bg-[#e26f00]"
        onClick={onRequestPayout}
      >
        <span>Request payout</span>
      </button>
    </section>
  );
}

type SummaryCardProps = {
  label: string;
  value: number;
  accent?: boolean;
};

function SummaryCard({ label, value, accent }: SummaryCardProps) {
  return (
    <div
      className={`border rounded-2xl px-3 py-2 flex flex-col gap-1 transition-colors ${accent ? "bg-[#f77f00]/10 dark:bg-[#f77f00]/20 border-[#f77f00]" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
        }`}
    >
      <span className="text-xs text-slate-500 dark:text-slate-300">{label}</span>
      <span className="text-base font-semibold dark:font-bold text-slate-900 dark:text-slate-100">
        ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </span>
      {accent && (
        <span className="text-xs text-slate-600 dark:text-slate-200 font-medium">
          You can transfer this now to your payout method.
        </span>
      )}
    </div>
  );
}

/* Earnings breakdown panel */
type EarningsBreakdownPanelProps = {
  breakdownData: BreakdownRow[];
  breakdownLabel: string;
  viewMode: string;
  onChangeViewMode: (mode: string) => void;
  dateRange: string;
  onChangeDateRange: (range: string) => void;
  earningsComposition: EarningsComposition;
  percent: (value: number) => number;
};

function EarningsBreakdownPanel({
  breakdownData,
  breakdownLabel,
  viewMode,
  onChangeViewMode,
  dateRange,
  onChangeDateRange,
  earningsComposition,
  percent
}: EarningsBreakdownPanelProps) {
  const maxValue = Math.max(...breakdownData.map((d: BreakdownRow) => d.total), 1);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-3 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Earnings breakdown</h3>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            Compare performance over time, by campaign or by seller.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          <select
            className="border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors"
            value={dateRange}
            onChange={(e) => onChangeDateRange(e.target.value)}
          >
            <option value="last-3-months">Last 3 months</option>
            <option value="year-to-date">Year to date</option>
            <option value="last-12-months">Last 12 months</option>
          </select>
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full transition-colors px-1 py-0.5">
            <ToggleChip
              label="By month"
              active={viewMode === "month"}
              onClick={() => onChangeViewMode("month")}
            />
            <ToggleChip
              label="By campaign"
              active={viewMode === "campaign"}
              onClick={() => onChangeViewMode("campaign")}
            />
            <ToggleChip
              label="By seller"
              active={viewMode === "seller"}
              onClick={() => onChangeViewMode("seller")}
            />
          </div>
        </div>
      </div>

      {/* bar-style breakdown */}
      <div className="mt-1 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
          <span>{breakdownLabel}</span>
          <span>Relative earnings</span>
        </div>
        <div className="space-y-1">
          {breakdownData.map((row: BreakdownRow) => (
            <div key={row.label} className="flex items-center gap-2">
              <span className="w-28 text-xs text-slate-600 dark:text-slate-200 font-medium truncate">
                {row.label}
              </span>
              <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden transition-colors">
                <div
                  className="h-full rounded-full bg-[#f77f00]"
                  style={{
                    width: `${(row.total / maxValue) * 100}%`
                  }}
                />
              </div>
              <span className="w-16 text-right text-xs text-slate-600 dark:text-slate-200 font-medium">
                ${row.total.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Composition / pseudo pie */}
      <div className="border-t border-slate-100 dark:border-slate-700 pt-2 mt-1 grid grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)] gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-300">
            Earnings composition
          </span>
          <div className="flex items-center gap-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden transition-colors">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${percent(earningsComposition.commission)}%` }}
            />
            <div
              className="h-full bg-[#f77f00]"
              style={{ width: `${percent(earningsComposition.flatFees)}%` }}
            />
            <div
              className="h-full bg-sky-500"
              style={{ width: `${percent(earningsComposition.bonuses)}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-1 text-xs">
            <LegendChip
              color="bg-emerald-500"
              label={`Commission · ${percent(
                earningsComposition.commission
              )}%`}
            />
            <LegendChip
              color="bg-[#f77f00]"
              label={`Flat fees · ${percent(earningsComposition.flatFees)}%`}
            />
            <LegendChip
              color="bg-sky-500"
              label={`Bonuses · ${percent(earningsComposition.bonuses)}%`}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-300">Notes</span>
          <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">
            Commission is driving most of your upside. Consider negotiating slightly higher
            commission tiers for top-converting campaigns while keeping flat fees competitive.
          </p>
        </div>
      </div>
    </div>
  );
}

type ToggleChipProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function ToggleChip({ label, active, onClick }: ToggleChipProps) {
  return (
    <button
      className={`px-2.5 py-0.5 rounded-full text-xs ${active
        ? "bg-[#f77f00] text-white"
        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

type LegendChipProps = {
  color: string;
  label: string;
};

function LegendChip({ color, label }: LegendChipProps) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-200 font-medium">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span>{label}</span>
    </span>
  );
}

/* Forecast + tax/export tools */
type ForecastAndTaxPanelProps = {
  forecast: Forecast;
  onDownloadCsv: () => void;
  onDownloadStatement: () => void;
};

function ForecastAndTaxPanel({
  forecast,
  onDownloadCsv,
  onDownloadStatement,
  isPending
}: ForecastAndTaxPanelProps & { isPending: boolean }) {
  const growthLabel =
    forecast.growth > 0
      ? `+${forecast.growth.toLocaleString()} vs last month`
      : forecast.growth < 0
        ? `${forecast.growth.toLocaleString()} vs last month`
        : "Flat vs last month";

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Forecast</h3>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              Projected earnings if your current trend holds.
            </p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-300">
            Period: {forecast.month}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 dark:text-slate-300">Current</span>
            <span className="text-base font-semibold dark:font-bold text-slate-900 dark:text-slate-100">
              ${forecast.current.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-500 dark:text-slate-300">Projected</span>
            <span className="text-base font-semibold dark:font-bold text-slate-900 dark:text-slate-100">
              ${forecast.projected.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
              {growthLabel}
            </span>
          </div>
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
          <span className="font-semibold dark:font-bold text-slate-700 dark:text-slate-100 font-medium mr-1">
            Tip:
          </span>
          <span>
            Lean into campaigns with strong commission rates and high conversion. Your highest
            upside is in returning viewers who already trust your recommendations.
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold dark:text-slate-50 dark:font-bold">Tax & export tools</h3>
          <span className="text-xs text-slate-500 dark:text-slate-300">
            Reporting & compliance
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">
          Generate CSV exports or summarized statements to share with your accountant or for
          self-filing.
        </p>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
            onClick={onDownloadCsv}
            disabled={isPending}
          >
            {isPending && <CircularProgress size={12} color="inherit" />}
            Download CSV
          </button>
          <button
            className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
            onClick={onDownloadStatement}
            disabled={isPending}
          >
            {isPending && <CircularProgress size={12} color="inherit" />}
            Download statement (PDF)
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-300">
          In the full product, you’ll also be able to set your tax region, upload tax IDs and see
          annual summaries here.
        </p>
      </div>
    </div>
  );
}

/* Payouts table */
type PayoutsTableProps = {
  payouts: Payout[];
  filter: string;
  onFilterChange: (f: string) => void;
};

function PayoutsTable({ payouts, filter, onFilterChange }: PayoutsTableProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleFilterClick = (newFilter: string) => {
    if (newFilter === filter) return;
    setIsTransitioning(true);
    setTimeout(() => {
      onFilterChange(newFilter);
      setIsTransitioning(false);
    }, 300);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold dark:text-slate-50 dark:font-bold">Payouts & history</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Total {payouts.length} records</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-full transition-colors px-1 py-0.5 text-[10px]">
          {["All", "Paid", "Processing", "Failed"].map((f) => (
            <button
              key={f}
              className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-tight transition-all ${filter === f
                ? f === "Paid" ? "bg-emerald-500 text-white" : f === "Processing" ? "bg-amber-500 text-white" : f === "Failed" ? "bg-red-500 text-white" : "bg-slate-900 dark:bg-slate-700 text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              onClick={() => handleFilterClick(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors shadow-inner">
        <table className={`min-w-[700px] w-full text-xs transition-opacity duration-300 border-collapse ${isTransitioning ? "opacity-0" : "opacity-100"}`}>
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">ID</th>
              <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Amount</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Method</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Reference</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p: Payout) => (
              <tr
                key={p.id}
                className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">{p.date}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">{p.id}</td>
                <td className="px-4 py-3 text-right font-black text-slate-900 dark:text-slate-100">
                  <span className="text-[10px] text-slate-400 mr-1">{p.currency}</span>
                  {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3">
                  <PayoutStatusChip status={p.status} />
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">{p.method}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-[10px]">{p.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-300">
        Filter by status, method and date range to drill into each payout for more details.
      </p>
    </div>
  );
}

type PayoutStatusChipProps = {
  status: string;
};

function PayoutStatusChip({ status }: PayoutStatusChipProps) {
  let style =
    "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 font-medium border-slate-200 dark:border-slate-600";
  if (status === "Paid")
    style = "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700";
  if (status === "Processing")
    style = "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700";
  if (status === "Failed")
    style = "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700";

  const isProcessing = status === "Processing"

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-tight transition-colors ${style}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isProcessing ? "animate-pulse" : ""} ${status === "Paid" ? "bg-emerald-500" : status === "Processing" ? "bg-amber-500" : "bg-red-500"}`} />
      <span>{status}</span>
    </span>
  )
}

/* Payout actions panel */
type PayoutActionsPanelProps = {
  summary: Summary;
  onRequestPayout: () => void;
  onSetupPayoutMethod: () => void;
};

function PayoutActionsPanel({
  summary,
  onRequestPayout,
  onSetupPayoutMethod
}: PayoutActionsPanelProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-2 text-sm">
      <h3 className="text-sm font-semibold dark:text-slate-50 dark:font-bold">Payout actions</h3>
      <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">
        Manage how you get paid and request withdrawals of your available balance.
      </p>
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 bg-slate-50 dark:bg-slate-700/50 flex flex-col gap-1 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-300">
            Available to withdraw
          </span>
          <span className="text-md font-semibold text-slate-900 dark:text-slate-100">
            ${summary.available.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-300">
          You can request a payout now or wait to accumulate more earnings.
        </p>
      </div>
      <div className="flex flex-col gap-1 mt-1">
        <button
          className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white text-sm font-semibold hover:bg-[#e26f00]"
          onClick={onRequestPayout}
        >
          Request payout
        </button>
        <button
          className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-100 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 dark:hover:bg-slate-700 transition-colors"
          onClick={onSetupPayoutMethod}
        >
          Setup / edit payout method
        </button>
      </div>
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-300">
        <p>
          Make sure your payout method and tax information are correctly configured before
          requesting large payouts.
        </p>
      </div>
    </div>
  );
}

export { EarningsDashboardPage };
