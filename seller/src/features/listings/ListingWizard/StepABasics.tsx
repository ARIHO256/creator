import React, { useEffect, useMemo, useState } from 'react';
import {
  Typography,
  Box,
  Paper,
  TextField,
  Chip,
  Button,
  Stack,
  Divider,
  MenuItem,
  InputAdornment,
  useTheme,
} from '@mui/material';
import { TreeView, TreeItem } from '@mui/lab';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '../../../localization/LocalizationProvider';
import { useRolePageContent } from '../../../data/pageContent';
import type { ListingLineSeed, ListingTaxonomyNode } from '../../../data/pageTypes';

// -----------------------------------------------------------------------------
// Brand tokens (match storefront)
// -----------------------------------------------------------------------------
const BRAND = {
  green: '#03CD8C',
  orange: '#F77F00',
  black: '#111827',
};

const LIGHT_EV = {
  primary: BRAND.green,
  primarySoft: 'rgba(3, 205, 140, 0.12)',
  primaryStrong: '#047857',
  accent: BRAND.orange,
  accentSoft: 'rgba(247, 127, 0, 0.12)',
  bg: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FBFF',
  border: '#E2E8F0',
  textMain: '#0F172A',
  textSubtle: '#64748B',
  textMuted: '#94A3B8',
};

const LIGHT_HERO_SURFACE =
  'linear-gradient(90deg, rgba(16, 185, 129, 0.16), rgba(255, 255, 255, 0.95), rgba(247, 115, 0, 0.16))';
const LIGHT_CARD_SURFACE = 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(240,246,255,0.7))';

const IconShell = ({ children }) => (
  <Box
    component="span"
    className="inline-flex items-center justify-center"
    sx={{ fontSize: '0.9rem', lineHeight: 1 }}
  >
    {children}
  </Box>
);

const IconChevronRight = ({ className, style }) => (
  <IconShell>
    <span className={className} style={style}>
      ›
    </span>
  </IconShell>
);

const IconSearch = () => <IconShell>🔍</IconShell>;

type TaxonomyNode = ListingTaxonomyNode;
type LineStatus = 'active' | 'suspended';
type CatalogLine = {
  id: string;
  nodeId: string;
  status: LineStatus;
  path: Array<{ id: string; name: string; type: string; description?: string }>;
};
type ListingIntent = 'new' | 'restock' | 'variant';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function findNodePath(tree: TaxonomyNode[], id?: string, path: TaxonomyNode[] = []) {
  if (!id) return [];
  for (const node of tree) {
    const currentPath = [...path, node];
    if (node.id === id) return currentPath;
    if (node.children && node.children.length) {
      const childPath = findNodePath(node.children, id, currentPath);
      if (childPath.length) return childPath;
    }
  }
  return [];
}

function buildLine(
  tree: TaxonomyNode[],
  nodeId: string,
  status: LineStatus = 'active'
): CatalogLine {
  const path = findNodePath(tree, nodeId).map((n) => ({
    id: n.id,
    name: n.name,
    type: n.type,
    description: n.description,
  }));
  return {
    id: `${nodeId}-${Math.random().toString(36).slice(2, 8)}`,
    nodeId,
    status,
    path,
  };
}

function pathToSearchText(path: CatalogLine['path'], t?: (value: string) => string) {
  const translate = typeof t === 'function' ? t : (value) => value;
  return (path || [])
    .map((p) => translate(p.name))
    .join(' ')
    .toLowerCase();
}

function getLeaf(path: TaxonomyNode[] | null | undefined) {
  return path?.[path.length - 1] || null;
}

function filterTree(tree: TaxonomyNode[], query: string, t?: (value: string) => string) {
  if (!query) return tree;
  const normalized = query.trim().toLowerCase();
  if (!normalized) return tree;
  const translate = typeof t === 'function' ? t : (value) => value;

  const walk = (nodes) => {
    return nodes
      .map((node) => {
        const children = node.children && node.children.length ? walk(node.children) : [];
        const matches = translate(node.name).toLowerCase().includes(normalized);
        if (matches || children.length > 0) {
          return { ...node, children };
        }
        return null;
      })
      .filter(Boolean);
  };

  return walk(tree);
}

