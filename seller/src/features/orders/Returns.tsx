import React, { useMemo, useState } from "react";
import { useLocalization } from "../../localization/LocalizationProvider";
import { Link } from "react-router-dom";

// Seller — Returns & RMAs command center
export default function SellerReturnsEVzoneV3() {
  const { t } = useLocalization();
  const brand = useMemo(
    () => ({ green: "#03CD8C", orange: "#F77F00", grey: "#A6A6A6", greyLight: "#F2F2F2", black: "#111827" }),
    []
  );
  const HeroHeading = ({ children, className = "", withIcon = false, ...rest }) => {
    const classes = ["page-hero-title", "flex items-center gap-2", className].filter(Boolean).join(" ");
    return (
      <h1 className={classes} {...rest}>
        {withIcon && <img src="/logo2.jpeg" alt="" className="h-6 w-6 flex-shrink-0 object-contain" />}
        <span>{children}</span>
      </h1>
    );
  };

  const initial = [
    { rma: "RMA-22015", orderId: "EV-10510", channel: "EVmart", buyer: "GreenFleet Ltd", sku: "WBX-7KW-BLK", title: "7kW Wallbox (Black)", quantity: 1, currency: "USD", amount: 1999, reason: "Defective on arrival", attachments: ["https://dummyimage.com/60x60/f2f2f2/111827&text=IMG"], state: "Requested", createdAt: "2025-10-12 13:05" },
    { rma: "RMA-22014", orderId: "GM-10509", channel: "GadgetMart", buyer: "K. Namusoke", sku: "GAD-WATCH-UL", title: "Smart Watch Ultra", quantity: 1, currency: "USD", amount: 79, reason: "Wrong color", attachments: [], state: "Approved", createdAt: "2025-10-12 10:44" },
    { rma: "RMA-22013", orderId: "MD-10507", channel: "Medical", buyer: "City Clinic", sku: "PPE-MASK-50", title: "Masks (50 pack)", quantity: 10, currency: "USD", amount: 120, reason: "Over-order, need partial refund", attachments: [], state: "Received", createdAt: "2025-10-11 09:02" },
    { rma: "RMA-22012", orderId: "ST-10506", channel: "StyleMart", buyer: "J. Byaruhanga", sku: "STYLE-TEE-XL-BK", title: "EVzone Tee — XL Black", quantity: 1, currency: "USD", amount: 18, reason: "Size mismatch", attachments: ["https://dummyimage.com/60x60/f2f2f2/111827&text=IMG"], state: "Refunded", createdAt: "2025-10-10 19:30" }
  ];

  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState("All");
  const [channel, setChannel] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [view, setView] = useState("table");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState("");

  const openToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 1400);
  };

  const counters = useMemo(
    () => ({
      All: rows.length,
      Requested: rows.filter((r) => r.state === "Requested").length,
      Approved: rows.filter((r) => r.state === "Approved").length,
      Denied: rows.filter((r) => r.state === "Denied").length,
      Received: rows.filter((r) => r.state === "Received").length,
      Refunded: rows.filter((r) => r.state === "Refunded").length
    }),
    [rows]
  );

  const channelOptions = useMemo(() => ["All", ...Array.from(new Set(rows.map((r) => r.channel)))], [rows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (tab !== "All" && row.state !== tab) return false;
      if (channel !== "All" && row.channel !== channel) return false;
      if (dateFrom && new Date(row.createdAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(row.createdAt) > new Date(`${dateTo}T23:59:59`)) return false;
      return true;
    });
  }, [rows, tab, channel, dateFrom, dateTo]);

  const allSelectedOnPage = filtered.length > 0 && filtered.every((row) => selected[row.rma]);

  const toggleSelect = (rma) => {
    setSelected((prev) => ({ ...prev, [rma]: !prev[rma] }));
  };

  const toggleAllOnPage = () => {
    if (allSelectedOnPage) {
      const clone = { ...selected };
      filtered.forEach((row) => delete clone[row.rma]);
      setSelected(clone);
    } else {
      setSelected((prev) => {
        const next = { ...prev };
        filtered.forEach((row) => {
          next[row.rma] = true;
        });
        return next;
      });
    }
  };

  const actApprove = (rma) => {
    setRows((list) => list.map((row) => (row.rma === rma ? { ...row, state: "Approved" } : row)));
    openToast(t("Return approved"));
  };
  const actDeny = (rma) => {
    setRows((list) => list.map((row) => (row.rma === rma ? { ...row, state: "Denied" } : row)));
    openToast(t("Return denied"));
  };
  const actRequestPhotos = () => openToast(t("Requested additional photos"));
  const actMarkReceived = (rma) => {
    setRows((list) => list.map((row) => (row.rma === rma ? { ...row, state: "Received" } : row)));
    openToast(t("Marked received"));
  };
  const actRefund = (rma) => {
    setRows((list) => list.map((row) => (row.rma === rma ? { ...row, state: "Refunded" } : row)));
    openToast(t("Refund initiated"));
  };

  const stateChip = (state) => (
    <span className={`state-chip state-${state.toLowerCase()}`}>{t(state)}</span>
  );

  const renderRow = (row) => (
    <tr key={row.rma}>
      <td>
        <input type="checkbox" checked={!!selected[row.rma]} onChange={() => toggleSelect(row.rma)} />
      </td>
      <td>{row.rma}</td>
      <td>
        <div className="linkish">{row.orderId}</div>
        <div className="text-xs text-gray-500">{t(row.channel)}</div>
      </td>
      <td>
        <div className="font-semibold">{t(row.buyer)}</div>
        <div className="text-xs text-gray-500">{t(row.title)}</div>
      </td>
      <td>{row.quantity}</td>
      <td>
        {row.currency} {row.amount.toFixed(2)}
      </td>
      <td>{stateChip(row.state)}</td>
      <td>{row.createdAt}</td>
      <td>
        <div className="row-actions">
          <button type="button" onClick={() => actApprove(row.rma)} className="btn-ghost">
            {t("Approve")}
          </button>
          <button type="button" onClick={() => actDeny(row.rma)} className="btn-ghost">
            {t("Deny")}
          </button>
          <button type="button" onClick={() => actRequestPhotos()} className="btn-ghost">
            {t("Request photos")}
          </button>
          {row.state !== "Received" && (
            <button type="button" onClick={() => actMarkReceived(row.rma)} className="btn-ghost">
              {t("Mark received")}
            </button>
          )}
          {row.state === "Received" && (
            <button type="button" onClick={() => actRefund(row.rma)} className="btn-primary">
              {t("Refund")}
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  const renderCard = (row) => (
    <article key={row.rma} className="return-card">
      <header>
        <div>
          <div className="card-title">{row.rma}</div>
          <div className="text-xs text-gray-500">{t("Order")} {row.orderId} • {t(row.channel)}</div>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={!!selected[row.rma]} onChange={() => toggleSelect(row.rma)} />
          {t("Select")}
        </label>
      </header>
      <div className="card-body">
        <div>
          <div className="label">{t("Buyer")}</div>
          <div>{t(row.buyer)}</div>
        </div>
        <div>
          <div className="label">{t("Item")}</div>
          <div>{t(row.title)}</div>
        </div>
        <div>
          <div className="label">{t("Qty")}</div>
          <div>{row.quantity}</div>
        </div>
        <div>
          <div className="label">{t("Amount")}</div>
          <div>
            {row.currency} {row.amount.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="label">{t("State")}</div>
          {stateChip(row.state)}
        </div>
      </div>
      <footer>
        <div className="text-xs text-gray-500">{t("Opened")} {row.createdAt}</div>
        <div className="row-actions">
          <button type="button" onClick={() => actApprove(row.rma)} className="btn-ghost">
            {t("Approve")}
          </button>
          <button type="button" onClick={() => actDeny(row.rma)} className="btn-ghost">
            {t("Deny")}
          </button>
          <button type="button" onClick={() => actMarkReceived(row.rma)} className="btn-ghost">
            {t("Mark received")}
          </button>
          <button type="button" onClick={() => actRequestPhotos()} className="btn-ghost">
            {t("Request photos")}
          </button>
        </div>
      </footer>
    </article>
  );

  return (
    <div className="returns-shell text-[#111827]">
      <style>{`
        :root{ --ev-green:${brand.green}; --ev-orange:${brand.orange}; --ev-grey:${brand.grey}; --ev-grey-light:${brand.greyLight}; --ev-ink:${brand.black}; }
        .returns-shell{ min-height:100vh; background:var(--surface-2); margin-top:calc(-1 * var(--app-topbar-height,72px)); padding-top:var(--app-topbar-height,72px); }
        .returns-header{ border: 1px solid #e5e7eb; top:var(--app-topbar-height,72px); z-index:30; border-radius: 10px; background:var(--surface-1); padding:12px; }
        .returns-header .inner{ display:flex; flex-direction:column; gap:12px; }
        .returns-hero{ display:flex; flex-wrap:wrap; gap:16px; align-items:flex-start; justify-content:space-between; }
        .returns-title{ font-size:24px; font-weight:900; letter-spacing:-0.02em; margin:0; color:#0f172a; }
        .returns-chips{ display:flex; flex-wrap:wrap; gap:8px; margin-top:6px; }
        .returns-chips span{ display:inline-flex; align-items:center; gap:6px; border-radius:999px; padding:4px 10px; border:1px solid rgba(107,114,128,0.25); background:var(--surface-2); font-size:11px; font-weight:700; color:#334155; }
        .returns-actions{ display:flex; gap:10px; flex-wrap:wrap; }
        .btn-primary{ border:none; border-radius:14px; padding:8px 16px; font-weight:700; background:#f97316; color:#0f172a; box-shadow:0 12px 30px -32px rgba(15,23,42,.35); }
        .btn-ghost{ border:1px solid rgba(15,23,42,0.15); border-radius:14px; padding:6px 14px; background:var(--surface-1); font-weight:600; color:#334155; }
        .returns-metrics{ width:100%; display:grid; gap:10px; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); }
        .metric-card{ border:1px solid #e5e7eb; border-radius:16px; padding:10px 12px; background:var(--surface-1); }
        .metric-card span{ display:block; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.16em; color:#94a3b8; }
        .metric-card strong{ display:block; margin-top:4px; font-size:20px; }
        .returns-main{ padding:18px 0 40px; }
        .returns-surface{ border:1px solid #e5e7eb; border-radius:32px; background:var(--surface-1); padding:24px; box-shadow:0 20px 60px -50px rgba(15,23,42,.25); }
        .filters-row{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
        .status-pill{ border-radius:999px; border:1.5px solid rgba(15,23,42,0.15); padding:6px 12px; font-size:12px; font-weight:700; background:var(--surface-1); color:#0f172a; }
        .status-pill.active{ background:rgba(15,23,42,0.08); }
        .channel-select, .date-input{ border:1.5px solid rgba(15,23,42,0.15); border-radius:12px; padding:8px 12px; font-size:12px; background:var(--surface-1); color:#0f172a; }
        .view-toggle{ display:inline-flex; border:1.5px solid rgba(15,23,42,0.15); border-radius:12px; padding:4px; gap:4px; }
        .view-toggle button{ border:none; border-radius:8px; padding:6px 12px; font-size:12px; font-weight:600; background:transparent; color:#0f172a; }
        .view-toggle button.active{ background:rgba(3,205,140,.12); color:var(--ev-green); }
        .bulk-bar{ margin-top:12px; border:1.5px solid rgba(15,23,42,0.15); border-radius:16px; padding:10px 14px; display:flex; align-items:center; gap:10px; background:var(--surface-2); font-size:13px; }
        table{ width:100%; border-collapse:separate; border-spacing:0; margin-top:16px; border-radius:24px; border:1px solid rgba(15,23,42,0.12); overflow:hidden; }
        thead{ background:var(--surface-2); text-transform:uppercase; font-size:11px; letter-spacing:.16em; color:#94a3b8; }
        th,td{ padding:12px 14px; border-bottom:1px solid rgba(226,232,240,.6); text-align:left; font-size:13px; }
        tbody tr:last-child td{ border-bottom:none; }
        .row-actions{ display:flex; flex-wrap:wrap; gap:6px; }
        .return-card{ border:1.25px solid rgba(15,23,42,0.15); border-radius:22px; padding:18px; background:var(--surface-1); display:flex; flex-direction:column; gap:14px; }
        .return-card header{ display:flex; justify-content:space-between; gap:12px; }
        .return-card .card-body{ display:grid; gap:10px; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); font-size:13px; }
        .return-card .label{ font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.12em; }
        .state-chip{ border-radius:999px; padding:3px 10px; font-size:11px; font-weight:700; letter-spacing:.08em; background:var(--surface-1); border:1.5px solid rgba(3,205,140,.35); color:#0f172a; text-transform:uppercase; }
        .state-chip.state-requested{ border-color:var(--ev-orange); color:var(--ev-orange); }
        .state-chip.state-approved{ border-color:var(--ev-green); color:#047857; }
        .state-chip.state-denied{ border-color:#ef4444; color:#b91c1c; }
        .state-chip.state-received{ border-color:#2563eb; color:#1d4ed8; }
        .state-chip.state-refunded{ border-color:#047857; color:#047857; }
        .linkish{ color:var(--ev-green); font-weight:700; cursor:pointer; }
        .toast{ position:fixed; bottom:18px; left:0; right:0; display:flex; justify-content:center; z-index:50; }
        .toast span{ border:1.5px solid rgba(3,205,140,.35); border-radius:999px; padding:8px 18px; background:var(--surface-1); font-weight:700; display:inline-flex; align-items:center; gap:8px; }
        @media(max-width:768px){ .returns-surface{ padding:16px; } table{ display:none; } }
      `}</style>

      <header className="returns-header">
        <div className="w-full max-w-none px-3 sm:px-4">
          <div className="inner">
            <div className="returns-hero">
              <div>
                <HeroHeading withIcon className="returns-title">{t("Returns & RMAs")}</HeroHeading>
                <div className="returns-chips">
                  <span>⚡ {t("Same-day approvals")}</span>
                  <span>📦 {t("Courier receipts")}</span>
                  <span>💳 {t("Instant refunds")}</span>
                </div>
              </div>
              <div className="returns-actions">
                <Link to="/orders" className="btn-ghost">{t("Go to orders")}</Link>
                <button type="button" className="btn-primary" onClick={() => setView((prev) => (prev === "table" ? "cards" : "table"))}>
                  {t("Toggle view")}
                </button>
              </div>
            </div>
            <div className="returns-metrics">
              {Object.entries(counters).map(([key, value]) => (
                <div key={key} className="metric-card">
                  <span>{t(key)}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="returns-main">
        <div className="w-full max-w-none px-3 sm:px-4">
          <div className="returns-surface">
            <div className="filters-row">
              {["All", "Requested", "Approved", "Denied", "Received", "Refunded"].map((entry) => (
                <button key={entry} type="button" className={`status-pill ${tab === entry ? "active" : ""}`} onClick={() => setTab(entry)}>
                  {t(entry)} {counters[entry] !== undefined && <span>({counters[entry]})</span>}
                </button>
              ))}
              <select className="channel-select" value={channel} onChange={(event) => setChannel(event.target.value)}>
                {channelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "All" ? t("All") : t(option)}
                  </option>
                ))}
              </select>
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="date-input" />
              <span>→</span>
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="date-input" />
              <div className="view-toggle">
                <button type="button" className={view === "table" ? "active" : ""} onClick={() => setView("table")}>
                  {t("Table")}
                </button>
                <button type="button" className={view === "cards" ? "active" : ""} onClick={() => setView("cards")}>
                  {t("Cards")}
                </button>
              </div>
            </div>

            {Object.values(selected).some(Boolean) && (
              <div className="bulk-bar">
                <span>{Object.values(selected).filter(Boolean).length} {t("selected")}</span>
                <button type="button" className="btn-ghost" onClick={() => openToast(t("Bulk approve queued"))}>{t("Bulk approve")}</button>
                <button type="button" className="btn-ghost" onClick={() => openToast(t("Bulk deny queued"))}>{t("Bulk deny")}</button>
                <button type="button" className="btn-ghost" onClick={() => setSelected({})}>{t("Clear")}</button>
              </div>
            )}

            {view === "table" ? (
              <table>
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox" checked={allSelectedOnPage} onChange={toggleAllOnPage} />
                    </th>
                    <th>{t("RMA")}</th>
                    <th>{t("Order")}</th>
                    <th>{t("Buyer")}</th>
                    <th>{t("Qty")}</th>
                    <th>{t("Amount")}</th>
                    <th>{t("State")}</th>
                    <th>{t("Created")}</th>
                    <th>{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody>{filtered.map(renderRow)}</tbody>
              </table>
            ) : (
              <div className="grid grid-cols-1 gap-4 pt-4">{filtered.map(renderCard)}</div>
            )}

            {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-[rgba(3,205,140,.35)] p-10 text-center text-gray-500 mt-4">{t("No returns in this view.")}</div>}
          </div>
        </div>
      </main>

      {toast && (
        <div className="toast">
          <span>✅ {toast}</span>
        </div>
      )}
    </div>
  );
}
