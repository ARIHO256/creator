import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { TreeView, TreeItem } from "@mui/lab";

const EV_COLORS = {
  primary: "#00B388",
  primarySoft: "#E6F7F2",
  primaryStrong: "#008565",
  accent: "#FF8A00",
  accentSoft: "#FFF4E5",
  bg: "#F5F7FB",
  surface: "#FFFFFF",
  surfaceAlt: "#F9FBFF",
  border: "#E2E8F0",
  textMain: "#0F172A",
  textSubtle: "#64748B",
  textMuted: "#94A3B8",
};
const CARD_RADIUS = 2;
const DEFAULT_TYPES = {
  marketplace: "Marketplace",
  family: "Product Family",
  category: "Category",
  subcategory: "Sub-Category",
};
const DEFAULT_LABELS = {
  marketplace: "Marketplace",
  family: "Product family",
  category: "Category",
  subcategory: "Sub-category",
};
const DEFAULT_COPY = {
  title: "Tell us what you sell",
  subtitle:
    "Select the taxonomy paths that describe every product line you plan to list on EVzone.",
  treeTitle: "Taxonomy tree",
  searchPlaceholder: "Search by name",
  quickTitle: "Quick selection",
  quickSubtitle:
    "Use these menus to jump directly to the marketplace, family, category or sub-category you want.",
  selectedTitle: "Selected taxonomy path",
  selectedHelper:
    "Add this taxonomy path to your product lines list if it describes what you want to sell.",
  selectedEmpty:
    "Pick a taxonomy path from the tree or the menus above to add it to your list.",
  addButtonLabel: "Add to product lines",
  listTitle: "Your product lines (taxonomy coverage)",
  listEmpty:
    "No taxonomy paths have been added yet. Add all the categories and sub-categories that represent your catalog.",
  finishTitle: "Finish your catalog coverage",
  finishSubtitle:
    "Add every taxonomy path that describes the products you intend to sell so EVzone can route your listings, approvals, and promotions correctly.",
  saveLabel: "Save",
  saveMessageSingle: "1 taxonomy path saved.",
  saveMessageMulti: "{count} taxonomy paths saved.",
  selectionCountLabel: "{count} path{suffix} selected",
  duplicateMessage: "Taxonomy path already exists",
};

type TaxonomyNode = {
  id: string;
  type: string;
  name: string;
  description?: string;
  children?: TaxonomyNode[];
};
type TaxonomySelection = {
  id?: string;
  nodeId: string;
  path?: string[];
  pathNodes?: Array<{ id: string; name: string; type: string }>;
  marketplace?: string;
  marketplaceId?: string;
};

const IconShell = ({ children }) => (
  <Box component="span" className="inline-flex items-center justify-center" sx={{ fontSize: "0.9rem", lineHeight: 1 }}>
    {children}
  </Box>
);
const IconChevronRight = ({ className }) => (
  <IconShell>
    <span className={className}>›</span>
  </IconShell>
);
const IconCategory = () => <IconShell>◎</IconShell>;
const IconSearch = () => <IconShell>🔍</IconShell>;

