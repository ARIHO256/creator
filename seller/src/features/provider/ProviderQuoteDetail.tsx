import React, { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useLocalization } from "../../localization/LocalizationProvider";

export default function ProviderQuoteDetail() {
  const { id } = useParams();
  const { t } = useLocalization();
  const quoteId = useMemo(() => id || "Q-3001", [id]);

  return (
    <div className="w-full px-[0.55%] py-6">
      <div className="mb-5">
        <div className="text-sm font-semibold text-slate-500">{t("Provider quote")}</div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t("Quote")} {quoteId}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("Review scope, pricing, and milestones before sending.")}</p>
      </div>

      <div className="grid gap-4">
        <div className="rounded-3xl border border-slate-100 bg-white dark:bg-slate-900 p-5">
          <div className="text-xs uppercase tracking-wide text-slate-400">{t("Client summary")}</div>
          <div className="mt-2 text-sm text-slate-700">{t("Client name and context will appear here.")}</div>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white dark:bg-slate-900 p-5">
          <div className="text-xs uppercase tracking-wide text-slate-400">{t("Quote actions")}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/provider/new-quote" className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-800">
              {t("Edit quote")}
            </Link>
            <Link to="/provider/joint-quotes" className="rounded-full border border-slate-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-700">
              {t("Open collaboration")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
