import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Typography,
  Box,
  Breadcrumbs,
  Link as MUILink,
  Button,
  TextField,
  Chip,
  Stack,
  Paper,
  useTheme,
  useMediaQuery,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  Switch,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Checkbox,
  FormGroup,
  LinearProgress,
  MenuItem,
} from "@mui/material";
import { useLocalization } from "../../localization/LocalizationProvider";

// -----------------------------------------------------------------------------
// EVzone brand palette (light mode)
// -----------------------------------------------------------------------------
const LIGHT_EV_COLORS = {
  primary: "#00B388", // EVzone Green
  primarySoft: "#E6F7F2",
  primaryStrong: "#008565",
  accent: "#FF8A00", // EVzone Orange
  accentSoft: "#FFF4E5",
  bg: "#F5F7FB",
  surface: "#FFFFFF",
  surfaceAlt: "#F9FBFF",
  border: "#E2E8F0",
  textMain: "#0F172A",
  textSubtle: "#64748B",
  textMuted: "#94A3B8",
};

const LIGHT_HERO_SURFACE = "linear-gradient(90deg, rgba(16,185,129,0.15), rgba(255,255,255,0.95), rgba(249,115,22,0.08))";

// -----------------------------------------------------------------------------
// Lightweight icons
// -----------------------------------------------------------------------------
const IconShell = ({ children }) => (
  <Box
    component="span"
    className="inline-flex items-center justify-center"
    sx={{ fontSize: "0.9rem", lineHeight: 1 }}
  >
    {children}
  </Box>
);

const IconStart = () => <IconShell>▶</IconShell>;
const IconSave = () => <IconShell>💾</IconShell>;
const IconBack = () => <IconShell>←</IconShell>;

// -----------------------------------------------------------------------------
// Variant attribute options (these will ultimately come from admin/schema)
// -----------------------------------------------------------------------------
const AVAILABLE_COLORS = [
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
  { value: "red", label: "Red" },
  { value: "blue", label: "Blue" },
  { value: "silver", label: "Silver" },
];

const AVAILABLE_TRIMS = [
  { value: "standard", label: "Standard" },
  { value: "long_range", label: "Long Range" },
  { value: "performance", label: "Performance" },
];

const AVAILABLE_BATTERIES = [
  { value: "60", label: "60 kWh" },
  { value: "75", label: "75 kWh" },
  { value: "90", label: "90 kWh" },
];

const AVAILABLE_WHEEL_SIZES = [
  { value: "17", label: '17"' },
  { value: "18", label: '18"' },
  { value: "19", label: '19"' },
];

const AVAILABLE_INTERIOR_COLORS = [
  { value: "black", label: "Black" },
  { value: "beige", label: "Beige" },
  { value: "white", label: "White" },
];

// -----------------------------------------------------------------------------
// Mock seller markets – in real app, load from seller's Profile & Storefront
// -----------------------------------------------------------------------------
const MOCK_SELLER_MARKETS = [
  { id: "market-ug", name: "Uganda" },
  { id: "market-ke", name: "Kenya" },
  { id: "market-rw", name: "Rwanda" },
  { id: "market-tz", name: "Tanzania" },
];

// -----------------------------------------------------------------------------
// Wizard steps – in real app this comes from Admin Wizard Builder
// -----------------------------------------------------------------------------
const WIZARD_STEPS = [
  { id: "core", label: "Core Features", type: "form" },
  { id: "preOwned", label: "Pre-Owned Info", type: "form", conditional: true },
  { id: "bev", label: "BEV Data", type: "form", conditional: true },
  { id: "extras", label: "Extras", type: "form" },
  { id: "gallery", label: "Gallery", type: "form" },
  { id: "pricing", label: "Pricing", type: "pricing" },
  { id: "warranty", label: "Warranty", type: "warranty", conditional: true },
  { id: "inventory", label: "Inventory", type: "inventory" },
  { id: "delivery", label: "Markets & Delivery", type: "delivery" },
  { id: "seo", label: "Search & Discovery", type: "seo" },
];

const MAX_WHOLESALE_TIERS = 4;
const OPEN_ENDED_LABEL = "Above";
const parseNum = (v) => {
  if (v === null || v === undefined) return null;
  const str = String(v).trim();
  if (str === "") return null;
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
};
const isTierMarkedFinal = (tier) =>
  !!tier?.isFinal ||
  String(tier?.maxQty || "").toLowerCase() === OPEN_ENDED_LABEL.toLowerCase();

