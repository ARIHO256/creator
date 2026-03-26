import React from "react";
import { Box, Paper, Typography, Stack, Button, Chip } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useLocalization } from "../../localization/LocalizationProvider";

import { sellerBackendApi } from "../../lib/backendApi";


void sellerBackendApi.getWorkflowScreenState("seller-feature:listings/AwaitingApproval_ProductListing").catch(() => undefined);

// Awaiting approval screen shown after a seller publishes a product listing
export default function AwaitingApprovalProductListing() {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const location = useLocation();
  const listingTitle = location?.state?.title || t("Your product");
  const marketplace = location?.state?.marketplace || "EVzone Marketplace";

  return (
    <Box
      className="min-h-screen flex items-center justify-center"
      sx={{
        background: "radial-gradient(circle at 80% 20%, rgba(0,179,136,0.10), #F5F7FB)",
        px: 2,
        py: 6,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 760,
          width: "100%",
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          border: "1px solid #D9E5F5",
          backgroundColor: "#FFFFFF",
          textAlign: "center",
          boxShadow: "0 18px 60px -40px rgba(15,23,42,0.35)",
        }}
      >
        <Stack spacing={2.5} alignItems="center">
          <Box
            sx={{
              width: 82,
              height: 82,
              borderRadius: "50%",
              border: "1px solid #B8E1D7",
              backgroundColor: "#E6F7F2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              color: "#00B388",
              fontSize: 18,
            }}
          >
            ✓
          </Box>
          <Typography
            variant="h5"
            component="h1"
            className="page-hero-title"
            sx={{ fontWeight: 800, color: "#0F172A" }}
          >
            {t("Submitted for approval")}
          </Typography>
          <Typography variant="body1" sx={{ color: "#64748B", maxWidth: 560 }}>
            {t(
              "{listingTitle} has been sent for review. Our team is checking content, pricing, and compliance before it goes live on {marketplace}.",
              { listingTitle, marketplace }
            )}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
            <Chip label={t("Status: Awaiting approval")} color="success" variant="outlined" />
            <Chip label={t("Next: QA & compliance checks")} variant="outlined" />
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="center"
          >
            <Button
              variant="contained"
              onClick={() => navigate("/listings")}
              sx={{
                textTransform: "none",
                borderRadius: 999,
                px: 3,
                backgroundColor: "#00B388",
                "&:hover": { backgroundColor: "#008565" },
              }}
            >
              {t("Back to listings")}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate("/dashboard")}
              sx={{ textTransform: "none", borderRadius: 999, px: 3 }}
            >
              {t("Go to dashboard")}
            </Button>
          </Stack>
          <Typography variant="body2" sx={{ color: "#94A3B8" }}>
            {t("We’ll notify you once it’s approved or if more info is required.")}
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
