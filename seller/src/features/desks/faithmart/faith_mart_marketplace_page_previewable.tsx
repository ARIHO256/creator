import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { addSellerCartItem } from "../../../lib/cartApi";
import { sellerBackendApi } from "../../../lib/backendApi";
import {
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Filter,
  FileText,
  Handshake,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Users2,
  X,
  Plus,
} from "lucide-react";

/**
 * FaithMart Marketplace (Buyer) - previewable
 * - Premium marketplace home for FaithMart
 * - Retail/Wholesale toggle, search, filters, category chips
 * - Item detail drawer (Product / Digital / Service / Event)
 * - Trust and safety + verified organizations
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastAction = { label: string; onClick: () => void };
type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = { id: string; title: string; message?: string; tone?: ToastTone; action?: ToastAction };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function fmtMoney(n, currency = "USD") {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function Badge({ children, tone = "slate" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "orange" && "bg-orange-50 text-orange-700",
        tone === "danger" && "bg-rose-50 text-rose-700",
        tone === "slate" && "bg-slate-100 text-slate-700"
      )}
    >
      {children}
    </span>
  );
}

function GlassCard({ children, className }) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 shadow-[0_12px_40px_rgba(2,16,23,0.06)] backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

function IconButton({ label, onClick, children, tone = "light" }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
        tone === "dark"
          ? "border-white/25 bg-white dark:bg-slate-900/12 text-white hover:bg-gray-50 dark:hover:bg-slate-800/18"
          : "border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function ToastCenter({ toasts, dismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-[90] flex w-[92vw] max-w-[420px] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={cx(
              "rounded-3xl border bg-white dark:bg-slate-900/95 p-4 shadow-[0_24px_80px_rgba(2,16,23,0.18)] backdrop-blur",
              t.tone === "success" && "border-emerald-200",
              t.tone === "warning" && "border-orange-200",
              t.tone === "danger" && "border-rose-200",
              (!t.tone || t.tone === "default") && "border-slate-200/70"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cx(
                  "grid h-10 w-10 place-items-center rounded-2xl",
                  t.tone === "success" && "bg-emerald-50 text-emerald-700",
                  t.tone === "warning" && "bg-orange-50 text-orange-700",
                  t.tone === "danger" && "bg-rose-50 text-rose-700",
                  (!t.tone || t.tone === "default") && "bg-slate-100 text-slate-700"
                )}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900">{t.title}</div>
                {t.message ? <div className="mt-1 text-xs font-semibold text-slate-500">{t.message}</div> : null}
                {t.action ? (
                  <button
                    type="button"
                    onClick={t.action.onClick}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-slate-800"
                  >
                    {t.action.label}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Drawer({ open, title, subtitle, onClose, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[720px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 bg-white/90 px-4 py-3 dark:bg-slate-900/90">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900">{title}</div>
                    {subtitle ? <div className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</div> : null}
                  </div>
                  <IconButton label="Close" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function PillToggle({ value, onChange, leftLabel, rightLabel }) {
  return (
    <div className="inline-flex overflow-hidden rounded-2xl border border-white/20 bg-white dark:bg-slate-900/10">
      <button
        type="button"
        onClick={() => onChange("left")}
        className={cx(
          "px-4 py-2 text-xs font-extrabold transition",
          value === "left" ? "bg-white dark:bg-slate-900 text-slate-900" : "text-white/90 hover:bg-gray-50 dark:hover:bg-slate-800/10"
        )}
      >
        {leftLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange("right")}
        className={cx(
          "px-4 py-2 text-xs font-extrabold transition",
          value === "right" ? "bg-white dark:bg-slate-900 text-slate-900" : "text-white/90 hover:bg-gray-50 dark:hover:bg-slate-800/10"
        )}
      >
        {rightLabel}
      </button>
    </div>
  );
}

function createEmptyPageData() {
  return {
    categories: [],
    orgs: [],
    items: [],
  };
}

function kindMeta(kind) {
  if (kind === "Product") return { label: "Product", icon: Package, tone: "slate" };
  if (kind === "Digital") return { label: "Digital", icon: FileText, tone: "orange" };
  if (kind === "Service") return { label: "Service", icon: Handshake, tone: "slate" };
  return { label: "Event", icon: Calendar, tone: "orange" };
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700")}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

function ItemCard({ item, mode, onOpen }) {
  const meta = kindMeta(item.kind);
  const Icon = meta.icon;
  const price = mode === "retail" ? item.retail : item.wholesale;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800 hover:shadow-[0_18px_50px_rgba(2,16,23,0.10)]"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
          <Icon className="h-5 w-5 text-slate-800" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-black text-slate-900">{item.title}</div>
            {item.verified ? (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified
              </span>
            ) : (
              <span className="ml-auto"><Badge tone="slate">Standard</Badge></span>
            )}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500">{item.category} · {item.vendor}</div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {mode === "wholesale" ? <Badge tone="slate">MOQ {item.moq}</Badge> : <Badge tone="slate">Retail</Badge>}
            <span className="ml-auto text-sm font-black text-slate-900">{fmtMoney(price, item.currency)}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(item.tags || []).slice(0, 3).map((t) => (
              <span key={t} className="rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-extrabold text-slate-700">
                {t}
              </span>
            ))}
          </div>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
      </div>
    </button>
  );
}

export default function FaithMartMarketplacePage() {
  const [pageData, setPageData] = useState(() => createEmptyPageData());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const payload = await sellerBackendApi.getRegulatoryDesk("faithmart");
        const nextPageData = payload?.pageData;
        if (!cancelled && nextPageData && typeof nextPageData === "object") {
          setPageData(nextPageData as typeof pageData);
        }
      } catch {
        if (!cancelled) {
          setPageData(createEmptyPageData());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const [mode, setMode] = useState("retail");
  const [tab, setTab] = useState("All");
  const [category, setCategory] = useState("All");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [q, setQ] = useState("");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const active = useMemo(() => pageData.items.find((x) => x.id === activeId) || null, [pageData.items, activeId]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return pageData.items
      .filter((it) => (tab === "All" ? true : it.kind === tab))
      .filter((it) => (category === "All" ? true : it.category === category))
      .filter((it) => (verifiedOnly ? !!it.verified : true))
      .filter((it) => {
        if (!query) return true;
        const hay = [it.id, it.title, it.vendor, it.category, it.kind, ...(it.tags || [])].join(" ").toLowerCase();
        return hay.includes(query);
      });
  }, [pageData.items, tab, category, verifiedOnly, q]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(pageData.items.map((x) => x.category)))], [pageData.items]);

  const stats = useMemo(() => {
    const verifiedStores = pageData.orgs.filter((o) => o.verified).length;
    const digital = pageData.items.filter((x) => x.kind === "Digital").length;
    const events = pageData.items.filter((x) => x.kind === "Event").length;
    const services = pageData.items.filter((x) => x.kind === "Service").length;
    return { verifiedStores, digital, events, services };
  }, [pageData.orgs, pageData.items]);

  useEffect(() => {
    if (!activeId && pageData.items[0]?.id) {
      setActiveId(pageData.items[0].id);
    }
  }, [activeId, pageData.items]);

  const openItem = (id) => {
    setActiveId(id);
    setDetailOpen(true);
  };

  const addToCart = async () => {
    if (!active) return;
    try {
      await addSellerCartItem(active.id, 1);
      pushToast({
        title: "Added to cart",
        message: `${active.title} added to cart.`,
        tone: "success",
        action: { label: "View cart", onClick: () => pushToast({ title: "Cart", message: "Cart drawer comes next.", tone: "default" }) },
      });
    } catch {
      pushToast({ title: "Cart unavailable", message: "Unable to add item right now.", tone: "danger" });
    }
  };

  const primaryCtaLabel = useMemo(() => {
    if (!active) return "Continue";
    if (active.kind === "Digital") return "Buy and access";
    if (active.kind === "Service") return "Request booking";
    if (active.kind === "Event") return "Buy ticket";
    return "Add to cart";
  }, [active]);

  const primaryCta = () => {
    if (!active) return;
    if (active.kind === "Product") return addToCart();
    pushToast({ title: "Request submitted", message: `${primaryCtaLabel} (demo).`, tone: "success" });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 border-b border-white/10"
        style={{ background: `linear-gradient(90deg, ${TOKENS.green} 0%, ${TOKENS.greenDeep} 100%)` }}
      >
        <div className="w-full flex flex-wrap items-center justify-between gap-3 px-[0.55%] py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white dark:bg-slate-900/15 text-white">
              <Users2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-black text-white">FaithMart</div>
              <div className="text-[11px] font-semibold text-white/80">Books, media, services and community</div>
            </div>
            {loading ? <Badge tone="slate">Loading</Badge> : <Badge tone="green">Backend</Badge>}
          </div>

          <div className="flex items-center gap-2">
            <PillToggle
              value={mode === "retail" ? "left" : "right"}
              onChange={(v) => setMode(v === "left" ? "retail" : "wholesale")}
              leftLabel="Retail"
              rightLabel="Wholesale"
            />

            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white dark:bg-slate-900/10 px-3 py-2 text-xs font-extrabold text-white hover:bg-gray-50 dark:hover:bg-slate-800/15"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => pushToast({ title: "Saved", message: "Saved items page comes next.", tone: "default" })}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white dark:bg-slate-900/10 px-3 py-2 text-xs font-extrabold text-white hover:bg-gray-50 dark:hover:bg-slate-800/15"
            >
              <Tag className="h-4 w-4" />
              Saved
            </button>
          </div>
        </div>

        <div className="w-full px-[0.55%] pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search books, media, services, tickets, organizations"
              className="h-10 w-full rounded-2xl border border-white/25 bg-white dark:bg-slate-900/10 pl-10 pr-3 text-sm font-semibold text-white placeholder:text-white/70 outline-none focus:border-white/35 focus:bg-white dark:bg-slate-900/12"
            />
          </div>
        </div>
      </div>

      <div className="w-full px-[0.55%] py-6">
        {/* Hero */}
        <div className="grid gap-4 lg:grid-cols-12">
          <GlassCard className="p-6 lg:col-span-8">
            <div className="flex items-start gap-3">
              <div
                className="grid h-12 w-12 place-items-center rounded-3xl text-white"
                style={{ background: `linear-gradient(135deg, ${TOKENS.green} 0%, ${TOKENS.greenDeep} 100%)` }}
              >
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-black tracking-tight text-slate-900">A trusted faith and community marketplace</div>
                <div className="mt-2 text-sm font-semibold text-slate-500">
                  Discover verified organizations, quality products, digital content, events and services. Built with trust signals and safe reporting.
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Explore", message: "Scrolling to items.", tone: "default" })}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <ChevronRight className="h-4 w-4" />
                    Explore items
                  </button>
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Organizations", message: "Verified partners section.", tone: "default" })}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Store className="h-4 w-4" />
                    Verified organizations
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerifiedOnly((v) => !v)}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-extrabold",
                      verifiedOnly
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                    )}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {verifiedOnly ? "Verified only" : "All sellers"}
                  </button>
                </div>
              </div>
              <div className="hidden lg:block">
                <Badge tone="green">Trust-first</Badge>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 lg:col-span-4">
            <div className="text-sm font-black text-slate-900">Today in FaithMart</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">Live stats from the marketplace (demo).</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <StatCard icon={ShieldCheck} label="Verified organizations" value={String(stats.verifiedStores)} tone="green" />
              <StatCard icon={FileText} label="Digital items" value={String(stats.digital)} tone="orange" />
              <StatCard icon={Calendar} label="Events" value={String(stats.events)} tone="orange" />
              <StatCard icon={Handshake} label="Services" value={String(stats.services)} tone="green" />
            </div>
          </GlassCard>
        </div>

        {/* Category chips */}
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                {c}
              </Chip>
            ))}
            <span className="ml-auto"><Badge tone="slate">{filtered.length} results</Badge></span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[
              { k: "All", label: "All" },
              { k: "Product", label: "Products" },
              { k: "Digital", label: "Digital" },
              { k: "Service", label: "Services" },
              { k: "Event", label: "Events" },
            ].map((t) => (
              <Chip key={t.k} active={tab === t.k} onClick={() => setTab(t.k)}>
                {t.label}
              </Chip>
            ))}

            <button
              type="button"
              onClick={() => {
                setQ("");
                setCategory("All");
                setTab("All");
                setVerifiedOnly(false);
                pushToast({ title: "Filters cleared", tone: "default" });
              }}
              className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>

        {/* Featured organizations */}
        <div className="mt-6 grid gap-4 lg:grid-cols-12">
          <GlassCard className="p-5 lg:col-span-4">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Featured organizations</div>
              <span className="ml-auto"><Badge tone="slate">{pageData.orgs.length}</Badge></span>
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-500">Verified partners and trusted community sellers.</div>

            <div className="mt-4 space-y-2">
              {pageData.orgs.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => pushToast({ title: o.name, message: "Organization profile comes next.", tone: "default" })}
                  className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <div className="flex items-start gap-3">
                    <div className={cx("grid h-11 w-11 place-items-center rounded-3xl", o.verified ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                      {o.verified ? <ShieldCheck className="h-5 w-5" /> : <Users2 className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-black text-slate-900">{o.name}</div>
                        <span className="ml-auto"><Badge tone={o.verified ? "green" : "slate"}>{o.verified ? "Verified" : "Standard"}</Badge></span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">{o.type} · {o.focus}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Items grid */}
          <GlassCard className="p-5 lg:col-span-8">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Explore</div>
              <span className="ml-auto"><Badge tone="slate">{mode === "retail" ? "Retail" : "Wholesale"}</Badge></span>
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-500">Tap any card to view details and actions.</div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {filtered.map((it) => (
                <ItemCard
                  key={it.id}
                  item={it}
                  mode={mode}
                  onOpen={() => openItem(it.id)}
                />
              ))}

              {filtered.length === 0 ? (
                <div className="md:col-span-2 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-lg font-black text-slate-900">No results</div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">Try changing category, tab, or search keywords.</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </GlassCard>
        </div>

        {/* Trust & safety */}
        <div className="mt-6">
          <div className="grid gap-4 lg:grid-cols-12">
            <GlassCard className="p-5 lg:col-span-8">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Trust and safety</div>
                <span className="ml-auto"><Badge tone="green">Policy</Badge></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">
                FaithMart is community-focused and moderation-first. Listings may be routed to the FaithMart Desk for review when needed.
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[{
                  title: "Verified organizations",
                  desc: "Badges, reviews, and identity checks.",
                  icon: ShieldCheck,
                }, {
                  title: "Reporting tools",
                  desc: "Report content and request review.",
                  icon: FileText,
                }, {
                  title: "Safe transactions",
                  desc: "Secure payments, clear refunds policy.",
                  icon: CheckCheck,
                }].map((x) => {
                  const Icon = x.icon;
                  return (
                    <div key={x.title} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-black text-slate-900">{x.title}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{x.desc}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => pushToast({ title: "Report", message: "Report flow comes next.", tone: "warning" })}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-extrabold text-rose-700"
                >
                  <X className="h-4 w-4" />
                  Report a listing
                </button>
                <button
                  type="button"
                  onClick={() => pushToast({ title: "Policies", message: "Open FaithMart policies page.", tone: "default" })}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <FileText className="h-4 w-4" />
                  View policies
                </button>
              </div>
            </GlassCard>

            <GlassCard className="p-5 lg:col-span-4">
              <div className="flex items-center gap-2">
                <Users2 className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Community actions</div>
                <span className="ml-auto"><Badge tone="orange">Premium</Badge></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Things people do most in FaithMart.</div>

              <div className="mt-4 space-y-2">
                {[{
                  title: "Start a group order",
                  desc: "Wholesale pricing for community needs.",
                  tone: "green",
                }, {
                  title: "Share an event",
                  desc: "Invite friends and send calendar links.",
                  tone: "orange",
                }, {
                  title: "Request a service",
                  desc: "Book counselling or support sessions.",
                  tone: "slate",
                }].map((a) => (
                  <button
                    key={a.title}
                    type="button"
                    onClick={() => pushToast({ title: a.title, message: "Feature is ready to wire.", tone: "default" })}
                    className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cx("grid h-11 w-11 place-items-center rounded-3xl", a.tone === "green" ? "bg-emerald-50 text-emerald-700" : a.tone === "orange" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700")}
                      >
                        <Plus className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-slate-900">{a.title}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{a.desc}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Filters drawer */}
      <Drawer
        open={filtersOpen}
        title="Filters"
        subtitle="Refine results for products, digital content, events and services."
        onClose={() => setFiltersOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Quick options</div>
              <span className="ml-auto"><Badge tone="slate">Demo</Badge></span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setVerifiedOnly((v) => !v)}
                className={cx(
                  "rounded-2xl border px-3 py-2 text-xs font-extrabold",
                  verifiedOnly ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                )}
              >
                <ShieldCheck className="mr-2 inline h-4 w-4" />
                {verifiedOnly ? "Verified only" : "Include standard"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  pushToast({ title: "Search cleared", tone: "default" });
                }}
                className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
              >
                <X className="mr-2 inline h-4 w-4" />
                Clear search
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black text-orange-900">Premium filters (next)</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                  <li>Price range slider</li>
                  <li>Delivery speed and warehouse pickup</li>
                  <li>Language and digital format</li>
                  <li>Organization verification levels</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setFiltersOpen(false);
                pushToast({ title: "Applied", message: "Filters applied.", tone: "success" });
              }}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Check className="h-4 w-4" />
              Apply
            </button>
            <button
              type="button"
              onClick={() => {
                setVerifiedOnly(false);
                setTab("All");
                setCategory("All");
                setFiltersOpen(false);
                pushToast({ title: "Reset", message: "Filters reset.", tone: "default" });
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
            >
              <X className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
      </Drawer>

      {/* Item detail drawer */}
      <Drawer
        open={detailOpen}
        title={active ? `Item · ${active.id}` : "Item"}
        subtitle={active ? `${active.kind} · ${active.category}` : "Select an item"}
        onClose={() => setDetailOpen(false)}
      >
        {!active ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
            <div className="text-lg font-black text-slate-900">No item selected</div>
            <div className="mt-1 text-sm font-semibold text-slate-500">Choose an item card to open details.</div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                  {React.createElement(kindMeta(active.kind).icon, { className: "h-5 w-5 text-slate-800" })}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-black text-slate-900">{active.title}</div>
                    <span className="ml-auto"><Badge tone={active.verified ? "green" : "slate"}>{active.verified ? "Verified" : "Standard"}</Badge></span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{active.vendor} · {active.category}</div>
                  <div className="mt-3 text-sm font-semibold text-slate-700">{active.desc}</div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone={kindMeta(active.kind).tone}>{kindMeta(active.kind).label}</Badge>
                    {mode === "wholesale" ? <Badge tone="slate">MOQ {active.moq}</Badge> : <Badge tone="slate">Retail</Badge>}
                    <span className="ml-auto text-lg font-black text-slate-900">
                      {fmtMoney(mode === "retail" ? active.retail : active.wholesale, active.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-orange-900">Trust signals</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                    <li>Verified badge shown when identity checks are complete</li>
                    <li>Report and review tools are available on every listing</li>
                    <li>Some content may require desk review before publishing</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={primaryCta}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: active.kind === "Product" ? TOKENS.green : TOKENS.orange }}
              >
                <Check className="h-4 w-4" />
                {primaryCtaLabel}
              </button>
              <button
                type="button"
                onClick={() => pushToast({ title: "Shared", message: "Share sheet comes next.", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
                Share
              </button>
              <button
                type="button"
                onClick={() => pushToast({ title: "Reported", message: "Report submitted (demo).", tone: "warning" })}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-extrabold text-rose-700"
              >
                <X className="h-4 w-4" />
                Report
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Next upgrades</div>
                <span className="ml-auto"><Badge tone="slate">Roadmap</Badge></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">
                Reviews, multi-language content, delivery routing, organization pages, and a full checkout flow.
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
