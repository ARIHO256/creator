import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { sellerBackendApi } from "../../../lib/backendApi";
import { formatOrderDisplayId } from "../../../lib/orderIds";
import { useLocalization } from "../../../localization/LocalizationProvider";

const EMPTY_ORDER = {
  id: "",
  channel: "",
  promo: false,
  createdAt: "",
  shipTo: { name: "", addr: "", phone: "" },
  shipFrom: { name: "", addr: "", phone: "" },
  items: [] as Array<{ sku: string; title: string; qty: number }>,
  notes: "",
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

function normalizePackingSlipPayload(payload: Record<string, unknown>) {
  const order = asRecord(payload.order);
  const seller = asRecord(payload.seller);
  const metadata = asRecord(order.metadata);
  return {
    id: String(order.id || ""),
    channel: String(order.channel || ""),
    promo: Boolean(metadata.promo),
    createdAt: formatDate(String(order.createdAt || "")),
    shipTo: {
      name: String(metadata.customer || metadata.shippingName || ""),
      addr: String(metadata.shippingAddress || ""),
      phone: String(metadata.buyerPhone || ""),
    },
    shipFrom: {
      name: String(seller.storefrontName || seller.name || ""),
      addr: String(metadata.sellerAddress || ""),
      phone: String(metadata.sellerPhone || ""),
    },
    items: Array.isArray(payload.items)
      ? payload.items.map((entry) => {
          const item = asRecord(entry);
          return {
            sku: String(item.sku || item.id || ""),
            title: String(item.name || item.title || ""),
            qty: Number(item.qty || 0),
          };
        })
      : [],
    notes: String(order.notes || metadata.packingNotes || ""),
  };
}

export default function SellerPrintPackingSlipEVzoneV2() {
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
      .getSellerPrintPackingSlip(id)
      .then((payload) => {
        if (active) {
          setOrder(normalizePackingSlipPayload(payload));
        }
      })
      .catch((error) => {
        if (active) {
          setOrder(EMPTY_ORDER);
          setLoadError(error instanceof Error ? error.message : "Unable to load packing slip.");
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
  const displayOrderId = formatOrderDisplayId(order.id || id || "");
  const isPromo = order.channel === "MyLiveDealz" || order.promo === true;
  const logoSrc = isPromo
    ? "/assets/brand/mylivedealz-mark-color.svg"
    : "/assets/brand/evzone-marketplace-mark.svg";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <style>{` :root{ --ev-green:${brand.green}; --ev-orange:${brand.orange}; --ev-grey:${brand.grey}; --ev-black:${brand.black}; } @page{ size:A4; margin:14mm;} @media print{ .no-print{display:none!important;} .page{ box-shadow:none!important; margin:0!important; } } .page{ max-width:800px; margin:24px auto; box-shadow:0 2px 8px rgba(0,0,0,.06); padding:24px; border:1px solid #eef2f7; border-radius:12px; } .hrow{ display:flex; align-items:flex-start; justify-content:space-between; gap:16px;} .table{ width:100%; border-collapse:collapse;} .table th,.table td{ border-bottom:1px solid #e5e7eb; padding:10px; font-size:13px;} .chk{ display:inline-block; width:14px; height:14px; border:1px solid #cbd5e1; border-radius:3px; margin-right:8px; } `}</style>

      <div className="no-print sticky top-0 z-10 border-b bg-white dark:bg-slate-900/90 px-4 py-2">
        <div className="w-full flex items-center justify-between">
          <div className="font-extrabold" style={{ color: "var(--ev-green)" }}>
            {t("Packing Slip")} {order.id ? `— ${displayOrderId}` : ""}
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
            <div className="text-lg font-extrabold">{t("PACKING SLIP")}</div>
            <div className="text-xs text-gray-600">{t("Order")}: <b>{order.id ? displayOrderId : "—"}</b> {order.channel ? `• ${order.channel}` : ""}</div>
            <div className="text-xs text-gray-600">{t("Date")}: {order.createdAt || "—"}</div>
            <img alt={t("QR")} className="ml-auto mt-2 h-24 w-24 rounded-md border" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(packUrl)}`} onError={(e) => { const target = e.currentTarget; if (!target.dataset.ff) { target.dataset.ff = "1"; target.src = "https://quickchart.io/qr?text=" + encodeURIComponent(packUrl); } else { target.src = "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27180%27 height=%27180%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%23eee%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 fill=%27%23666%27 font-family=%27Arial%27 font-size=%2712%27%3ENo QR%3C/text%3E%3C/svg%3E"; } }} />
            <div className="mt-1 text-[10px] text-gray-500 break-all">{packUrl}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="text-xs font-semibold text-gray-500">{t("Ship From")}</div>
            <div className="mt-1 text-sm font-bold">{order.shipFrom.name || "—"}</div>
            <div className="text-sm text-gray-700 dark:text-slate-300">{order.shipFrom.addr || "—"}</div>
            <div className="text-xs text-gray-600">{order.shipFrom.phone || "—"}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs font-semibold text-gray-500">{t("Ship To")}</div>
            <div className="mt-1 text-sm font-bold">{order.shipTo.name || "—"}</div>
            <div className="text-sm text-gray-700 dark:text-slate-300">{order.shipTo.addr || "—"}</div>
            <div className="text-xs text-gray-600">{order.shipTo.phone || "—"}</div>
          </div>
        </div>

        <div className="mt-6">
          <table className="table">
            <thead>
              <tr><th>{t("Pick")}</th><th>{t("SKU")}</th><th>{t("Item")}</th><th>{t("Qty")}</th><th>{t("Notes")}</th></tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={`${item.sku}-${item.title}`}>
                  <td><span className="chk"></span></td>
                  <td className="font-mono text-xs">{item.sku || "—"}</td>
                  <td>{item.title || "—"}</td>
                  <td>{item.qty}</td>
                  <td></td>
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

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-3 text-sm">
            <div className="text-xs font-semibold text-gray-500">{t("Packer")}</div>
            <div className="mt-2 h-8 rounded bg-gray-50 dark:bg-slate-950" />
            <div className="mt-1 text-xs text-gray-600">{t("Sign & date")}</div>
          </div>
          <div className="rounded-lg border p-3 text-sm">
            <div className="text-xs font-semibold text-gray-500">{t("Notes")}</div>
            <div className="mt-1 text-gray-700 dark:text-slate-300">{order.notes || "—"}</div>
          </div>
        </div>
        <div className="mt-4 text-xs text-gray-600">{t("Scan the QR to view live packing details and delivery status.")}</div>
      </div>
    </div>
  );
}
