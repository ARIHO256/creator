import React from "react";
import { Link } from "react-router-dom";
import { useLocalization } from "../../localization/LocalizationProvider";

import { sellerBackendApi } from "../../lib/backendApi";

void sellerBackendApi.getWorkflowScreenState("seller-feature:provider/ProviderOnboardingReview").catch(() => undefined);

export default function ProviderOnboardingReview() {
  const { t } = useLocalization();
  return (
    <div className="w-full px-[0.55%] py-6">
      <div className="rounded-3xl border border-slate-100 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="text-sm font-semibold text-slate-500">{t("Provider review")}</div>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{t("Review your provider setup")}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {t("Confirm details before submitting for verification.")}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/provider/portfolio"
            className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-800"
          >
            {t("Edit portfolio")}
          </Link>
          <Link
            to="/provider/service-command"
            className="rounded-full border border-slate-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-700"
          >
            {t("Submit & continue")}
          </Link>
        </div>
      </div>
    </div>
  );
}
