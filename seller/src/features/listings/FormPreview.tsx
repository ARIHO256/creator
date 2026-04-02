import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {

  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Breadcrumbs,
  Link as MUILink,
  Button,
  Chip,
  Stack,
  Paper,
  useTheme,
  useMediaQuery,
  Divider,
} from "@mui/material";
import { useLocalization } from "../../localization/LocalizationProvider";
import { sellerBackendApi } from "../../lib/backendApi";

void sellerBackendApi.getWorkflowScreenState("seller-feature:listings/FormPreview").catch(() => undefined);

// -----------------------------------------------------------------------------
// EVzone brand palette (light mode)
// -----------------------------------------------------------------------------
const EV_COLORS = {
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

const IconMenu = () => <IconShell>☰</IconShell>;
const IconStart = () => <IconShell>▶</IconShell>;
const IconStep = () => <IconShell>▢</IconShell>;
const IconPricing = () => <IconShell>₵</IconShell>;
const IconWarranty = () => <IconShell>✓</IconShell>;
const IconInventory = () => <IconShell>📦</IconShell>;
const IconMarketsDelivery = () => <IconShell>🌍</IconShell>;
const IconSeo = () => <IconShell>🔎</IconShell>;

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------
function SellerFormPreviewPage() {
  const { t } = useLocalization();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const location = useLocation();
  const wizardState = location?.state;
  const [tabs, setTabs] = useState([]);
  const [standardSteps, setStandardSteps] = useState([]);
  const [selectedTabId, setSelectedTabId] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    void sellerBackendApi
      .getSellerListingWizard()
      .then((payload) => {
        if (!active) return;
        const config =
          payload?.config && typeof payload.config === "object" && !Array.isArray(payload.config)
            ? payload.config
            : {};
        const steps = Array.isArray(config.steps) ? config.steps : [];
        const nextTabs = steps
          .filter((step) => String(step.type || "form") === "form")
          .map((step) => ({
            id: String(step.id || ""),
            label: String(step.label || step.id || "Step"),
            description: String(step.description || ""),
            requiredFields: Number(step.requiredFields ?? 0),
            optionalFields: Number(step.optionalFields ?? 0),
            conditionalSummary: typeof step.conditionalSummary === "string" ? step.conditionalSummary : undefined,
          }));
        const nextStandardSteps = steps
          .filter((step) => String(step.type || "form") !== "form")
          .map((step) => ({
            id: String(step.id || ""),
            label: String(step.label || step.id || "Step"),
            icon:
              step.id === "pricing"
                ? <IconPricing />
                : step.id === "warranty"
                  ? <IconWarranty />
                  : step.id === "inventory"
                    ? <IconInventory />
                    : step.id === "delivery"
                      ? <IconMarketsDelivery />
                      : <IconSeo />,
            description: String(step.description || ""),
          }));
        setTabs(nextTabs);
        setStandardSteps(nextStandardSteps);
        setSelectedTabId(nextTabs[0]?.id || "");
        setLoadError("");
      })
      .catch(() => {
        if (!active) return;
        setTabs([]);
        setStandardSteps([]);
        setSelectedTabId("");
        setLoadError("Listing form preview is unavailable because the backend did not return the wizard configuration.");
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedTab = tabs.find((t) => t.id === selectedTabId) || tabs[0];

  const handleStartListing = () => {
    navigate("/listings/wizard", { state: wizardState });
  };

  return (
    <Box
      className="flex flex-col h-screen"
      sx={{ backgroundColor: EV_COLORS.bg }}
    >
      {/* Top App Bar */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: EV_COLORS.surface,
          color: EV_COLORS.textMain,
          borderBottom: `1px solid ${EV_COLORS.border}`,
        }}
      >
        <Toolbar className="flex justify-between gap-4 px-4">
          <Box className="flex items-center gap-3">
            {isMobile && (
              <IconButton edge="start" color="inherit" aria-label={t("menu")}>
                <IconMenu />
              </IconButton>
            )}
            <Box className="flex flex-col">
              <Box className="flex items-center gap-2">
                <Box
                  component="img"
                  src="/logo2.jpeg"
                  alt={t("EVzone logo")}
                  sx={{
                    height: 32,
                    width: 32,
                    borderRadius: 1,
                    border: `1px solid ${EV_COLORS.border}`,
                    objectFit: "contain",
                  }}
                />
                <Typography
                  variant="h6"
                  className="font-semibold tracking-tight"
                  sx={{ color: EV_COLORS.textMain }}
                >
                  Preview your listing steps
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{ color: EV_COLORS.textSubtle }}
              >
                Step 2 of 2 – Review all questions and steps before you start
                filling them.
              </Typography>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main layout */}
      <Box className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Tabs overview */}
        <Box
          className="md:w-[320px] lg:w-[360px] border-b md:border-b-0 md:border-r"
          sx={{
            borderColor: EV_COLORS.border,
            backgroundColor: EV_COLORS.surface,
          }}
        >
          <Box className="flex flex-col h-full">
            {loadError ? (
              <Paper
                elevation={0}
                sx={{
                  m: 3,
                  mb: 0,
                  p: 2,
                  borderRadius: 3,
                  border: `1px solid ${EV_COLORS.border}`,
                  backgroundColor: EV_COLORS.accentSoft,
                  color: EV_COLORS.textMain,
                }}
              >
                <Typography sx={{ fontWeight: 800 }}>{t("Form preview unavailable")}</Typography>
                <Typography sx={{ mt: 0.5, color: EV_COLORS.textSubtle }}>{loadError}</Typography>
              </Paper>
            ) : null}
            <Box
              className="px-4 py-3 flex flex-col gap-2"
              sx={{ borderBottom: `1px solid ${EV_COLORS.border}` }}
            >
              <Typography
                variant="subtitle2"
                className="uppercase tracking-[0.2em] text-[11px]"
                sx={{ color: EV_COLORS.textMuted }}
              >
                Form steps
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: EV_COLORS.textSubtle }}
              >
                These are the sections you will complete for this product.
              </Typography>
            </Box>

            <Box className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {tabs.map((tab) => {
                const isActive = tab.id === selectedTabId;
                return (
                  <Paper
                    key={tab.id}
                    elevation={0}
                    onClick={() => setSelectedTabId(tab.id)}
                    sx={{
                      borderRadius: 2,
                      border: `1px solid ${
                        isActive ? EV_COLORS.primary : EV_COLORS.border
                      }`,
                      backgroundColor: isActive
                        ? EV_COLORS.primarySoft
                        : EV_COLORS.surface,
                      cursor: "pointer",
                      px: 2,
                      py: 1.5,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.5,
                      transition: "all 0.15s ease",
                      "&:hover": {
                        borderColor: EV_COLORS.primary,
                        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 28,
                        display: "flex",
                        justifyContent: "center",
                        pt: 0.3,
                        color: EV_COLORS.textMuted,
                      }}
                    >
                      <IconStep />
                    </Box>
                    <Box className="flex-1 min-w-0">
                      <Typography
                        variant="body2"
                        sx={{ color: EV_COLORS.textMain, fontWeight: 500 }}
                      >
                        {tab.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: EV_COLORS.textMuted, display: "block" }}
                      >
                        {tab.description}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: EV_COLORS.textMuted,
                          display: "block",
                          mt: 0.5,
                        }}
                      >
                        {tab.requiredFields} required · {tab.optionalFields} optional
                      </Typography>
                      {tab.conditionalSummary && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: EV_COLORS.textSubtle,
                            display: "block",
                            mt: 0.5,
                          }}
                        >
                          {tab.conditionalSummary}
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        </Box>

        {/* Right: Selected tab details + standard steps */}
        <Box
          className="flex-1 overflow-y-auto"
          sx={{
            background: `radial-gradient(circle at top left, ${EV_COLORS.primarySoft}, transparent 55%), ${EV_COLORS.bg}`,
          }}
        >
          <Box className="w-full px-[0.55%] py-4 md:py-6 space-y-4">
            {/* Breadcrumbs */}
            <Box className="flex items-center justify-between flex-wrap gap-3">
              <Breadcrumbs
                aria-label={t("seller preview breadcrumb")}
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
                  Seller
                </MUILink>
                <Typography sx={{ color: EV_COLORS.textMuted }}>
                  Product listing
                </Typography>
                <Typography
                  className="font-medium"
                  sx={{ color: EV_COLORS.textMain }}
                >
                  Form preview
                </Typography>
              </Breadcrumbs>

              <Chip
                size="small"
                label="EVmart – Electric Vehicles"
                sx={{
                  backgroundColor: EV_COLORS.surfaceAlt,
                  color: EV_COLORS.textSubtle,
                  borderColor: EV_COLORS.border,
                  borderWidth: 1,
                }}
                variant="outlined"
              />
            </Box>

              {/* Selected tab summary */}
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
                {selectedTab?.label || "Step"} – questions
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: EV_COLORS.textSubtle, mb: 1.5 }}
              >
                {selectedTab?.description || ""}
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip
                  size="small"
                  label={`${selectedTab?.requiredFields || 0} required`}
                  sx={{
                    backgroundColor: EV_COLORS.surfaceAlt,
                    color: EV_COLORS.textSubtle,
                  }}
                />
                <Chip
                  size="small"
                  label={`${selectedTab?.optionalFields || 0} optional`}
                  sx={{
                    backgroundColor: EV_COLORS.surfaceAlt,
                    color: EV_COLORS.textSubtle,
                  }}
                />
                {selectedTab?.conditionalSummary && (
                  <Chip
                    size="small"
                    label="Conditional section"
                    sx={{
                      backgroundColor: EV_COLORS.accentSoft,
                      color: EV_COLORS.accent,
                    }}
                  />
                )}
              </Stack>

              <Divider sx={{ mb: 2 }} />

              <Typography
                variant="caption"
                sx={{ color: EV_COLORS.textMuted, display: "block", mb: 1 }}
              >
                Example of how questions in this section will look on the
                seller form:
              </Typography>

              <Box className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <FieldPreviewRow label="Listing title" required />
                <FieldPreviewRow label="Brand" required />
                <FieldPreviewRow label="Model" required />
                <FieldPreviewRow label="Body type" required={false} />
                <FieldPreviewRow label="Key selling point" required={false} />
              </Box>
            </Paper>

            {/* Standard steps overview */}
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
                After the form, you will go through:
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: EV_COLORS.textSubtle, mb: 2 }}
              >
                These steps are common for all products and help you set
                commercial and visibility details for your listing.
              </Typography>

              <Box className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {standardSteps.map((step) => (
                  <Paper
                    key={step.id}
                    elevation={0}
                    sx={{
                      borderRadius: 2,
                      border: `1px solid ${EV_COLORS.border}`,
                      backgroundColor: EV_COLORS.surfaceAlt,
                      p: 2,
                      display: "flex",
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        backgroundColor: EV_COLORS.surface,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                      }}
                    >
                      {step.icon}
                    </Box>
                    <Box className="flex-1 min-w-0">
                      <Typography
                        variant="body2"
                        sx={{ color: EV_COLORS.textMain, fontWeight: 500 }}
                      >
                        {step.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: EV_COLORS.textMuted, display: "block" }}
                      >
                        {step.description}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Paper>

            {/* Call to action */}
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${EV_COLORS.border}`,
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
                    Happy with the steps?
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: EV_COLORS.textSubtle, maxWidth: 520 }}
                  >
                    When you continue, we will guide you through each section
                    step by step: form tabs first, then Pricing, Warranty,
                    Inventory, Markets & Delivery, and Search & Discovery. You
                    can save as draft at any time and come back later.
                  </Typography>
                </Box>
                <Button
                  size="medium"
                  variant="contained"
                  startIcon={<IconStart />}
                  onClick={handleStartListing}
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
                  Continue to listing
                </Button>
              </Stack>
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function FieldPreviewRow({ label, required }) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ color: EV_COLORS.textSubtle, display: "block", mb: 0.25 }}
      >
        {label}
        {required && <span style={{ color: "#DC2626" }}> *</span>}
      </Typography>
      <Box
        sx={{
          height: 34,
          borderRadius: 2,
          border: `1px solid ${EV_COLORS.border}`,
          backgroundColor: EV_COLORS.surface,
        }}
      />
    </Box>
  );
}

export default SellerFormPreviewPage;
