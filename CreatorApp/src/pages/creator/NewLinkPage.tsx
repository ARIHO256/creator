import React, { useEffect, useMemo, useRef, useState, ReactNode, ChangeEvent } from "react"
import { useApiResource } from "../../hooks/useApiResource"
import { creatorApi, type AdzCampaignRecord, type AdzLinkRecord } from "../../lib/creatorApi"
/*************************************************
 * Link Tools (Creator) - Previewable (Orange Primary)
 * Base: attached link_tools_creator_previewable.jsx
 *
 * Update requested:
 * - Orange should be the primary color across the page (CTAs, badges, key actions)
 * - WhatsApp/WeChat remain green outline with green hover fill.
 *************************************************/

/************** Type Definitions **************/
interface Seller {
  name: string
  handle: string
  verified: boolean
}

interface CampaignLink {
  id: string
  label: string
  url: string
}

interface Campaign {
  id: string
  title: string
  slug: string
  hero: string
  seller: Seller
  commissionPct: number
  surfaces: string[]
  links: CampaignLink[]
}

declare global {
  interface Window {
    __LINK_TOOLS_CREATOR_TESTS__?: Array<{ name: string; pass: boolean }>
  }
}

/************** Tokens **************/
const TOKENS = {
  brandOrange: "#f77f00",
  ink: "#111827",
  card: "rounded-2xl border border-gray-200 bg-white shadow-sm",
  pill: "rounded-full",
  btn: "rounded-xl",
}

const BRAND = {
  whatsapp: "#25D366",
  wechat: "#07C160",
  black: "#111827",
}


/************** Drawer Contract **************/
export interface LinkToolsDrawerProps {
  open: boolean
  onClose: () => void
  /** Optional: open pre-selected campaign when launched from another surface. */
  initialCampaignId?: string
}

const cx = (...xs: (string | undefined | null | false)[]): string => xs.filter(Boolean).join(" ")

/************** Utilities **************/
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(!!mq.matches)
    update()
    mq.addEventListener ? mq.addEventListener("change", update) : mq.addListener(update)
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", update) : mq.removeListener(update)
    }
  }, [])
  return reduced
}

function safeCopy(text: string | number | null | undefined): Promise<void> {
  const t = String(text || "")
  return new Promise<void>((resolve) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(t).then(() => resolve()).catch(() => resolve())
        return
      }
    } catch {
      // Clipboard API not available
    }
    try {
      const ta = document.createElement("textarea")
      ta.value = t
      ta.style.position = "fixed"
      ta.style.left = "-9999px"
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    } catch {
      // Fallback copy failed
    }
    resolve()
  })
}

function placeholder(label: string | null | undefined): string {
  const safe = encodeURIComponent(String(label || ""))
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='900' height='600'>
    <defs>
      <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
        <stop offset='0%' stop-color='#f3f4f6'/>
        <stop offset='100%' stop-color='#e5e7eb'/>
      </linearGradient>
    </defs>
    <rect width='100%' height='100%' fill='url(#g)'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
      font-family='Arial' font-size='26' fill='#6b7280'>${safe}</text>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${svg}`
}

function buildSellerLink(slug: string | null | undefined): string {
  const s = String(slug || "").trim() || "my-shoppable-adz"
  return `https://mylivedealz.com/a/${encodeURIComponent(s)}`
}

function buildCreatorLink(slug: string | null | undefined, ref: string | null | undefined): string {
  const base = buildSellerLink(slug)
  const r = String(ref || "CR-1234")
  return `${base}?ref=${encodeURIComponent(r)}`
}

// Deterministic short code (preview-only)
function hashString(str: string | null | undefined): number {
  const s = String(str || "")
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0)
}

function shortLinkFromUrl(url: string | null | undefined): string {
  const h = hashString(url)
  const code = h.toString(36).slice(0, 7)
  return `https://mylivedealz.com/s/${code}`
}