// -----------------------------------------------------------------------------
// Listing Start Page (restricted to existing Product Lines)
// -----------------------------------------------------------------------------
export default function ProductListingFromProductLinesPage() {
  const { t } = useLocalization();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const EV = useMemo(
    () =>
      isDark
        ? {
            ...LIGHT_EV,
            primarySoft: 'rgba(3,205,140,0.14)',
            accentSoft: 'rgba(247,127,0,0.16)',
            bg: '#0b1220',
            surface: '#111827',
            surfaceAlt: '#0f172a',
            border: '#2d2d30',
            textMain: '#E5E7EB',
            textSubtle: '#94A3B8',
            textMuted: '#64748B',
          }
        : LIGHT_EV,
    [isDark]
  );
  const HERO_SURFACE = isDark
    ? 'linear-gradient(90deg, rgba(3,205,140,0.16), rgba(15,23,42,0.94), rgba(247,127,0,0.12))'
    : LIGHT_HERO_SURFACE;
  const CARD_SURFACE = isDark
    ? 'linear-gradient(180deg, rgba(17,24,39,0.98), rgba(15,23,42,0.94))'
    : LIGHT_CARD_SURFACE;
  const { role, content } = useRolePageContent('listingWizard');
  const taxonomy = content.taxonomy;
  const copy = content.copy;
  // ---------------------------------------------------------------------------
  // In real app:
  // - fetch product lines from backend (saved during onboarding/storefront)
  // - use the stored taxonomyNodeId + status + path.
  // ---------------------------------------------------------------------------
  const navigate = useNavigate();

  const buildBaseLines = (seeds: ListingLineSeed[], tree: TaxonomyNode[]) =>
    seeds.map((line) => buildLine(tree, line.nodeId, line.status));

  const [productLines, setProductLines] = useState<CatalogLine[]>(() =>
    buildBaseLines(content.baseLines, taxonomy)
  );

  const [query, setQuery] = useState('');
  const isProvider = role === 'provider';
  const [onlyActive, setOnlyActive] = useState(true);
  const [selectedLineId, setSelectedLineId] = useState('');
  const [listingIntent, setListingIntent] = useState<ListingIntent>('new');
  const [searchTaxonomy, setSearchTaxonomy] = useState('');
  const [selectedTaxonomyNodeId, setSelectedTaxonomyNodeId] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [selectedMarketplaceId, setSelectedMarketplaceId] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');

  useEffect(() => {
    const baseLines = buildBaseLines(content.baseLines, taxonomy);
    setProductLines(baseLines);
    setSelectedLineId('');
    setSelectedTaxonomyNodeId('');
    setExpandedNodes([]);
    setSelectedMarketplaceId('');
    setSelectedFamilyId('');
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
    setListingIntent('new');
    setQuery('');
  }, [content, taxonomy]);

  const addLineLabel = t(copy.addLineLabel);

  const filteredLines = useMemo(() => {
    const q = query.trim().toLowerCase();
    return productLines
      .filter((l) => (onlyActive ? l.status === 'active' : true))
      .filter((l) => (q ? pathToSearchText(l.path, t).includes(q) : true));
  }, [productLines, query, onlyActive, t]);

  const selectedLine = useMemo(
    () => productLines.find((l) => l.id === selectedLineId) || null,
    [productLines, selectedLineId]
  );

  const selectedLeaf = useMemo(
    () => (selectedLine ? getLeaf(selectedLine.path) : null),
    [selectedLine]
  );

  const filteredTaxonomy = useMemo(
    () => filterTree(taxonomy, searchTaxonomy, t),
    [taxonomy, searchTaxonomy, t]
  );

  const selectedTaxonomyPath = useMemo(
    () => (selectedTaxonomyNodeId ? findNodePath(taxonomy, selectedTaxonomyNodeId) : []),
    [selectedTaxonomyNodeId, taxonomy]
  );
  const selectedTaxonomyLeaf = selectedTaxonomyPath[selectedTaxonomyPath.length - 1] || null;

  const selectedMarketplace = taxonomy.find((m) => m.id === selectedMarketplaceId) || null;
  const families = selectedMarketplace?.children || [];
  const selectedFamily = families.find((f) => f.id === selectedFamilyId) || null;
  const categories = selectedFamily?.children || [];
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || null;
  const subcategories = selectedCategory?.children || [];

  const canProceed = !!selectedLine && selectedLine.status === 'active';

  const handlePreviewForm = () => {
    if (!canProceed) return;
    navigate('/listings/form-preview', {
      state: {
        taxonomyNodeId: selectedLine.nodeId,
        taxonomyPath: selectedLine.path,
        intent: listingIntent,
      },
    });
  };

  const handleStartListing = () => {
    if (!canProceed || !selectedLine) return;
    navigate('/listings/wizard', {
      state: {
        taxonomyNodeId: selectedLine.nodeId,
        taxonomyPath: selectedLine.path,
        intent: listingIntent,
      },
    });
  };

  const expandPathNodes = (path) => {
    if (!path?.length) return;
    const ids = path.map((node) => node.id);
    setExpandedNodes((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleTreeToggle = (_event, nodeIds) => {
    setExpandedNodes(nodeIds);
  };

  const handleTreeSelect = (_event, nodeId) => {
    if (!nodeId) return;
    setSelectedTaxonomyNodeId(nodeId);
    const path = findNodePath(taxonomy, nodeId);
    setSelectedMarketplaceId(path?.[0]?.id || '');
    setSelectedFamilyId(path?.[1]?.id || '');
    setSelectedCategoryId(path?.[2]?.id || '');
    setSelectedSubcategoryId(path?.[3]?.id || '');
    expandPathNodes(path);
  };

  const handleMarketplaceChange = (event) => {
    const value = event.target.value;
    setSelectedMarketplaceId(value);
    setSelectedFamilyId('');
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
    setSelectedTaxonomyNodeId(value);
    const path = findNodePath(taxonomy, value);
    expandPathNodes(path);
  };

  const handleFamilyChange = (event) => {
    const value = event.target.value;
    setSelectedFamilyId(value);
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
    setSelectedTaxonomyNodeId(value);
    const path = findNodePath(taxonomy, value);
    expandPathNodes(path);
  };

  const handleCategoryChange = (event) => {
    const value = event.target.value;
    setSelectedCategoryId(value);
    setSelectedSubcategoryId('');
    setSelectedTaxonomyNodeId(value);
    const path = findNodePath(taxonomy, value);
    expandPathNodes(path);
  };

  const handleSubcategoryChange = (event) => {
    const value = event.target.value;
    setSelectedSubcategoryId(value);
    setSelectedTaxonomyNodeId(value);
    const path = findNodePath(taxonomy, value);
    expandPathNodes(path);
  };

  const StatusChip = ({ status }) => (
    <Chip
      size="small"
      label={status === 'active' ? t('Active') : t('Suspended')}
      sx={{
        height: 22,
        borderRadius: 999,
        backgroundColor: status === 'active' ? EV.primarySoft : EV.accentSoft,
        color: status === 'active' ? EV.primaryStrong : EV.accent,
        border: `1px solid ${status === 'active' ? 'rgba(3,205,140,.25)' : 'rgba(247,127,0,.25)'}`,
      }}
      variant="outlined"
    />
  );

  const PathPills = ({ path }) => {
    const leafIndex = Math.max(0, (path?.length || 1) - 1);
    return (
      <Box className="flex flex-wrap items-center gap-0.5">
        {(path || []).map((p, idx) => (
          <React.Fragment key={p.id}>
            {idx > 0 && (
              <Typography variant="caption" sx={{ color: EV.textMuted, mx: 0.25 }}>
                ›
              </Typography>
            )}
            <Chip
              size="small"
              label={t(p.name)}
              sx={{
                height: 22,
                borderRadius: 999,
                backgroundColor: idx === leafIndex ? 'rgba(3,205,140,.12)' : EV.surface,
                color: idx === leafIndex ? EV.primaryStrong : EV.textSubtle,
                border: `1px solid ${idx === leafIndex ? 'rgba(3,205,140,.3)' : 'rgba(148,163,184,.35)'}`,
              }}
              variant="outlined"
            />
          </React.Fragment>
        ))}
      </Box>
    );
  };

  const renderTreeItems = (nodes) =>
    nodes.map((node) => (
      <TreeItem
        key={node.id}
        nodeId={node.id}
        label={
          <Box className="flex items-center gap-1.25">
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: EV.textMain, whiteSpace: 'nowrap' }}
            >
              {t(node.name)}
            </Typography>
            <Chip
              size="small"
              label={t(node.type)}
              sx={{
                height: 22,
                borderRadius: 999,
                backgroundColor: EV.surface,
                borderColor: EV.border,
                textTransform: 'uppercase',
                fontSize: 9,
                fontWeight: 600,
                color: EV.textMuted,
              }}
            />
            <Chip
              size="small"
              label={t('Covered')}
              sx={{
                height: 22,
                borderRadius: 999,
                backgroundColor: EV.primarySoft,
                color: EV.primaryStrong,
                borderColor: 'rgba(3,205,140,0.4)',
              }}
            />
          </Box>
        }
      >
        {node.children && node.children.length ? renderTreeItems(node.children) : null}
      </TreeItem>
    ));

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: EV.bg }}>
      <Box
        component="section"
        className="w-full max-w-none px-[0.55%]"
        sx={{
          background: HERO_SURFACE,
          borderRadius: 1,
          border: `1px solid ${EV.border}`,
          boxShadow: '0 42px 110px -50px rgba(15, 23, 42, 0.8)',
          mb: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 3,
            py: { xs: 3.5, md: 4 },
            px: { xs: 3, md: 4 },
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: EV.textMain }}>
              {t(copy.heroTitle)}
            </Typography>
            <Typography variant="body2" sx={{ color: EV.textMuted, mt: 0.5, maxWidth: 560 }}>
              {t(copy.heroSubtitle)}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            onClick={() =>
              navigate('/settings/profile?returnTo=/listings/taxonomy', {
                state: {
                  fromTaxonomy: true,
                  returnTo: '/listings/taxonomy',
                },
              })
            }
            sx={{
              textTransform: 'none',
              borderRadius: 999,
              borderColor: EV.border,
              color: EV.textMain,
              '&:hover': {
                borderColor: EV.primary,
                backgroundColor: EV.surfaceAlt,
              },
            }}
          >
            {t(copy.manageLinesLabel)}
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          width: '100%',
          px: { xs: '0.55%', md: '0.55%' },
          py: { xs: 2, md: 3 },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.15fr 0.85fr' },
            gap: 2,
            alignItems: 'start',
          }}
        >
          {/* LEFT: Approved product lines list */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 1,
              border: `1px solid ${EV.primary}`,
              background: CARD_SURFACE,
              overflow: 'hidden',
              boxShadow: '0 35px 70px -45px rgba(3,205,140,0.65)',
            }}
          >
            <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(3,205,140,0.25)' }}>
              <Box className="flex items-start justify-between gap-2">
                <Box>
                  <Typography sx={{ fontWeight: 900, color: EV.textMain }}>
                    {t(copy.approvedLinesTitle)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: EV.textSubtle }}>
                    {t(copy.approvedLinesSubtitle)}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={t('{count} shown', { count: filteredLines.length })}
                  sx={{
                    borderRadius: 999,
                    backgroundColor: EV.surfaceAlt,
                    color: EV.textSubtle,
                    borderColor: EV.primary,
                  }}
                  variant="outlined"
                />
              </Box>

              <Box
                sx={{
                  mt: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 220px' },
                  gap: 1.5,
                }}
              >
                <TextField
                  size="small"
                  fullWidth
                  placeholder={t(copy.searchPlaceholder)}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />

                <TextField
                  select
                  size="small"
                  fullWidth
                  label={t('Show')}
                  InputLabelProps={{ shrink: true }}
                  value={onlyActive ? 'active' : 'all'}
                  onChange={(e) => setOnlyActive(e.target.value === 'active')}
                >
                  <MenuItem value="active">{t('Active only')}</MenuItem>
                  <MenuItem value="all">{t('All (including suspended)')}</MenuItem>
                </TextField>
              </Box>
            </Box>

            <Box sx={{ p: 2.5 }}>
              {filteredLines.length === 0 ? (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: EV.surface,
                    border: `1px dashed ${EV.primary}`,
                  }}
                >
                  <Typography sx={{ fontWeight: 800, color: EV.textMain }}>
                    {t(copy.emptyTitle)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: EV.textSubtle, mt: 0.5 }}>
                    {t(copy.emptySubtitle)}
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.25}>
                  {filteredLines.map((line) => {
                    const isSelected = line.id === selectedLineId;
                    const disabled = line.status !== 'active';

                    return (
                      <Paper
                        key={line.id}
                        elevation={0}
                        onClick={() => {
                          if (!disabled) setSelectedLineId(line.id);
                        }}
                        sx={{
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          borderRadius: 1,
                          border: `1px solid ${isSelected ? EV.primary : EV.border}`,
                          backgroundColor: isSelected ? EV.primarySoft : EV.surfaceAlt,
                          p: 1.5,
                          opacity: disabled ? 0.6 : 1,
                        }}
                      >
                        <Box className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <Box sx={{ minWidth: 0 }}>
                            <PathPills path={line.path} />
                            <Typography
                              variant="caption"
                              sx={{ color: EV.textMuted, display: 'block', mt: 0.75 }}
                            >
                              {disabled ? t(copy.suspendedHint) : t(copy.eligibleHint)}
                            </Typography>
                          </Box>

                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ flexWrap: 'wrap' }}
                          >
                            <StatusChip status={line.status} />
                            {isSelected && (
                              <Chip
                                size="small"
                                label={t('Selected')}
                                sx={{
                                  height: 22,
                                  borderRadius: 999,
                                  backgroundColor: EV.primarySoft,
                                  color: EV.primaryStrong,
                                  border: `1px solid rgba(3,205,140,.35)`,
                                }}
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        </Box>
                      </Paper>
                    );
                  })}
                </Stack>
              )}

              <Divider sx={{ my: 2 }} />

              <Box className="flex flex-col md:flex-row md:items-center md:justify-between gap-1.5">
                <Typography variant="body2" sx={{ color: EV.textSubtle }}>
                  {t(copy.tipText)}
                </Typography>
                <Button
                  variant="text"
                  onClick={() =>
                    navigate('/settings/profile?returnTo=/listings/taxonomy', {
                      state: {
                        fromTaxonomy: true,
                        returnTo: '/listings/taxonomy',
                      },
                    })
                  }
                  sx={{ textTransform: 'none', color: EV.accent, fontWeight: 800 }}
                >
                  {addLineLabel}
                </Button>
              </Box>
            </Box>
          </Paper>

          {/* RIGHT: Selected line + actions */}
          <Stack spacing={2}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 1,
                border: `1px solid ${EV.primary}`,
                background: CARD_SURFACE,
                p: 2.5,
                boxShadow: '0 30px 90px -50px rgba(3,205,140,0.6)',
              }}
            >
              <Typography sx={{ fontWeight: 900, color: EV.textMain, mb: 0.75 }}>
                {t(copy.selectedLineTitle)}
              </Typography>

              {!selectedLine ? (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: EV.surface,
                    border: `1px dashed ${EV.primary}`,
                  }}
                >
                  <Typography sx={{ fontWeight: 800, color: EV.textMain }}>
                    {t(copy.selectedLineEmptyTitle)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: EV.textSubtle, mt: 0.5 }}>
                    {t(copy.selectedLineEmptySubtitle)}
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box className="flex items-center justify-between gap-2" sx={{ mb: 1 }}>
                    <StatusChip status={selectedLine.status} />
                    <Chip
                      size="small"
                      label={t('Node ID: {id}', { id: selectedLine.nodeId })}
                      sx={{
                        borderRadius: 999,
                        backgroundColor: EV.surfaceAlt,
                        color: EV.textMuted,
                        borderColor: EV.border,
                      }}
                      variant="outlined"
                    />
                  </Box>

                  <PathPills path={selectedLine.path} />

                  <Typography variant="body2" sx={{ color: EV.textSubtle, mt: 1.25 }}>
                    {selectedLeaf?.description
                      ? t(selectedLeaf.description)
                      : t(copy.taxonomyFallback)}
                  </Typography>

                  <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr', gap: 1.25 }}>
                    <TextField
                      select
                      size="small"
                      label={t(copy.listingIntentLabel)}
                      InputLabelProps={{ shrink: true }}
                      value={listingIntent}
                      onChange={(e) => setListingIntent(e.target.value as ListingIntent)}
                    >
                      {copy.listingIntentOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {t(opt.label)}
                        </MenuItem>
                      ))}
                    </TextField>

                    {selectedLine.status !== 'active' && (
                      <Box sx={{ p: 1.25, borderRadius: 14, backgroundColor: EV.accentSoft }}>
                        <Typography sx={{ fontWeight: 800, color: EV.accent }}>
                          {t(copy.suspendedCardTitle)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: EV.textSubtle, mt: 0.25 }}>
                          {t(copy.suspendedCardBody)}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={handlePreviewForm}
                      disabled={!canProceed}
                      sx={{
                        textTransform: 'none',
                        borderRadius: 999,
                        borderColor: EV.border,
                        color: EV.textMain,
                        '&:hover': {
                          borderColor: EV.primary,
                          backgroundColor: EV.primarySoft,
                        },
                      }}
                    >
                      {t(copy.previewCta)}
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleStartListing}
                      disabled={!canProceed}
                      sx={{
                        textTransform: 'none',
                        borderRadius: 999,
                        backgroundColor: EV.primary,
                        color: BRAND.black,
                        fontWeight: 900,
                        boxShadow: '0 14px 34px rgba(3,205,140,.25)',
                        '&:hover': {
                          backgroundColor: EV.primary,
                          boxShadow: '0 18px 40px rgba(3,205,140,.3)',
                        },
                      }}
                    >
                      {t(copy.startCta)}
                    </Button>
                  </Stack>
                </>
              )}
            </Paper>

            <Paper
              elevation={0}
              sx={{
                borderRadius: 1,
                border: `1px solid ${EV.primary}`,
                background: CARD_SURFACE,
                p: 2.5,
                boxShadow: '0 30px 90px -50px rgba(3,205,140,0.6)',
              }}
            >
              <Typography sx={{ fontWeight: 900, color: EV.textMain, mb: 1 }}>
                {t(copy.nextStepsTitle)}
              </Typography>
              <Stack spacing={1}>
                {copy.nextSteps.map((s) => (
                  <Box key={s.title} sx={{ display: 'flex', gap: 1.25 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        mt: 0.75,
                        backgroundColor: EV.primary,
                      }}
                    />
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: EV.textMain, fontSize: 13 }}>
                        {t(s.title)}
                      </Typography>
                      <Typography variant="body2" sx={{ color: EV.textSubtle }}>
                        {t(s.description)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
