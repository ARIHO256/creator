export default function ProfileSellerView() {
  return (
    <div className="w-full px-[0.55%] py-6">
      {/* Header */}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Profile &amp; Storefront</h1>
          <p className="mt-1 text-xs md:text-sm text-gray-500 dark:text-slate-400">
            Identity, branding, addresses, multi-store readiness and quality scoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center rounded-full border border-emerald-400/70 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm dark:border-emerald-500/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            Preview storefront
          </button>
          <button className="inline-flex items-center rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-600">
            Save
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        {["Identity", "Branding", "Addresses", "Product/Service Lines", "Regions", "Socials"].map(
          (tab, idx) => (
            <button
              key={tab}
              className={`inline-flex items-center rounded-full border px-3 py-1 font-semibold ${
                idx === 3
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-700 bg-slate-900 text-slate-300"
              }`}
            >
              {tab}
            </button>
          )
        )}
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        {/* Product lines / taxonomy coverage */}
        <section className="rounded-2xl border border-emerald-500/30 bg-slate-950/40 p-4 shadow-[0_24px_80px_rgba(16,185,129,0.25)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Your product lines (taxonomy coverage)
              </h2>
              <p className="mt-1 text-xs text-slate-400 max-w-2xl">
                These product lines appear on your storefront and help EVzone route approvals,
                promotions, and compliance checks.
              </p>
            </div>
            <span className="text-[11px] text-slate-400">0 selected</span>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <input
              disabled
              className="h-9 w-full rounded-full border border-slate-700 bg-slate-900/60 px-3 text-xs text-slate-300 placeholder:text-slate-600 md:max-w-md"
              placeholder="Search product lines (e.g., chargers, desktops)"
            />
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Show</span>
              <button className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs text-slate-200">
                Active only
              </button>
            </div>
          </div>

          {/* Empty state list – labels visible even with no data */}
          <div className="mt-4 grid gap-2 rounded-2xl border border-dashed border-emerald-500/40 bg-slate-900/40 p-4 text-xs text-slate-400">
            <p className="font-semibold text-slate-200">
              No product lines have been configured yet.
            </p>
            <p>
              When your database endpoints are wired, approved product lines will show here with
              their taxonomy path and status badges (Active / Suspended).
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-[11px]">
                EVmart · EV Chargers &amp; Accessories · DC Fast Chargers
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-[11px]">
                GadgetMart · Laptops &amp; Computers · Desktops
              </span>
            </div>
          </div>
        </section>

        {/* Quality score side card */}
        <aside className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Quality score
          </h3>
          <div className="mt-3 flex items-center gap-4">
            <div className="relative h-20 w-20 rounded-full border-4 border-emerald-500/70">
              <div className="absolute inset-1 rounded-full border border-slate-800 bg-slate-950/80 flex items-center justify-center">
                <span className="text-sm font-bold text-emerald-400">0</span>
              </div>
            </div>
            <div className="space-y-1 text-xs text-slate-400">
              <p className="font-semibold text-slate-100">
                Super premium: completeness and readiness.
              </p>
              <p>
                As you connect real data (logo, description, addresses, regions), this score will
                update automatically.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-1 text-xs">
            {[
              "Logo uploaded",
              "Description ready",
              "Default address",
              "Multi‑store planned",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5"
              >
                <span className="text-slate-300">{item}</span>
                <span className="text-[10px] font-semibold text-emerald-400">Pending</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
