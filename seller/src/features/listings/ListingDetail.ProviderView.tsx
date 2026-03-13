import React, { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useLocalization } from "../../localization/LocalizationProvider";
import { useMockState } from "../../mocks";

type ServiceDetail = {
  id: string;
  title: string;
  category: string;
  rate: number;
  currency: string;
  duration: string;
  status: "Active" | "Paused" | "Draft";
  lastUpdated: string;
};

const SEED_SERVICES: ServiceDetail[] = [
  {
    id: "SRV-401",
    title: "EV Charger Installation",
    category: "Installations",
    rate: 180,
    currency: "USD",
    duration: "2 hours",
    status: "Active",
    lastUpdated: "Today, 09:10",
  },
  {
    id: "SRV-402",
    title: "Fleet Energy Audit",
    category: "Consulting",
    rate: 320,
    currency: "USD",
    duration: "Half day",
    status: "Paused",
    lastUpdated: "Yesterday",
  },
];

export default function ProviderListingDetailView() {
  const { id } = useParams();
  const { t, formatCurrency } = useLocalization();

  const [services] = useMockState<ServiceDetail[]>("provider.listings.services", SEED_SERVICES);
  const detail = useMemo(() => services.find((item) => item.id === id) || services[0], [id, services]);

  return (
    <div className="w-full px-[0.55%] py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-500">{t("Service listing")}</div>
          <h1 className="text-2xl font-extrabold text-slate-900">{detail.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            <span className="rounded-full border border-slate-200 bg-gray-50 dark:bg-slate-950 px-3 py-1">{detail.category}</span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">{detail.status}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-slate-400">{t("Rate")}</div>
          <div className="text-xl font-extrabold text-slate-900">
            {formatCurrency(detail.rate, { fromCurrency: detail.currency })}
          </div>
          <div className="text-xs text-slate-500">{t("Updated")} · {detail.lastUpdated}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">{t("Delivery")}</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">{t("Duration")}: {detail.duration}</div>
          <div className="mt-1 text-xs text-slate-500">{t("Configure scheduling and buffers in Service Command.")}</div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">{t("Actions")}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link className="rounded-full border border-slate-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold" to="/provider/service-command">
              {t("Open Service Command")}
            </Link>
            <Link className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-800" to="/provider/consultations">
              {t("Manage consultations")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