/************** Icons **************/
const Icon = {
  Link: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 13" />
      <path d="M14 11a5 5 0 0 1 0 7L12.5 19.5a5 5 0 1 1-7-7L7 11" />
    </svg>
  ),
  Copy: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <rect x="4" y="4" width="11" height="11" rx="2" />
    </svg>
  ),
  External: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M14 3h7v7" />
      <path d="M10 14L21 3" />
      <path d="M21 14v7H3V3h7" />
    </svg>
  ),
  Share: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M12 16V3" />
      <path d="M7 8l5-5 5 5" />
    </svg>
  ),
  QR: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z" />
      <path d="M14 14h3v3h-3zM20 14h1v1h-1zM18 18h3v3h-3z" />
    </svg>
  ),
  WhatsApp: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M21 12a8.5 8.5 0 0 1-12.9 7.4L3 21l1.7-5.1A8.5 8.5 0 1 1 21 12z" />
      <path d="M9.2 9.2c.3-.8.7-.9 1.2-.9h.5c.2 0 .4 0 .6.4l.8 1.9c.1.3.1.6-.1.8l-.6.6c-.2.2-.2.4-.1.6.6 1.2 1.5 2.1 2.7 2.7.2.1.4.1.6-.1l.6-.6c.2-.2.5-.2.8-.1l1.9.8c.4.2.4.4.4.6v.5c0 .5-.1.9-.9 1.2-.8.3-2.5.3-4.7-1.2-2.2-1.5-3.6-3.8-3.9-4.7-.3-.9-.3-1.4.2-2.4z" />
    </svg>
  ),
  WeChat: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M10.5 12.5c-3 0-5.5-2-5.5-4.5S7.5 3.5 10.5 3.5s5.5 2 5.5 4.5-2.5 4.5-5.5 4.5z" />
      <path d="M7.5 12.3 6 15l3.1-1" />
      <path d="M14.5 20.5c-3 0-5.5-2-5.5-4.5s2.5-4.5 5.5-4.5S20 13.5 20 16s-2.5 4.5-5.5 4.5z" />
      <path d="M17.5 20.3 19 23l-3.1-1" />
      <path d="M9 7h.01" />
      <path d="M12 7h.01" />
      <path d="M13.5 15h.01" />
      <path d="M16.5 15h.01" />
    </svg>
  ),
  ChevronDown: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  X: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
}

/************** UI **************/
interface BadgeProps {
  children: ReactNode
  tone?: "good" | "warn" | "danger" | "brand" | "neutral"
}

function Badge({ children, tone = "neutral" }: BadgeProps) {
  const base = cx("inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-extrabold border transition-colors", TOKENS.pill)
  const cls =
    tone === "good"
      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700"
      : tone === "warn"
        ? "bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-700"
        : tone === "danger"
          ? "bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-700"
          : tone === "brand"
            ? "bg-[#f77f00] text-white border-transparent"
            : "bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600"
  return <span className={cx(base, cls)}>{children}</span>
}

interface ButtonProps {
  variant?: "primary" | "neutral" | "outline" | "danger"
  className?: string
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  title?: string
  type?: "button" | "submit" | "reset"
}

function Button({ variant = "primary", className, children, onClick, disabled, title, type = "button" }: ButtonProps) {
  const base = cx(
    "inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-extrabold select-none",
    TOKENS.btn,
    disabled ? "opacity-60 cursor-not-allowed" : "active:scale-[0.99] transition-transform",
    className
  )

  const style =
    variant === "primary"
      ? "bg-[#f77f00] text-white hover:opacity-95"
      : variant === "neutral"
        ? "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        : variant === "outline"
          ? "border border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-900 dark:hover:bg-slate-600 hover:text-white transition-colors"
          : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"

  return (
    <button type={type} className={cx(base, style)} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  )
}

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  reducedMotion: boolean
}

function Modal({ open, title, children, onClose, reducedMotion }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center p-3" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/40 dark:bg-black/60" aria-label="Close" onClick={onClose} />
      <div className={cx("relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl transition-colors", reducedMotion ? "" : "transition-transform")}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{title}</div>
          </div>
          <button className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors" onClick={onClose} aria-label="Close modal">
            <Icon.X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors">{children}</div>
      </div>
    </div>
  )
}

interface BrandOutlineButtonProps {
  color: string
  icon: ReactNode
  children: ReactNode
  onClick?: () => void
  title?: string
  disabled?: boolean
  emphasis?: boolean
}

function BrandOutlineButton({ color, icon, children, onClick, title, disabled, emphasis = false }: BrandOutlineButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={!!disabled}
      style={{ "--b": color } as React.CSSProperties}
      className={cx(
        "brandOutline inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-extrabold select-none border transition-colors",
        TOKENS.btn,
        emphasis ? "shadow-sm" : "",
        disabled ? "opacity-60 cursor-not-allowed" : "active:scale-[0.99] transition-transform",
        "bg-white dark:bg-slate-800"
      )}
    >
      {icon}
      {children}
    </button>
  )
}

