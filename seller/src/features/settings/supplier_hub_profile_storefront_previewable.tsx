import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Box,
  Button,
  Chip as MuiChip,
  IconButton as MuiIconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { TreeItem, TreeView } from '@mui/lab';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLocalization } from '../../localization/LocalizationProvider';
import { useSellerTaxonomy } from '../../data/taxonomy';
import { readSession } from '../../auth/session';
import { sellerBackendApi } from '../../lib/backendApi';
import type { ListingTaxonomyNode } from '../../data/pageTypes';
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  CalendarClock,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Layers,
  Mail,
  MapPin,
  Palette,
  Phone,
  Plus,
  Save,
  Share2,
  ShieldCheck,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import {
  dedupeCatalogLines,
  mapCoverageRecordToCatalogLine,
  mapStorefrontTaxonomyToCatalogLine,
  type CatalogLine,
} from '../listings/catalogEntryStore';

/**
 * SupplierHub Settings
 * Page: Profile & Storefront
 * Route: /settings/profile
 * Core: identity, branding, addresses
 * Super premium: multi-store readiness, quality score
 */

const TOKENS = {
  green: '#03CD8C',
  greenDeep: '#02B77E',
  orange: '#F77F00',
  black: '#0B0F14',
};

type ToastTone = 'success' | 'warning' | 'danger' | 'default';
type Toast = { id: string; title: string; message?: string; tone?: ToastTone; action?: { label: string; onClick: () => void } };
type CustomSocial = { id: string; name: string; handle: string };
type TaxonomyNode = ListingTaxonomyNode;
type StoreStatus = 'Active' | 'Planned';
type StoreRecord = { id: string; name: string; handle: string; region: string; status: StoreStatus };
type CoverageRecord = { id: string; taxonomyNodeId: string; status: string };
const EV_COLORS = {
  primary: TOKENS.green,
  primarySoft: 'rgba(3, 205, 140, 0.12)',
  primaryStrong: '#047857',
  accent: TOKENS.orange,
  accentSoft: 'rgba(247, 127, 0, 0.12)',
  bg: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FBFF',
  border: '#E2E8F0',
  textMain: '#0F172A',
  textSubtle: '#64748B',
  textMuted: '#94A3B8',
};

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function makeId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function safeCopy(text) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function fmtTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}


function findNodePath(tree: TaxonomyNode[], nodeId?: string | null): TaxonomyNode[] {
  if (!nodeId) return [];
  const stack: Array<{ node: TaxonomyNode; path: TaxonomyNode[] }> = [...tree].map((node) => ({ node, path: [node] }));

  while (stack.length) {
    const next = stack.pop();
    if (!next) break;
    const { node, path } = next;
    if (node.id === nodeId) return path;
    if (node.children) {
      node.children.forEach((child) => {
        stack.push({ node: child, path: [...path, child] });
      });
    }
  }
  return [];
}

function filterTree(nodes: TaxonomyNode[], query: string) {
  if (!query) return nodes;
  const q = query.toLowerCase();

  const walk = (items: TaxonomyNode[]) => {
    const result: TaxonomyNode[] = [];
    items.forEach((node) => {
      const matches = node.name.toLowerCase().includes(q);
      const children = node.children ? walk(node.children) : [];
      if (matches || children.length > 0) {
        result.push({ ...node, children });
      }
    });
    return result;
  };

  return walk(nodes);
}

