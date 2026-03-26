// Round 6 – Page 16: Earnings Dashboard (Creator View)
// Purpose: Full overview of revenue streams.
// Sections:
// 1) Summary row: balance available, pending, lifetime earnings.
// 2) Earnings breakdown: graph-style blocks (by month / campaign / seller) + composition.
// 3) Payouts & history: table with status, method, reference IDs.
// 4) Payout actions: Request payout, Setup / edit payout method.
// Premium extras: Forecast card, Tax/export tools.

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "../../components/PageHeader";
import { PayoutMethodsDialog } from "../../shell/PayoutMethodsDialog";
import { useApiResource } from "../../hooks/useApiResource";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import {
  creatorApi,
  type ContractRecord,
  type EarningsSummary,
  type FinancePayoutRecord
} from "../../lib/creatorApi";
import { CircularProgress } from "@mui/material";

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

type EarningsDataset = {
  summary: Summary;
  payouts: FinancePayoutRecord[];
  contracts: ContractRecord[];
};

function toNumber(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  const parsed = value ? new Date(String(value)) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function monthLabel(date: Date) {
  return date.toLocaleString("en", { month: "short", year: "numeric" });
}

function getRangeStart(range: string) {
  const now = new Date();
  if (range === "year-to-date") {
    return new Date(now.getFullYear(), 0, 1);
  }
  if (range === "last-12-months") {
    return new Date(now.getFullYear(), now.getMonth() - 11, 1);
  }
  return new Date(now.getFullYear(), now.getMonth() - 2, 1);
}

function formatPayoutDate(value: unknown) {
  const date = parseDate(value);
  return date
    ? date.toLocaleDateString("en", { month: "short", day: "2-digit", year: "numeric" })
    : "—";
}

function normalizePayoutStatus(value: string | null | undefined) {
  const status = String(value || "").toUpperCase();
  if (status === "PAID") return "Paid";
  if (status === "PENDING" || status === "AVAILABLE") return "Processing";
  if (status === "FAILED" || status === "CANCELLED") return "Failed";
  return "Processing";
}

function readStringMetadata(payload: Record<string, unknown> | undefined, key: string) {
  const value = payload?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function EarningsDashboardPage() {
  const navigate = useNavigate();
  const { run, isPending } = useAsyncAction();

  const [viewMode, setViewMode] = useState("month"); // month | campaign | seller
  const [dateRange, setDateRange] = useState("last-3-months");
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState("All");

  const { data: dataset, loading, error } = useApiResource<EarningsDataset | null>({
    initialData: null,
    loader: async () => {
      const [summary, payouts, contracts] = await Promise.all([
        creatorApi.earningsSummary(),
        creatorApi.payouts(),
        creatorApi.contracts()
      ]);
      return {
        summary: {
          available: toNumber((summary as EarningsSummary).available),
          pending: toNumber((summary as EarningsSummary).pending),
          lifetime: toNumber((summary as EarningsSummary).lifetime)
        },
        payouts,
        contracts
      };
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f2f2] dark:bg-slate-950">
        <CircularProgress size={28} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 p-6">
        <PageHeader pageTitle="Earnings Dashboard" />
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm text-slate-600 dark:text-slate-300">
          Earnings data is unavailable.
        </div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 p-6">
        <PageHeader pageTitle="Earnings Dashboard" />
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm text-slate-600 dark:text-slate-300">
          Earnings data is unavailable.
        </div>
      </div>
    );
  }

  const summary = dataset.summary;
  const rangeStart = useMemo(() => getRangeStart(dateRange), [dateRange]);
  const contractRows = useMemo(() => {
    return dataset.contracts
      .map((contract) => {
        const metadata =
          contract.metadata && typeof contract.metadata === "object" && !Array.isArray(contract.metadata)
            ? (contract.metadata as Record<string, unknown>)
            : undefined;
        const createdAt = parseDate(contract.updatedAt || contract.createdAt);
        return {
          campaign: String(contract.campaignName || contract.campaign || "Unassigned campaign"),
          seller: String(contract.sellerName || contract.seller || contract.brand || "Unassigned seller"),
          amount: Math.max(0, toNumber(contract.value)),
          createdAt,
          metadata
        };
      })
      .filter((record) => record.amount > 0 && record.createdAt);
  }, [dataset.contracts]);

  const rangedContracts = useMemo(
    () => contractRows.filter((record) => (record.createdAt as Date) >= rangeStart),
    [contractRows, rangeStart]
  );

  const monthlyEarnings = useMemo(() => {
    const grouped = new Map<string, { label: string; total: number; sortAt: number }>();
    rangedContracts.forEach((record) => {
      const date = record.createdAt as Date;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const entry = grouped.get(key) ?? {
        label: monthLabel(date),
        total: 0,
        sortAt: new Date(date.getFullYear(), date.getMonth(), 1).getTime()
      };
      entry.total += record.amount;
      grouped.set(key, entry);
    });
    const rows = Array.from(grouped.values())
      .sort((left, right) => left.sortAt - right.sortAt)
      .map((entry) => ({ label: entry.label, total: Number(entry.total.toFixed(2)) }));
    return rows;
  }, [rangedContracts]);

  const campaignEarnings = useMemo(() => {
    const grouped = new Map<string, number>();
    rangedContracts.forEach((record) => {
      grouped.set(record.campaign, (grouped.get(record.campaign) ?? 0) + record.amount);
    });
    const rows = Array.from(grouped.entries())
      .map(([label, total]) => ({ label, total: Number(total.toFixed(2)) }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 8);
    return rows;
  }, [rangedContracts]);

  const sellerEarnings = useMemo(() => {
    const grouped = new Map<string, number>();
    rangedContracts.forEach((record) => {
      grouped.set(record.seller, (grouped.get(record.seller) ?? 0) + record.amount);
    });
    const rows = Array.from(grouped.entries())
      .map(([label, total]) => ({ label, total: Number(total.toFixed(2)) }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 8);
    return rows;
  }, [rangedContracts]);

  const earningsComposition = useMemo(() => {
    const composition: EarningsComposition = {
      flatFees: 0,
      commission: 0,
      bonuses: 0
    };
    rangedContracts.forEach((record) => {
      const modelText = [
        readStringMetadata(record.metadata, "compensationModel"),
        readStringMetadata(record.metadata, "collabMode"),
        readStringMetadata(record.metadata, "paymentModel"),
        readStringMetadata(record.metadata, "pricingModel")
      ]
        .join(" ")
        .toLowerCase();

      if (modelText.includes("bonus")) {
        composition.bonuses += record.amount;
      } else if (modelText.includes("commission")) {
        composition.commission += record.amount;
      } else {
        composition.flatFees += record.amount;
      }
    });

    const composedTotal = composition.flatFees + composition.commission + composition.bonuses;
    if (composedTotal === 0 && summary.lifetime > 0) {
      composition.flatFees = summary.lifetime;
    }
    return composition;
  }, [rangedContracts, summary.lifetime]);

  const payoutRows = useMemo(() => {
    return dataset.payouts.map((payout) => {
      const metadata =
        payout.metadata && typeof payout.metadata === "object" && !Array.isArray(payout.metadata)
          ? (payout.metadata as Record<string, unknown>)
          : undefined;
      return {
        id: payout.id,
        date: formatPayoutDate(payout.createdAt),
        amount: toNumber(payout.amount),
        currency: String(payout.currency || "USD"),
        status: normalizePayoutStatus(payout.status),
        method:
          readStringMetadata(metadata, "method")
          || readStringMetadata(metadata, "provider")
          || readStringMetadata(metadata, "channel")
          || "Wallet",
        reference:
          readStringMetadata(metadata, "reference")
          || readStringMetadata(metadata, "transactionRef")
          || readStringMetadata(metadata, "payoutRef")
          || ""
      } satisfies Payout;
    });
  }, [dataset.payouts]);

  // Forecast: simple extrapolation based on monthly data
  const forecast = useMemo(() => {
    const thisMonth = monthlyEarnings.length > 0 ? monthlyEarnings[monthlyEarnings.length - 1] : null;
    const lastMonth = monthlyEarnings.length > 1 ? monthlyEarnings[monthlyEarnings.length - 2] : null;
    const growth = thisMonth && lastMonth ? thisMonth.total - lastMonth.total : 0;
    const projected = (thisMonth?.total || 0) + Math.max(0, growth * 0.5);
    return {
      month: thisMonth?.label || "This month",
      current: thisMonth?.total || 0,
      projected,
      growth
    };
  }, [monthlyEarnings]);

  const filteredPayouts = useMemo(() => {
    if (payoutStatusFilter === "All") return payoutRows;
    return payoutRows.filter(p => p.status === payoutStatusFilter);
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
