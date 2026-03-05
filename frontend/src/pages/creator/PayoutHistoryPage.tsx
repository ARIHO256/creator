import React, { useState } from "react";
import { PageHeader } from "../../components/PageHeader";
// import { useTheme } from "../../contexts/ThemeContext";

type PayoutStatus = "Paid" | "Pending" | "Scheduled" | "Failed";

type Payout = {
    id: string;
    date: string;
    amount: number;
    currency: string;
    method: string;
    status: PayoutStatus;
    reference: string;
    recipient: string;
};

const MOCK_PAYOUTS: Payout[] = [
    { id: "1", date: "2026-01-15", amount: 1250.00, currency: "USD", method: "Bank Transfer", status: "Paid", reference: "TXN-882190", recipient: "Ronald Isabirye" },
    { id: "2", date: "2026-01-10", amount: 450.50, currency: "USD", method: "Mobile Money", status: "Paid", reference: "TXN-771239", recipient: "+256 770 000 000" },
    { id: "3", date: "2025-12-28", amount: 2100.00, currency: "USD", method: "Bank Transfer", status: "Paid", reference: "TXN-661002", recipient: "Ronald Isabirye" },
    { id: "4", date: "2025-12-15", amount: 890.00, currency: "USD", method: "PayPal", status: "Paid", reference: "TXN-551998", recipient: "ronald@example.com" },
    { id: "5", date: "2025-11-30", amount: 1500.00, currency: "USD", method: "Bank Transfer", status: "Paid", reference: "TXN-441887", recipient: "Ronald Isabirye" },
    { id: "6", date: "2026-01-20", amount: 620.75, currency: "USD", method: "Mobile Money", status: "Pending", reference: "TXN-991200", recipient: "+256 770 000 000" },
];

export const PayoutHistoryPage: React.FC = () => {
    // const { theme } = useTheme();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<PayoutStatus | "All">("All");

    const filteredPayouts = MOCK_PAYOUTS.filter(p => {
        const matchesSearch = p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.method.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "All" || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusStyle = (status: PayoutStatus) => {
        switch (status) {
            case "Paid": return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
            case "Pending": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
            case "Scheduled": return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
            case "Failed": return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
        }
    };

    const handleExportCsv = () => {
        // Create CSV content
        const headers = ["Date", "Amount", "Currency", "Method", "Recipient", "Status", "Reference"];
        const rows = filteredPayouts.map(p => [
            p.date,
            p.amount.toString(),
            p.currency,
            p.method,
            p.recipient,
            p.status,
            p.reference
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        // Create and download file
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `payout-history-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
            <PageHeader
                pageTitle="Payout History"
                badge={
                    <button
                        onClick={handleExportCsv}
                        className="px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        📥 Export CSV
                    </button>
                }
            />

            <main className="flex-1 flex flex-col w-full p-4 sm:p-6 lg:p-8 pt-6 gap-6 overflow-y-auto overflow-x-hidden">
                <div className="w-full max-w-6xl mx-auto flex flex-col gap-4">
                    {/* Filters Bar */}
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
                            <input
                                type="text"
                                placeholder="Search by reference or method..."
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#f77f00] outline-none transition-all dark:text-slate-100 text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                            {["All", "Paid", "Pending", "Scheduled", "Failed"].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status as PayoutStatus | "All")}
                                    className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${statusFilter === status
                                        ? "bg-[#f77f00] border-[#f77f00] text-white shadow-md shadow-orange-500/10"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table Container */}
                    <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm overflow-hidden border border-slate-100 dark:border-slate-800/50">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Amount</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Method</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Recipient</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Reference</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {filteredPayouts.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 font-medium">{p.date}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-[#f77f00]">
                                                {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {p.currency}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{p.method}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{p.recipient}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyle(p.status)}`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-mono text-slate-400 dark:text-slate-500">{p.reference}</td>
                                        </tr>
                                    ))}
                                    {filteredPayouts.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-3xl">🏜️</span>
                                                    <span className="text-sm">No payouts found matching your criteria.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination Placeholder */}
                        {filteredPayouts.length > 0 && (
                            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <span className="text-xs text-slate-500 dark:text-slate-400">Showing {filteredPayouts.length} entries</span>
                                <div className="flex gap-2">
                                    <button className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs disabled:opacity-50" disabled>Previous</button>
                                    <button className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs disabled:opacity-50" disabled>Next</button>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
};