function buildLine(tree: TaxonomyNode[], nodeId: string, status: 'active' | 'suspended' = 'active'): CatalogLine | null {
  const path = findNodePath(tree, nodeId).map((n) => ({
    id: n.id,
    name: n.name,
    type: n.type,
  }));
  if (path.length === 0) return null;
  return {
    id: `${nodeId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nodeId,
    path,
    status,
  };
}

function buildProductLinesFromBackend(
  coverage: Array<Record<string, unknown>>,
  storefrontTaxonomy: Array<Record<string, unknown>>,
  taxonomyTree: TaxonomyNode[]
) {
  const coverageLines = coverage
    .map((entry) => mapCoverageRecordToCatalogLine(entry))
    .filter((entry): entry is CatalogLine => Boolean(entry));
  const storefrontLines = storefrontTaxonomy
    .map((entry) => mapStorefrontTaxonomyToCatalogLine(entry))
    .filter((entry): entry is CatalogLine => Boolean(entry));

  const merged = dedupeCatalogLines([...coverageLines, ...storefrontLines]).map((line) => {
    if (line.path.length > 0) {
      return line;
    }
    return buildLine(taxonomyTree, line.nodeId, line.status) ?? line;
  });

  return dedupeCatalogLines(merged);
}

function Badge({ children, tone = 'slate' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold',
        tone === 'green' && 'bg-emerald-50 text-emerald-700',
        tone === 'orange' && 'bg-orange-50 text-orange-700',
        tone === 'danger' && 'bg-rose-50 text-rose-700',
        tone === 'slate' && 'bg-slate-100 text-slate-700'
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
        'rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 shadow-[0_12px_40px_rgba(2,16,23,0.06)] backdrop-blur',
        className
      )}
    >
      {children}
    </div>
  );
}

function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 transition hover:bg-gray-50 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children, tone = 'green' }) {
  const activeCls =
    tone === 'orange'
      ? 'border-orange-200 bg-orange-50 text-orange-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition',
        active ? activeCls : 'border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
      )}
    >
      {children}
    </button>
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
            className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[75] h-screen w-[96vw] max-w-[720px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/90 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900">{title}</div>
                    {subtitle ? (
                      <div className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</div>
                    ) : null}
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
              'rounded-3xl border bg-white dark:bg-slate-900/95 p-4 shadow-[0_24px_80px_rgba(2,16,23,0.18)] backdrop-blur',
              t.tone === 'success' && 'border-emerald-200',
              t.tone === 'warning' && 'border-orange-200',
              t.tone === 'danger' && 'border-rose-200',
              (!t.tone || t.tone === 'default') && 'border-slate-200/70'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cx(
                  'grid h-10 w-10 place-items-center rounded-2xl',
                  t.tone === 'success' && 'bg-emerald-50 text-emerald-700',
                  t.tone === 'warning' && 'bg-orange-50 text-orange-700',
                  t.tone === 'danger' && 'bg-rose-50 text-rose-700',
                  (!t.tone || t.tone === 'default') && 'bg-slate-100 text-slate-700'
                )}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900">{t.title}</div>
                {t.message ? (
                  <div className="mt-1 text-xs font-semibold text-slate-500">{t.message}</div>
                ) : null}
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

function Ring({ value, label }) {
  const v = clamp(Number(value || 0), 0, 100);
  const r = 34;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  return (
    <div className="flex items-center gap-3">
      <svg width="90" height="90" viewBox="0 0 90 90" className="text-slate-800">
        <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(2,16,23,0.08)" strokeWidth="10" />
        <circle
          cx="45"
          cy="45"
          r={r}
          fill="none"
          stroke={TOKENS.green}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 45 45)"
        />
        <text x="45" y="51" textAnchor="middle" fontSize="16" fontWeight="900" fill="#0F172A">
          {v}
        </text>
      </svg>
      <div>
        <div className="text-xs font-extrabold text-slate-600">{label}</div>
        <div className="mt-1 text-sm font-black text-slate-900">Quality Score</div>
      </div>
    </div>
  );
}

function createEmptyProfileState() {
  return {
    identity: {
      displayName: '',
      legalName: '',
      handle: '',
      email: '',
      phone: '',
      website: '',
      category: '',
    },
    branding: {
      tagline: '',
      description: '',
      primary: TOKENS.green,
      accent: TOKENS.orange,
      logoName: '',
      coverName: '',
    },
    addresses: [],
    stores: [],
    regions: [],
    supportHours: '',
    socials: {
      facebook: '',
      instagram: '',
      twitter: '',
      youtube: '',
      linkedin: '',
      tiktok: '',
    },
    customSocials: [],
    productLines: [],
  };
}

function calcQuality({ identity, branding, addresses, stores }) {
  let score = 44;

  // Identity
  const idHits = [
    identity.displayName,
    identity.legalName,
    identity.handle,
    identity.email,
    identity.phone,
  ].filter(Boolean).length;
  score += idHits >= 5 ? 16 : idHits >= 3 ? 10 : 4;

  // Branding
  score += branding.logoName ? 8 : 2;
  score += branding.coverName ? 4 : 1;
  score +=
    (branding.description || '').trim().length >= 140
      ? 12
      : (branding.description || '').trim().length >= 80
        ? 7
        : 2;
  score += (branding.tagline || '').trim().length >= 12 ? 5 : 2;

  // Addresses
  const addrCount = (addresses || []).length;
  score += addrCount >= 3 ? 10 : addrCount >= 2 ? 7 : addrCount >= 1 ? 3 : 0;
  score += (addresses || []).some((a) => a.isDefault) ? 4 : 0;

  // Multi-store readiness (super premium)
  const storeCount = (stores || []).length;
  score += storeCount >= 2 ? 6 : 2;
  score += storeCount >= 3 ? 3 : 0;

  return clamp(Math.round(score), 35, 99);
}

function readiness({ identity, branding, addresses, stores }) {
  const checks = [
    { k: 'logo', label: 'Brand logo uploaded', ok: !!branding.logoName },
    {
      k: 'desc',
      label: 'Store description written',
      ok: (branding.description || '').trim().length >= 80,
    },
    { k: 'addr', label: 'Default address set', ok: (addresses || []).some((a) => a.isDefault) },
    {
      k: 'handle',
      label: 'Store handle set',
      ok: !!identity.handle && identity.handle.length >= 3,
    },
    { k: 'stores', label: 'At least 2 stores planned', ok: (stores || []).length >= 2 },
  ];
  const pct = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  return { checks, pct };
}

function IconChevronRight({ className = '' }) {
  return (
    <Box
      component="span"
      className={className}
      sx={{ fontSize: 16, lineHeight: 1, color: EV_COLORS.textMuted }}
    >
      ›
    </Box>
  );
}

function ProductLinesManagerFullPage({
  open,
  onClose,
  taxonomy,
  productLines,
  setProductLines,
  resumeTarget,
  onFinishPersist,
}) {
  const HERO_GRADIENT = "transparent";
  const CARD_RADIUS = 2;
  const CARD_BORDER = `1px solid ${EV_COLORS.primary}`;

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { t } = useLocalization();
  const [isProvider] = useState(() => {
    try {
      const session = readSession();
      if (!session) return false;
      if (session.role === "provider") return true;
      if (Array.isArray(session.roles) && session.roles.includes("provider")) return true;
      return false;
    } catch {
      return false;
    }
  });

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);

  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [selectedMarketplaceId, setSelectedMarketplaceId] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");

  const marketplaces = taxonomy;
  const selectedMarketplace =
    marketplaces.find((m) => m.id === selectedMarketplaceId) || null;
  const families = selectedMarketplace?.children || [];
  const selectedFamily = families.find((f) => f.id === selectedFamilyId) || null;
  const categories = selectedFamily?.children || [];
  const selectedCategory =
    categories.find((c) => c.id === selectedCategoryId) || null;
  const subcategories = selectedCategory?.children || [];

  const filteredTaxonomy = useMemo(
    () => filterTree(taxonomy, search),
    [taxonomy, search]
  );

  const selectedPath = useMemo(
    () => findNodePath(taxonomy, selectedNodeId),
    [taxonomy, selectedNodeId]
  );

  const selectedNode = selectedPath[selectedPath.length - 1] || null;
  const marketplaceFromPath = selectedPath.find((n) => n.type === "Marketplace");

  const selectedPathIds = useMemo(
    () => new Set(selectedPath.map((n) => n.id)),
    [selectedPath]
  );

  const coveredIds = useMemo(
    () => new Set(productLines.flatMap((line) => line.path.map((n) => n.id))),
    [productLines]
  );

  const isValidSelection =
    !!selectedNode &&
    (selectedNode.type === "Category" || selectedNode.type === "Sub-Category");

  const alreadyAdded =
    !!selectedNode && productLines.some((l) => l.nodeId === selectedNode.id);

  const expandPath = (nodeId) => {
    const path = findNodePath(taxonomy, nodeId);
    if (!path.length) return;
    const ids = path.map((n) => n.id);
    setExpanded((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleFinish = () => {
    const proceed = async () => {
      if (onFinishPersist) {
        const persisted = await onFinishPersist(productLines);
        if (!persisted) return;
      }
      onClose();
      if (resumeTarget) {
        navigate(resumeTarget);
      }
    };
    void proceed();
  };

  const syncQuickSelectorsFromNode = (nodeId) => {
    const path = findNodePath(taxonomy, nodeId);
    const mk = path.find((n) => n.type === "Marketplace");
    const fam = path.find((n) => n.type === "Product Family");
    const cat = path.find((n) => n.type === "Category");
    const sub = path.find((n) => n.type === "Sub-Category");

    if (mk) setSelectedMarketplaceId(mk.id);
    setSelectedFamilyId(fam?.id || "");
    setSelectedCategoryId(cat?.id || "");
    setSelectedSubcategoryId(sub?.id || "");
  };

  const handleSelectNode = (nodeId) => {
    setSelectedNodeId(nodeId);
    syncQuickSelectorsFromNode(nodeId);
    expandPath(nodeId);
  };

  const handleMarketplaceChange = (event) => {
    const id = event.target.value;
    setSelectedMarketplaceId(id);
    setSelectedFamilyId("");
    setSelectedCategoryId("");
    setSelectedSubcategoryId("");
    setSelectedNodeId(id);
    if (id) expandPath(id);
  };

  const handleFamilyChange = (event) => {
    const id = event.target.value;
    setSelectedFamilyId(id);
    setSelectedCategoryId("");
    setSelectedSubcategoryId("");
    setSelectedNodeId(id);
    if (id) expandPath(id);
  };

  const handleCategoryChange = (event) => {
    const id = event.target.value;
    setSelectedCategoryId(id);
    setSelectedSubcategoryId("");
    setSelectedNodeId(id);
    if (id) expandPath(id);
  };

  const handleSubcategoryChange = (event) => {
    const id = event.target.value;
    setSelectedSubcategoryId(id);
    setSelectedNodeId(id);
    if (id) expandPath(id);
  };

  const handleClearSelection = () => {
    setSelectedNodeId("");
    setSelectedFamilyId("");
    setSelectedCategoryId("");
    setSelectedSubcategoryId("");
  };

  const handleAddLine = () => {
    if (!isValidSelection || !selectedNode) return;
    if (alreadyAdded) return;

    const line = buildLine(taxonomy, selectedNode.id, "active");
    setProductLines((prev) => [...prev, line]);

    // Auto clear selection, keep marketplace for faster multi-add
    setSelectedNodeId("");
    setSelectedFamilyId("");
    setSelectedCategoryId("");
    setSelectedSubcategoryId("");
  };

  const handleToggleStatus = (lineId) => {
    setProductLines((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? { ...l, status: l.status === "active" ? "suspended" : "active" }
          : l
      )
    );
  };

  const handleDelete = (lineId) => {
    setProductLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  const renderTree = (nodes) =>
    nodes.map((node) => {
      const isCurrent = node.id === selectedNodeId;
      const isInPath = selectedPathIds.has(node.id);
      const isCovered = coveredIds.has(node.id);

      return (
        <TreeItem
          key={node.id}
          nodeId={node.id}
          label={
            <Box
              className="flex items-center gap-2"
              sx={{
                borderRadius: 2,
                px: 1,
                py: 0.5,
                my: 0.5,
                backgroundColor: isCurrent
                  ? EV_COLORS.primarySoft
                  : isInPath
                    ? EV_COLORS.surfaceAlt
                    : "transparent",
                border: isCovered
                  ? `1px solid ${EV_COLORS.border}`
                  : "1px solid transparent",
              }}
            >
              <Box
                component="span"
                sx={{ fontSize: 13, opacity: 0.85, lineHeight: 1 }}
              >
                ◎
              </Box>
              <span style={{ color: EV_COLORS.textMain, fontWeight: 500 }}>
                {t(node.name)}
              </span>
              <MuiChip
                size="small"
                label={t(node.type)}
                sx={{
                  backgroundColor:
                    node.type === "Marketplace"
                      ? EV_COLORS.primarySoft
                      : EV_COLORS.surface,
                  color:
                    node.type === "Marketplace"
                      ? EV_COLORS.primaryStrong
                      : EV_COLORS.textSubtle,
                  borderColor: EV_COLORS.border,
                  borderWidth: 1,
                  fontSize: "0.65rem",
                  height: 20,
                }}
                variant="outlined"
              />
              {isCovered && (
                <MuiChip
                  size="small"
                  label={t("Covered")}
                  sx={{
                    backgroundColor: EV_COLORS.primarySoft,
                    color: EV_COLORS.primaryStrong,
                    borderColor: EV_COLORS.primary,
                    borderWidth: 1,
                    fontSize: "0.6rem",
                    height: 18,
                  }}
                  variant="outlined"
                />
              )}
            </Box>
          }
        >
          {Array.isArray(node.children) && node.children.length > 0
            ? renderTree(node.children)
            : null}
        </TreeItem>
      );
    });

  if (!open) return null;

  return createPortal(
    <Box
      component="div"
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 1300,
        backgroundColor: "rgba(15,23,42,0.35)",
        backdropFilter: "blur(6px)",
        overflowY: "auto",
        px: { xs: 1.5, md: 3 },
        py: { xs: 2, md: 4 },
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <Box
        component="div"
        sx={{
          width: "min(1340px, 100%)",
          backgroundColor: "var(--surface-1)",
          borderRadius: CARD_RADIUS,
          border: `1px solid rgba(255,255,255,0.4)`,
          boxShadow: "0 45px 120px rgba(15,23,42,0.4)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          component="div"
          sx={{
            px: { xs: 1.5, md: 3 },
            pt: { xs: 1.5, md: 2.5 },
            pb: { xs: 2.5, md: 3.5 },
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <Box
            component="section"
            sx={{
              borderRadius: CARD_RADIUS,
              border: CARD_BORDER,
              background: HERO_GRADIENT,
              p: { xs: 2.5, md: 3.5 },
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: { xs: "flex-start", md: "center" },
              justifyContent: "space-between",
              gap: 2,
              boxShadow: "0 25px 60px rgba(3,205,140,0.35)",
            }}
          >
            <Box sx={{ maxWidth: { xs: "100%", md: 630 } }}>
              <Typography variant="h4" sx={{ fontWeight: 900, color: EV_COLORS.textMain }}>
                {t("Start a new listing")}
              </Typography>
              <Typography variant="body2" sx={{ color: EV_COLORS.textMuted, mt: 0.5 }}>
                {t("Choose one of your approved product lines. You can only list within the taxonomy coverage you set during onboarding or in your storefront settings.")}
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}
            >
              {marketplaceFromPath && (
                <MuiChip
                  size="small"
                  label={`${t("Marketplace")}: ${t(marketplaceFromPath.name)}`}
                  sx={{
                    backgroundColor: EV_COLORS.surfaceAlt,
                    color: EV_COLORS.textSubtle,
                    borderColor: EV_COLORS.primary,
                    borderWidth: 1,
                  }}
                  variant="outlined"
                />
              )}
              <Button
                variant="contained"
                onClick={handleFinish}
                sx={{
                  textTransform: "none",
                  borderRadius: 999,
                  backgroundColor: EV_COLORS.primary,
                  color: "#0F172A",
                  fontWeight: 800,
                  px: 3,
                  "&:hover": { backgroundColor: EV_COLORS.primaryStrong },
                }}
              >
                {resumeTarget
                  ? isProvider
                    ? t("Resume new service")
                    : t("Resume listing")
                  : t("Done")}
              </Button>
              <MuiIconButton onClick={onClose} size="small" sx={{ color: EV_COLORS.textMuted }}>
                ✕
              </MuiIconButton>
            </Stack>
          </Box>

          <Box
            className="flex flex-col gap-4 md:flex-row"
            sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3 }}
          >
            <Box
              sx={{
                flex: "0 0 360px",
                maxWidth: 420,
                minWidth: 300,
                borderRadius: CARD_RADIUS,
                border: CARD_BORDER,
                backgroundColor: EV_COLORS.surface,
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 30px 80px -40px rgba(3,205,140,0.45)",
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  px: 3,
                  pt: 3,
                  pb: 2,
                  borderBottom: `1px solid ${EV_COLORS.primary}`,
                }}
              >
                <Typography
                  variant="subtitle2"
                  className="uppercase tracking-[0.2em] text-[11px]"
                  sx={{ color: EV_COLORS.textMuted }}
                >
                  {t("Taxonomy")}
                </Typography>
                <Box className="flex items-center gap-2 mt-2">
                  <Box component="span" sx={{ fontSize: 14 }}>
                    🔍
                  </Box>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder={t("Search by name")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    variant="outlined"
                  />
                </Box>
              </Box>

              <Box
                className="flex-1 overflow-y-auto"
                sx={{ flex: 1, overflowY: "auto", px: 3, py: 2, minHeight: 0 }}
              >
                <TreeView
                  selected={selectedNodeId}
                  expanded={expanded}
                  onNodeToggle={(_e, nodeIds) => setExpanded(nodeIds)}
                  defaultCollapseIcon={<IconChevronRight className="rotate-90" />}
                  defaultExpandIcon={<IconChevronRight />}
                  onNodeSelect={(_e, nodeId) => handleSelectNode(nodeId)}
                  sx={{
                    "& .MuiTreeItem-content": { paddingLeft: 0 },
                    "& .MuiTreeItem-group": { marginLeft: 0, paddingLeft: 0 },
                    "& .MuiTreeItem-iconContainer": { width: 20, marginRight: 6 },
                  }}
                >
                  {renderTree(filteredTaxonomy)}
                </TreeView>
              </Box>
            </Box>

            <Box
              className="flex-1 overflow-y-auto"
              sx={{
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                gap: 3,
                background: `radial-gradient(circle at top left, ${EV_COLORS.primarySoft}, transparent 55%), ${EV_COLORS.bg}`,
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  borderRadius: CARD_RADIUS,
                  border: CARD_BORDER,
                  backgroundColor: EV_COLORS.surface,
                  p: { xs: 2.5, md: 3 },
                  boxShadow: "0 30px 80px -40px rgba(3,205,140,0.45)",
                }}
              >
                <Typography sx={{ fontWeight: 800, color: EV_COLORS.textMain, mb: 1 }}>
                  {t("Quick selection")}
                </Typography>
                <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle, mb: 2 }}>
                  {t("Use quick selection or the taxonomy tree. You can add multiple product lines.")}
                </Typography>

                <Box className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TextField
                    select
                    label={t("Marketplace")}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      "& .MuiSelect-select": {
                        color: selectedMarketplaceId ? EV_COLORS.textMain : EV_COLORS.textMuted,
                      },
                    }}
                    value={selectedMarketplaceId}
                    onChange={handleMarketplaceChange}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (value) => {
                        if (!value) return t("Select marketplace");
                        return marketplaces.find((m) => m.id === value) ? t(marketplaces.find((m) => m.id === value).name) : t("Select marketplace");
                      },
                    }}
                  >
                    <MenuItem value="" disabled>
                      {t("Select marketplace")}
                    </MenuItem>
                    {marketplaces.map((m) => (
                      <MenuItem key={m.id} value={m.id}>
                        {t(m.name)}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label={t("Product family")}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      "& .MuiSelect-select": {
                        color: selectedFamilyId ? EV_COLORS.textMain : EV_COLORS.textMuted,
                      },
                    }}
                    value={selectedFamilyId}
                    onChange={handleFamilyChange}
                    disabled={!selectedMarketplaceId || !families.length}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (value) => {
                        if (!value) return t("Select product family");
                        return families.find((f) => f.id === value) ? t(families.find((f) => f.id === value).name) : t("Select product family");
                      },
                    }}
                  >
                    <MenuItem value="" disabled>
                      {t("Select product family")}
                    </MenuItem>
                    {families.map((f) => (
                      <MenuItem key={f.id} value={f.id}>
                        {t(f.name)}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label={t("Category")}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      "& .MuiSelect-select": {
                        color: selectedCategoryId ? EV_COLORS.textMain : EV_COLORS.textMuted,
                      },
                    }}
                    value={selectedCategoryId}
                    onChange={handleCategoryChange}
                    disabled={!selectedFamilyId || !categories.length}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (value) => {
                        if (!value) return t("Select category");
                        return categories.find((c) => c.id === value) ? t(categories.find((c) => c.id === value).name) : t("Select category");
                      },
                    }}
                  >
                    <MenuItem value="" disabled>
                      {t("Select category")}
                    </MenuItem>
                    {categories.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {t(c.name)}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label={t("Sub-category (optional)")}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      "& .MuiSelect-select": {
                        color: selectedSubcategoryId ? EV_COLORS.textMain : EV_COLORS.textMuted,
                      },
                    }}
                    value={selectedSubcategoryId}
                    onChange={handleSubcategoryChange}
                    disabled={!selectedCategoryId || !subcategories.length}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (value) => {
                        if (!value) return t("Select sub-category");
                        return subcategories.find((s) => s.id === value) ? t(subcategories.find((s) => s.id === value).name) : t("Select sub-category");
                      },
                    }}
                  >
                    <MenuItem value="">{t("Select sub-category")}</MenuItem>
                    {subcategories.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {t(s.name)}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  borderRadius: CARD_RADIUS,
                  border: CARD_BORDER,
                  backgroundColor: EV_COLORS.surface,
                  p: { xs: 2.5, md: 3 },
                  boxShadow: "0 35px 90px -45px rgba(3,205,140,0.6)",
                }}
              >
                <Box className="flex items-start justify-between gap-2 mb-2">
                  <Typography sx={{ fontWeight: 800, color: EV_COLORS.textMain }}>
                    {t("Selected taxonomy path")}
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={handleClearSelection}
                    disabled={!selectedNodeId}
                    sx={{ textTransform: "none", color: EV_COLORS.textSubtle }}
                  >
                    {t("Clear")}
                  </Button>
                </Box>

                {selectedPath.length > 0 ? (
                  <>
                    <Box className="flex flex-wrap items-center gap-0.5 mb-2">
                      {selectedPath.map((node, idx) => (
                        <React.Fragment key={node.id}>
                          {idx > 0 && (
                            <Typography
                              variant="caption"
                              sx={{ color: EV_COLORS.textMuted, mx: 0.25 }}
                            >
                              ›
                            </Typography>
                          )}
                          <MuiChip
                            size="small"
                            label={t(node.name)}
                            sx={{
                              backgroundColor:
                                idx === selectedPath.length - 1
                                  ? EV_COLORS.primarySoft
                                  : EV_COLORS.surfaceAlt,
                              color:
                                idx === selectedPath.length - 1
                                  ? EV_COLORS.primaryStrong
                                  : EV_COLORS.textSubtle,
                              borderColor: EV_COLORS.border,
                              borderWidth: 1,
                            }}
                            variant="outlined"
                          />
                        </React.Fragment>
                      ))}
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                      {!isValidSelection && (
                        <MuiChip
                          size="small"
                          label={t("Select a Category or Sub-category to add")}
                          sx={{ backgroundColor: EV_COLORS.accentSoft, color: EV_COLORS.accent }}
                        />
                      )}
                      {alreadyAdded && (
                        <MuiChip
                          size="small"
                          label={t("Already added")}
                          sx={{ backgroundColor: EV_COLORS.accentSoft, color: EV_COLORS.accent }}
                        />
                      )}
                    </Stack>

                    <Box className="mt-2">
                      <Button
                        variant="contained"
                        onClick={handleAddLine}
                        disabled={!isValidSelection || alreadyAdded}
                        sx={{
                          textTransform: "none",
                          borderRadius: 999,
                          backgroundColor: EV_COLORS.accent,
                          color: "#111827",
                          fontWeight: 800,
                          px: 2.5,
                          "&:hover": { backgroundColor: EV_COLORS.accent },
                        }}
                      >
                        {t("Add to product lines")}
                      </Button>
                    </Box>
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: EV_COLORS.textMuted }}>
                    {t("Choose a taxonomy path to add.")}
                  </Typography>
                )}
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  borderRadius: CARD_RADIUS,
                  border: CARD_BORDER,
                  backgroundColor: EV_COLORS.surface,
                  p: { xs: 2.5, md: 3 },
                  boxShadow: "0 30px 80px -40px rgba(3,205,140,0.5)",
                }}
              >
                <Box className="flex items-center justify-between gap-2 mb-2">
                  <Typography sx={{ fontWeight: 800, color: EV_COLORS.textMain }}>
                    {t("Your product lines (taxonomy coverage)")}
                  </Typography>
                  <Typography variant="caption" sx={{ color: EV_COLORS.textMuted }}>
                    {productLines.length} {t("selected")}
                  </Typography>
                </Box>

                {productLines.length === 0 ? (
                  <Typography variant="body2" sx={{ color: EV_COLORS.textMuted }}>
                    {t("No product lines yet.")}
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {productLines.map((line) => (
                      <Box
                        key={line.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                        sx={{
                          borderRadius: CARD_RADIUS,
                          border: CARD_BORDER,
                          backgroundColor: EV_COLORS.surfaceAlt,
                          p: 1.5,
                        }}
                      >
                        <Box className="flex flex-wrap items-center gap-0.5">
                          {line.path.map((node, idx) => (
                            <React.Fragment key={node.id}>
                              {idx > 0 && (
                                <Typography
                                  variant="caption"
                                  sx={{ color: EV_COLORS.textMuted, mx: 0.25 }}
                                >
                                  ›
                                </Typography>
                              )}
                              <MuiChip
                                size="small"
                                label={t(node.name)}
                                sx={{
                                  backgroundColor:
                                    idx === line.path.length - 1
                                      ? EV_COLORS.primarySoft
                                      : EV_COLORS.surface,
                                  color:
                                    idx === line.path.length - 1
                                      ? EV_COLORS.primaryStrong
                                      : EV_COLORS.textSubtle,
                                  borderColor: EV_COLORS.border,
                                  borderWidth: 1,
                                }}
                                variant="outlined"
                              />
                            </React.Fragment>
                          ))}
                        </Box>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <MuiChip
                            size="small"
                            label={line.status === "active" ? t("Active") : t("Suspended")}
                            sx={{
                              backgroundColor:
                                line.status === "active"
                                  ? EV_COLORS.primarySoft
                                  : EV_COLORS.accentSoft,
                              color:
                                line.status === "active"
                                  ? EV_COLORS.primaryStrong
                                  : EV_COLORS.accent,
                            }}
                          />
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => handleToggleStatus(line.id)}
                            sx={{ textTransform: "none", color: EV_COLORS.textSubtle }}
                          >
                            {line.status === "active" ? t("Suspend") : t("Activate")}
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => handleDelete(line.id)}
                            sx={{ textTransform: "none", color: "#EF4444" }}
                          >
                            {t("Delete")}
                          </Button>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>,
    document.body
  );
}

export default function SupplierHubProfileStorefrontPage() {
  const taxonomyQuery = useSellerTaxonomy();
  const taxonomy = taxonomyQuery.taxonomy;
  const [toasts, setToasts] = useState<Toast[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLocalization();
  const pushToast = (t: Omit<Toast, 'id'>) => {
    const id = makeId('toast');
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const emptyState = useMemo(() => createEmptyProfileState(), []);
  const [identity, setIdentity] = useState(emptyState.identity);
  const [branding, setBranding] = useState(emptyState.branding);
  const [addresses, setAddresses] = useState(emptyState.addresses);
  const [stores, setStores] = useState(emptyState.stores);
  const [productLines, setProductLines] = useState<CatalogLine[]>(emptyState.productLines);
  const [regions, setRegions] = useState(emptyState.regions);
  const [supportHours, setSupportHours] = useState(emptyState.supportHours);
  const [socials, setSocials] = useState(emptyState.socials);
  const [customSocials, setCustomSocials] = useState<CustomSocial[]>(emptyState.customSocials || []);
  const [loading, setLoading] = useState(true);
  const [coverageRecords, setCoverageRecords] = useState<CoverageRecord[]>([]);
  const [storefrontRecord, setStorefrontRecord] = useState<Record<string, unknown> | null>(null);
  const [showCustomSocialForm, setShowCustomSocialForm] = useState(false);
  const [newSocialName, setNewSocialName] = useState('');
  const [newSocialHandle, setNewSocialHandle] = useState('');
  const updateProductLines = (updater) => {
    setProductLines((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  };

  const snapshot = useMemo(
    () => ({
      identity,
      branding,
      addresses,
      stores,
      productLines,
      regions,
      supportHours,
      socials,
      customSocials,
    }),
    [identity, branding, addresses, stores, productLines, regions, supportHours, socials, customSocials]
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.parse(JSON.stringify(snapshot)));

  const dirty = useMemo(
    () => JSON.stringify(snapshot) !== JSON.stringify(savedSnapshot),
    [snapshot, savedSnapshot]
  );

  const quality = useMemo(() => calcQuality(snapshot), [snapshot]);
  const ready = useMemo(() => readiness(snapshot), [snapshot]);

  const [tab, setTab] = useState('Identity');

  const [addressDrawer, setAddressDrawer] = useState(false);
  const [storeDrawer, setStoreDrawer] = useState(false);
  const [linesEditorOpen, setLinesEditorOpen] = useState(false);
  const [improvementTipsOpen, setImprovementTipsOpen] = useState(false);
  const [resumeListingTarget, setResumeListingTarget] = useState('');
  const regionOptions = ['UG', 'KE', 'TZ', 'RW', 'NG', 'ZA', 'AE', 'GB', 'US', 'CN'];
  const socialOptions = [
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'twitter', label: 'Twitter / X' },
    { key: 'youtube', label: 'YouTube' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'tiktok', label: 'TikTok' },
  ];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const returnToParam = params.get('returnTo') || '';
    const fromTaxonomy = Boolean(location.state?.fromTaxonomy) || Boolean(returnToParam);

    if (fromTaxonomy) {
      setLinesEditorOpen(true);
      setResumeListingTarget(location.state?.returnTo || returnToParam || '/listings/taxonomy');
      navigate(location.pathname, { replace: true, state: undefined });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  const toggleLineStatus = (id) => {
    updateProductLines((prev) =>
      prev.map((line) =>
        line.id === id
          ? { ...line, status: line.status === 'active' ? 'suspended' : 'active' }
          : line
      )
    );
  };

  const deleteLine = (id) => {
    updateProductLines((prev) => prev.filter((line) => line.id !== id));
  };

  const toggleRegion = (code) => {
    setRegions((prev) =>
      prev.includes(code) ? prev.filter((r) => r !== code) : [...prev, code]
    );
  };

  const setSocial = (key, value) => {
    setSocials((prev) => ({ ...prev, [key]: value }));
  };

  const addCustomSocial = () => {
    const name = newSocialName.trim();
    const handle = newSocialHandle.trim();
    if (!name || !handle) {
      pushToast({ title: 'Missing fields', message: 'Add a name and handle/link.', tone: 'warning' });
      return;
    }
    const id = `social-${Math.random().toString(36).slice(2, 8)}`;
    setCustomSocials((prev) => [...prev, { id, name, handle }]);
    setNewSocialName('');
    setNewSocialHandle('');
    setShowCustomSocialForm(false);
  };

  const updateCustomSocial = (id, patch) => {
    setCustomSocials((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeCustomSocial = (id) => {
    setCustomSocials((prev) => prev.filter((s) => s.id !== id));
  };

  const [newAddress, setNewAddress] = useState({
    label: '',
    type: 'Office',
    line1: '',
    city: '',
    region: '',
    country: '',
    isDefault: false,
  });

  const [newStore, setNewStore] = useState({ name: '', handle: '', region: 'Global' });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [payload, storefrontPayload, coveragePayload] = await Promise.all([
          sellerBackendApi.getSettings(),
          sellerBackendApi.getMyStorefront().catch(() => null),
          sellerBackendApi.getTaxonomyCoverage().catch(() => []),
        ]);
        const profile = (payload.profile as Record<string, unknown> | undefined) ?? null;
        if (!profile || cancelled) return;
        const storefront =
          storefrontPayload && typeof storefrontPayload === 'object'
            ? (storefrontPayload as Record<string, unknown>)
            : null;
        const storefrontTaxonomy = Array.isArray(storefront?.taxonomy)
          ? (storefront?.taxonomy as Array<Record<string, unknown>>)
          : [];
        const coverage = Array.isArray(coveragePayload)
          ? (coveragePayload as Array<Record<string, unknown>>)
          : [];
        const derivedProductLines = buildProductLinesFromBackend(coverage, storefrontTaxonomy, taxonomy);
        const nextSnapshot = {
          identity: (profile.identity as typeof emptyState.identity | undefined) ?? emptyState.identity,
          branding: {
            ...((profile.branding as typeof emptyState.branding | undefined) ?? emptyState.branding),
            tagline:
              typeof storefront?.tagline === 'string'
                ? storefront.tagline
                : ((profile.branding as typeof emptyState.branding | undefined)?.tagline ??
                  emptyState.branding.tagline),
            description:
              typeof storefront?.description === 'string'
                ? storefront.description
                : ((profile.branding as typeof emptyState.branding | undefined)?.description ??
                  emptyState.branding.description),
          },
          addresses: (Array.isArray(profile.addresses) ? profile.addresses : emptyState.addresses) as typeof emptyState.addresses,
          stores:
            storefront && typeof storefront.slug === 'string'
              ? [
                  {
                    id:
                      typeof storefront.id === 'string' && storefront.id
                        ? storefront.id
                        : 'primary-store',
                    name:
                      typeof storefront.name === 'string' && storefront.name
                        ? storefront.name
                        : emptyState.stores[0]?.name || '',
                    handle: storefront.slug,
                    region:
                      (Array.isArray(profile.regions) ? String(profile.regions[0] ?? '') : '') ||
                      emptyState.stores[0]?.region ||
                      'Global',
                    status:
                      Boolean(storefront.isPublished) ||
                      String((profile.identity as Record<string, unknown> | undefined)?.handle ?? '').length > 0
                        ? 'Active'
                        : 'Planned',
                  },
                ]
              : (Array.isArray(profile.stores) ? profile.stores : emptyState.stores) as typeof emptyState.stores,
          productLines: derivedProductLines,
          regions: (Array.isArray(profile.regions) ? profile.regions : emptyState.regions) as typeof emptyState.regions,
          supportHours: (profile.supportHours as typeof emptyState.supportHours | undefined) ?? emptyState.supportHours,
          socials: (profile.socials as typeof emptyState.socials | undefined) ?? emptyState.socials,
          customSocials: (Array.isArray(profile.customSocials) ? profile.customSocials : emptyState.customSocials || []) as CustomSocial[],
        };
        setIdentity(nextSnapshot.identity);
        setBranding(nextSnapshot.branding);
        setAddresses(nextSnapshot.addresses);
        setStores(nextSnapshot.stores);
        setProductLines(nextSnapshot.productLines);
        setRegions(nextSnapshot.regions);
        setSupportHours(nextSnapshot.supportHours);
        setSocials(nextSnapshot.socials);
        setCustomSocials(nextSnapshot.customSocials);
        setCoverageRecords(
          coverage
            .map((entry) => ({
              id: String(entry.id ?? ''),
              taxonomyNodeId: String(entry.taxonomyNodeId ?? ''),
              status: String(entry.status ?? ''),
            }))
            .filter((entry) => entry.id && entry.taxonomyNodeId)
        );
        setStorefrontRecord(storefront);
        setSavedSnapshot(JSON.parse(JSON.stringify(nextSnapshot)));
      } catch {
        setIdentity(emptyState.identity);
        setBranding(emptyState.branding);
        setAddresses(emptyState.addresses);
        setStores(emptyState.stores);
        setProductLines(emptyState.productLines);
        setRegions(emptyState.regions);
        setSupportHours(emptyState.supportHours);
        setSocials(emptyState.socials);
        setCustomSocials(emptyState.customSocials);
        setCoverageRecords([]);
        setStorefrontRecord(null);
        setSavedSnapshot(JSON.parse(JSON.stringify({
          identity: emptyState.identity,
          branding: emptyState.branding,
          addresses: emptyState.addresses,
          stores: emptyState.stores,
          productLines: emptyState.productLines,
          regions: emptyState.regions,
          supportHours: emptyState.supportHours,
          socials: emptyState.socials,
          customSocials: emptyState.customSocials,
        })));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [emptyState, taxonomy]);

  const persistSnapshot = async (nextSnapshot = snapshot) => {
    try {
      const existingCoverageByNodeId = new Map(
        coverageRecords.map((entry) => [entry.taxonomyNodeId, entry])
      );
      const nextProductLines = Array.isArray(nextSnapshot.productLines) ? nextSnapshot.productLines : [];
      const nextNodeIds = Array.from(new Set(nextProductLines.map((line) => line.nodeId).filter(Boolean)));
      const activeNodeIds = nextProductLines
        .filter((line) => line.status === 'active')
        .map((line) => line.nodeId);
      const removedCoverage = coverageRecords.filter((entry) => !nextNodeIds.includes(entry.taxonomyNodeId));
      const coverageWrites: Array<Promise<unknown>> = [];

      nextProductLines.forEach((line) => {
        const existing = existingCoverageByNodeId.get(line.nodeId);
        const status = line.status === 'active' ? 'ACTIVE' : 'SUSPENDED';
        if (existing) {
          if (String(existing.status).toUpperCase() !== status) {
            coverageWrites.push(
              sellerBackendApi.patchTaxonomyCoverage(existing.id, { status })
            );
          }
          return;
        }
        coverageWrites.push(
          sellerBackendApi.addTaxonomyCoverage({ taxonomyNodeId: line.nodeId, status })
        );
      });

      removedCoverage.forEach((entry) => {
        coverageWrites.push(sellerBackendApi.removeTaxonomyCoverage(entry.id));
      });

      const primaryStore = nextSnapshot.stores?.[0];
      await sellerBackendApi.patchSettings({
        profile: {
          ...nextSnapshot,
          productLines: undefined,
        },
      });

      for (const write of coverageWrites) {
        await write;
      }

      await sellerBackendApi.patchMyStorefront({
        slug: nextSnapshot.identity.handle || primaryStore?.handle || undefined,
        name: primaryStore?.name || nextSnapshot.identity.displayName || storefrontRecord?.name || undefined,
        tagline: nextSnapshot.branding.tagline || undefined,
        description: nextSnapshot.branding.description || undefined,
        taxonomyNodeIds: activeNodeIds,
        primaryTaxonomyNodeId: activeNodeIds[0] || undefined,
        isPublished: storefrontRecord?.isPublished ?? false,
      });

      const refreshedCoveragePayload = await sellerBackendApi.getTaxonomyCoverage().catch(() => []);
      const refreshedStorefront = await sellerBackendApi.getMyStorefront().catch(() => storefrontRecord);
      const refreshedCoverage = Array.isArray(refreshedCoveragePayload)
        ? (refreshedCoveragePayload as Array<Record<string, unknown>>)
        : [];
      setCoverageRecords(
        refreshedCoverage
          .map((entry) => ({
            id: String(entry.id ?? ''),
            taxonomyNodeId: String(entry.taxonomyNodeId ?? ''),
            status: String(entry.status ?? ''),
          }))
          .filter((entry) => entry.id && entry.taxonomyNodeId)
      );
      setStorefrontRecord(
        refreshedStorefront && typeof refreshedStorefront === 'object'
          ? (refreshedStorefront as Record<string, unknown>)
          : null
      );
      setSavedSnapshot(JSON.parse(JSON.stringify(nextSnapshot)));
      pushToast({ title: 'Saved', message: 'Profile and storefront updated.', tone: 'success' });
      return true;
    } catch {
      return false;
    }
  };

  const saveAll = async () => {
    await persistSnapshot(snapshot);
  };

  const setDefaultAddress = (id) => {
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    pushToast({ title: 'Default address updated', tone: 'success' });
  };

  const addAddress = () => {
    if (!newAddress.label.trim() || !newAddress.line1.trim()) {
      pushToast({
        title: 'Missing fields',
        message: 'Label and address line are required.',
        tone: 'warning',
      });
      return;
    }

    const id = `ADDR-${Math.floor(Math.random() * 9000) + 1000}`;
    setAddresses((prev) => {
      const next = [
        {
          id,
          updatedAt: new Date().toISOString(),
          ...newAddress,
        },
        ...prev,
      ];
      if (newAddress.isDefault) return next.map((a) => ({ ...a, isDefault: a.id === id }));
      return next;
    });

    setNewAddress({
      label: '',
      type: 'Office',
      line1: '',
      city: '',
      region: '',
      country: '',
      isDefault: false,
    });
    setAddressDrawer(false);
    pushToast({ title: 'Address added', message: id, tone: 'success' });
  };

  const addStore = () => {
    if (!newStore.name.trim() || !newStore.handle.trim()) {
      pushToast({
        title: 'Missing fields',
        message: 'Store name and handle are required.',
        tone: 'warning',
      });
      return;
    }
    const id = `STORE-${Math.floor(Math.random() * 9000) + 1000}`;
    setStores((prev) => [{ id, status: 'Planned', ...newStore }, ...prev]);
    setNewStore({ name: '', handle: '', region: 'Global' });
    setStoreDrawer(false);
    pushToast({
      title: 'Store added',
      message: 'Multi-store is ready to configure.',
      tone: 'success',
    });
  };

  const improvementTips = useMemo(() => {
    const tips = [];

    if (!branding.logoName) {
      tips.push({
        id: 'logo',
        title: 'Upload your brand logo',
        detail: 'A logo improves trust and storefront completeness.',
        action: 'Open branding',
        run: () => {
          setTab('Branding');
          setImprovementTipsOpen(false);
        },
      });
    }

    if ((branding.description || '').trim().length < 80) {
      tips.push({
        id: 'description',
        title: 'Expand your storefront description',
        detail: 'Add at least 80 characters to improve readiness and buyer confidence.',
        action: 'Edit branding',
        run: () => {
          setTab('Branding');
          setImprovementTipsOpen(false);
        },
      });
    }

    if (!addresses.some((a) => a.isDefault)) {
      tips.push({
        id: 'default-address',
        title: 'Set a default address',
        detail: 'A default office or warehouse helps with routing and compliance.',
        action: 'Open addresses',
        run: () => {
          setTab('Addresses');
          setImprovementTipsOpen(false);
        },
      });
    }

    if (stores.length < 2) {
      tips.push({
        id: 'multistore',
        title: 'Add a second planned store',
        detail: 'This improves multi-store readiness for regional expansion.',
        action: 'Add store',
        run: () => {
          setStoreDrawer(true);
          setImprovementTipsOpen(false);
        },
      });
    }

    if (!productLines.length) {
      tips.push({
        id: 'product-lines',
        title: 'Add product or service lines',
        detail: 'Taxonomy coverage helps approvals, discovery, and compliance routing.',
        action: 'Open product lines',
        run: () => {
          setTab('Product/Service Lines');
          setImprovementTipsOpen(false);
        },
      });
    }

    if (!tips.length) {
      tips.push({
        id: 'all-good',
        title: 'Profile quality is in good shape',
        detail: 'Focus on ongoing freshness: update branding, regions, and product lines when your business changes.',
        action: 'Close',
        run: () => setImprovementTipsOpen(false),
      });
    }

    return tips;
  }, [addresses, branding.description, branding.logoName, productLines.length, stores.length]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <style>{`
        .panel{ border:1.5px solid rgba(3,205,140,.35); border-radius:10px; background:var(--surface-1); padding:18px; box-shadow:0 18px 50px -40px rgba(15,23,42,.3); }
        @media (min-width:640px){ .panel{ padding:22px; border-radius:10px; } }
        .panel h3{ margin:0 0 12px; font-size:16px; font-weight:900; color:#0f172a; }
        @media (min-width:640px){ .panel h3{ margin:0 0 16px; font-size:18px; } }
        .input{ width:100%; border:1.5px solid rgba(3,205,140,.35); border-radius:12px; padding:12px 14px; font-size:13px; background:var(--surface-1); min-height:44px; }
        @media (min-width:640px){ .input{ padding:10px 14px; min-height:auto; } }
        .textarea{ border:1.5px solid rgba(3,205,140,.35); border-radius:14px; padding:12px 14px; font-size:13px; min-height:120px; background:var(--surface-1); }
        @media (min-width:640px){ .textarea{ padding:12px 14px; } }
        .regions-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(100px,1fr)); gap:8px; font-size:13px; }
        @media (min-width:640px){ .regions-grid{ grid-template-columns:repeat(auto-fit,minmax(110px,1fr)); gap:10px; } }
        .lines-shell{ border:1px solid rgba(3,205,140,.18); border-radius:12px; padding:16px; background:var(--surface-1); box-shadow:0 20px 60px -50px rgba(15,23,42,.25); }
        @media (min-width:640px){ .lines-shell{ padding:16px; } }
        .line-row{ display:flex; align-items:center; justify-content:space-between; gap:10px; border:1px solid rgba(148,163,184,.28); background:#f8fbff; border-radius:16px; padding:10px 12px; }
        @media (min-width:640px){ .line-row{ padding:10px 14px; } }
        .line-path{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; min-width:0; }
        .pill{ border:1px solid rgba(148,163,184,.35); background:var(--surface-1); border-radius:999px; padding:3px 10px; font-size:12px; font-weight:700; color:#334155; }
        .pill-leaf{ background:rgba(3,205,140,.12); border-color:rgba(3,205,140,.35); color:#047857; }
        .arrow{ color:#94a3b8; font-size:12px; }
        .status{ border-radius:999px; padding:3px 10px; font-size:12px; font-weight:800; border:1px solid transparent; }
        .status-active{ background:rgba(3,205,140,.12); color:#047857; border-color:rgba(3,205,140,.28); }
        .status-suspended{ background:rgba(247,127,0,.12); color:#b45309; border-color:rgba(247,127,0,.28); }
        .line-actions{ display:flex; align-items:center; gap:10px; }
        .link-btn{ border:none; background:transparent; font-weight:800; font-size:12px; color:#64748b; cursor:pointer; }
        .link-btn:hover{ color:#0f172a; }
        .link-danger{ color:#ef4444; }
        .link-danger:hover{ color:#b91c1c; }
        .btn-orange{ background:${TOKENS.orange}; color:#0f172a; border:none; border-radius:14px; padding:12px 18px; font-weight:800; box-shadow:0 16px 40px -26px rgba(247,127,0,.55); min-height:44px; }
        @media (min-width:640px){ .btn-orange{ padding:10px 18px; min-height:auto; } }
        .pl-panel {
          border: 1.5px solid rgba(3,205,140,.35);
          border-radius: 12px;
          background:var(--surface-1);
          padding: 18px;
          box-shadow: 0 18px 50px -40px rgba(15,23,42,.3);
        }
        @media (min-width:640px){ .pl-panel{ padding:22px; border-radius:12px; } }
        .pl-panel h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
        }
        @media (min-width:640px){ .pl-panel h3{ font-size:18px; } }
        .pl-count { font-size: 12px; font-weight: 800; color: #94a3b8; }
        .pl-lines-shell {
          border: 1px solid rgba(3,205,140,.18);
          border-radius: 12px;
          padding: 16px;
          background:var(--surface-1);
          box-shadow: 0 20px 60px -50px rgba(15,23,42,.25);
        }
        .pl-line-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid rgba(148,163,184,.28);
          background: #f8fbff;
          border-radius: 16px;
          padding: 10px 12px;
        }
        @media (min-width:640px){ .pl-line-row{ padding:10px 14px; } }
        .pl-line-path {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }
        .pl-pill {
          border: 1px solid rgba(148,163,184,.35);
          background:var(--surface-1);
          border-radius: 999px;
          padding: 3px 10px;
          font-size: 12px;
          font-weight: 700;
          color: #334155;
        }
        .pl-pill-leaf {
          background: rgba(3,205,140,.12);
          border-color: rgba(3,205,140,.35);
          color: #047857;
        }
        .pl-arrow { color: #94a3b8; font-size: 12px; }
        .pl-status {
          border-radius: 999px;
          padding: 3px 10px;
          font-size: 12px;
          font-weight: 800;
          border: 1px solid transparent;
        }
        .pl-status-active {
          background: rgba(3,205,140,.12);
          color: #047857;
          border-color: rgba(3,205,140,.28);
        }
        .pl-status-suspended {
          background: rgba(247,127,0,.12);
          color: #b45309;
          border-color: rgba(247,127,0,.28);
        }
        .pl-line-actions { display: flex; align-items: center; gap: 10px; }
        .pl-link-btn {
          border: none;
          background: transparent;
          font-weight: 800;
          font-size: 12px;
          color: #64748b;
          cursor: pointer;
        }
        .pl-link-btn:hover { color: #0f172a; }
        .pl-link-danger { color: #ef4444; }
        .pl-link-danger:hover { color: #b91c1c; }
        .pl-btn-orange {
          background: ${TOKENS.orange};
          color: #0f172a;
          border: none;
          border-radius: 14px;
          padding: 12px 18px;
          font-weight: 800;
          box-shadow: 0 16px 40px -26px rgba(247,127,0,.55);
          min-height: 44px;
        }
        @media (min-width:640px){ .pl-btn-orange{ padding:10px 18px; min-height:auto; } }

        .dark .panel,
        .dark .pl-panel,
        .dark .lines-shell,
        .dark .pl-lines-shell {
          background: rgba(15,23,42,.82);
          border-color: rgba(71,85,105,.75);
          box-shadow: none;
        }
        .dark .panel h3,
        .dark .pl-panel h3 {
          color: #f1f5f9;
        }
        .dark .input,
        .dark .textarea {
          background: #0f172a;
          border-color: rgba(71,85,105,.8);
          color: #e2e8f0;
        }
        .dark .input::placeholder,
        .dark .textarea::placeholder {
          color: #94a3b8;
        }
        .dark .line-row,
        .dark .pl-line-row {
          background: rgba(15,23,42,.9);
          border-color: rgba(71,85,105,.75);
        }
        .dark .pill,
        .dark .pl-pill {
          background: #0f172a;
          border-color: rgba(71,85,105,.8);
          color: #cbd5e1;
        }
        .dark .link-btn,
        .dark .pl-link-btn {
          color: #94a3b8;
        }
        .dark .link-btn:hover,
        .dark .pl-link-btn:hover {
          color: #f1f5f9;
        }
      `}</style>
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                  Profile & Storefront
                </div>
                <Badge tone="slate">/settings/profile</Badge>
                <Badge tone="orange">Super premium</Badge>
                {dirty ? <Badge tone="orange">Unsaved</Badge> : <Badge tone="green">Saved</Badge>}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                Identity, branding, addresses, multi-store readiness and quality scoring.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/storefront')}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <ExternalLink className="h-4 w-4" />
                Preview storefront
              </button>
              <button
                type="button"
                onClick={saveAll}
                className={cx(
                  'inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white',
                  !dirty && 'opacity-90'
                )}
                style={{ background: TOKENS.green }}
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Main layout */}
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Left */}
          <div className="lg:col-span-8">
            <GlassCard className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { k: 'Identity', icon: Building2 },
                  { k: 'Branding', icon: Palette },
                  { k: 'Addresses', icon: MapPin },
                ].map((t) => {
                  const Ico = t.icon;
                  const active = tab === t.k;
                  return (
                    <button
                      key={t.k}
                      type="button"
                      onClick={() => setTab(t.k)}
                      className={cx(
                        'inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition',
                        active
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                      )}
                    >
                      <Ico className="h-4 w-4" />
                      {t.k}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setTab('Product/Service Lines')}
                  className={cx(
                    'inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition',
                    tab === 'Product/Service Lines'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                  )}
                >
                  <Layers className="h-4 w-4" />
                  Product/Service Lines
                </button>
                <button
                  type="button"
                  onClick={() => setTab('Regions')}
                  className={cx(
                    'inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition',
                    tab === 'Regions'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                  )}
                >
                  <Globe className="h-4 w-4" />
                  Regions
                </button>
                <button
                  type="button"
                  onClick={() => setTab('Socials')}
                  className={cx(
                    'inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition',
                    tab === 'Socials'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                  )}
                >
                  <Share2 className="h-4 w-4" />
                  Socials
                </button>
                <span className="ml-auto">
                  <Badge tone="slate">Quality {quality}</Badge>
                </span>
              </div>

              <div className="mt-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.16 }}
                  >
                    {tab === 'Identity' ? (
                      <div className="grid gap-3">
                        <SectionTitle
                          icon={Building2}
                          title="Business identity"
                          subtitle="Core fields used across invoices, compliance and storefront."
                        />

                        <div className="grid gap-3 md:grid-cols-2">
                          <Field
                            label="Display name"
                            value={identity.displayName}
                            onChange={(v) => setIdentity((s) => ({ ...s, displayName: v }))}
                          />
                          <Field
                            label="Legal name"
                            value={identity.legalName}
                            onChange={(v) => setIdentity((s) => ({ ...s, legalName: v }))}
                          />
                          <Field
                            label="Store handle"
                            value={identity.handle}
                            onChange={(v) =>
                              setIdentity((s) => ({
                                ...s,
                                handle: v.toLowerCase().replace(/\s+/g, '').slice(0, 22),
                              }))
                            }
                            hint="Used in store URL."
                          />
                          <Field
                            label="Category"
                            value={identity.category}
                            onChange={(v) => setIdentity((s) => ({ ...s, category: v }))}
                          />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <Field
                            icon={Mail}
                            label="Support email"
                            value={identity.email}
                            onChange={(v) => setIdentity((s) => ({ ...s, email: v }))}
                          />
                          <Field
                            icon={Phone}
                            label="Support phone"
                            value={identity.phone}
                            onChange={(v) => setIdentity((s) => ({ ...s, phone: v }))}
                          />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <Field
                            label="Website"
                            value={identity.website}
                            onChange={(v) => setIdentity((s) => ({ ...s, website: v }))}
                          />
                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-slate-700" />
                              <div className="text-sm font-black text-slate-900">Handle check</div>
                              <span className="ml-auto">
                                <Badge tone={identity.handle.length >= 3 ? 'green' : 'orange'}>
                                  {identity.handle.length >= 3 ? 'Looks good' : 'Too short'}
                                </Badge>
                              </span>
                            </div>
                            <div className="mt-2 text-xs font-semibold text-slate-500">
                              Premium: real-time availability and brand protection.
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  pushToast({
                                    title: 'Check',
                                    message: 'Wire to availability API.',
                                    tone: 'default',
                                  })
                                }
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                              >
                                <Sparkles className="h-4 w-4" />
                                Check availability
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  safeCopy(identity.handle);
                                  pushToast({
                                    title: 'Copied',
                                    message: 'Store handle copied.',
                                    tone: 'success',
                                  });
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                              >
                                <Copy className="h-4 w-4" />
                                Copy
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {tab === 'Branding' ? (
                      <div className="grid gap-3">
                        <SectionTitle
                          icon={Palette}
                          title="Branding"
                          subtitle="Logos, cover, colors and storefront description."
                        />

                        <div className="grid gap-3 md:grid-cols-2">
                          <UploadCard
                            title="Logo"
                            value={branding.logoName}
                            onUpload={(name) => {
                              setBranding((s) => ({ ...s, logoName: name }));
                              pushToast({ title: 'Logo updated', tone: 'success' });
                            }}
                          />
                          <UploadCard
                            title="Cover image"
                            value={branding.coverName}
                            onUpload={(name) => {
                              setBranding((s) => ({ ...s, coverName: name }));
                              pushToast({ title: 'Cover updated', tone: 'success' });
                            }}
                          />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <ColorField
                            label="Primary"
                            value={branding.primary}
                            onChange={(v) => setBranding((s) => ({ ...s, primary: v }))}
                          />
                          <ColorField
                            label="Accent"
                            value={branding.accent}
                            onChange={(v) => setBranding((s) => ({ ...s, accent: v }))}
                          />
                        </div>

                        <Field
                          label="Tagline"
                          value={branding.tagline}
                          onChange={(v) => setBranding((s) => ({ ...s, tagline: v }))}
                        />
                        <TextArea
                          label="Store description"
                          value={branding.description}
                          onChange={(v) => setBranding((s) => ({ ...s, description: v }))}
                        />

                        <GlassCard className="p-4">
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-slate-700" />
                            <div className="text-sm font-black text-slate-900">Preview snippet</div>
                            <span className="ml-auto">
                              <Badge tone="slate">Buyer view</Badge>
                            </span>
                          </div>

                          <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                            <div className="flex items-start gap-3">
                              <div
                                className="grid h-12 w-12 place-items-center rounded-3xl text-white"
                                style={{ background: branding.primary }}
                              >
                                <Store className="h-6 w-6" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="truncate text-sm font-black text-slate-900">
                                    {identity.displayName || 'Store name'}
                                  </div>
                                  <Badge tone="slate">{identity.category || 'Category'}</Badge>
                                  <span className="ml-auto">
                                    <Badge tone="green">Verified</Badge>
                                  </span>
                                </div>
                                <div className="mt-1 text-xs font-semibold text-slate-500">
                                  {branding.tagline || 'Add a tagline'}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <span
                                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                                    style={{ background: branding.accent }}
                                  >
                                    Shop now
                                    <ChevronRight className="h-4 w-4" />
                                  </span>
                                  <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800">
                                    View policies
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 text-xs font-semibold text-slate-500">
                            Premium: storefront A/B testing, shoppable video hero, and SEO score.
                          </div>
                        </GlassCard>
                      </div>
                    ) : null}

                    {tab === 'Addresses' ? (
                      <div className="grid gap-3">
                        <SectionTitle
                          icon={MapPin}
                          title="Addresses"
                          subtitle="Offices, warehouses and pickup locations."
                        />

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAddressDrawer(true)}
                            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                            style={{ background: TOKENS.green }}
                          >
                            <Plus className="h-4 w-4" />
                            Add address
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              pushToast({
                                title: 'Geo',
                                message: 'Wire map and geocoding.',
                                tone: 'default',
                              })
                            }
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                          >
                            <Globe className="h-4 w-4" />
                            Verify locations
                          </button>
                          <span className="ml-auto">
                            <Badge tone="slate">{addresses.length} total</Badge>
                          </span>
                        </div>

                        <div className="grid gap-2">
                          {addresses.map((a) => (
                            <div
                              key={a.id}
                              className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4"
                            >
                              <div className="flex items-start gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                                  <MapPin className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="text-sm font-black text-slate-900">
                                      {a.label}
                                    </div>
                                    <Badge tone="slate">{a.type}</Badge>
                                    {a.isDefault ? (
                                      <Badge tone="green">Default</Badge>
                                    ) : (
                                      <Badge tone="slate">Optional</Badge>
                                    )}
                                    <span className="ml-auto text-[11px] font-semibold text-slate-500">
                                      Updated {fmtTime(a.updatedAt)}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-xs font-semibold text-slate-600">
                                    {a.line1}
                                  </div>
                                  <div className="mt-1 text-[11px] font-semibold text-slate-500">
                                    {a.city}, {a.region} · {a.country}
                                  </div>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {!a.isDefault ? (
                                      <button
                                        type="button"
                                        onClick={() => setDefaultAddress(a.id)}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-800"
                                      >
                                        <Check className="h-4 w-4" />
                                        Set default
                                      </button>
                                    ) : null}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        safeCopy(`${a.label} - ${a.line1}, ${a.city}`);
                                        pushToast({
                                          title: 'Copied',
                                          message: 'Address copied.',
                                          tone: 'success',
                                        });
                                      }}
                                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                                    >
                                      <Copy className="h-4 w-4" />
                                      Copy
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        pushToast({
                                          title: 'Edit',
                                          message: 'Wire address editor.',
                                          tone: 'default',
                                        })
                                      }
                                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                                    >
                                      <ChevronRight className="h-4 w-4" />
                                      Edit
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                              <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-orange-900">Premium idea</div>
                              <div className="mt-1 text-xs font-semibold text-orange-900/70">
                                Auto-route orders to the best warehouse by destination and SLA.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {tab === 'Regions' ? (
                      <div className="panel">
                        <h3>{t("Regions & support")}</h3>
                        <div className="mb-2 text-xs font-semibold text-amber-700">
                          {t("Complete the previous step to unlock this section.")}
                        </div>
                        <div className="text-xs text-gray-600">{t("Regions served")}</div>
                        <div className="regions-grid mt-2">
                          {regionOptions.map((region) => (
                            <label key={region} className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={regions.includes(region)}
                                onChange={() => toggleRegion(region)}
                              />
                              {region}
                            </label>
                          ))}
                        </div>
                        <div className="mt-3">
                          <div className="text-xs text-gray-600">{t("Support hours")}</div>
                          <input
                            className="input mt-1"
                            placeholder={t("e.g., Mon-Fri 09:00-17:00 (EAT)")}
                            value={supportHours}
                            onChange={(event) => setSupportHours(event.target.value)}
                          />
                        </div>
                      </div>
                    ) : null}

                    {tab === 'Socials' ? (
                      <div className="panel">
                        <h3>{t("Social links")}</h3>
                        <div className="mb-2 text-xs font-semibold text-amber-700">
                          {t("Complete the previous step to unlock this section.")}
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {socialOptions.map((item) => (
                            <div key={item.key}>
                              <div className="text-xs text-gray-600">{item.label.toLowerCase()}</div>
                              <input
                                className="input mt-1"
                                value={socials[item.key] || ''}
                                onChange={(e) => setSocial(item.key, e.target.value)}
                                placeholder={`https://…/${item.key}`}
                              />
                            </div>
                          ))}
                        </div>

                        <div className="mt-4">
                          {!showCustomSocialForm ? (
                            <button
                              type="button"
                              onClick={() => setShowCustomSocialForm(true)}
                              className="btn-orange"
                            >
                              {t("Add social media")}
                            </button>
                          ) : (
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div>
                                <div className="text-xs text-gray-600">{t("Name")}</div>
                                <input
                                  className="input mt-1"
                                  value={newSocialName}
                                  onChange={(e) => setNewSocialName(e.target.value)}
                                  placeholder="e.g., WhatsApp, WeChat, Telegram"
                                />
                              </div>
                              <div>
                                <div className="text-xs text-gray-600">{t("Handle / link")}</div>
                                <input
                                  className="input mt-1"
                                  value={newSocialHandle}
                                  onChange={(e) => setNewSocialHandle(e.target.value)}
                                  placeholder="Paste link or @handle"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={addCustomSocial} className="btn-orange">
                                  {t("Add")}
                                </button>
                                <button
                                  type="button"
                                  className="link-btn"
                                  onClick={() => {
                                    setShowCustomSocialForm(false);
                                    setNewSocialName('');
                                    setNewSocialHandle('');
                                  }}
                                >
                                  {t("Cancel")}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {customSocials.length ? (
                          <div className="mt-4 grid grid-cols-1 gap-3">
                            {customSocials.map((entry) => (
                              <div key={entry.id}>
                                <div className="text-xs text-gray-600">{entry.name}</div>
                                <input
                                  className="input mt-1"
                                  value={entry.handle}
                                  onChange={(e) => updateCustomSocial(entry.id, { handle: e.target.value })}
                                />
                                <button
                                  type="button"
                                  className="link-btn link-danger mt-2"
                                  onClick={() => removeCustomSocial(entry.id)}
                                >
                                  {t("Delete")}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {tab === 'Product/Service Lines' ? (
                      <div className="panel">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <h3>{t("Your product lines (taxonomy coverage)")}</h3>
                          <div className="text-xs font-extrabold text-slate-400">
                            {productLines.length} {t("selected")}
                          </div>
                        </div>

                        <div className="text-sm text-slate-600">
                          {t("These product lines appear on your storefront and help EVzone route approvals, promotions, and compliance checks.")}
                        </div>

                        <div className="mt-4 lines-shell">
                          {productLines.length === 0 ? (
                            <div className="text-sm text-slate-500">
                              {t("No product lines yet. Add at least one.")}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {productLines.map((line) => {
                                const leafIndex = Math.max(0, line.path.length - 1);
                                return (
                                  <div key={line.id} className="line-row">
                                    <div className="line-path">
                                      {line.path.map((n, idx) => (
                                        <React.Fragment key={n.id}>
                                          {idx > 0 && <span className="arrow">›</span>}
                                          <span className={`pill ${idx === leafIndex ? "pill-leaf" : ""}`}>
                                            {t(n.name)}
                                          </span>
                                        </React.Fragment>
                                      ))}
                                    </div>

                                    <div className="line-actions">
                                      <span
                                        className={`status ${line.status === "active" ? "status-active" : "status-suspended"}`}
                                      >
                                        {line.status === "active" ? t("Active") : t("Suspended")}
                                      </span>
                                      <button
                                        type="button"
                                        className="link-btn"
                                        onClick={() => toggleLineStatus(line.id)}
                                      >
                                        {line.status === "active" ? t("Suspend") : t("Activate")}
                                      </button>
                                      <button
                                        type="button"
                                        className="link-btn link-danger"
                                        onClick={() => deleteLine(line.id)}
                                      >
                                        {t("Delete")}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              className="btn-orange"
                              onClick={() => setLinesEditorOpen(true)}
                            >
                              {t("Add another product line")}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </div>
            </GlassCard>
          </div>

          {/* Right */}
          <div className="lg:col-span-4">
            <div className="space-y-3">
              <GlassCard className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">Quality score</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">
                      Super premium: completeness and readiness.
                    </div>
                  </div>
                  <Badge tone="orange">Score</Badge>
                </div>
                <div className="mt-3">
                  <Ring value={quality} label="" />
                </div>

                <div className="mt-3 grid gap-2">
                  {[
                    { k: 'Logo uploaded', ok: !!branding.logoName },
                    {
                      k: 'Description ready',
                      ok: (branding.description || '').trim().length >= 80,
                    },
                    { k: 'Default address', ok: addresses.some((a) => a.isDefault) },
                    { k: 'Multi-store planned', ok: stores.length >= 2 },
                  ].map((x) => (
                    <div
                      key={x.k}
                      className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2"
                    >
                      <div className="text-xs font-extrabold text-slate-700">{x.k}</div>
                      <Badge tone={x.ok ? 'green' : 'orange'}>{x.ok ? 'OK' : 'Improve'}</Badge>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setImprovementTipsOpen(true)}
                  className="mt-3 w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Open improvement tips
                </button>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Multi-store readiness</div>
                  <span className="ml-auto">
                    <Badge tone="slate">{ready.pct}%</Badge>
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ready.checks.map((c) => (
                    <Badge key={c.k} tone={c.ok ? 'green' : 'orange'}>
                      {c.label}
                    </Badge>
                  ))}
                </div>

                <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-extrabold text-slate-600">Stores</div>
                    <Badge tone="slate">{stores.length}</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {stores.slice(0, 4).map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-xs font-extrabold text-slate-800">
                            {s.name}
                          </div>
                          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                            {s.handle} · {s.region}
                          </div>
                        </div>
                        <Badge tone={s.status === 'Active' ? 'green' : 'slate'}>{s.status}</Badge>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setStoreDrawer(true)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <Plus className="h-5 w-5" />
                    Add store
                  </button>
                </div>

                <div className="mt-3 text-xs font-semibold text-slate-500">
                  Premium: store-level pricing, teams, catalogs, and settlement routing.
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Quick compliance</div>
                  <span className="ml-auto">
                    <Badge tone="slate">Starter</Badge>
                  </span>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">
                  KYC, security and policies affect payouts and ranking.
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      pushToast({
                        title: 'Go to KYC',
                        message: 'Open /settings/kyc',
                        tone: 'default',
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    KYC / KYB
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      pushToast({
                        title: 'Security',
                        message: 'Open /settings/security',
                        tone: 'default',
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Security
                  </button>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>

      {/* Add Address Drawer */}
      <Drawer
        open={addressDrawer}
        title="Add address"
        subtitle="Office, warehouse, pickup or correspondence"
        onClose={() => setAddressDrawer(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Address details</div>
              <span className="ml-auto">
                <Badge tone="slate">Core</Badge>
              </span>
            </div>
            <div className="mt-3 grid gap-3">
              <Field
                label="Label"
                value={newAddress.label}
                onChange={(v) => setNewAddress((s) => ({ ...s, label: v }))}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField
                  label="Type"
                  value={newAddress.type}
                  onChange={(v) => setNewAddress((s) => ({ ...s, type: v }))}
                  options={['Office', 'Warehouse', 'Pickup', 'Correspondence']}
                />
                <ToggleRow
                  label="Set as default"
                  value={newAddress.isDefault}
                  onChange={(v) => setNewAddress((s) => ({ ...s, isDefault: v }))}
                />
              </div>
              <Field
                label="Address line"
                value={newAddress.line1}
                onChange={(v) => setNewAddress((s) => ({ ...s, line1: v }))}
              />
              <div className="grid gap-3 md:grid-cols-3">
                <Field
                  label="City"
                  value={newAddress.city}
                  onChange={(v) => setNewAddress((s) => ({ ...s, city: v }))}
                />
                <Field
                  label="Region"
                  value={newAddress.region}
                  onChange={(v) => setNewAddress((s) => ({ ...s, region: v }))}
                />
                <Field
                  label="Country"
                  value={newAddress.country}
                  onChange={(v) => setNewAddress((s) => ({ ...s, country: v }))}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={addAddress}
            className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
            style={{ background: TOKENS.green }}
          >
            Add address
          </button>
        </div>
      </Drawer>

      {/* Add Store Drawer */}
      <Drawer
        open={storeDrawer}
        title="Add store"
        subtitle="Super premium: multi-store setup"
        onClose={() => setStoreDrawer(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Store details</div>
              <span className="ml-auto">
                <Badge tone="orange">Super premium</Badge>
              </span>
            </div>
            <div className="mt-3 grid gap-3">
              <Field
                label="Store name"
                value={newStore.name}
                onChange={(v) => setNewStore((s) => ({ ...s, name: v }))}
              />
              <Field
                label="Store handle"
                value={newStore.handle}
                onChange={(v) =>
                  setNewStore((s) => ({
                    ...s,
                    handle: v.toLowerCase().replace(/\s+/g, '').slice(0, 22),
                  }))
                }
                hint="Used for store URL"
              />
              <SelectField
                label="Region"
                value={newStore.region}
                onChange={(v) => setNewStore((s) => ({ ...s, region: v }))}
                options={['Global', 'Africa', 'China', 'Asia', 'Europe', 'Americas']}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-black text-orange-900">Premium reminder</div>
                <div className="mt-1 text-xs font-semibold text-orange-900/70">
                  Store-level teams, catalogs, pricing and wallets can be configured after creation.
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={addStore}
            className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
            style={{ background: TOKENS.green }}
          >
            Add store
          </button>
        </div>
      </Drawer>

      <ProductLinesManagerFullPage
        open={linesEditorOpen}
        onClose={() => {
          setLinesEditorOpen(false);
          setResumeListingTarget('');
        }}
        taxonomy={taxonomy}
        productLines={productLines}
        setProductLines={updateProductLines}
        resumeTarget={resumeListingTarget}
        onFinishPersist={async (nextProductLines) => {
          if (!resumeListingTarget) return true;
          return persistSnapshot({
            ...snapshot,
            productLines: nextProductLines,
          });
        }}
      />

      <Drawer
        open={improvementTipsOpen}
        title="Improvement tips"
        subtitle="Best next actions to improve profile quality"
        onClose={() => setImprovementTipsOpen(false)}
      >
        <div className="space-y-3">
          {improvementTips.map((tip, index) => (
            <div
              key={tip.id}
              className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-black text-slate-900">{tip.title}</div>
                    <span className="ml-auto">
                      <Badge tone={tip.id === 'all-good' ? 'green' : 'orange'}>
                        {tip.id === 'all-good' ? 'Ready' : `Tip ${index + 1}`}
                      </Badge>
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{tip.detail}</div>
                  <button
                    type="button"
                    onClick={tip.run}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                    style={{ background: tip.id === 'all-good' ? TOKENS.green : TOKENS.orange }}
                  >
                    {tip.action}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-900">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, hint, icon: Icon }: { label: string; value: string; onChange: (v: string) => void; hint?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-slate-700" /> : null}
        <div className="text-[11px] font-extrabold text-slate-600">{label}</div>
        {hint ? (
          <span className="ml-auto">
            <Badge tone="slate">{hint}</Badge>
          </span>
        ) : null}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
        placeholder={label}
      />
    </div>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="text-[11px] font-extrabold text-slate-600">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
      />
      <div className="mt-2 text-[11px] font-semibold text-slate-500">
        Tip: 120+ characters increases quality score.
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-slate-700" />
        <div className="text-[11px] font-extrabold text-slate-600">{label}</div>
        <span className="ml-auto">
          <Badge tone="slate">{value}</Badge>
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-16 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
        />
      </div>
    </div>
  );
}

function UploadCard({ title, value, onUpload }) {
  const ref = useRef<HTMLInputElement | null>(null);
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-slate-700" />
        <div className="text-sm font-black text-slate-900">{title}</div>
        <span className="ml-auto">
          <Badge tone={value ? 'green' : 'orange'}>{value ? 'Uploaded' : 'Missing'}</Badge>
        </span>
      </div>
      <div className="mt-2 text-xs font-semibold text-slate-500">
        {value ? `File: ${value}` : 'Upload a high quality image for better conversion.'}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => ref.current?.click?.()}
          className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
          style={{ background: TOKENS.orange }}
        >
          <Plus className="h-4 w-4" />
          Upload
        </button>
        <input
          ref={ref}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            onUpload(f.name);
            e.currentTarget.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (!value) return;
            safeCopy(value);
          }}
          className={cx(
            'inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800',
            !value && 'opacity-50 cursor-not-allowed'
          )}
          disabled={!value}
        >
          <Copy className="h-4 w-4" />
          Copy name
        </button>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="text-[11px] font-extrabold text-slate-600">{label}</div>
      <div className="relative mt-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-sm font-semibold text-slate-800"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-extrabold text-slate-600">{label}</div>
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={cx(
            'rounded-2xl border px-3 py-2 text-xs font-extrabold',
            value
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700'
          )}
        >
          {value ? 'On' : 'Off'}
        </button>
      </div>
    </div>
  );
}
