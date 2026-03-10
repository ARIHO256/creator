import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLocalization } from "../../localization/LocalizationProvider";

// Provider — Quotes Hub

type QuoteStage = "New" | "Negotiating" | "Approved" | "Expired";

type QuoteRow = {
  id: string;
  client: string;
  value: number;
  currency: string;
  stage: QuoteStage;
  updated: string;
};

export default function ProviderQuotes() {
  const { t, formatCurrency } = useLocalization();

  const seed = useMemo<QuoteRow[]>(
    () => [
      { id: "Q-3001", client: "Kampala EV Hub", value: 1240, currency: "USD", stage: "New", updated: "Today" },
      { id: "Q-3000", client: "Skylink Stores", value: 860, currency: "USD", stage: "Negotiating", updated: "Yesterday" },
      { id: "Q-2999", client: "GreenFleet Uganda", value: 4200, currency: "USD", stage: "Approved", updated: "2d ago" },
    ],
    []
  );

  const [stage, setStage] = useState<QuoteStage | "All">("All");

  const filtered = useMemo(() => {
    if (stage === "All") return seed;
    return seed.filter((q) => q.stage === stage);
  }, [seed, stage]);

  return (
    <div className="w-full px-[0.55%] py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-500">{t("Provider sales")}</div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t("Service quotes")}</h1>
          <p className="mt-1 text-sm text-slate-600">{t("Track proposals, negotiations, and approvals.")}</p>
        </div>
        <Link
          to="/provider/new-quote"
          className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-800"
        >
          {t("New quote")}
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {["All", "New", "Negotiating", "Approved", "Expired"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStage(s as QuoteStage | "All")}
            className={`rounded-full border px-3 py-1 text-xs font-extrabold ${
              stage === s ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white dark:bg-slate-900 text-slate-600"
            }`}
          >
            {t(s)}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4">
        {filtered.map((quote) => (
          <Link
            key={quote.id}
            to={`/provider/quotes/${quote.id}`}
            className="block rounded-3xl border border-slate-100 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:border-emerald-200"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{quote.id}</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{quote.client}</div>
                <div className="mt-1 text-sm text-slate-600">{t("Updated")} · {quote.updated}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">{formatCurrency(quote.value, { fromCurrency: quote.currency })}</div>
                <div className="mt-1 text-xs font-semibold text-emerald-700">{t(quote.stage)}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