interface ToolCardProps {
  title: string
  desc: string
  children: ReactNode
}

function ToolCard({ title, desc, children }: ToolCardProps) {
  return (
    <div className={cx(TOKENS.card, "p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors")}>
      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{title}</div>
      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{desc}</div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

/************** Data **************/
const CREATOR = { handle: "@EVzoneCreator", ref: "CR-7782" }

function mapCampaignsToDrawerData(campaigns: AdzCampaignRecord[], links: AdzLinkRecord[]): Campaign[] {
  return campaigns.map((campaign) => {
    const data =
      campaign.data && typeof campaign.data === "object" && !Array.isArray(campaign.data)
        ? (campaign.data as Record<string, unknown>)
        : {}
    const title = String(campaign.title || data.title || "Campaign")
    const slug = String(data.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""))
    const sellerName = String(data.sellerName || data.seller || "Seller")
    const sellerHandle = String(data.sellerHandle || "")
    const linked = links.filter((link) => {
      const linkData =
        link.data && typeof link.data === "object" && !Array.isArray(link.data)
          ? (link.data as Record<string, unknown>)
          : {}
      return (
        String(linkData.campaignId || "") === campaign.id ||
        String(linkData.adzCampaignId || "") === campaign.id
      )
    })

    const mappedLinks = linked.length
      ? linked.map((link, index) => ({
          id: String(link.id || `link_${index}`),
          label: String(
            (link.data as Record<string, unknown> | undefined)?.label ||
              (link.data as Record<string, unknown> | undefined)?.channel ||
              `Link ${index + 1}`
          ),
          url: String(
            link.url ||
              (link.data as Record<string, unknown> | undefined)?.url ||
              buildCreatorLink(slug, CREATOR.ref)
          )
        }))
      : [{ id: `${campaign.id}_default`, label: "Default", url: buildCreatorLink(slug, CREATOR.ref) }]

    return {
      id: campaign.id,
      title,
      slug,
      hero: String(data.heroImageUrl || data.posterImageUrl || placeholder(title)),
      seller: {
        name: sellerName,
        handle: sellerHandle,
        verified: Boolean(data.sellerVerified)
      },
      commissionPct: Number(data.commissionPct || data.commission || 0),
      surfaces: Array.isArray(data.surfaces) ? data.surfaces.map((entry) => String(entry)) : ["SHOPPABLE_ADZ"],
      links: mappedLinks
    }
  })
}

/************** Page **************/
export function LinkToolsDrawer({ open, onClose, initialCampaignId }: LinkToolsDrawerProps) {
  const reducedMotion = usePrefersReducedMotion()

// Drawer behavior: lock background scroll + ESC to close
useEffect(() => {
  if (!open) return
  const prev = document.body.style.overflow
  document.body.style.overflow = "hidden"
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose?.()
  }
  window.addEventListener("keydown", onKey)
  return () => {
    document.body.style.overflow = prev
    window.removeEventListener("keydown", onKey)
  }
}, [open, onClose])

  // Toast
  const [toast, setToast] = useState("")
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = (msg: string | number) => {
    setToast(String(msg || ""))
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(""), 1600)
  }
  useEffect(() => {
    return () => {
      if (toastRef.current) clearTimeout(toastRef.current)
    }
  }, [])

  const { data: campaignOptions } = useApiResource<Campaign[]>({
    initialData: [],
    loader: async () => {
      const [campaigns, links] = await Promise.all([creatorApi.adzCampaigns(), creatorApi.adzLinks()])
      return mapCampaignsToDrawerData(campaigns, links)
    }
  })

  // Selection
  const [campaignId, setCampaignId] = useState(initialCampaignId || "")
  const campaign = useMemo(() => campaignOptions.find((c) => c.id === campaignId) || null, [campaignId, campaignOptions])

  const [linkId, setLinkId] = useState("")
  useEffect(() => {
    if (!campaignId && initialCampaignId && campaignOptions.some((campaignOption) => campaignOption.id === initialCampaignId)) {
      setCampaignId(initialCampaignId)
    }
  }, [campaignId, campaignOptions, initialCampaignId])

  useEffect(() => {
    setLinkId((prev) => (campaign?.links?.some((l) => l.id === prev) ? prev : ""))
  }, [campaign])

  const linkItem = useMemo(() => (campaign?.links || []).find((l) => l.id === linkId) || null, [campaign, linkId])
  const link = linkItem?.url || ""

  // Share message
  const [message, setMessage] = useState("Check out these Dealz 👇")

  // Short link (preview deterministic)
  const shortLink = useMemo(() => (link ? shortLinkFromUrl(link) : ""), [link])

  // QR (preview endpoint)
  const qrUrl = useMemo(() => (link ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(link)}` : ""), [link])

  // WeChat modal
  const [wechatOpen, setWechatOpen] = useState(false)

  const shareText = useMemo(() => {
    if (!link) return ""
    return `${message}\n${link}`
  }, [message, link])

  const openWhatsApp = () => {
    if (!link) return
    const u = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    try {
      window.open(u, "_blank")
    } catch {
      // Window open failed
    }
  }

  const openLink = (u: string) => {
    if (!u) return
    // TODO: Connect to real destination pages when they are built
    showToast("Coming soon: Destination page")
  }

  const copy = async (txt: string, label?: string) => {
    await safeCopy(txt)
    showToast(label || "Copied")
  }

  const shareLink = async (urlToShare: string) => {
    if (!urlToShare) return
    try {
      if (navigator?.share) {
        await navigator.share({
          title: campaign?.title || "Shoppable Adz",
          text: message || "",
          url: urlToShare,
        })
        showToast("Share opened")
        return
      }
    } catch {
      // fall through
    }
    await safeCopy(urlToShare)
    showToast("Copied (share fallback)")
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70]">
  <div className="absolute inset-0 bg-black/35" onClick={onClose} />
  <aside
    className="absolute right-0 top-0 h-full w-full max-w-[920px] bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 border-l border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col transition-colors"
    onClick={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
    aria-label="Link Tools"
  >
      <style>{`
        /* Orange primary + brand outlines */
        .brandOutline { border-color: var(--b); color: var(--b); background: #fff; }
        .brandOutline:hover { background: var(--b); color: #fff; }
        .brandOutline:disabled:hover { background: #fff; color: var(--b); }
        .dark .brandOutline { background: rgb(30 41 59); }
        .dark .brandOutline:hover { background: var(--b); }
        .dark .brandOutline:disabled:hover { background: rgb(30 41 59); }
      `}</style><div className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-950/85 backdrop-blur">
  <div className="p-4 flex items-start justify-between gap-3">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-[13px] font-extrabold text-slate-900 dark:text-slate-50">Link Tools</div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors">
          <span>🔗</span>
          <span>Share & manage links</span>
        </span>
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-white border border-transparent text-[11px] font-extrabold"
          style={{ background: TOKENS.brandOrange }}
          title="Side drawer"
        >
          Drawer
        </span>
      </div>
      <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
        Create branded links, preview before sharing, and export WhatsApp/WeChat assets.
      </div>
    </div>

    <button
      type="button"
      onClick={onClose}
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      title="Close"
    >
      <Icon.X className="w-4 h-4" />
      Close
    </button>
  </div>
</div><main className="flex-1 flex flex-col w-full p-3 sm:p-4 md:p-6 lg:p-8 pt-4 gap-4 overflow-y-auto overflow-x-hidden">
        {/* Toolbox Top */}
        <section className={cx(TOKENS.card, "p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors")}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
            <div className="min-w-0 flex items-start gap-3">
              <img
                src={campaign?.hero || placeholder("Campaign")}
                alt={campaign?.title || "Campaign"}
                className="h-16 w-24 rounded-2xl border border-slate-200 dark:border-slate-700 object-cover bg-slate-100 dark:bg-slate-700"
              />
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{campaign?.title || "Select a campaign"}</div>
                <div className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300 font-semibold truncate">
                  {campaign?.seller?.name || ""} · {campaign?.seller?.handle || ""}{campaign?.seller?.verified ? " · Verified" : ""}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone="brand">Earn {campaign?.commissionPct ?? 0}%</Badge>
                  <Badge>{(campaign?.surfaces || []).includes("LIVE_SESSIONZ") ? "Shoppable + Live" : "Shoppable only"}</Badge>
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Campaign</div>
              <div className="mt-1 relative">
                <select
                  value={campaignId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setCampaignId(e.target.value)}
                  className={cx("w-full appearance-none px-3 py-2 text-sm font-extrabold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors", TOKENS.btn)}
                >
                  {campaignOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"><Icon.ChevronDown className="w-4 h-4" /></span>
              </div>

              <div className="mt-3 text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Link variant</div>
              <div className="mt-1 relative">
                <select
                  value={linkId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setLinkId(e.target.value)}
                  className={cx("w-full appearance-none px-3 py-2 text-sm font-extrabold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors", TOKENS.btn)}
                >
                  {(campaign?.links || []).map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"><Icon.ChevronDown className="w-4 h-4" /></span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-3 transition-colors">
            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Main link</div>
            <div className="mt-1 text-[12px] font-extrabold text-slate-900 dark:text-slate-100 break-all">{link || "—"}</div>

            {/* Orange primary actions */}
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              <BrandOutlineButton color={TOKENS.brandOrange} icon={<Icon.Copy className="w-4 h-4" />} onClick={() => copy(link, "Link copied")} disabled={!link} title="Copy link" emphasis>
                Copy
              </BrandOutlineButton>
              <BrandOutlineButton color={TOKENS.brandOrange} icon={<Icon.External className="w-4 h-4" />} onClick={() => openLink(link)} disabled={!link} title="Open link">
                Open
              </BrandOutlineButton>
              <Button variant="primary" onClick={() => copy(shortLink, "Short link copied")} disabled={!shortLink} title="Copy short link">
                <Icon.Link className="w-4 h-4" /> Copy short
              </Button>
              <Button variant="neutral" onClick={() => openLink(shortLink)} disabled={!shortLink} title="Open short link">
                <Icon.External className="w-4 h-4" /> Open short
              </Button>
            </div>

            <div className="mt-2">
              <Button variant="primary" className="w-full" onClick={() => shareLink(link)} disabled={!link} title="Share link">
                <Icon.Share className="w-4 h-4" /> Share link
              </Button>
            </div>

            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Short link (preview): <span className="font-extrabold text-slate-900 dark:text-slate-100 break-all">{shortLink || "—"}</span>
            </div>
          </div>
        </section>

        {/* Tool cards grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <ToolCard title="Copy link" desc="Copy the tracking link to your clipboard.">
            <div className="grid grid-cols-2 gap-2">
              <BrandOutlineButton
                color={TOKENS.brandOrange}
                icon={<Icon.Copy className="w-4 h-4" />}
                onClick={() => copy(link, "Link copied")}
                disabled={!link}
                emphasis
                title="Copy link"
              >
                Copy link
              </BrandOutlineButton>
              <Button variant="primary" onClick={() => shareLink(link)} disabled={!link} title="Share via system share (fallback copies)" className="">
                <Icon.Share className="w-4 h-4" /> Share
              </Button>
            </div>
          </ToolCard>

          <ToolCard title="Short link" desc="Preview: deterministic code. Production: backend generated + stored.">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-3 transition-colors">
              <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Short link</div>
              <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-100 break-all">{shortLink || "—"}</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="primary" onClick={() => copy(shortLink, "Short link copied")} disabled={!shortLink} title="Copy short link" className=""><Icon.Copy className="w-4 h-4" /> Copy</Button>
              <Button variant="neutral" onClick={() => openLink(shortLink)} disabled={!shortLink} title="Open short link" className=""><Icon.External className="w-4 h-4" /> Open</Button>
            </div>
          </ToolCard>

          <ToolCard title="Share QR Code" desc="QR-first sharing. Scan it, or share the QR image link.">
            <div className="grid place-items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 transition-colors">
              {qrUrl ? (
                <button
                  type="button"
                  onClick={() => openLink(qrUrl)}
                  className={cx(
                    "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden transition-colors",
                    reducedMotion ? "" : "transition-transform active:scale-[0.99]"
                  )}
                  title="Open QR image"
                >
                  <img
                    src={qrUrl}
                    alt="QR"
                    className="h-44 w-44 object-cover bg-white dark:bg-slate-800"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = placeholder("QR")
                    }}
                  />
                </button>
              ) : (
                <div className="text-xs text-slate-600 dark:text-slate-300">Select a link</div>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="neutral" onClick={() => copy(link, "Link copied")} disabled={!link} title="Copy link" className="">
                <Icon.Copy className="w-4 h-4" /> Copy link
              </Button>
              <Button variant="primary" onClick={() => shareLink(qrUrl)} disabled={!qrUrl} title="Share QR image link (fallback copies)" className="">
                <Icon.Share className="w-4 h-4" /> Share QR
              </Button>
            </div>
          </ToolCard>

          <ToolCard title="WhatsApp share" desc="Opens WhatsApp with your message + link.">
            <BrandOutlineButton color={BRAND.whatsapp} icon={<Icon.WhatsApp className="w-5 h-5" />} onClick={openWhatsApp} disabled={!link} title="Share on WhatsApp">
              Share on WhatsApp
            </BrandOutlineButton>
            <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-3 text-[11px] text-slate-600 dark:text-slate-300 break-all transition-colors">{shareText || ""}</div>
          </ToolCard>

          <ToolCard title="WeChat share" desc="QR-first: open modal with QR + copy link.">
            <BrandOutlineButton color={BRAND.wechat} icon={<Icon.WeChat className="w-5 h-5" />} onClick={() => setWechatOpen(true)} disabled={!link} title="Share on WeChat">
              Share on WeChat
            </BrandOutlineButton>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="primary" onClick={() => copy(link, "Link copied")} disabled={!link} title="Copy link" className=""><Icon.Copy className="w-4 h-4" /> Copy</Button>
              <Button variant="neutral" onClick={() => setWechatOpen(true)} disabled={!link} title="Show QR" className=""><Icon.QR className="w-4 h-4" /> Show QR</Button>
            </div>
          </ToolCard>

          <ToolCard title="Open link" desc="Quick open in a new tab for testing.">
            <Button variant="outline" onClick={() => openLink(link)} disabled={!link} className="w-full" title="Open in new tab">
              <Icon.External className="w-4 h-4" /> Open in new tab
            </Button>
          </ToolCard>
        </section>

        {/* Custom message field */}
        <section className={cx(TOKENS.card, "p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors")}>
          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Custom message</div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Used for WhatsApp share and shown in the WeChat modal.</div>
          <textarea
            value={message}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
            rows={3}
            className={cx(
              "mt-3 w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400",
              TOKENS.btn,
              "focus:outline-none focus:ring-2 focus:ring-[#f77f00] dark:focus:ring-[#f77f00] transition-colors"
            )}
            placeholder="Write a short share message…"
          />
        </section>
      </main>

      {/* WeChat modal */}
      <Modal open={wechatOpen} title="WeChat Share" onClose={() => setWechatOpen(false)} reducedMotion={reducedMotion}>
        <div className="text-sm text-slate-700 dark:text-slate-200">
          <div className="text-xs text-slate-600 dark:text-slate-300">Recommended: open WeChat → scan QR or paste the link.</div>

          <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-3 transition-colors">
            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Message</div>
            <div className="mt-1 text-[12px] font-extrabold text-slate-900 dark:text-slate-100 whitespace-pre-wrap">{message}</div>
          </div>

          <div className="mt-3 grid place-items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 transition-colors">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="WeChat QR"
                className="h-44 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                loading="lazy"
                onError={(e) => { e.currentTarget.src = placeholder("QR") }}
              />
            ) : (
              <div className="text-xs text-slate-600 dark:text-slate-300">Select a link</div>
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-3 transition-colors">
            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Link</div>
            <div className="mt-1 text-[12px] font-extrabold text-slate-900 dark:text-slate-100 break-all">{link || "—"}</div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={() => copy(link, "Link copied")} disabled={!link} title="Copy link" className=""><Icon.Copy className="w-4 h-4" /> Copy link</Button>
            <Button variant="neutral" onClick={() => setWechatOpen(false)} title="Close" className=""><Icon.X className="w-4 h-4" /> Close</Button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast ? (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[90] bg-slate-900 dark:bg-slate-700 text-white text-[11px] px-3 py-1.5 rounded-full shadow transition-colors" aria-live="polite">
          {toast}
        </div>
      ) : null}
    </aside>
    </div>
  )
}


/**
 * Default export: route-friendly wrapper (drawer is open by default).
 * - Keeps the file usable as a standalone page for previews.
 * - In the app shell, import and render <LinkToolsDrawer open onClose /> directly.
 */
export default function LinkToolsCreatorOrangePrimaryPreviewable() {
  const [open, setOpen] = useState(true)
  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950">
      <LinkToolsDrawer open={open} onClose={() => setOpen(false)} />
      {!open ? (
        <div className="mx-auto max-w-xl px-4 py-12 text-center">
          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Drawer closed</div>
          <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            This page is a demo wrapper so you can preview the drawer in isolation.
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-[12px] font-extrabold text-white"
            style={{ background: TOKENS.brandOrange }}
          >
            Re-open drawer
          </button>
        </div>
      ) : null}
    </div>
  )
}
