import type { ListingWizardContent } from "../shared/types";

export const providerListingWizardContent: ListingWizardContent = {
  taxonomy: [
    {
      id: "marketplace-servicemart",
      type: "Marketplace",
      name: "ServiceMart",
      description: "Services, consulting, and field operations.",
      children: [
        {
          id: "family-installation",
          type: "Service Family",
          name: "Installation & Field",
          description: "On-site installs, inspections and maintenance.",
          children: [
            {
              id: "category-ev-install",
              type: "Category",
              name: "EV Charger Installation",
              description: "Residential and commercial installations.",
              children: [],
            },
            {
              id: "category-site-audit",
              type: "Category",
              name: "Site Readiness Audit",
              description: "Infrastructure and power readiness checks.",
              children: [],
            },
          ],
        },
        {
          id: "family-consulting",
          type: "Service Family",
          name: "Consulting & Advisory",
          description: "Strategy, audits and operational reviews.",
          children: [
            {
              id: "category-fleet-audit",
              type: "Category",
              name: "Fleet Energy Audit",
              description: "Fleet charging optimization and ROI analysis.",
              children: [],
            },
          ],
        },
      ],
    },
    {
      id: "marketplace-consultations",
      type: "Marketplace",
      name: "Consultations",
      description: "Remote sessions and diagnostics.",
      children: [
        {
          id: "family-diagnostics",
          type: "Service Family",
          name: "Diagnostics",
          description: "Battery health and performance checks.",
          children: [
            {
              id: "category-battery-diagnostics",
              type: "Category",
              name: "Battery Diagnostics",
              description: "Remote battery health analysis.",
              children: [],
            },
          ],
        },
      ],
    },
  ],
  baseLines: [
    { nodeId: "category-ev-install", status: "active" },
    { nodeId: "category-site-audit", status: "active" },
    { nodeId: "category-fleet-audit", status: "active" },
    { nodeId: "category-battery-diagnostics", status: "suspended" },
  ],
  copy: {
    heroTitle: "Start a new service listing",
    heroSubtitle:
      "Choose one of your approved service lines. You can only list within the taxonomy coverage you set during onboarding or in your provider profile.",
    manageLinesLabel: "Manage service lines",
    approvedLinesTitle: "Your approved service lines",
    approvedLinesSubtitle: "Pick a service line, then preview the form or start listing.",
    selectedLineTitle: "Selected service line",
    selectedLineEmptyTitle: "Select a service line to continue",
    selectedLineEmptySubtitle:
      "Choose an active service line from the list to preview the listing form.",
    searchPlaceholder: "Search service lines (e.g., installation, diagnostics)",
    emptyTitle: "No matching service lines",
    emptySubtitle: "Try a different search term or switch to “All”.",
    suspendedHint:
      "This service line is suspended. Reactivate it in Provider settings to list under it.",
    eligibleHint: "Eligible for booking.",
    tipText:
      "Tip: If you don’t see the service line you need, add it from Provider settings.",
    addLineLabel: "Add new service",
    listingIntentLabel: "Listing intent",
    listingIntentOptions: [
      { value: "new", label: "New service" },
      { value: "restock", label: "Add availability" },
      { value: "variant", label: "Add packages" },
    ],
    suspendedCardTitle: "This service line is suspended",
    suspendedCardBody:
      "Reactivate it in Provider settings to list under this taxonomy path.",
    previewCta: "Preview form",
    startCta: "Start listing",
    nextStepsTitle: "What happens next",
    nextSteps: [
      {
        title: "Form generated",
        description: "EVzone generates a tailored service form for the selected line.",
      },
      {
        title: "Add service details",
        description: "Fill scope, availability, pricing and capacity.",
      },
      {
        title: "Compliance checks",
        description: "Some services require extra credentials or approvals.",
      },
      {
        title: "Publish",
        description: "Once approved, your service becomes bookable on the marketplace.",
      },
    ],
    taxonomyFallback: "This listing will use the form schema configured for this taxonomy path.",
  },
};
