import React, { useMemo, useState } from "react";
import { useLocalization } from "../../localization/LocalizationProvider";
import { useRolePageContent } from "../../mock/shared/pageContent";

// Provider — Bookings & Orders (role-shared Orders page)

type BookingStage = "Requested" | "Confirmed" | "In progress" | "Completed" | "Canceled";

type BookingRow = {
  id: string;
  client: string;
  service: string;
  price: number;
  currency: string;
  scheduledFor: string;
  stage: BookingStage;
};

export default function ProviderOrdersView() {
  const { t, formatCurrency } = useLocalization();
  const { content } = useRolePageContent("orders", "provider");
  const seed = useMemo<BookingRow[]>(() => content.bookings || [], [content]);
  const stages = useMemo(
    () => ["All", ...((content.stages as BookingStage[]) || ["Requested", "Confirmed", "In progress", "Completed", "Canceled"])],
    [content]
  );

  const [stage, setStage] = useState<BookingStage | "All">("All");

  const filtered = useMemo(() => {
    if (stage === "All") return seed;
    return seed.filter((b) => b.stage === stage);
  }, [seed, stage]);

  return (
    <div className="w-full px-[0.55%] py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-500">{t("Provider operations")}</div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t(content.headline)}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(content.subhead)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {stages.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStage(s as BookingStage | "All")}
              className={`rounded-full border px-3 py-1 text-xs font-extrabold ${
                stage === s
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white dark:bg-slate-900 text-slate-600"
              }`}
            >
              {t(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {filtered.map((booking) => (
          <article key={booking.id} className="rounded-3xl border border-slate-100 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{booking.id}</div>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{booking.service}</h3>
                <div className="mt-1 text-sm text-slate-600">{booking.client}</div>
              </div>
              <div className="text-sm font-semibold text-emerald-700">
                {formatCurrency(booking.price, { fromCurrency: booking.currency })}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
              <span className="rounded-full border border-slate-200 bg-gray-50 dark:bg-slate-950 px-3 py-1">{t(booking.stage)}</span>
              <span>{t("Scheduled")}: {booking.scheduledFor}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
