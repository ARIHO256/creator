import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { sellerBackendApi } from "../../../lib/backendApi";
import { useLocalization } from "../../../localization/LocalizationProvider";

const EMPTY_ORDER = {
  id: "",
  channel: "",
  createdAt: "",
  seller: { name: "", addr: "", email: "", phone: "" },
  buyer: { name: "", addr: "", email: "", phone: "" },
  currency: "USD",
  items: [] as Array<{ sku: string; title: string; qty: number; price: number }>,
  totals: { subTotal: 0, shipping: 0, tax: 0, discount: 0, grandTotal: 0 },
  promo: false,
};

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function normalizeInvoicePayload(payload: Record<string, unknown>) {
  const order = asRecord(payload.order);
  const seller = asRecord(payload.seller);
  const buyer = asRecord(payload.buyer);
  const metadata = asRecord(order.metadata);
  const totals = asRecord(payload.totals);
  const items = Array.isArray(payload.items)
    ? payload.items.map((entry) => {
        const item = asRecord(entry);
        return {
          sku: String(item.sku || item.id || ""),
          title: String(item.name || item.title || ""),
          qty: Number(item.qty || 0),
          price: Number(item.unitPrice || item.price || 0),
        };
      })
    : [];

  return {
    id: String(order.id || ""),
    channel: String(order.channel || ""),
    createdAt: formatDate(String(order.createdAt || "")),
    seller: {
      name: String(seller.storefrontName || seller.name || ""),
      addr: String(metadata.sellerAddress || ""),
      email: String(metadata.sellerEmail || ""),
      phone: String(metadata.sellerPhone || ""),
    },
    buyer: {
      name: String(metadata.customer || metadata.buyerName || buyer.email || ""),
      addr: String(metadata.shippingAddress || metadata.billingAddress || ""),
      email: String(buyer.email || metadata.buyerEmail || ""),
      phone: String(metadata.buyerPhone || ""),
    },
    currency: String(totals.currency || metadata.currency || "USD"),
    items,
    totals: {
      subTotal: Number(totals.itemTotal || 0),
      shipping: Number(metadata.shippingAmount || 0),
      tax: Number(metadata.taxAmount || 0),
      discount: Number(metadata.discountAmount || 0),
      grandTotal: Number(totals.total || 0),
    },
    promo: Boolean(metadata.promo),
  };
}

