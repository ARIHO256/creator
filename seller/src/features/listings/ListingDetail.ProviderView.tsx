import React, { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useLocalization } from "../../localization/LocalizationProvider";
import { sellerBackendApi } from "../../lib/backendApi";

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

export default function ProviderListingDetailView() {
  const { id } = useParams();
  const { t, formatCurrency } = useLocalization();
  const [services, setServices] = React.useState<ServiceDetail[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    void sellerBackendApi
      .getSellerWorkspaceListings()
      .then((rows) => {
        if (!active) return;
        const mapped = rows
          .filter((row) => String((row as { listingType?: unknown }).listingType ?? "").toLowerCase() === "service")
          .map((row) => {
            const payload = (((row as { data?: unknown }).data ?? {}) as Record<string, unknown>);
            return {
              id: String((row as { id?: unknown }).id ?? payload.id ?? ""),
              title: String((row as { title?: unknown }).title ?? payload.title ?? "Service listing"),
              category: String(payload.category ?? "Services"),
              rate: Number(payload.price ?? payload.rate ?? 0),
              currency: String((row as { currency?: unknown }).currency ?? payload.currency ?? "USD"),
              duration: String(payload.duration ?? "Custom"),
              status: String((row as { status?: unknown }).status ?? payload.status ?? "Draft"),
              lastUpdated: new Date(String((row as { updatedAt?: unknown }).updatedAt ?? payload.updatedAt ?? new Date().toISOString())).toLocaleString(undefined, {
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              }),
            } satisfies ServiceDetail;
          });
        setServices(mapped);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const detail = useMemo(() => services.find((item) => item.id === id) || services[0], [id, services]);

  if (!detail && loaded) {
    return <div className="w-full px-[0.55%] py-6 text-sm font-semibold text-slate-500">{t("No service listing found.")}</div>;
  }

  if (!detail) {
    return <div className="w-full px-[0.55%] py-6 text-sm font-semibold text-slate-500">{t("Loading service listing...")}</div>;
  }

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
