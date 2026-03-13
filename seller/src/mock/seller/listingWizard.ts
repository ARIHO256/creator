import type { ListingWizardContent } from "../shared/types";

export const sellerListingWizardContent: ListingWizardContent = {
  taxonomy: [
    {
      id: "marketplace-evmart",
      type: "Marketplace",
      name: "EVmart",
      description: "Electric vehicles, chargers, batteries and mobility.",
      children: [
        {
          id: "family-chargers",
          type: "Product Family",
          name: "EV Chargers & Accessories",
          description: "Home, workplace and public chargers plus accessories.",
          children: [
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
          id: "family-computers",
          type: "Product Family",
          name: "Laptops & Computers",
          description: "Laptops, desktops and computer accessories.",
          children: [
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
          id: "family-fashion-women",
          type: "Product Family",
          name: "Women's Fashion",
          description: "Clothing and accessories for women.",
          children: [
            {
              id: "category-women-shoes",
              type: "Category",
              name: "Shoes & Heels",
              description: "Footwear for women.",
              children: [],
            },
          ],
        },
      ],
    },
  ],
  baseLines: [
    { nodeId: "category-dc-fast-chargers", status: "active" },
    { nodeId: "category-desktops", status: "active" },
    { nodeId: "category-women-shoes", status: "suspended" },
    { nodeId: "category-charging-cables", status: "active" },
  ],
  copy: {
    heroTitle: "Start a new listing",
    heroSubtitle:
      "Choose one of your approved product lines. You can only list within the taxonomy coverage you set during onboarding or in your storefront settings.",
    manageLinesLabel: "Manage product lines",
    approvedLinesTitle: "Your approved product lines",
    approvedLinesSubtitle: "Pick a product line, then preview the form or start listing.",
    selectedLineTitle: "Selected product line",
    selectedLineEmptyTitle: "Select a product line to continue",
    selectedLineEmptySubtitle:
      "Choose an active product line from the list to preview the listing form.",
    searchPlaceholder: "Search product lines (e.g., chargers, desktops)",
    emptyTitle: "No matching product lines",
    emptySubtitle: "Try a different search term or switch to “All”.",
    suspendedHint:
      "This product line is suspended. Reactivate it in Storefront settings to list under it.",
    eligibleHint: "Eligible for listing.",
    tipText:
      "Tip: If you don’t see the product line you need, add it from Storefront settings.",
    addLineLabel: "Add new product line",
    listingIntentLabel: "Listing intent",
    listingIntentOptions: [
      { value: "new", label: "New product" },
      { value: "restock", label: "Restock / additional stock" },
      { value: "variant", label: "Add variants" },
    ],
    suspendedCardTitle: "This product line is suspended",
    suspendedCardBody:
      "Reactivate it in Storefront settings to list under this taxonomy path.",
    previewCta: "Preview form",
    startCta: "Start listing",
    nextStepsTitle: "What happens next",
    nextSteps: [
      {
        title: "Form generated",
        description: "EVzone generates a tailored listing form for the selected product line.",
      },
      {
        title: "Add product details",
        description: "Fill specifications, variants, photos, pricing and inventory.",
      },
      {
        title: "Compliance checks",
        description: "Some categories require extra documents or approvals.",
      },
      {
        title: "Publish",
        description: "Once approved, your product becomes visible on the marketplace.",
      },
    ],
    taxonomyFallback: "This listing will use the form schema configured for this taxonomy path.",
  },
};
