import React, { useMemo } from "react";
import { useLocalization } from "../../localization/LocalizationProvider";

// Provider — Capacity & Asset Inventory

type Asset = {
  id: string;
  name: string;
  type: string;
  status: "Available" | "Allocated" | "Maintenance";
  location: string;
};

const statusTone: Record<Asset["status"], string> = {
  Available: "bg-emerald-50 text-emerald-700",
  Allocated: "bg-amber-50 text-amber-700",
  Maintenance: "bg-rose-50 text-rose-700",
};

export default function ProviderInventoryView() {
  const { t } = useLocalization();

  const assets = useMemo<Asset[]>(
    () => [
      { id: "AS-200", name: "Field Kit A", type: "Install tools", status: "Available", location: "Kampala" },
      { id: "AS-201", name: "Lift Rig 12", type: "Hardware", status: "Allocated", location: "Entebbe" },
      { id: "AS-202", name: "Diagnostics Pad", type: "Testing", status: "Maintenance", location: "Kampala" },
    ],
    []
  );

  return (
    <div className="w-full px-[0.55%] py-6">
      <div className="mb-5">
        <div className="text-sm font-semibold text-slate-500">{t("Provider ops")}</div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t("Capacity & assets")}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t("Track the tools and teams available for upcoming service bookings.")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {assets.map((asset) => (
          <article key={asset.id} className="rounded-3xl border border-slate-100 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{asset.id}</div>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{asset.name}</h3>
                <div className="mt-1 text-sm text-slate-600">{asset.type}</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${statusTone[asset.status]}`}>
                {t(asset.status)}
              </span>
            </div>
            <div className="mt-4 text-xs text-slate-500">{t("Location")}: {asset.location}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
