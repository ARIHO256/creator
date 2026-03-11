import React, { useEffect, useMemo, useState } from "react";

// Seller — Packing Sticker (EVzone) v2 — JS only
// Route: /orders/:id/print/sticker

import { useLocalization } from "../../../localization/LocalizationProvider";

export default function SellerPackingStickerEVzoneV2() {
  const { t } = useLocalization();
  const brand = { green: '#03CD8C', orange: '#F77F00', black: '#111827' };
  const [order] = useState({ id: 'EV-10510', channel: 'EVmart', promo: false, to: { name: 'GreenFleet Warehouse', addr: 'Plot 12, Industrial Area, Kampala UG', phone: '+256700000000' }, from: { name: 'EVzone Seller', addr: 'Nsambya Rd 472, Kampala UG', phone: '+256700200168' } });

  const initialSize: "A4" | "A5" | "A6" = (() => {
    try {
      const p = new URLSearchParams(window.location.search).get("size");
      return p === "A4" || p === "A5" || p === "A6" ? p : "A6";
    } catch {
      return "A6";
    }
  })();
  const [size, setSize] = useState<"A4" | "A5" | "A6">(initialSize);
  const pageCss = useMemo(() => `@page { size: ${size} landscape; margin: 10mm; }`, [size]);
  const previewStyle = useMemo(
    () => ({ A6: { width: "148mm", height: "105mm" }, A5: { width: "210mm", height: "148mm" }, A4: { width: "297mm", height: "210mm" } }[size]),
    [size]
  );

  const packUrl = useMemo(() => (typeof window !== 'undefined' ? `${window.location.origin}/pack/${order.id}` : `/pack/${order.id}`), [order.id]);
  const isPromo = order.channel === 'MyLiveDealz' || order.promo === true; const logoSrc = isPromo ? '/assets/brand/mylivedealz-mark-color.svg' : '/assets/brand/evzone-marketplace-mark.svg';

  useEffect(() => { try { const url = new URL(window.location.href); url.searchParams.set('size', size); window.history.replaceState(null, '', url.toString()); } catch { } }, [size]);

  return (
    <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
      <style>{`
        ${pageCss}
        @media print { .no-print{ display:none !important; } .label{ box-shadow:none !important; margin:0 !important; width:auto !important; height:auto !important; } }
        .label{ box-shadow:0 2px 8px rgba(0,0,0,.06); border:1px solid #e5e7eb; border-radius:10px; padding:12px; background:#fff; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print sticky top-0 z-10 border-b bg-white dark:bg-slate-900/90 px-4 py-2"><div className="w-full flex items-center justify-between gap-3"><div className="font-extrabold" style={{ color: brand.green }}>{t("Packing Sticker")} — {order.id}</div><div className="inline-flex items-center gap-2 text-sm"><label>{t("Select size")}</label><select value={size} onChange={e => setSize(e.target.value as "A4" | "A5" | "A6")} className="rounded border border-gray-300 px-2 py-1"><option value="A6">A6 ({t("landscape")})</option><option value="A5">A5 ({t("landscape")})</option><option value="A4">A4 ({t("landscape")})</option></select><a href={`/orders/${order.id}`} className="rounded-lg border px-3 py-1">{t("Back")}</a><button onClick={() => window.print()} className="rounded-lg px-3 py-1 font-bold text-white" style={{ backgroundColor: brand.orange }}>{t("Print")}</button></div></div></div>

      <div className="mx-auto mt-4 flex items-start justify-center px-4"><div className="label" style={{ width: previewStyle.width, height: previewStyle.height }}>
        <div className="flex items-start justify-between"><div className="flex items-center gap-2"><img src={logoSrc} alt={isPromo ? 'MyLiveDealz' : 'EVzone Marketplace'} className="h-8 w-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} /><div className="text-xs text-gray-600">{order.channel}</div></div><div className="text-xs text-gray-600">{t("Order")} <b>{order.id}</b></div></div>
        <div className="mt-2 grid grid-cols-2 gap-3"><div className="rounded border p-2"><div className="text-[10px] font-semibold text-gray-500">{t("TO")}</div><div className="text-base font-extrabold">{order.to.name}</div><div className="text-xs text-gray-700 dark:text-slate-300">{order.to.addr}</div><div className="text-xs text-gray-700 dark:text-slate-300">{order.to.phone}</div></div><div className="rounded border p-2"><div className="text-[10px] font-semibold text-gray-500">{t("FROM")}</div><div className="text-sm font-bold">{order.from.name}</div><div className="text-xs text-gray-700 dark:text-slate-300">{order.from.addr}</div><div className="text-xs text-gray-700 dark:text-slate-300">{order.from.phone}</div></div></div>
        <div className="mt-2 flex items-start gap-3"><img alt={t("QR")} className="h-36 w-36 rounded border" src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(packUrl)}`} onError={(e) => { const t = e.currentTarget; if (!t.dataset.ff) { t.dataset.ff = '1'; t.src = 'https://quickchart.io/qr?text=' + encodeURIComponent(packUrl); } else { t.src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27260%27 height=%27260%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%23eee%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 fill=%27%23666%27 font-family=%27Arial%27 font-size=%2712%27%3ENo QR%3C/text%3E%3C/svg%3E'; } }} /><div className="text-[11px] text-gray-700 dark:text-slate-300"><div className="font-semibold" style={{ color: brand.black }}>{t("Scan for Packing & Delivery Details")}</div><div className="mt-1 break-all text-[10px] text-gray-500">{packUrl}</div><div className="mt-2 rounded border border-dashed p-2 text-[10px]"><div><b>{t("Notes")}:</b> {t("Handle with care • Keep upright • Verify contents")}</div></div></div></div>
        <div className="absolute bottom-2 left-0 right-0 px-3"><div className="flex items-center justify-between text-[10px] text-gray-600"><div>{t("Printed by EVzone")}</div><div>{new Date().toLocaleString()}</div></div></div>
      </div></div>
    </div>
  );
}
