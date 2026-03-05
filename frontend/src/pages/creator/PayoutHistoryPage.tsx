import React, { useMemo, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { usePayoutsQuery } from "../../hooks/api/useFinance";
import type { PayoutRecord } from "../../api/types";

type StatusFilter = "All" | "Paid" | "Pending" | "Requested" | "Scheduled" | "Failed";

function formatCurrency(amount: number, currency = "USD"): string {
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function getStatusStyle(status: string) {
  switch (status) {
    case "Paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
    case "Requested":
    case "Pending":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "Scheduled":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    default:
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
  }
}

function exportCsv(rows: PayoutRecord[]) {
  const headers = ["Date", "Amount", "Currency", "Method", "Recipient", "Status", "Reference"];
  const body = rows.map((payout) => [
    payout.date,
    String(payout.amount),
    payout.currency,
    payout.method,
    payout.recipient || "",
    payout.status,
    payout.reference
  ]);
  const csvContent = [headers.join(","), ...body.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `payout-history-${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const PayoutHistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const payoutsQuery = usePayoutsQuery({ q: searchTerm || undefined, status: statusFilter === "All" ? undefined : statusFilter });

  const rows = useMemo(() => payoutsQuery.data?.items || [], [payoutsQuery.data]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="Payout History"
        badge={
          <button onClick={() => exportCsv(rows)} className="px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            📥 Export CSV
          </button>
        }
      />

      <main className="flex-1 flex flex-col w-full p-4 sm:p-6 lg:p-8 pt-6 gap-6 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-96">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
              <input
                type="text"
                placeholder="Search by reference, method or recipient..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#f77f00] outline-none transition-all dark:text-slate-100 text-sm"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {["All", "Paid", "Requested", "Scheduled", "Failed"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status as StatusFilter)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                    statusFilter === status
                      ? "bg-[#f77f00] border-[#f77f00] text-white shadow-md shadow-orange-500/10"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm overflow-hidden border border-slate-100 dark:border-slate-800/50">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Backend payout ledger</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">History updates from the API, including requested and scheduled payouts.</p>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{rows.length} records</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Amount</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Method</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recipient</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Settlement</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {rows.map((payout) => (
                    <tr key={payout.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 font-medium">{payout.date}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-[#f77f00]">{formatCurrency(payout.amount, payout.currency)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{payout.method}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{payout.recipient || "Primary payout account"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyle(payout.status)}`}>
                          {payout.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{payout.estimatedSettlement || "—"}</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-400 dark:text-slate-500">{payout.reference}</td>
                    </tr>
                  ))}
                  {!payoutsQuery.isLoading && rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                        No payouts found matching your current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {payoutsQuery.isLoading && (
              <div className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">Loading payouts from the backend…</div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};