// NOTE: In a real integration, `variants` should be generated from answered
// attributes and repeaters (e.g. colors, trims, battery packs, wheel sizes, etc).
// Here we seed 3 example variants to demonstrate the UI.
const INITIAL_FORM = {
  // Core
  title: "",
  brand: "",
  model: "",
  bodyType: "",
  keySellingPoint: "",
  // Pre-owned
  isUsed: false,
  mileage: "",
  owners: "",
  serviceHistory: "",
  // Powertrain
  powertrainType: "BEV", // BEV / PHEV / OTHER
  batteryCapacity: "",
  range: "",
  connectorType: "",
  numPorts: "",
  // Extras
  extras: {
    fastCharger: false,
    floorMats: false,
    roofRack: false,
    extendedWarranty: false,
  },
  // Gallery
  heroImageUploaded: false,
  // Pricing (base)
  price: "",
  currency: "USD",
  enableWholesale: false,
  // Warranty (global toggle)
  hasWarranty: false,
  warrantyMonths: "",
  warrantyDetails: "",
  // Markets & Delivery
  markets: {
    allActive: true,
    selectedIds: MOCK_SELLER_MARKETS.map((m) => m.id),
  },
  allowPickup: true,
  allowDelivery: true,
  deliveryRegions: {
    local: true,
    upcountry: false,
    crossBorder: false,
  },
  deliverToBuyerWarehouse: false,
  // Search & Discovery
  seoTitle: "",
  seoDescription: "",
  seoAudience: "",
  seoKeywords: "",
  // Variants (all combinations/specs for cards)
  variants: [
    {
      id: "v1",
      name: "Standard Range",
      color: "White",
      trim: "Standard",
      batteryPack: "60 kWh",
      wheelSize: '17"',
      interiorColor: "Black",
      description: "Base configuration for daily city driving.",
      specs: "60 kWh · 350 km range · Color: White · Trim: Standard",
      price: "",
      stockQty: "",
      sku: "",
      warrantyMonths: "",
      wholesaleTiers: [
        {
          id: "v1-t1",
          minQty: "1",
          maxQty: "",
          price: "",
          isFinal: false,
        },
      ],
    },
    {
      id: "v2",
      name: "Long Range",
      color: "Black",
      trim: "Long Range",
      batteryPack: "75 kWh",
      wheelSize: '18"',
      interiorColor: "Beige",
      description: "Larger battery for longer trips.",
      specs: "75 kWh · 450 km range · Color: Black · Trim: Long Range",
      price: "",
      stockQty: "",
      sku: "",
      warrantyMonths: "",
      wholesaleTiers: [
        {
          id: "v2-t1",
          minQty: "1",
          maxQty: "",
          price: "",
          isFinal: false,
        },
      ],
    },
    {
      id: "v3",
      name: "Performance",
      color: "Red",
      trim: "Performance",
      batteryPack: "90 kWh",
      wheelSize: '19"',
      interiorColor: "Black",
      description: "High performance with stronger acceleration.",
      specs: "90 kWh · Sport mode · Color: Red · Trim: Performance",
      price: "",
      stockQty: "",
      sku: "",
      warrantyMonths: "",
      wholesaleTiers: [
        {
          id: "v3-t1",
          minQty: "1",
          maxQty: "",
          price: "",
          isFinal: false,
        },
      ],
    },
  ],
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------
function SellerProductListingWizardPage() {
  const { t } = useLocalization();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const EV_COLORS = useMemo(
    () =>
      isDark
        ? {
            ...LIGHT_EV_COLORS,
            primarySoft: "rgba(3,205,140,0.14)",
            bg: "#0b1220",
            surface: "#111827",
            surfaceAlt: "#0f172a",
            border: "#2d2d30",
            textMain: "#E5E7EB",
            textSubtle: "#94A3B8",
            textMuted: "#64748B",
          }
        : LIGHT_EV_COLORS,
    [isDark]
  );
  const HERO_SURFACE = useMemo(
    () =>
      isDark
        ? "linear-gradient(90deg, rgba(3,205,140,0.16), rgba(15,23,42,0.94), rgba(247,127,0,0.12))"
        : LIGHT_HERO_SURFACE,
    [isDark]
  );
  const variantImageBg = isDark
    ? "linear-gradient(135deg, #1F2937, #0F172A)"
    : "linear-gradient(135deg, #E2E8F0, #F8FAFC)";
  const attributeChipStyles = useMemo(
    () => ({
      color: {
        backgroundColor: isDark ? "rgba(99,102,241,0.16)" : "#EEF2FF",
        color: isDark ? "#C7D2FE" : "#4338CA",
      },
      trim: {
        backgroundColor: isDark ? "rgba(245,158,11,0.16)" : "#FEF3C7",
        color: isDark ? "#FCD34D" : "#92400E",
      },
      battery: {
        backgroundColor: isDark ? "rgba(16,185,129,0.16)" : "#ECFDF3",
        color: isDark ? "#6EE7B7" : "#15803D",
      },
      wheels: {
        backgroundColor: isDark ? "rgba(14,165,233,0.16)" : "#E0F2FE",
        color: isDark ? "#7DD3FC" : "#075985",
      },
      interior: {
        backgroundColor: isDark ? "rgba(148,163,184,0.16)" : "#F5F5F5",
        color: isDark ? "#CBD5E1" : "#374151",
      },
    }),
    [isDark]
  );
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const location = useLocation();
  const inboundState = location?.state;

  const [form, setForm] = useState(INITIAL_FORM);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const visibleSteps = useMemo(() => {
    return WIZARD_STEPS.filter((step) => {
      if (step.id === "preOwned") {
        return form.isUsed; // only show when pre-owned
      }
      if (step.id === "bev") {
        return form.powertrainType === "BEV"; // only for BEVs
      }
      if (step.id === "warranty") {
        return form.hasWarranty; // only if seller offers warranty
      }
      return true;
    });
  }, [form]);

  const activeStep = visibleSteps[currentIndex] || visibleSteps[0];
  const initialStepJumped = useRef(false);

  useEffect(() => {
    if (initialStepJumped.current) return;
    if (inboundState?.intent === "restock") {
      const inventoryIndex = visibleSteps.findIndex((step) => step.id === "inventory");
      if (inventoryIndex >= 0) {
        setCurrentIndex(inventoryIndex);
      }
    }
    initialStepJumped.current = true;
  }, [visibleSteps, inboundState?.intent]);

  const handleFieldChange = (field) => (event) => {
    const value =
      event.target.type === "checkbox" ? event.target.checked : event.target.value;

    // When the base retail price changes, mirror it to all variant retail prices (non-wholesale).
    if (field === "price") {
      setForm((prev) => {
        const variants = prev.enableWholesale
          ? prev.variants
          : prev.variants.map((v) => ({ ...v, price: value }));
        return { ...prev, price: value, variants };
      });
      return;
    }

    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleExtrasChange = (name) => (event) => {
    const checked = event.target.checked;
    setForm((prev) => ({
      ...prev,
      extras: {
        ...prev.extras,
        [name]: checked,
      },
    }));
  };

  const handleDeliveryRegionChange = (name) => (event) => {
    const checked = event.target.checked;
    setForm((prev) => ({
      ...prev,
      deliveryRegions: {
        ...prev.deliveryRegions,
        [name]: checked,
      },
    }));
  };

  const handleVariantFieldChange = (index, field) => (event) => {
    const value = event.target.value;
    setForm((prev) => {
      const variants = prev.variants.map((v, i) =>
        i === index ? { ...v, [field]: value } : v
      );
      return { ...prev, variants };
    });
  };

  // Per-variant wholesale tiers
  const handleVariantWholesaleTierChange =
    (variantIndex, tierIndex, field) => (event) => {
      const value = event.target.value;
      setForm((prev) => {
        const variants = prev.variants.map((v, i) => {
          if (i !== variantIndex) return v;
          const tiers = (v.wholesaleTiers || []).map((t, ti) => {
            if (ti !== tierIndex) return t;
            if (isTierMarkedFinal(t) && field === "maxQty") return t;
            return { ...t, [field]: value };
          });
          return { ...v, wholesaleTiers: tiers };
        });
        return { ...prev, variants };
      });
    };

  const handleToggleVariantFinalTier = (variantIndex, tierIndex) => (event) => {
    const checked = event.target.checked;
    setForm((prev) => {
      const variants = prev.variants.map((v, i) => {
        if (i !== variantIndex) return v;
        const tiers = (v.wholesaleTiers || []).map((t, ti) => {
          if (ti === tierIndex) {
            return {
              ...t,
              isFinal: checked,
              maxQty: checked ? OPEN_ENDED_LABEL : "",
            };
          }
          if (checked) {
            // Only one tier can be the open-ended final tier.
            const wasFinal = isTierMarkedFinal(t);
            return {
              ...t,
              isFinal: false,
              maxQty: wasFinal ? "" : t.maxQty,
            };
          }
          return t;
        });
        const cappedTiers = checked ? tiers.slice(0, tierIndex + 1) : tiers;
        return { ...v, wholesaleTiers: cappedTiers };
      });
      return { ...prev, variants };
    });
  };

  const handleAddVariantWholesaleTier = (variantIndex) => () => {
    setForm((prev) => {
      const variants = prev.variants.map((v, i) => {
        if (i !== variantIndex) return v;
        const tiers = v.wholesaleTiers || [];
        if (tiers.length >= MAX_WHOLESALE_TIERS) return v;
        if (tiers.some((t) => isTierMarkedFinal(t))) return v;
        const nextIndex = tiers.length + 1;
        const last = tiers[tiers.length - 1];
        const lastMax = parseNum(last?.maxQty);
        const lastMin = parseNum(last?.minQty);
        const lastCeiling = lastMax ?? lastMin;
        const suggestedMin =
          lastCeiling === null ? "" : String(Number(lastCeiling) + 1);
        return {
          ...v,
          wholesaleTiers: [
            ...tiers,
            {
              id: `${v.id}-t${nextIndex}`,
              minQty: suggestedMin,
              maxQty: "",
              price: "",
              isFinal: false,
            },
          ],
        };
      });
      return { ...prev, variants };
    });
  };

  const handleRemoveVariantWholesaleTier = (variantIndex) => () => {
    setForm((prev) => {
      const variants = prev.variants.map((v, i) => {
        if (i !== variantIndex) return v;
        if (!v.wholesaleTiers || v.wholesaleTiers.length <= 1) return v;
        return {
          ...v,
          wholesaleTiers: v.wholesaleTiers.slice(0, -1),
        };
      });
      return { ...prev, variants };
    });
  };

  // Markets selection handlers
  const handleMarketAllChange = (event) => {
    const checked = event.target.checked;
    setForm((prev) => ({
      ...prev,
      markets: {
        allActive: checked,
        selectedIds: checked ? MOCK_SELLER_MARKETS.map((m) => m.id) : [],
      },
    }));
  };

const handleMarketToggle = (id) => (event) => {
    const checked = event.target.checked;
    setForm((prev) => {
      const currentSelected = new Set(prev.markets.selectedIds);
      if (checked) {
        currentSelected.add(id);
      } else {
        currentSelected.delete(id);
      }
      const allActive =
        currentSelected.size === MOCK_SELLER_MARKETS.length &&
        MOCK_SELLER_MARKETS.every((m) => currentSelected.has(m.id));
      return {
        ...prev,
        markets: {
          allActive,
          selectedIds: Array.from(currentSelected),
        },
      };
    });
};

  const handleNext = () => {
    if (currentIndex < visibleSteps.length - 1) {
      setCurrentIndex((idx) => idx + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((idx) => idx - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSaveDraft = () => {
    setSavingDraft(true);
    setTimeout(() => {
      setSavingDraft(false);
      alert(t("Your listing has been saved as a draft. You can come back later."));
    }, 900);
  };

  const handleSubmit = () => {
    setSubmitting(true);
    navigate("/listings/AwaitingApproval_ProductListing", { state: inboundState });
  };

  const isLastStep = currentIndex === visibleSteps.length - 1;

  // Simple per-step validation
  const isCurrentStepValid = useMemo(() => {
    const step = activeStep;
    if (!step) return true;

    const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;

    switch (step.id) {
      case "core":
        return nonEmpty(form.title) && nonEmpty(form.brand) && nonEmpty(form.model);
      case "preOwned":
        if (!form.isUsed) return true;
        return nonEmpty(form.mileage);
      case "bev":
        if (form.powertrainType !== "BEV") return true;
        return nonEmpty(form.batteryCapacity) && nonEmpty(form.range);
      case "gallery":
        return !!form.heroImageUploaded;
      case "pricing": {
        if (!form.enableWholesale) {
          return form.variants.every((v) => nonEmpty(v.price));
        }
        // For wholesale: each variant needs at least one completed tier.
        return form.variants.every((v) => {
          const tiers = v.wholesaleTiers || [];
          const used = tiers.filter(
            (t) => nonEmpty(t.minQty) || nonEmpty(t.maxQty) || nonEmpty(t.price)
          );
          if (!used.length) return false;
          return used.every(
            (t) => nonEmpty(t.minQty) && nonEmpty(t.maxQty) && nonEmpty(t.price)
          );
        });
      }
      case "warranty":
        if (!form.hasWarranty) return true;
        return nonEmpty(form.warrantyMonths);
      case "inventory":
        return form.variants.every((v) => nonEmpty(v.stockQty));
      case "delivery": {
        const anyMode = form.allowPickup || form.allowDelivery;
        const anyRegion = Object.values(form.deliveryRegions).some(Boolean);
        const anyMarket = form.markets.selectedIds.length > 0;
        return anyMode && anyRegion && anyMarket;
      }
      case "seo":
        return nonEmpty(form.seoTitle) && nonEmpty(form.seoDescription);
      default:
        return true;
    }
  }, [activeStep, form]);

  const canGoNext = isCurrentStepValid && !submitting;

  return (
    <Box
      className="flex flex-col h-screen"
    >
      {/* Page hero */}
      <Box
        component="section"
        className="w-full max-w-none px-[0.55%]"
        sx={{
          background: HERO_SURFACE,
          borderRadius: 3,
          border: `1px solid ${EV_COLORS.border}`,
          boxShadow: "0 36px 90px -45px rgba(15, 23, 42, 0.8)",
          mb: 3,
        }}
      >
        <Box
          className="flex flex-wrap items-start justify-between gap-4"
          sx={{ py: { xs: 3.5, md: 4 }, px: { xs: 3, md: 4 } }}
        >
          <Box className="flex items-start gap-3">
            <Box>
              <Typography
                component="h1"
                variant="h4"
                className="page-hero-title font-semibold tracking-tight"
                sx={{ color: EV_COLORS.textMain }}
              >
                {t("List your product")}
              </Typography>
              <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle, mt: 0.5 }}>
                {t("Fill in the sections below. You can save as draft at any time.")}
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1} className="items-center">
            <Button
              size="small"
              variant="outlined"
              startIcon={<IconSave />}
              onClick={handleSaveDraft}
              disabled={savingDraft || submitting}
              sx={{
                borderRadius: 999,
                textTransform: "none",
                borderColor: EV_COLORS.border,
                color: EV_COLORS.textMain,
                "&:hover": {
                  borderColor: EV_COLORS.primary,
                  backgroundColor: EV_COLORS.primarySoft,
                },
              }}
            >
              {savingDraft ? t("Saving…") : t("Save draft")}
            </Button>
          </Stack>
        </Box>
      </Box>

      {submitting && <LinearProgress sx={{ bgcolor: EV_COLORS.surfaceAlt }} />}

      {/* Main layout */}
      <Box className="flex-1 flex flex-col overflow-hidden">
        <Box
          className="w-full px-[0.55%] py-4 md:py-6 flex-1 flex flex-col gap-4 overflow-y-auto"
        >
          {/* Breadcrumbs */}
          <Box className="flex items-center justify-between flex-wrap gap-3">
            <Breadcrumbs
              aria-label={t("seller wizard breadcrumb")}
              sx={{ color: EV_COLORS.textMuted }}
            >
              <MUILink
                underline="hover"
                color="inherit"
                className="cursor-pointer"
                sx={{
                  color: EV_COLORS.textSubtle,
                  "&:hover": { color: EV_COLORS.primaryStrong },
                }}
              >
                {t("Seller")}
              </MUILink>
              <Typography sx={{ color: EV_COLORS.textMuted }}>
                {t("Product listing")}
              </Typography>
              <Typography
                className="font-medium"
                sx={{ color: EV_COLORS.textMain }}
              >
                {t("Wizard")}
              </Typography>
            </Breadcrumbs>

            <Chip
              size="small"
              label={t("Step {current} of {total}", {
                current: currentIndex + 1,
                total: visibleSteps.length,
              })}
              sx={{
                backgroundColor: EV_COLORS.surfaceAlt,
                color: EV_COLORS.textSubtle,
                borderColor: EV_COLORS.border,
                borderWidth: 1,
              }}
              variant="outlined"
            />
          </Box>

          {/* Stepper */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: `1px solid ${EV_COLORS.border}`,
              backgroundColor: EV_COLORS.surface,
              p: 2,
            }}
          >
            <Stepper
              activeStep={currentIndex}
              alternativeLabel={!isMobile}
              orientation={isMobile ? "vertical" : "horizontal"}
            >
              {visibleSteps.map((step) => (
                <Step key={step.id}>
                  <StepLabel>{t(step.label)}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>

          {/* Active step content */}
          {activeStep && (
            <Paper
              elevation={0}
              sx={{
                borderRadius: 2,
                border: `1px solid ${EV_COLORS.border}`,
                backgroundColor: EV_COLORS.surface,
                p: 3,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ color: EV_COLORS.textMain, fontWeight: 600, mb: 1 }}
              >
                {t(activeStep.label)}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: EV_COLORS.textSubtle, mb: 2 }}
              >
                {activeStep.id === "core" &&
                  t("Tell buyers the basics about this vehicle so they immediately understand what you are selling.")}
                {activeStep.id === "preOwned" &&
                  t("Because this is a pre-owned vehicle, we will ask a few questions about its history.")}
                {activeStep.id === "bev" &&
                  t("Since you selected BEV as the powertrain, we will capture key battery and charging data.")}
                {activeStep.id === "extras" &&
                  t("Highlight any extras or accessories you are including to make your offer stand out.")}
                {activeStep.id === "gallery" &&
                  t("Upload clear photos – listings with good images get more views and better conversions.")}
                {activeStep.id === "pricing" &&
                  t("Review pricing for each variant and configure optional wholesale tiers for bulk buyers. You can also refine color, trim, battery pack and more.")}
                {activeStep.id === "warranty" &&
                  t("Describe the warranty you offer so buyers know how they are protected.")}
                {activeStep.id === "inventory" &&
                  t("Tell us how many units of each variant you have and their SKUs.")}
                {activeStep.id === "delivery" &&
                  t("Choose which markets you plan to sell to, then configure how you deliver in each region.")}
                {activeStep.id === "seo" &&
                  t("Help buyers find your product in EVzone search by writing a clear title and description.")}
              </Typography>

              {/* Step-specific fields */}
              {activeStep.id === "core" && (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <TextField
                    label={t("Listing title")}
                    fullWidth
                    size="small"
                    value={form.title}
                    onChange={handleFieldChange("title")}
                  />
                  <TextField
                    label={t("Brand")}
                    fullWidth
                    size="small"
                    value={form.brand}
                    onChange={handleFieldChange("brand")}
                  />
                  <TextField
                    label={t("Model")}
                    fullWidth
                    size="small"
                    value={form.model}
                    onChange={handleFieldChange("model")}
                  />
                  <TextField
                    label={t("Body type")}
                    fullWidth
                    size="small"
                    placeholder={t("e.g. Sedan, SUV, Hatchback")}
                    value={form.bodyType}
                    onChange={handleFieldChange("bodyType")}
                  />
                  <TextField
                    label={t("Key selling point")}
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    placeholder={t("What makes this vehicle special?")}
                    value={form.keySellingPoint}
                    onChange={handleFieldChange("keySellingPoint")}
                    sx={{ gridColumn: { xs: "1 / -1", md: "1 / -1" } }}
                  />

                  <FormControl
                    component="fieldset"
                    sx={{
                      gridColumn: { xs: "1 / -1", md: "1 / -1" },
                    }}
                  >
                    <FormLabel component="legend" sx={{ fontSize: 12 }}>
                      {t("Powertrain type")}
                    </FormLabel>
                    <RadioGroup
                      row
                      value={form.powertrainType}
                      onChange={handleFieldChange("powertrainType")}
                      sx={{ columnGap: 2, flexWrap: "wrap" }}
                    >
                      <FormControlLabel
                        value="BEV"
                        control={<Radio size="small" />}
                        label={t("BEV")}
                      />
                      <FormControlLabel
                        value="PHEV"
                        control={<Radio size="small" />}
                        label={t("PHEV")}
                      />
                      <FormControlLabel
                        value="OTHER"
                        control={<Radio size="small" />}
                        label={t("Other")}
                      />
                    </RadioGroup>
                  </FormControl>
                </Box>
              )}

              {activeStep.id === "preOwned" && (
                <Box className="space-y-2">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.isUsed}
                        onChange={handleFieldChange("isUsed")}
                        color="primary"
                      />
                    }
                    label={t("This is a pre-owned vehicle")}
                  />
                  {form.isUsed && (
                    <Box className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <TextField
                        label={t("Mileage (km)")}
                        fullWidth
                        size="small"
                        value={form.mileage}
                        onChange={handleFieldChange("mileage")}
                      />
                      <TextField
                        label={t("Number of previous owners")}
                        fullWidth
                        size="small"
                        value={form.owners}
                        onChange={handleFieldChange("owners")}
                      />
                      <TextField
                        label={t("Service history summary")}
                        fullWidth
                        size="small"
                        value={form.serviceHistory}
                        onChange={handleFieldChange("serviceHistory")}
                      />
                    </Box>
                  )}
                </Box>
              )}

              {activeStep.id === "bev" && (
                <Box className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TextField
                    label={t("Battery capacity (kWh)")}
                    fullWidth
                    size="small"
                    value={form.batteryCapacity}
                    onChange={handleFieldChange("batteryCapacity")}
                  />
                  <TextField
                    label={t("Range (km)")}
                    fullWidth
                    size="small"
                    value={form.range}
                    onChange={handleFieldChange("range")}
                  />
                  <TextField
                    label={t("Connector type")}
                    fullWidth
                    size="small"
                    placeholder={t("e.g. CCS2, Type 2")}
                    value={form.connectorType}
                    onChange={handleFieldChange("connectorType")}
                  />
                  <TextField
                    label={t("Number of charging ports")}
                    fullWidth
                    size="small"
                    value={form.numPorts}
                    onChange={handleFieldChange("numPorts")}
                  />
                </Box>
              )}

              {activeStep.id === "extras" && (
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.extras.fastCharger}
                        onChange={handleExtrasChange("fastCharger")}
                      />
                    }
                    label={t("Fast charger included")}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.extras.floorMats}
                        onChange={handleExtrasChange("floorMats")}
                      />
                    }
                    label={t("Floor mats included")}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.extras.roofRack}
                        onChange={handleExtrasChange("roofRack")}
                      />
                    }
                    label={t("Roof rack included")}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.extras.extendedWarranty}
                        onChange={handleExtrasChange("extendedWarranty")}
                      />
                    }
                    label={t("Extended warranty available as extra")}
                  />
                </FormGroup>
              )}

              {activeStep.id === "gallery" && (
                <Box className="space-y-2">
                  <Typography
                    variant="body2"
                    sx={{ color: EV_COLORS.textSubtle }}
                  >
                    {t("In the full app, you will upload images here. For now, we just capture whether your hero image is ready.")}
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.heroImageUploaded}
                        onChange={handleFieldChange("heroImageUploaded")}
                      />
                    }
                    label={t("I have uploaded at least one hero image")}
                  />
                </Box>
              )}

              {activeStep.id === "pricing" && (
                <Box className="space-y-3">
                  <Box className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <TextField
                      label={t("Currency")}
                      fullWidth
                      size="small"
                      value={form.currency}
                      onChange={handleFieldChange("currency")}
                    />
                    <TextField
                      label={t("Base retail price (optional)")}
                      fullWidth
                      size="small"
                      helperText={
                        form.enableWholesale
                          ? t("Disabled while wholesale pricing is on.")
                          : t("Applies this retail price to all variants by default.")
                      }
                      disabled={form.enableWholesale}
                      value={form.price}
                      onChange={handleFieldChange("price")}
                    />
                  </Box>

                  {/* Variant attribute + pricing cards */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                        lg: "repeat(3, minmax(0, 1fr))",
                      },
                      gap: 2,
                      pb: 1,
                    }}
                  >
                    {form.variants.map((variant, index) => (
                      <Paper
                        key={variant.id}
                        elevation={0}
                        sx={{
                          borderRadius: 2,
                          border: `1px solid ${EV_COLORS.border}`,
                          backgroundColor: EV_COLORS.surfaceAlt,
                          p: 2.5,
                          display: "flex",
                          flexDirection: "column",
                          gap: 1.25,
                          boxShadow:
                            "0 10px 25px rgba(15, 23, 42, 0.06)",
                        }}
                      >
                        {/* Image & variant header */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: 72,
                              height: 72,
                              borderRadius: 2,
                              border: `1px solid ${EV_COLORS.border}`,
                              background: variantImageBg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              color: EV_COLORS.textMuted,
                            }}
                          >
                            {t("Variant image")}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                color: EV_COLORS.textMain,
                                fontWeight: 600,
                                mb: 0.25,
                              }}
                            >
                              {variant.name ? t(variant.name) : t("Variant")}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: EV_COLORS.textSubtle,
                                display: "block",
                              }}
                            >
                              {variant.description ? t(variant.description) : ""}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Attribute chips */}
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {variant.color && (
                            <Chip
                              size="small"
                              label={t("Color: {value}", { value: t(variant.color) })}
                              sx={attributeChipStyles.color}
                            />
                          )}
                          {variant.trim && (
                            <Chip
                              size="small"
                              label={t("Trim: {value}", { value: t(variant.trim) })}
                              sx={attributeChipStyles.trim}
                            />
                          )}
                          {variant.batteryPack && (
                            <Chip
                              size="small"
                              label={t("Battery: {value}", { value: t(variant.batteryPack) })}
                              sx={attributeChipStyles.battery}
                            />
                          )}
                          {variant.wheelSize && (
                            <Chip
                              size="small"
                              label={t("Wheels: {value}", { value: t(variant.wheelSize) })}
                              sx={attributeChipStyles.wheels}
                            />
                          )}
                          {variant.interiorColor && (
                            <Chip
                              size="small"
                              label={t("Interior: {value}", { value: t(variant.interiorColor) })}
                              sx={attributeChipStyles.interior}
                            />
                          )}
                        </Stack>

                        {/* Attribute editors */}
                        <TextField
                          select
                          label={t("Color")}
                          size="small"
                          fullWidth
                          value={variant.color || ""}
                          onChange={handleVariantFieldChange(index, "color")}
                        >
                          {AVAILABLE_COLORS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.label}>
                              {t(opt.label)}
                            </MenuItem>
                          ))}
                        </TextField>

                        <TextField
                          select
                          label={t("Trim")}
                          size="small"
                          fullWidth
                          value={variant.trim || ""}
                          onChange={handleVariantFieldChange(index, "trim")}
                        >
                          {AVAILABLE_TRIMS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.label}>
                              {t(opt.label)}
                            </MenuItem>
                          ))}
                        </TextField>

                        <TextField
                          select
                          label={t("Battery pack")}
                          size="small"
                          fullWidth
                          value={variant.batteryPack || ""}
                          onChange={handleVariantFieldChange(
                            index,
                            "batteryPack"
                          )}
                        >
                          {AVAILABLE_BATTERIES.map((opt) => (
                            <MenuItem key={opt.value} value={opt.label}>
                              {t(opt.label)}
                            </MenuItem>
                          ))}
                        </TextField>

                        <TextField
                          select
                          label={t("Wheel size")}
                          size="small"
                          fullWidth
                          value={variant.wheelSize || ""}
                          onChange={handleVariantFieldChange(
                            index,
                            "wheelSize"
                          )}
                        >
                          {AVAILABLE_WHEEL_SIZES.map((opt) => (
                            <MenuItem key={opt.value} value={opt.label}>
                              {t(opt.label)}
                            </MenuItem>
                          ))}
                        </TextField>

                        <TextField
                          select
                          label={t("Interior color")}
                          size="small"
                          fullWidth
                          value={variant.interiorColor || ""}
                          onChange={handleVariantFieldChange(
                            index,
                            "interiorColor"
                          )}
                        >
                          {AVAILABLE_INTERIOR_COLORS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.label}>
                              {t(opt.label)}
                            </MenuItem>
                          ))}
                        </TextField>

                        <TextField
                          label={t("Short description")}
                          size="small"
                          fullWidth
                          multiline
                          minRows={2}
                          placeholder={t("e.g. Long range, premium interior")}
                          value={variant.description || ""}
                          onChange={handleVariantFieldChange(
                            index,
                            "description"
                          )}
                        />
                        <TextField
                          label={t("Specs (for card)")}
                          size="small"
                          fullWidth
                          placeholder={t("e.g. 450 km range · Dual motor")}
                          value={variant.specs || ""}
                          onChange={handleVariantFieldChange(index, "specs")}
                        />

                        {/* Price + optional warranty per variant */}
                        <TextField
                          label={t("Retail price")}
                          fullWidth
                          size="small"
                          disabled={form.enableWholesale}
                          helperText={
                            form.enableWholesale
                              ? t("Set prices via wholesale tiers.")
                              : t("Mirrors the base retail price; adjust if needed.")
                          }
                          value={variant.price}
                          onChange={handleVariantFieldChange(index, "price")}
                        />
                        {form.hasWarranty && (
                          <TextField
                            label={t("Applicable warranty (months)")}
                            fullWidth
                            size="small"
                            sx={{ mt: 1 }}
                            value={variant.warrantyMonths}
                            onChange={handleVariantFieldChange(
                              index,
                              "warrantyMonths"
                            )}
                          />
                        )}

                        {/* Per-variant wholesale tiers */}
                        {form.enableWholesale &&
                          (() => {
                            const wholesaleTiers = variant.wholesaleTiers || [];
                            const hasFinalTier = wholesaleTiers.some(
                              (t) => isTierMarkedFinal(t)
                            );
                            return (
                              <Box sx={{ mt: 1.5 }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: EV_COLORS.textMuted,
                                    display: "block",
                                    mb: 0.5,
                                  }}
                                >
                                  {t("Wholesale tiers for this variant")}
                                </Typography>
                                {wholesaleTiers.map((tier, tierIndex) => {
                                  const prev = wholesaleTiers[tierIndex - 1];
                                  const prevMax = parseNum(
                                    prev?.maxQty ?? prev?.minQty
                                  );
                                  const minNum = parseNum(tier.minQty);
                                  const maxNum = parseNum(tier.maxQty);
                                  const tierIsFinal = isTierMarkedFinal(tier);
                                  const minError =
                                    prevMax !== null &&
                                    minNum !== null &&
                                    minNum <= prevMax;
                                  const maxError =
                                    !tierIsFinal &&
                                    minNum !== null &&
                                    maxNum !== null &&
                                    maxNum < minNum;
                                  const maxLabel = t("Tier {index} max qty", { index: tierIndex + 1 }) + (tierIsFinal ? ` ${t("(and above)")}` : "");
                                  return (
                                    <Box
                                      key={tier.id}
                                      className="grid grid-cols-1 gap-1 mb-2"
                                    >
                                      <TextField
                                        label={t("Tier {index} min qty", { index: tierIndex + 1 })}
                                        fullWidth
                                        size="small"
                                        value={tier.minQty}
                                        error={!!minError}
                                        helperText={
                                          minError
                                            ? t("Must be greater than previous max ({value})", { value: prevMax })
                                            : ""
                                        }
                                        onChange={handleVariantWholesaleTierChange(
                                          index,
                                          tierIndex,
                                          "minQty"
                                        )}
                                      />
                                      <TextField
                                        label={maxLabel}
                                        fullWidth
                                        size="small"
                                        value={
                                          tierIsFinal
                                            ? t(OPEN_ENDED_LABEL)
                                            : tier.maxQty
                                        }
                                        disabled={tierIsFinal}
                                        error={!!maxError}
                                        helperText={
                                          maxError
                                            ? t("Max must be at least the min")
                                            : ""
                                        }
                                        onChange={handleVariantWholesaleTierChange(
                                          index,
                                          tierIndex,
                                          "maxQty"
                                        )}
                                      />
                                      <TextField
                                        label={t("Tier {index} price", { index: tierIndex + 1 })}
                                        fullWidth
                                        size="small"
                                        value={tier.price}
                                        onChange={handleVariantWholesaleTierChange(
                                          index,
                                          tierIndex,
                                          "price"
                                        )}
                                      />
                                      <FormControlLabel
                                        control={
                                          <Switch
                                            checked={tierIsFinal}
                                            onChange={handleToggleVariantFinalTier(
                                              index,
                                              tierIndex
                                            )}
                                            color="primary"
                                          />
                                        }
                                        sx={{ alignItems: "flex-start", mt: 0.5 }}
                                        label={
                                          <Box sx={{ lineHeight: 1.25 }}>
                                            <Typography
                                              variant="body2"
                                              sx={{ fontWeight: 600 }}
                                            >
                                              {t('Mark this tier as "and above" (final tier)')}
                                            </Typography>
                                            <Typography
                                              variant="caption"
                                              sx={{
                                                color: EV_COLORS.textMuted,
                                                display: "block",
                                              }}
                                            >
                                              {t("Once marked as 'and above', you cannot add more tiers after this one.")}
                                            </Typography>
                                          </Box>
                                        }
                                      />
                                    </Box>
                                  );
                                })}
                                <Stack direction="row" spacing={1}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={handleAddVariantWholesaleTier(index)}
                                    disabled={
                                      hasFinalTier ||
                                      wholesaleTiers.length >= MAX_WHOLESALE_TIERS
                                    }
                                    sx={{
                                      borderRadius: 999,
                                      textTransform: "none",
                                      borderColor: EV_COLORS.border,
                                      color: EV_COLORS.textSubtle,
                                      "&:hover": {
                                        borderColor: EV_COLORS.primary,
                                        backgroundColor: EV_COLORS.primarySoft,
                                      },
                                    }}
                                  >
                                    {t("+ Add tier")}
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={handleRemoveVariantWholesaleTier(
                                      index
                                    )}
                                    disabled={wholesaleTiers.length <= 1}
                                    sx={{
                                      borderRadius: 999,
                                      textTransform: "none",
                                      borderColor: EV_COLORS.border,
                                      color: EV_COLORS.textSubtle,
                                      "&:hover": {
                                        borderColor: EV_COLORS.primary,
                                        backgroundColor: EV_COLORS.primarySoft,
                                      },
                                    }}
                                  >
                                    {t("Remove last")}
                                  </Button>
                                </Stack>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: EV_COLORS.textMuted,
                                    display: "block",
                                    mt: 0.5,
                                  }}
                                >
                                  {t("Maximum of {count} tiers per variant.", { count: MAX_WHOLESALE_TIERS })}
                                </Typography>
                              </Box>
                            );
                          })()}
                      </Paper>
                    ))}
                  </Box>

                  {/* Global wholesale toggle */}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.enableWholesale}
                        onChange={handleFieldChange("enableWholesale")}
                        color="primary"
                      />
                    }
                    label={t("Enable wholesale pricing (tiers) per variant")}
                  />
                </Box>
              )}

              {activeStep.id === "warranty" && (
                <Box className="space-y-2">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.hasWarranty}
                        onChange={handleFieldChange("hasWarranty")}
                        color="primary"
                      />
                    }
                    label={t("I offer warranty on this vehicle")}
                  />
                  {form.hasWarranty && (
                    <Box className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <TextField
                        label={t("Warranty period (months)")}
                        fullWidth
                        size="small"
                        value={form.warrantyMonths}
                        onChange={handleFieldChange("warrantyMonths")}
                      />
                      <TextField
                        label={t("Warranty details")}
                        fullWidth
                        size="small"
                        multiline
                        minRows={2}
                        value={form.warrantyDetails}
                        onChange={handleFieldChange("warrantyDetails")}
                      />
                    </Box>
                  )}
                </Box>
              )}

              {activeStep.id === "inventory" && (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                      lg: "repeat(3, minmax(0, 1fr))",
                    },
                    gap: 2,
                    pb: 1,
                  }}
                >
                  {form.variants.map((variant, index) => (
                    <Paper
                      key={variant.id}
                      elevation={0}
                      sx={{
                        borderRadius: 2,
                        border: `1px solid ${EV_COLORS.border}`,
                        backgroundColor: EV_COLORS.surfaceAlt,
                        p: 2.5,
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.25,
                        boxShadow: "0 10px 25px rgba(15, 23, 42, 0.06)",
                      }}
                    >
                      {/* Image & header */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                        }}
                      >
                        <Box
                          sx={{
                            width: 72,
                            height: 72,
                            borderRadius: 2,
                            border: `1px solid ${EV_COLORS.border}`,
                            background: variantImageBg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            color: EV_COLORS.textMuted,
                          }}
                        >
                          {t("Variant image")}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              color: EV_COLORS.textMain,
                              fontWeight: 600,
                              mb: 0.25,
                            }}
                          >
                            {variant.name ? t(variant.name) : t("Variant")}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: EV_COLORS.textSubtle,
                              display: "block",
                            }}
                          >
                            {variant.description ? t(variant.description) : t("No description yet")}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Attribute chips */}
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {variant.color && (
                          <Chip
                            size="small"
                            label={t("Color: {value}", { value: t(variant.color) })}
                            sx={attributeChipStyles.color}
                          />
                        )}
                        {variant.trim && (
                          <Chip
                            size="small"
                            label={t("Trim: {value}", { value: t(variant.trim) })}
                            sx={attributeChipStyles.trim}
                          />
                        )}
                        {variant.batteryPack && (
                          <Chip
                            size="small"
                            label={t("Battery: {value}", { value: t(variant.batteryPack) })}
                            sx={attributeChipStyles.battery}
                          />
                        )}
                        {variant.wheelSize && (
                          <Chip
                            size="small"
                            label={t("Wheels: {value}", { value: t(variant.wheelSize) })}
                            sx={attributeChipStyles.wheels}
                          />
                        )}
                        {variant.interiorColor && (
                          <Chip
                            size="small"
                            label={t("Interior: {value}", { value: t(variant.interiorColor) })}
                            sx={attributeChipStyles.interior}
                          />
                        )}
                      </Stack>

                      {variant.specs && (
                        <Typography
                          variant="caption"
                          sx={{ color: EV_COLORS.textMuted, display: "block" }}
                        >
                          {t(variant.specs)}
                        </Typography>
                      )}

                      <TextField
                        label={t("Stock quantity")}
                        fullWidth
                        size="small"
                        value={variant.stockQty}
                        onChange={handleVariantFieldChange(index, "stockQty")}
                      />
                      <TextField
                        label={t("SKU / Product code")}
                        fullWidth
                        size="small"
                        value={variant.sku}
                        onChange={handleVariantFieldChange(index, "sku")}
                      />
                    </Paper>
                  ))}
                </Box>
              )}

              {activeStep.id === "delivery" && (
                <Box className="space-y-3">
                  {/* Markets selection */}
                  <Box className="space-y-1">
                    <Typography
                      variant="subtitle2"
                      sx={{ color: EV_COLORS.textMain, fontWeight: 600 }}
                    >
                      {t("Which markets do you plan to sell to?")}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: EV_COLORS.textMuted, display: "block" }}
                    >
                      {t("These are the markets you have enabled in your store settings. If a market you want is missing, please add it in your Profile & Storefront settings, then return here.")}
                    </Typography>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={form.markets.allActive}
                            onChange={handleMarketAllChange}
                          />
                        }
                        label={t("All my active markets")}
                      />
                      <Box className="pl-4">
                        {MOCK_SELLER_MARKETS.map((m) => (
                          <FormControlLabel
                            key={m.id}
                            control={
                              <Checkbox
                                checked={form.markets.selectedIds.includes(m.id)}
                                onChange={handleMarketToggle(m.id)}
                              />
                            }
                            label={t(m.name)}
                          />
                        ))}
                      </Box>
                    </FormGroup>
                  </Box>

                  {/* Delivery modes */}
                  <FormGroup row>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.allowPickup}
                          onChange={handleFieldChange("allowPickup")}
                        />
                      }
                      label={t("Customer can pick up")}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.allowDelivery}
                          onChange={handleFieldChange("allowDelivery")}
                        />
                      }
                      label={t("I can deliver to buyer")}
                    />
                  </FormGroup>

                  {/* Regions */}
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: EV_COLORS.textMuted, display: "block", mb: 0.5 }}
                    >
                      {t("Delivery regions")}
                    </Typography>
                    <FormGroup row>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={form.deliveryRegions.local}
                            onChange={handleDeliveryRegionChange("local")}
                          />
                        }
                        label={t("Local city")}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={form.deliveryRegions.upcountry}
                            onChange={handleDeliveryRegionChange("upcountry")}
                          />
                        }
                        label={t("Upcountry")}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={form.deliveryRegions.crossBorder}
                            onChange={handleDeliveryRegionChange("crossBorder")}
                          />
                        }
                        label={t("Cross-border")}
                      />
                    </FormGroup>
                    {form.deliveryRegions.crossBorder && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={form.deliverToBuyerWarehouse}
                            onChange={handleFieldChange("deliverToBuyerWarehouse")}
                          />
                        }
                        label={t("Deliver to buyer's selected warehouse in your country")}
                      />
                    )}
                  </Box>
                </Box>
              )}

              {activeStep.id === "seo" && (
                <Box className="space-y-2">
                  <TextField
                    label={t("Title buyers see in search")}
                    fullWidth
                    size="small"
                    value={form.seoTitle}
                    onChange={handleFieldChange("seoTitle")}
                    placeholder={t("Example: 2024 Long Range Electric SUV – Black, 450 km range")}
                  />
                  <TextField
                    label={t("Short description for search results")}
                    fullWidth
                    size="small"
                    multiline
                    minRows={3}
                    value={form.seoDescription}
                    onChange={handleFieldChange("seoDescription")}
                    placeholder={t("Explain in 1–2 sentences why this product is a good choice for your buyers.")}
                  />
                  <TextField
                    label={t("Who is this product for? (optional)")}
                    fullWidth
                    size="small"
                    value={form.seoAudience}
                    onChange={handleFieldChange("seoAudience")}
                    placeholder={t("e.g. Taxi operators in Kampala, corporate fleets, family buyers")}
                  />
                  <TextField
                    label={t("Important words buyers might type when searching (optional)")}
                    fullWidth
                    size="small"
                    value={form.seoKeywords}
                    onChange={handleFieldChange("seoKeywords")}
                    placeholder={t("e.g. electric SUV, long range car, Kampala, 450 km, family car")}
                  />
                </Box>
              )}
            </Paper>
          )}

          {/* Navigation controls */}
          <Box className="flex justify-between items-center mt-2 mb-4 gap-2 flex-wrap">
            <Button
              size="small"
              variant="outlined"
              startIcon={<IconBack />}
              onClick={handleBack}
              disabled={currentIndex === 0 || submitting}
              sx={{
                borderRadius: 999,
                textTransform: "none",
                borderColor: EV_COLORS.border,
                color: EV_COLORS.textMain,
                "&:hover": {
                  borderColor: EV_COLORS.primary,
                  backgroundColor: EV_COLORS.primarySoft,
                },
              }}
            >
              {t("Back")}
            </Button>

            <Stack direction="row" spacing={1} className="items-center">
              {!isLastStep && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleNext}
                  disabled={!canGoNext}
                  sx={{
                    borderRadius: 999,
                    textTransform: "none",
                    backgroundColor: EV_COLORS.primary,
                    color: "#FFFFFF",
                    px: 3,
                    "&:hover": {
                      backgroundColor: EV_COLORS.primaryStrong,
                    },
                  }}
                >
                  {t("Next")}
                </Button>
              )}
              {isLastStep && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<IconStart />}
                  onClick={handleSubmit}
                  disabled={!isCurrentStepValid || submitting}
                  sx={{
                    borderRadius: 999,
                    textTransform: "none",
                    backgroundColor: EV_COLORS.primary,
                    color: "#FFFFFF",
                    px: 3,
                    "&:hover": {
                      backgroundColor: EV_COLORS.primaryStrong,
                    },
                  }}
                >
                  {t("Submit for approval")}
                </Button>
              )}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default SellerProductListingWizardPage;
