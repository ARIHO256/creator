import React, { useMemo, useState } from "react";

// Seller — Print Packing Slip (EVzone) v2 — JS only
// Route: /orders/:id/print/packing-slip

import { useLocalization } from "../../../localization/LocalizationProvider";

export default function SellerPrintPackingSlipEVzoneV2() {
  const { t } = useLocalization();
  const brand = { green: '#03CD8C', orange: '#F77F00', grey: '#A6A6A6', black: '#111827' };
  const [order] = useState({ id: 'EV-10510', channel: 'EVmart', promo: false, createdAt: '2025-10-12 10:21', shipTo: { name: 'GreenFleet Warehouse', addr: 'Plot 12, Industrial Area, Kampala UG', phone: '+256700000000' }, shipFrom: { name: 'EVzone Seller', addr: 'Millennium House, Nsambya Rd 472, Kampala UG', phone: '+256700200168' }, items: [{ sku: 'WBX-7KW-BLK', title: '7kW Wallbox (Black)', qty: 1 }, { sku: 'EVC-PORT-CCS2', title: 'CCS2 Port Kit', qty: 1 }], notes: 'Handle with care. Verify contents and seal integrity before dispatch.' });

  const packUrl = useMemo(() => (typeof window !== 'undefined' ? `${window.location.origin}/pack/${order.id}` : `/pack/${order.id}`), [order.id]);
  const isPromo = order.channel === 'MyLiveDealz' || order.promo === true; const logoSrc = isPromo ? '/assets/brand/mylivedealz-mark-color.svg' : '/assets/brand/evzone-marketplace-mark.svg';
  const official = { marketplaceName: 'EVzone Marketplace', officialAddrUG: 'Millennium House, Nsambya Road 472, Kampala, Uganda', officialEmail: 'hello@evzonecharging.com', officialPhone: '+256 700 200 168', registeredCN: 'EVZONE (Wuxi) Business Technology Co., Ltd.', registeredCNAddr: 'Room 265, No.3 Gaolang East Rd, Xinwu District, Wuxi City, Jiangsu, China' };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <style>{` :root{ --ev-green:${brand.green}; --ev-orange:${brand.orange}; --ev-grey:${brand.grey}; --ev-black:${brand.black}; } @page{ size:A4; margin:14mm;} @media print{ .no-print{display:none!important;} .page{ box-shadow:none!important; margin:0!important; } } .page{ max-width:800px; margin:24px auto; box-shadow:0 2px 8px rgba(0,0,0,.06); padding:24px; border:1px solid #eef2f7; border-radius:12px; } .hrow{ display:flex; align-items:flex-start; justify-content:space-between; gap:16px;} .table{ width:100%; border-collapse:collapse;} .table th,.table td{ border-bottom:1px solid #e5e7eb; padding:10px; font-size:13px;} .chk{ display:inline-block; width:14px; height:14px; border:1px solid #cbd5e1; border-radius:3px; margin-right:8px; } `}</style>

      {/* Toolbar */}
      <div className="no-print sticky top-0 z-10 border-b bg-white dark:bg-slate-900/90 px-4 py-2"><div className="w-full flex items-center justify-between"><div className="font-extrabold" style={{ color: 'var(--ev-green)' }}>{t("Packing Slip")} — {order.id}</div><div className="inline-flex gap-2"><a href={`/orders/${order.id}`} className="rounded-lg border px-3 py-1 text-sm">{t("Back")}</a><button onClick={() => window.print()} className="rounded-lg bg-[var(--ev-orange)] px-3 py-1 text-sm font-bold text-white">{t("Print")}</button></div></div></div>

      <div className="page">
        {/* Header */}
        <div className="hrow"><div className="flex items-start gap-3"><img src={logoSrc} alt={isPromo ? 'MyLiveDealz' : 'EVzone Marketplace'} className="h-10 w-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} /><div><div className="text-sm font-extrabold" style={{ color: 'var(--ev-green)' }}>{isPromo ? 'MyLiveDealz' : 'EVzone Marketplace'}</div><div className="text-[11px] text-gray-600">{t("Official")}: {official.officialAddrUG} • {official.officialEmail} • {official.officialPhone}</div><div className="text-[11px] text-gray-600">{t("Registered (CN)")}: {official.registeredCN} — {official.registeredCNAddr}</div></div></div><div className="text-right"><div className="text-lg font-extrabold">{t("PACKING SLIP")}</div><div className="text-xs text-gray-600">{t("Order")}: <b>{order.id}</b> • {order.channel}</div><div className="text-xs text-gray-600">{t("Date")}: {order.createdAt}</div><img alt={t("QR")} className="ml-auto mt-2 h-24 w-24 rounded-md border" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(packUrl)}`} onError={(e) => { const t = e.currentTarget; if (!t.dataset.ff) { t.dataset.ff = '1'; t.src = 'https://quickchart.io/qr?text=' + encodeURIComponent(packUrl); } else { t.src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27180%27 height=%27180%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%23eee%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 fill=%27%23666%27 font-family=%27Arial%27 font-size=%2712%27%3ENo QR%3C/text%3E%3C/svg%3E'; } }} /><div className="mt-1 text-[10px] text-gray-500 break-all">{packUrl}</div></div></div>

        {/* Addresses */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="rounded-lg border p-3"><div className="text-xs font-semibold text-gray-500">{t("Ship From")}</div><div className="mt-1 text-sm font-bold">{order.shipFrom.name}</div><div className="text-sm text-gray-700 dark:text-slate-300">{order.shipFrom.addr}</div><div className="text-xs text-gray-600">{order.shipFrom.phone}</div></div><div className="rounded-lg border p-3"><div className="text-xs font-semibold text-gray-500">{t("Ship To")}</div><div className="mt-1 text-sm font-bold">{order.shipTo.name}</div><div className="text-sm text-gray-700 dark:text-slate-300">{order.shipTo.addr}</div><div className="text-xs text-gray-600">{order.shipTo.phone}</div></div></div>

        {/* Items checklist */}
        <div className="mt-6"><table className="table"><thead><tr><th>{t("Pick")}</th><th>{t("SKU")}</th><th>{t("Item")}</th><th>{t("Qty")}</th><th>{t("Notes")}</th></tr></thead><tbody>{order.items.map(it => (<tr key={it.sku}><td><span className="chk"></span></td><td className="font-mono text-xs">{it.sku}</td><td>{it.title}</td><td>{it.qty}</td><td></td></tr>))}</tbody></table></div>

        {/* Footer */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="rounded-lg border p-3 text-sm"><div className="text-xs font-semibold text-gray-500">{t("Packer")}</div><div className="mt-2 h-8 rounded bg-gray-50 dark:bg-slate-950" /><div className="mt-1 text-xs text-gray-600">{t("Sign & date")}</div></div><div className="rounded-lg border p-3 text-sm"><div className="text-xs font-semibold text-gray-500">{t("Notes")}</div><div className="mt-1 text-gray-700 dark:text-slate-300">{order.notes}</div></div></div>
        <div className="mt-4 text-xs text-gray-600">{t("Scan the QR to view live packing details and delivery status.")}</div>
      </div>
    </div>
  );
}
