import React, { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { Typography } from "@mui/material";
import Card, { CardHeader, CardContent } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import { useLocalization } from "../../localization/LocalizationProvider";
import { getCurrentRole } from "../../auth/roles";
import { useSession } from "../../auth/session";

function useQueryParam(name) {
  const location = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get(name) || "";
  }, [location.search, name]);
}

function safeParse(key, fallback) {
  try {
    const raw =
      window.localStorage.getItem(key) ||
      (Array.isArray(fallback.keys) &&
        fallback.keys
          .map((k) => window.localStorage.getItem(k))
          .find((v) => !!v)) ||
      fallback.default ||
      "[]";
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export default function GlobalSearch() {
  const { t } = useLocalization();
  const session = useSession();
  const role = getCurrentRole(session);
  const q = useQueryParam("q");
  const normalized = q.trim().toLowerCase();

  const { orders, rfqs, quotes, listings } = useMemo(() => {
    if (typeof window === "undefined") {
      return { orders: [], rfqs: [], quotes: [], listings: [] };
    }
    const orders = safeParse("seller_orders_v1", {
      keys: ["orders"],
      default: "[]",
    });
    const rfqs = safeParse("wholesale_rfq_inbox_v1", {
      keys: ["rfqs"],
      default: "[]",
    });
    const quotes = safeParse("quotes_pending_v1", {
      keys: ["quotes"],
      default: "[]",
    });
    const listings = safeParse("seller_listings_share_v1", {
      keys: [],
      default: "[]",
    });
    return { orders, rfqs, quotes, listings };
  }, []);

  const filtered = useMemo(() => {
    if (!normalized) {
      return { orders: [], rfqs: [], quotes: [], listings: [] };
    }
    const match = (text) =>
      typeof text === "string" && text.toLowerCase().includes(normalized);

    const orderHits = orders.filter(
      (o) => match(o.id) || match(o.orderId) || match(o.buyerName || o.customer),
    );
    const rfqHits = rfqs.filter(
      (r) => match(r.id) || match(r.rfqId) || match(r.buyer || r.company),
    );
    const quoteHits = quotes.filter(
      (qItem) =>
        match(qItem.id) ||
        match(qItem.quoteId) ||
        match(qItem.buyer || qItem.client || qItem.company),
    );
    const listingHits = listings.filter(
      (l) =>
        match(l.sku) ||
        match(l.title) ||
        match(l.channel) ||
        match(l.category),
    );

    return {
      orders: orderHits.slice(0, 10),
      rfqs: rfqHits.slice(0, 10),
      quotes: quoteHits.slice(0, 10),
      listings: listingHits.slice(0, 10),
    };
  }, [normalized, orders, rfqs, quotes, listings]);

  const hasResults =
    filtered.orders.length ||
    filtered.rfqs.length ||
    filtered.quotes.length ||
    filtered.listings.length;

  return (
    <div className="w-full max-w-none px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
      <header className="mb-5">
        <h1 className="page-hero-title text-xl font-bold text-ev-ink sm:text-2xl">
          Global search
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Search across orders, RFQs, quotes, and catalog listings from the top
          search bar.
        </p>
        {q && (
          <p className="mt-1 text-xs text-slate-500">
            Showing results for <span className="font-mono text-ev-ink">“{q}”</span>
          </p>
        )}
      </header>

      {!q.trim() && (
        <EmptyState
          icon="⌕"
          title={t("Start typing in the global search bar")}
          description="Use the search bar at the top of the page to look up orders, RFQs, quotes, and listings. Press Enter to see results here."
        />
      )}

      {q.trim() && !hasResults && (
        <div className="mt-4">
          <EmptyState
            icon="🔍"
            title={t("No results found")}
            description="Try a different ID, buyer name, SKU, or keyword. You can search by order IDs like ORD‑10234, RFQs, quotes, or listing SKUs."
          />
        </div>
      )}

      {hasResults && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Orders */}
          <Card className="col-span-1">
            <CardHeader>
              <div>
                <Typography variant="h5" component="h2">
                  Orders
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Recent orders matching your search.
                </Typography>
              </div>
            </CardHeader>
            <CardContent>
              {filtered.orders.length === 0 ? (
                <p className="text-xs text-slate-500">{t("No matching orders.")}</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {filtered.orders.map((order) => (
                    <li
                      key={order.id || order.orderId}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-700"
                    >
                      <div>
                        <p className="font-semibold text-ev-ink">
                          {order.id || order.orderId}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {order.buyerName ||
                            order.customer ||
                            order.buyer ||
                            "Buyer"}
                        </p>
                      </div>
                      <Link
                        to={
                          order.id
                            ? `/orders/${encodeURIComponent(order.id)}`
                            : "/orders"
                        }
                        className="text-xs font-semibold text-ev-green"
                      >
                        View
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* RFQs & Quotes */}
          <Card className="col-span-1">
            <CardHeader>
              <div>
                <Typography variant="h5" component="h2">
                  RFQs & quotes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Wholesale RFQs and provider quotes that match.
                </Typography>
              </div>
            </CardHeader>
            <CardContent>
              {filtered.rfqs.length === 0 && filtered.quotes.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No matching RFQs or quotes.
                </p>
              ) : (
                <div className="space-y-3 text-xs">
                  {filtered.rfqs.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        RFQs
                      </p>
                      <ul className="space-y-1.5">
                        {filtered.rfqs.map((rfq) => (
                          <li
                            key={rfq.id || rfq.rfqId}
                            className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white dark:bg-slate-900 px-3 py-2"
                          >
                            <div>
                              <p className="font-semibold text-ev-ink">
                                {rfq.id || rfq.rfqId}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {rfq.buyer || rfq.company || "Buyer"}
                              </p>
                            </div>
                            <Link
                              to="/wholesale/rfq-inbox"
                              className="text-xs font-semibold text-ev-green"
                            >
                              Open RFQ inbox
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {filtered.quotes.length > 0 && (
                    <div>
                      <p className="mb-1 mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Quotes
                      </p>
                      <ul className="space-y-1.5">
                        {filtered.quotes.map((qt) => (
                          <li
                            key={qt.id || qt.quoteId}
                            className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white dark:bg-slate-900 px-3 py-2"
                          >
                            <div>
                              <p className="font-semibold text-ev-ink">
                                {qt.id || qt.quoteId}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {qt.buyer || qt.client || qt.company || "Buyer"}
                              </p>
                            </div>
                            <Link
                              to={
                                role === "provider"
                                  ? qt.id
                                    ? `/provider/quotes/${encodeURIComponent(qt.id)}`
                                    : "/provider/quotes"
                                  : qt.id
                                    ? `/wholesale/quotes/${encodeURIComponent(qt.id)}`
                                    : "/wholesale/quotes"
                              }
                              className="text-xs font-semibold text-ev-green"
                            >
                              View quote
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Listings */}
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <div>
                <Typography variant="h5" component="h2">
                  Catalog listings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Products you can share or open directly from search.
                </Typography>
              </div>
            </CardHeader>
            <CardContent>
              {filtered.listings.length === 0 ? (
                <p className="text-xs text-slate-500">{t("No matching listings.")}</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {filtered.listings.map((listing) => (
                    <article
                      key={listing.sku}
                      className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white dark:bg-slate-900 px-4 py-3 text-xs text-slate-700"
                    >
                      <div>
                        <p className="font-semibold text-ev-ink">
                          {listing.title || "Listing"}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                          {listing.sku}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {(listing.channel || listing.marketplace || "")
                            .toString()
                            .trim()}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Link
                          to={`/p/${encodeURIComponent(listing.sku)}`}
                          className="text-xs font-semibold text-ev-green"
                        >
                          Open share link
                        </Link>
                        <Link
                          to="/listings"
                          className="text-xs font-semibold text-ev-orange"
                        >
                          Go to listings
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
