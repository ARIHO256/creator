import React, { useMemo, useState } from "react";

// Seller — Print Invoice (EVzone) v2 — JS only
// Route: /orders/:id/print/invoice

import { useLocalization } from "../../../localization/LocalizationProvider";

export default function SellerPrintInvoiceEVzoneV2() {
  const { t } = useLocalization();
  const brand = { green: '#03CD8C', orange: '#F77F00', grey: '#A6A6A6', black: '#111827' };
  const [order] = useState({ id: 'EV-10510', channel: 'EVmart', createdAt: '2025-10-12 10:21', seller: { name: 'EVzone Seller', addr: 'Millennium House, Nsambya Rd 472, Kampala, UG', email: 'sales@evzone.example', phone: '+256700200168' }, buyer: { name: 'GreenFleet Ltd', addr: 'Plot 12, Industrial Area, Kampala UG', email: 'ops@greenfleet.example', phone: '+256700000000' }, currency: 'USD', items: [{ sku: 'WBX-7KW-BLK', title: '7kW Wallbox (Black)', qty: 1, price: 1999 }, { sku: 'EVC-PORT-CCS2', title: 'CCS2 Port Kit', qty: 1, price: 400 }], totals: { subTotal: 2399, shipping: 50, tax: 50, discount: 0, grandTotal: 2499 }, promo: false });

  const packUrl = useMemo(() => (typeof window !== 'undefined' ? `${window.location.origin}/pack/${order.id}` : `/pack/${order.id}`), [order.id]);
  const isPromo = order.channel === 'MyLiveDealz' || order.promo === true; const logoSrc = isPromo ? '/assets/brand/mylivedealz-mark-color.svg' : '/assets/brand/evzone-marketplace-mark.svg';
  const official = { marketplaceName: 'EVzone Marketplace', officialAddrUG: 'Millennium House, Nsambya Road 472, Kampala, Uganda', officialEmail: 'hello@evzonecharging.com', officialPhone: '+256 700 200 168', registeredCN: 'EVZONE (Wuxi) Business Technology Co., Ltd.', registeredCNAddr: 'Room 265, No.3 Gaolang East Rd, Xinwu District, Wuxi City, Jiangsu, China' };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <style>{` :root{ --ev-green:${brand.green}; --ev-orange:${brand.orange}; --ev-grey:${brand.grey}; --ev-black:${brand.black}; } @page{ size:A4; margin:16mm;} @media print{ .no-print{display:none!important;} .page{ box-shadow:none!important; margin:0!important; } } .page{ max-width:800px; margin:24px auto; box-shadow:0 2px 8px rgba(0,0,0,.06); padding:24px; border:1px solid #eef2f7; border-radius:12px; } .hrow{ display:flex; align-items:flex-start; justify-content:space-between; gap:16px;} .kv{ display:flex; align-items:center; justify-content:space-between;} .table{ width:100%; border-collapse:collapse;} .table th,.table td{ border-bottom:1px solid #e5e7eb; padding:10px; font-size:13px;} `}</style>

      {/* Toolbar */}
      <div className="no-print sticky top-0 z-10 border-b bg-white dark:bg-slate-900/90 px-4 py-2"><div className="w-full flex items-center justify-between"><div className="font-extrabold" style={{ color: 'var(--ev-green)' }}>{t("Invoice")} — {order.id}</div><div className="inline-flex gap-2"><a href={`/orders/${order.id}`} className="rounded-lg border px-3 py-1 text-sm">{t("Back")}</a><button onClick={() => window.print()} className="rounded-lg bg-[var(--ev-orange)] px-3 py-1 text-sm font-bold text-white">{t("Print")}</button></div></div></div>

      <div className="page">
        {/* Header */}
        <div className="hrow">
          <div className="flex items-start gap-3"><img src={logoSrc} alt={isPromo ? 'MyLiveDealz' : 'EVzone Marketplace'} className="h-10 w-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} /><div><div className="text-sm font-extrabold" style={{ color: 'var(--ev-green)' }}>{isPromo ? 'MyLiveDealz' : 'EVzone Marketplace'}</div><div className="text-[11px] text-gray-600">{t("Official")}: {official.officialAddrUG} • {official.officialEmail} • {official.officialPhone}</div><div className="text-[11px] text-gray-600">{t("Registered (CN)")}: {official.registeredCN} — {official.registeredCNAddr}</div></div></div>
          <div className="text-right"><div className="text-2xl font-extrabold">{t("INVOICE")}</div><div className="text-sm text-gray-600">{t("Order")}: <b>{order.id}</b></div><div className="text-sm text-gray-600">{t("Date")}: {order.createdAt}</div><img alt={t("QR")} className="ml-auto mt-2 h-24 w-24 rounded-md border" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(packUrl)}`} onError={(e) => { const t = e.currentTarget; if (!t.dataset.ff) { t.dataset.ff = '1'; t.src = 'https://quickchart.io/qr?text=' + encodeURIComponent(packUrl); } else { t.src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27180%27 height=%27180%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%23eee%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 fill=%27%23666%27 font-family=%27Arial%27 font-size=%2712%27%3ENo QR%3C/text%3E%3C/svg%3E'; } }} /><div className="mt-1 text-[10px] text-gray-500 break-all">{packUrl}</div></div>
        </div>

        {/* Parties */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="rounded-lg border p-3"><div className="text-xs font-semibold text-gray-500">{t("Bill From")}</div><div className="mt-1 text-sm font-bold">{order.seller.name}</div><div className="text-sm text-gray-700 dark:text-slate-300">{order.seller.addr}</div><div className="text-xs text-gray-600">{order.seller.email} • {order.seller.phone}</div></div><div className="rounded-lg border p-3"><div className="text-xs font-semibold text-gray-500">{t("Bill To")}</div><div className="mt-1 text-sm font-bold">{order.buyer.name}</div><div className="text-sm text-gray-700 dark:text-slate-300">{order.buyer.addr}</div><div className="text-xs text-gray-600">{order.buyer.email} • {order.buyer.phone}</div></div></div>

        {/* Items */}
        <div className="mt-6"><table className="table"><thead><tr><th>{t("SKU")}</th><th>{t("Item")}</th><th>{t("Qty")}</th><th>{t("Price")}</th><th>{t("Total")}</th></tr></thead><tbody>{order.items.map(it => (<tr key={it.sku}><td className="font-mono text-xs">{it.sku}</td><td>{it.title}</td><td>{it.qty}</td><td>{order.currency} {it.price.toFixed(2)}</td><td>{order.currency} {(it.qty * it.price).toFixed(2)}</td></tr>))}</tbody></table></div>

        {/* Totals */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div></div>
          <div className="rounded-lg border p-3">
            <div className="kv">
              <span className="text-gray-600">{t("Subtotal")}</span>
              <b>{order.currency} {order.totals.subTotal.toFixed(2)}</b>
            </div>
            <div className="kv">
              <span className="text-gray-600">{t("Shipping")}</span>
              <b>{order.currency} {order.totals.shipping.toFixed(2)}</b>
            </div>
            <div className="kv">
              <span className="text-gray-600">{t("Tax")}</span>
              <b>{order.currency} {order.totals.tax.toFixed(2)}</b>
            </div>
            {order.totals.discount > 0 && (
              <div className="kv">
                <span className="text-gray-600">{t("Discount")}</span>
                <b>- {order.currency} {order.totals.discount.toFixed(2)}</b>
              </div>
            )}
            <div className="kv text-base">
              <span>{t("Grand Total")}</span>
              <b>{order.currency} {order.totals.grandTotal.toFixed(2)}</b>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-xs text-gray-600"><div className="font-semibold" style={{ color: 'var(--ev-green)' }}>{t("Packing/Delivery QR")}</div><div>{t("Scan the QR to view live packing details, delivery status, and proof of delivery once available.")}</div><div className="mt-2">{t("Thank you for choosing EVzone.")}</div></div>
      </div>
    </div>
  );
}