export default function SellerPrintInvoiceEVzoneV2() {
  const { t } = useLocalization();
  const { id } = useParams();
  const brand = { green: "#03CD8C", orange: "#F77F00", grey: "#A6A6A6", black: "#111827" };
  const [order, setOrder] = useState(EMPTY_ORDER);
  const [loadError, setLoadError] = useState("");
  const official = {
    marketplaceName: "EVzone Marketplace",
    officialAddrUG: "Millennium House, Nsambya Road 472, Kampala, Uganda",
    officialEmail: "hello@evzonecharging.com",
    officialPhone: "+256 700 200 168",
    registeredCN: "EVZONE (Wuxi) Business Technology Co., Ltd.",
    registeredCNAddr: "Room 265, No.3 Gaolang East Rd, Xinwu District, Wuxi City, Jiangsu, China",
  };

  useEffect(() => {
    if (!id) {
      setOrder(EMPTY_ORDER);
      return;
    }
    let active = true;
    setLoadError("");
    void sellerBackendApi
      .getSellerPrintInvoice(id)
      .then((payload) => {
        if (active) {
          setOrder(normalizeInvoicePayload(payload));
        }
      })
      .catch((error) => {
        if (active) {
          setOrder(EMPTY_ORDER);
          setLoadError(error instanceof Error ? error.message : "Unable to load invoice.");
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  const packUrl = useMemo(
    () =>
      typeof window !== "undefined"
        ? `${window.location.origin}/pack/${order.id || id || ""}`
        : `/pack/${order.id || id || ""}`,
    [id, order.id]
  );
  const isPromo = order.channel === "MyLiveDealz" || order.promo === true;
  const logoSrc = isPromo
    ? "/assets/brand/mylivedealz-mark-color.svg"
    : "/assets/brand/evzone-marketplace-mark.svg";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <style>{` :root{ --ev-green:${brand.green}; --ev-orange:${brand.orange}; --ev-grey:${brand.grey}; --ev-black:${brand.black}; } @page{ size:A4; margin:16mm;} @media print{ .no-print{display:none!important;} .page{ box-shadow:none!important; margin:0!important; } } .page{ max-width:800px; margin:24px auto; box-shadow:0 2px 8px rgba(0,0,0,.06); padding:24px; border:1px solid #eef2f7; border-radius:12px; } .hrow{ display:flex; align-items:flex-start; justify-content:space-between; gap:16px;} .kv{ display:flex; align-items:center; justify-content:space-between;} .table{ width:100%; border-collapse:collapse;} .table th,.table td{ border-bottom:1px solid #e5e7eb; padding:10px; font-size:13px;} `}</style>

      <div className="no-print sticky top-0 z-10 border-b bg-white dark:bg-slate-900/90 px-4 py-2">
        <div className="w-full flex items-center justify-between">
          <div className="font-extrabold" style={{ color: "var(--ev-green)" }}>
            {t("Invoice")} {order.id ? `— ${order.id}` : ""}
          </div>
          <div className="inline-flex gap-2">
            <a href={order.id ? `/orders/${order.id}` : "/orders"} className="rounded-lg border px-3 py-1 text-sm">
              {t("Back")}
            </a>
            <button onClick={() => window.print()} className="rounded-lg bg-[var(--ev-orange)] px-3 py-1 text-sm font-bold text-white">
              {t("Print")}
            </button>
          </div>
        </div>
      </div>

      <div className="page">
        {loadError ? <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{loadError}</div> : null}

        <div className="hrow">
          <div className="flex items-start gap-3">
            <img src={logoSrc} alt={isPromo ? "MyLiveDealz" : "EVzone Marketplace"} className="h-10 w-auto" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <div>
              <div className="text-sm font-extrabold" style={{ color: "var(--ev-green)" }}>{isPromo ? "MyLiveDealz" : "EVzone Marketplace"}</div>
              <div className="text-[11px] text-gray-600">{t("Official")}: {official.officialAddrUG} • {official.officialEmail} • {official.officialPhone}</div>
              <div className="text-[11px] text-gray-600">{t("Registered (CN)")}: {official.registeredCN} — {official.registeredCNAddr}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold">{t("INVOICE")}</div>
            <div className="text-sm text-gray-600">{t("Order")}: <b>{order.id || "—"}</b></div>
            <div className="text-sm text-gray-600">{t("Date")}: {order.createdAt || "—"}</div>
            <img alt={t("QR")} className="ml-auto mt-2 h-24 w-24 rounded-md border" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(packUrl)}`} onError={(e) => { const target = e.currentTarget; if (!target.dataset.ff) { target.dataset.ff = "1"; target.src = "https://quickchart.io/qr?text=" + encodeURIComponent(packUrl); } else { target.src = "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27180%27 height=%27180%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%23eee%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 fill=%27%23666%27 font-family=%27Arial%27 font-size=%2712%27%3ENo QR%3C/text%3E%3C/svg%3E"; } }} />
            <div className="mt-1 text-[10px] text-gray-500 break-all">{packUrl}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="text-xs font-semibold text-gray-500">{t("Bill From")}</div>
            <div className="mt-1 text-sm font-bold">{order.seller.name || "—"}</div>
            <div className="text-sm text-gray-700 dark:text-slate-300">{order.seller.addr || "—"}</div>
            <div className="text-xs text-gray-600">{order.seller.email || "—"} {order.seller.phone ? `• ${order.seller.phone}` : ""}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs font-semibold text-gray-500">{t("Bill To")}</div>
            <div className="mt-1 text-sm font-bold">{order.buyer.name || "—"}</div>
            <div className="text-sm text-gray-700 dark:text-slate-300">{order.buyer.addr || "—"}</div>
            <div className="text-xs text-gray-600">{order.buyer.email || "—"} {order.buyer.phone ? `• ${order.buyer.phone}` : ""}</div>
          </div>
        </div>

        <div className="mt-6">
          <table className="table">
            <thead>
              <tr><th>{t("SKU")}</th><th>{t("Item")}</th><th>{t("Qty")}</th><th>{t("Price")}</th><th>{t("Total")}</th></tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={`${item.sku}-${item.title}`}>
                  <td className="font-mono text-xs">{item.sku || "—"}</td>
                  <td>{item.title || "—"}</td>
                  <td>{item.qty}</td>
                  <td>{order.currency} {item.price.toFixed(2)}</td>
                  <td>{order.currency} {(item.qty * item.price).toFixed(2)}</td>
                </tr>
              ))}
              {order.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-sm text-gray-500">{t("No items available")}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div></div>
          <div className="rounded-lg border p-3">
            <div className="kv"><span className="text-gray-600">{t("Subtotal")}</span><b>{order.currency} {order.totals.subTotal.toFixed(2)}</b></div>
            <div className="kv"><span className="text-gray-600">{t("Shipping")}</span><b>{order.currency} {order.totals.shipping.toFixed(2)}</b></div>
            <div className="kv"><span className="text-gray-600">{t("Tax")}</span><b>{order.currency} {order.totals.tax.toFixed(2)}</b></div>
            {order.totals.discount > 0 ? <div className="kv"><span className="text-gray-600">{t("Discount")}</span><b>- {order.currency} {order.totals.discount.toFixed(2)}</b></div> : null}
            <div className="kv text-base"><span>{t("Grand Total")}</span><b>{order.currency} {order.totals.grandTotal.toFixed(2)}</b></div>
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-600">
          <div className="font-semibold" style={{ color: "var(--ev-green)" }}>{t("Packing/Delivery QR")}</div>
          <div>{t("Scan the QR to view live packing details, delivery status, and proof of delivery once available.")}</div>
          <div className="mt-2">{t("Thank you for choosing EVzone.")}</div>
        </div>
      </div>
    </div>
  );
}