// Taxonomy must be provided by the backend (DB-backed). We intentionally do not ship a hardcoded fallback tree.
const initialTaxonomy: TaxonomyNode[] = [
  {
    id: "marketplace-evmart",
    type: "Marketplace",
    name: "EVmart",
    description: "Electric vehicles, chargers, batteries and mobility.",
    children: [
      {
        id: "family-ev-cars",
        type: "Product Family",
        name: "Electric Vehicles",
        description: "Cars, bikes, buses and other EVs.",
        children: [
          {
            id: "category-new-ev-cars",
            type: "Category",
            name: "New Electric Cars",
            description: "Brand new electric cars from OEMs and distributors.",
            children: [
              {
                id: "subcategory-ev-sedans",
                type: "Sub-Category",
                name: "Electric Sedans",
                description: "Four-door electric sedans.",
                children: [],
              },
              {
                id: "subcategory-ev-suvs",
                type: "Sub-Category",
                name: "Electric SUVs",
                description: "Electric SUVs and crossovers.",
                children: [],
              },
              {
                id: "subcategory-ev-hatchbacks",
                type: "Sub-Category",
                name: "Electric Hatchbacks",
                description: "Compact electric hatchbacks.",
                children: [],
              },
            ],
          },
          {
            id: "category-used-ev-cars",
            type: "Category",
            name: "Used Electric Cars",
            description: "Pre-owned electric cars from dealers and owners.",
            children: [
              {
                id: "subcategory-used-ev-sedans",
                type: "Sub-Category",
                name: "Used Electric Sedans",
                description: "Pre-owned electric sedans.",
                children: [],
              },
              {
                id: "subcategory-used-ev-suvs",
                type: "Sub-Category",
                name: "Used Electric SUVs",
                description: "Pre-owned electric SUVs and crossovers.",
                children: [],
              },
            ],
          },
          {
            id: "category-ev-bikes",
            type: "Category",
            name: "Electric Motorbikes",
            description: "Two-wheel electric bikes and scooters.",
            children: [
              {
                id: "subcategory-city-ebikes",
                type: "Sub-Category",
                name: "City E-Bikes",
                description: "Urban commuter electric bikes.",
                children: [],
              },
              {
                id: "subcategory-cargo-ebikes",
                type: "Sub-Category",
                name: "Cargo E-Bikes",
                description: "Cargo and delivery electric bikes.",
                children: [],
              },
            ],
          },
        ],
      },
      {
        id: "family-chargers",
        type: "Product Family",
        name: "EV Chargers & Accessories",
        description: "Home, workplace and public chargers plus accessories.",
        children: [
          {
            id: "category-home-ac-chargers",
            type: "Category",
            name: "Home AC Chargers",
            description: "Wallbox and portable AC chargers.",
            children: [],
          },
          {
            id: "category-dc-fast-chargers",
            type: "Category",
            name: "DC Fast Chargers",
            description: "Public DC fast charging stations.",
            children: [],
          },
          {
            id: "category-charging-cables",
            type: "Category",
            name: "Charging Cables & Adaptors",
            description: "Cables, connectors and adaptors.",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "marketplace-gadgetmart",
    type: "Marketplace",
    name: "GadgetMart",
    description: "Phones, laptops, accessories and smart devices.",
    children: [
      {
        id: "family-phones",
        type: "Product Family",
        name: "Phones & Tablets",
        description: "Smartphones, feature phones and tablets.",
        children: [
          {
            id: "category-smartphones",
            type: "Category",
            name: "Smartphones",
            description: "Android, iOS and other smartphones.",
            children: [
              {
                id: "subcategory-android-phones",
                type: "Sub-Category",
                name: "Android Phones",
                description: "Android smartphones from multiple brands.",
                children: [],
              },
              {
                id: "subcategory-ios-phones",
                type: "Sub-Category",
                name: "iOS Phones",
                description: "Apple iPhones.",
                children: [],
              },
            ],
          },
          {
            id: "category-feature-phones",
            type: "Category",
            name: "Feature Phones",
            description: "Basic phones with long battery life.",
            children: [],
          },
          {
            id: "category-tablets",
            type: "Category",
            name: "Tablets",
            description: "Android, iOS and other tablets.",
            children: [],
          },
        ],
      },
      {
        id: "family-computers",
        type: "Product Family",
        name: "Laptops & Computers",
        description: "Laptops, desktops and computer accessories.",
        children: [
          {
            id: "category-laptops",
            type: "Category",
            name: "Laptops",
            description: "Portable computers for work and play.",
            children: [
              {
                id: "subcategory-gaming-laptops",
                type: "Sub-Category",
                name: "Gaming Laptops",
                description: "High-performance laptops for gaming.",
                children: [],
              },
              {
                id: "subcategory-business-laptops",
                type: "Sub-Category",
                name: "Business Laptops",
                description: "Business-focused laptops.",
                children: [],
              },
            ],
          },
          {
            id: "category-desktops",
            type: "Category",
            name: "Desktops",
            description: "Desktop PCs and workstations.",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "marketplace-stylemart",
    type: "Marketplace",
    name: "StyleMart",
    description: "Fashion, footwear and accessories.",
    children: [
      {
        id: "family-fashion-men",
        type: "Product Family",
        name: "Men's Fashion",
        description: "Clothing and accessories for men.",
        children: [
          {
            id: "category-men-shirts",
            type: "Category",
            name: "Shirts",
            description: "Formal and casual shirts.",
            children: [],
          },
          {
            id: "category-men-trousers",
            type: "Category",
            name: "Trousers & Jeans",
            description: "Formal trousers and jeans.",
            children: [],
          },
        ],
      },
      {
        id: "family-fashion-women",
        type: "Product Family",
        name: "Women's Fashion",
        description: "Clothing and accessories for women.",
        children: [
          {
            id: "category-women-dresses",
            type: "Category",
            name: "Dresses",
            description: "Casual and occasion dresses.",
            children: [],
          },
          {
            id: "category-women-shoes",
            type: "Category",
            name: "Shoes & Heels",
            description: "Footwear for women.",
            children: [],
          },
        ],
      },
      {
        id: "family-footwear",
        type: "Product Family",
        name: "Footwear & Sneakers",
        description: "Shoes, sneakers and sandals.",
        children: [
          {
            id: "category-sneakers",
            type: "Category",
            name: "Sneakers",
            description: "Casual and performance sneakers.",
            children: [],
          },
          {
            id: "category-sandals",
            type: "Category",
            name: "Sandals & Slippers",
            description: "Open shoes and slippers.",
            children: [],
          },
        ],
      },
    ],
  },
];

function findNodePath(tree: TaxonomyNode[], id: string, path: TaxonomyNode[] = []): TaxonomyNode[] {
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

function SellerOnboardingTaxonomyNavigator({
  selections = [],
  onChange,
  disabled = false,
  onSave,
  className = "",
  taxonomyData,
  types,
  labels,
  copy,
  onRetry,
}: {
  selections?: TaxonomySelection[];
  onChange?: (next: TaxonomySelection[]) => void;
  disabled?: boolean;
  onSave?: () => void;
  className?: string;
  taxonomyData?: TaxonomyNode[];
  types?: Partial<typeof DEFAULT_TYPES>;
  labels?: Partial<typeof DEFAULT_LABELS>;
  copy?: Partial<typeof DEFAULT_COPY>;
  onRetry?: () => void;
}) {
  const taxonomy = taxonomyData ?? initialTaxonomy;
  const typeConfig = { ...DEFAULT_TYPES, ...types };
  const labelConfig = { ...DEFAULT_LABELS, ...labels };
  const copyConfig = { ...DEFAULT_COPY, ...copy };
  const [search, setSearch] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState(() => {
    const last = selections[selections.length - 1];
    const lastId = typeof last === "string" ? last : last?.nodeId;
    return lastId || taxonomy[0]?.id || "";
  });
  const [selectedMarketplaceId, setSelectedMarketplaceId] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");

  if (!taxonomy.length) {
    return (
      <Paper
        elevation={0}
        className={className}
        sx={{
          borderRadius: CARD_RADIUS,
          border: "1px solid rgba(226,232,240,1)",
          backgroundColor: EV_COLORS.surface,
          p: 3,
        }}
      >
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" sx={{ color: EV_COLORS.textMain, fontWeight: 700 }}>
            Taxonomy unavailable
          </Typography>
          <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle }}>
            This step requires taxonomy fetched from the database. Please try again.
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              onClick={onRetry}
              disabled={!onRetry}
              sx={{
                borderRadius: 999,
                textTransform: "none",
                backgroundColor: EV_COLORS.primary,
                "&:hover": { backgroundColor: EV_COLORS.primaryStrong },
              }}
            >
              Retry
            </Button>
          </Stack>
        </Stack>
      </Paper>
    );
  }

  const filteredTaxonomy = useMemo(() => filterTree(taxonomy, search), [taxonomy, search]);
  const selectedPath = useMemo(() => findNodePath(taxonomy, selectedNodeId), [taxonomy, selectedNodeId]);
  const selectedNode = selectedPath[selectedPath.length - 1] || null;
  const marketplaceFromPath = selectedPath.find((n) => n.type === typeConfig.marketplace) || null;

  const productLines = useMemo<TaxonomySelection[]>(() => selections || [], [selections]);

  useEffect(() => {
    if (!productLines.length || selectedNodeId) return;
    const last = productLines[productLines.length - 1];
    const nodes = last.pathNodes || [];
    const marketplaceNode = nodes.find((n) => n.type === typeConfig.marketplace);
    const familyNode = nodes.find((n) => n.type === typeConfig.family);
    const categoryNode = nodes.find((n) => n.type === typeConfig.category);
    const subcategoryNode = nodes.find((n) => n.type === typeConfig.subcategory);
    if (marketplaceNode) setSelectedMarketplaceId(marketplaceNode.id);
    if (familyNode) setSelectedFamilyId(familyNode.id);
    if (categoryNode) setSelectedCategoryId(categoryNode.id);
    if (subcategoryNode) setSelectedSubcategoryId(subcategoryNode.id);
    if (nodes.length) {
      setSelectedNodeId(nodes[nodes.length - 1].id);
    }
  }, [productLines, selectedNodeId]);

  const selectedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    productLines.forEach((line) => {
      if (line.nodeId) ids.add(line.nodeId);
    });
    return ids;
  }, [productLines]);

  const marketplaces = taxonomy;
  const selectedMarketplace =
    marketplaces.find((m) => m.id === selectedMarketplaceId) || null;
  const families = selectedMarketplace?.children || [];
  const selectedFamilyNode =
    families.find((f) => f.id === selectedFamilyId) || null;
  const categories = selectedFamilyNode?.children || [];
  const selectedCategoryNode =
    categories.find((c) => c.id === selectedCategoryId) || null;
  const subcategories = selectedCategoryNode?.children || [];

  const canAddCurrentSelection =
    !!selectedNode && selectedNode.type === typeConfig.subcategory && !disabled;
  const [saveMessage, setSaveMessage] = useState("");
  const messageTimerRef = useRef<number | null>(null);

  const handleSelectNode = (nodeId) => {
    if (disabled) return;
    setSelectedNodeId(nodeId);
    const path = findNodePath(taxonomy, nodeId);
    const marketplaceNode = path.find((n) => n.type === typeConfig.marketplace);
    const family = path.find((n) => n.type === typeConfig.family);
    const category = path.find((n) => n.type === typeConfig.category);
    const subcategory = path.find((n) => n.type === typeConfig.subcategory);
    if (marketplaceNode) setSelectedMarketplaceId(marketplaceNode.id);
    setSelectedFamilyId(family?.id || "");
    setSelectedCategoryId(category?.id || "");
    setSelectedSubcategoryId(subcategory?.id || "");
  };

  const handleMarketplaceChange = (event) => {
    if (disabled) return;
    const id = event.target.value;
    setSelectedMarketplaceId(id);
    setSelectedFamilyId("");
    setSelectedCategoryId("");
    setSelectedSubcategoryId("");
    const marketplace = taxonomy.find((m) => m.id === id);
    setSelectedNodeId(marketplace?.id || "");
  };

  const handleFamilyChange = (event) => {
    if (disabled) return;
    const id = event.target.value;
    setSelectedFamilyId(id);
    setSelectedCategoryId("");
    setSelectedSubcategoryId("");
    const family = (selectedMarketplace?.children || []).find((f) => f.id === id);
    setSelectedNodeId((family || selectedMarketplace)?.id || "");
  };

  const handleCategoryChange = (event) => {
    if (disabled) return;
    const id = event.target.value;
    setSelectedCategoryId(id);
    setSelectedSubcategoryId("");
    const category = (selectedFamilyNode?.children || []).find((c) => c.id === id);
    setSelectedNodeId((category || selectedFamilyNode || selectedMarketplace)?.id || "");
  };

  const handleSubcategoryChange = (event) => {
    if (disabled) return;
    const id = event.target.value;
    setSelectedSubcategoryId(id);
    setSelectedNodeId(id);
  };

  const handleClearSelection = () => {
    if (disabled) return;
    setSelectedNodeId("");
    setSelectedFamilyId("");
    setSelectedCategoryId("");
    setSelectedSubcategoryId("");
  };

  const handleAddProductLine = () => {
    if (!canAddCurrentSelection || !selectedNode) return;
    if (productLines.some((line) => line.nodeId === selectedNode.id)) {
      alert(copyConfig.duplicateMessage);
      return;
    }
    const pathNodes = selectedPath.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
    }));
    const pathNames = pathNodes.map((node) => node.name);
    const newLine: TaxonomySelection = {
      id: `${selectedNode.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nodeId: selectedNode.id,
      path: pathNames,
      pathNodes,
      marketplace: marketplaceFromPath?.name || "",
      marketplaceId: marketplaceFromPath?.id || "",
    };
    const nextLines = [...productLines, newLine];
    onChange?.(nextLines);
    setSelectedCategoryId("");
    setSelectedSubcategoryId("");
    setSelectedNodeId("");
  };

  const getLineId = (line, idx) => line.id || line.nodeId || `line-${idx}`;

  const handleDeleteProductLine = (entryId) => {
    if (disabled) return;
    const updated = productLines.filter((line, idx) => getLineId(line, idx) !== entryId);
    onChange?.(updated);
  };

  const handleSaveClick = () => {
    if (disabled || productLines.length === 0) return;
    onSave?.();
    const label =
      productLines.length === 1
        ? copyConfig.saveMessageSingle
        : copyConfig.saveMessageMulti.replace("{count}", String(productLines.length));
    setSaveMessage(label);
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }
    messageTimerRef.current = window.setTimeout(() => {
      setSaveMessage("");
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

  const renderTree = (nodes) =>
    nodes.map((node) => {
      const isCurrent = node.id === selectedNodeId;
      const isInProductLines = selectedNodeIds.has(node.id);
      return (
        <TreeItem
          key={node.id}
          nodeId={node.id}
          label={
            <Box
              className="flex items-center gap-2"
              sx={{
                borderRadius: 999,
                px: 1,
                py: 0.5,
                backgroundColor: isCurrent
                  ? EV_COLORS.primarySoft
                  : isInProductLines
                  ? EV_COLORS.surfaceAlt
                  : "transparent",
                border: isInProductLines
                  ? `1px solid ${
                      isCurrent ? EV_COLORS.primary : EV_COLORS.border
                    }`
                  : "1px solid transparent",
              }}
            >
              <IconCategory />
              <span className="text-sm font-medium" style={{ color: EV_COLORS.textMain }}>
                {node.name}
              </span>
              <Chip
                size="small"
                label={node.type}
                sx={{
                  backgroundColor:
                    node.type === typeConfig.marketplace
                      ? EV_COLORS.primarySoft
                      : EV_COLORS.surface,
                  color:
                    node.type === typeConfig.marketplace
                      ? EV_COLORS.primaryStrong
                      : EV_COLORS.textSubtle,
                  borderColor: EV_COLORS.border,
                  borderWidth: 1,
                  fontSize: "0.65rem",
                  height: 20,
                }}
                variant="outlined"
              />
              {isInProductLines && (
                <Chip
                  size="small"
                  label="Selected"
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

  return (
    <Box className={className} sx={{ backgroundColor: EV_COLORS.bg }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: CARD_RADIUS,
          border: `1px solid ${EV_COLORS.primary}`,
          backgroundColor: EV_COLORS.surface,
          p: 3,
          mb: 3,
        }}
      >
        <Typography variant="h6" sx={{ color: EV_COLORS.textMain, fontWeight: 600 }}>
          {copyConfig.title}
        </Typography>
        <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle, mt: 0.5 }}>
          {copyConfig.subtitle}
        </Typography>
        {!!productLines.length && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Chip
              size="small"
              label={copyConfig.selectionCountLabel
                .replace("{count}", String(productLines.length))
                .replace("{suffix}", productLines.length > 1 ? "s" : "")}
              sx={{ backgroundColor: EV_COLORS.surfaceAlt, color: EV_COLORS.textSubtle, borderColor: EV_COLORS.border }}
              variant="outlined"
            />
            {marketplaceFromPath && (
              <Chip
                size="small"
                label={`${labelConfig.marketplace}: ${marketplaceFromPath.name}`}
                sx={{ backgroundColor: EV_COLORS.surfaceAlt, color: EV_COLORS.textSubtle, borderColor: EV_COLORS.border }}
                variant="outlined"
              />
            )}
          </Stack>
        )}
      </Paper>

      <Box className="grid gap-4 xl:grid-cols-[minmax(280px,1fr)_minmax(0,1fr)]">
        <Paper
          elevation={0}
          sx={{
            borderRadius: CARD_RADIUS,
            border: `1px solid ${EV_COLORS.primary}`,
            backgroundColor: EV_COLORS.surface,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box sx={{ borderBottom: `1px solid ${EV_COLORS.border}`, p: 3 }}>
            <Typography
              variant="subtitle2"
              className="uppercase tracking-[0.2em] text-[11px]"
              sx={{ color: EV_COLORS.textMuted }}
            >
              {copyConfig.treeTitle}
            </Typography>
            <Box className="flex items-center gap-2" sx={{ mt: 1 }}>
              <IconSearch />
              <TextField
                size="small"
                fullWidth
                placeholder={copyConfig.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                variant="outlined"
              />
            </Box>
          </Box>
          <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
            <TreeView
              selected={selectedNodeId}
              defaultCollapseIcon={<IconChevronRight className="rotate-90 text-slate-400" />}
              defaultExpandIcon={<IconChevronRight className="text-slate-500" />}
              onNodeSelect={(_e, nodeId) => handleSelectNode(nodeId)}
              sx={{ color: EV_COLORS.textMain }}
            >
              {renderTree(filteredTaxonomy)}
            </TreeView>
          </Box>
        </Paper>

        <Box className="flex flex-col gap-4">
          <Paper
            elevation={0}
            sx={{
              borderRadius: CARD_RADIUS,
              border: `1px solid ${EV_COLORS.primary}`,
              backgroundColor: EV_COLORS.surface,
              p: 3,
            }}
          >
            <Typography variant="subtitle1" sx={{ color: EV_COLORS.textMain, fontWeight: 600, mb: 1 }}>
              {copyConfig.quickTitle}
            </Typography>
            <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle, mb: 2 }}>
              {copyConfig.quickSubtitle}
            </Typography>

            <Box className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <TextField
                select
                label={labelConfig.marketplace}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={selectedMarketplaceId}
                onChange={handleMarketplaceChange}
                disabled={disabled}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (selected) => {
                    const value = String(selected || "");
                    if (!value) {
                      return (
                        <span style={{ color: EV_COLORS.textMuted }}>
                          Select {labelConfig.marketplace.toLowerCase()}
                        </span>
                      );
                    }
                    const item = marketplaces.find((entry) => entry.id === value);
                    return item ? item.name : value;
                  },
                }}
              >
                <MenuItem value="" disabled>
                  Select {labelConfig.marketplace.toLowerCase()}
                </MenuItem>
                {marketplaces.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label={labelConfig.family}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={selectedFamilyId}
                onChange={handleFamilyChange}
                disabled={disabled || !families.length}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (selected) => {
                    const value = String(selected || "");
                    if (!value) {
                      return (
                        <span style={{ color: EV_COLORS.textMuted }}>
                          Select {labelConfig.family.toLowerCase()}
                        </span>
                      );
                    }
                    const item = families.find((entry) => entry.id === value);
                    return item ? item.name : value;
                  },
                }}
              >
                <MenuItem value="" disabled>
                  Select {labelConfig.family.toLowerCase()}
                </MenuItem>
                {families.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label={labelConfig.category}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={selectedCategoryId}
                onChange={handleCategoryChange}
                disabled={disabled || !categories.length}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (selected) => {
                    const value = String(selected || "");
                    if (!value) {
                      return (
                        <span style={{ color: EV_COLORS.textMuted }}>
                          Select {labelConfig.category.toLowerCase()}
                        </span>
                      );
                    }
                    const item = categories.find((entry) => entry.id === value);
                    return item ? item.name : value;
                  },
                }}
              >
                <MenuItem value="" disabled>
                  Select {labelConfig.category.toLowerCase()}
                </MenuItem>
                {categories.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label={labelConfig.subcategory}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={selectedSubcategoryId}
                onChange={handleSubcategoryChange}
                disabled={disabled || !subcategories.length}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (selected) => {
                    const value = String(selected || "");
                    if (!value) {
                      return (
                        <span style={{ color: EV_COLORS.textMuted }}>
                          Select {labelConfig.subcategory.toLowerCase()}
                        </span>
                      );
                    }
                    const item = subcategories.find((entry) => entry.id === value);
                    return item ? item.name : value;
                  },
                }}
              >
                <MenuItem value="" disabled>
                  Select {labelConfig.subcategory.toLowerCase()}
                </MenuItem>
                {subcategories.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              borderRadius: CARD_RADIUS,
              border: `1px solid ${EV_COLORS.primary}`,
              backgroundColor: EV_COLORS.surface,
              p: 3,
            }}
          >
            <Box className="flex items-start justify-between gap-2 mb-2">
              <Typography variant="subtitle1" sx={{ color: EV_COLORS.textMain, fontWeight: 600 }}>
                {copyConfig.selectedTitle}
              </Typography>
              <Button
                size="small"
                variant="text"
                onClick={handleClearSelection}
                disabled={!selectedPath.length || disabled}
                sx={{ textTransform: "none", color: EV_COLORS.textSubtle, minWidth: 0, px: 1 }}
              >
                Clear
              </Button>
            </Box>

            {selectedPath.length > 0 ? (
              <>
                <Box className="flex flex-wrap items-center gap-0.5 mb-2">
                  {selectedPath.map((node, idx) => (
                    <React.Fragment key={node.id}>
                      {idx > 0 && (
                        <Typography variant="caption" sx={{ color: EV_COLORS.textMuted, mx: 0.25 }}>
                          ›
                        </Typography>
                      )}
                      <Chip
                        size="small"
                        label={node.name}
                        sx={{
                          backgroundColor:
                            idx === selectedPath.length - 1 ? EV_COLORS.primarySoft : EV_COLORS.surfaceAlt,
                          color:
                            idx === selectedPath.length - 1 ? EV_COLORS.primaryStrong : EV_COLORS.textSubtle,
                          borderColor:
                            idx === selectedPath.length - 1 ? EV_COLORS.primary : EV_COLORS.border,
                          borderWidth: 1,
                        }}
                        variant="outlined"
                      />
                    </React.Fragment>
                  ))}
                </Box>
                <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle, mb: 1.5 }}>
                  {copyConfig.selectedHelper}
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  sx={{ alignItems: { xs: "stretch", sm: "center" } }}
                >
                  <Button
                    size="medium"
                    variant="contained"
                    onClick={handleAddProductLine}
                    disabled={!canAddCurrentSelection}
                    sx={{
                      textTransform: "none",
                      borderRadius: 999,
                      backgroundColor: EV_COLORS.accent,
                      color: "#FFFFFF",
                      "&:hover": { backgroundColor: EV_COLORS.accent },
                    }}
                  >
                    {copyConfig.addButtonLabel}
                  </Button>
                </Stack>
              </>
            ) : (
              <Typography variant="body2" sx={{ color: EV_COLORS.textMuted }}>
                {copyConfig.selectedEmpty}
              </Typography>
            )}
          </Paper>

          <Paper
            elevation={0}
            sx={{
              borderRadius: CARD_RADIUS,
              border: `1px solid ${EV_COLORS.primary}`,
              backgroundColor: EV_COLORS.surface,
              p: 3,
            }}
          >
            <Box className="flex items-center justify-between gap-2 mb-2">
              <Typography variant="subtitle1" sx={{ color: EV_COLORS.textMain, fontWeight: 600 }}>
                {copyConfig.listTitle}
              </Typography>
              {productLines.length > 0 && (
                <Typography variant="caption" sx={{ color: EV_COLORS.textMuted }}>
                  {productLines.length} selected
                </Typography>
              )}
            </Box>

            {productLines.length === 0 ? (
              <Typography variant="body2" sx={{ color: EV_COLORS.textMuted }}>
                {copyConfig.listEmpty}
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {productLines.map((line, idx) => {
                  const entryId = getLineId(line, idx);
                  const canonicalPath =
                    line.pathNodes && line.pathNodes.length > 0
                      ? line.pathNodes
                      : (line.path || []).map((value) => ({ name: value }));
                  const pathToRender = canonicalPath.map((node, pathIdx) => {
                    const label = typeof node === "string" ? node : node.name || "";
                    const nodeId = typeof node === "object" && "id" in node ? node.id || null : null;
                    return {
                      id: nodeId,
                      name: label,
                      isLast: pathIdx === canonicalPath.length - 1,
                    };
                  });
                  return (
                    <Box
                      key={entryId}
                      className="gap-2"
                      sx={{
                        borderRadius: 2,
                        border: `1px solid ${EV_COLORS.border}`,
                        backgroundColor: EV_COLORS.surfaceAlt,
                        p: 1.5,
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        minWidth: 0,
                      }}
                    >
                      <Box
                        className="flex flex-wrap items-center gap-0.5"
                        sx={{ minWidth: 0 }}
                      >
                        {pathToRender.map((pathNode, pathIdx) => (
                          <React.Fragment key={`${entryId}-${pathIdx}`}>
                            {pathIdx > 0 && (
                              <Typography
                                variant="caption"
                                sx={{ color: EV_COLORS.textMuted, mx: 0.25 }}
                              >
                                ›
                              </Typography>
                            )}
                            <Chip
                              size="small"
                              label={pathNode.name}
                              sx={{
                                backgroundColor: pathNode.isLast
                                  ? EV_COLORS.primarySoft
                                  : EV_COLORS.surface,
                                color: pathNode.isLast ? EV_COLORS.primaryStrong : EV_COLORS.textSubtle,
                                borderColor: EV_COLORS.border,
                                borderWidth: 1,
                              }}
                              variant="outlined"
                            />
                          </React.Fragment>
                        ))}
                      </Box>
                      <Stack direction="row" justifyContent="flex-end" spacing={1}>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => handleDeleteProductLine(entryId)}
                          disabled={disabled}
                          sx={{ textTransform: "none", color: "#EF4444" }}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>

          <Paper
            elevation={0}
            sx={{
              borderRadius: CARD_RADIUS,
              border: `1px solid ${EV_COLORS.primary}`,
              backgroundColor: EV_COLORS.surface,
              p: 3,
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={3}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent="space-between"
            >
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{ color: EV_COLORS.textMain, fontWeight: 600, mb: 0.5 }}
                >
                  {copyConfig.finishTitle}
                </Typography>
                <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle, maxWidth: 520 }}>
                  {copyConfig.finishSubtitle}
                </Typography>
              </Box>
              <Button
                size="medium"
                variant="contained"
                onClick={handleSaveClick}
                disabled={disabled || productLines.length === 0}
                sx={{
                  borderRadius: 999,
                  textTransform: "none",
                  backgroundColor: EV_COLORS.primary,
                  color: "#FFFFFF",
                  px: 3,
                  boxShadow: "0 12px 30px rgba(0, 179, 136, 0.3)",
                  "&:hover": {
                    backgroundColor: EV_COLORS.primaryStrong,
                    boxShadow: "0 14px 34px rgba(0, 133, 101, 0.4)",
                  },
                }}
                >
                  {copyConfig.saveLabel}
                </Button>
                <Typography
                  variant="caption"
                  sx={{ color: EV_COLORS.primaryStrong, minHeight: 20 }}
                >
                  {saveMessage || "\u00A0"}
                </Typography>
              </Stack>
            </Paper>
        </Box>
      </Box>
    </Box>
  );
}

export default SellerOnboardingTaxonomyNavigator;
