export type CatalogTaxonomyNode = {
  id: string;
  type: string;
  name: string;
  description: string;
  children: CatalogTaxonomyNode[];
};

export const CATALOG_TAXONOMY: CatalogTaxonomyNode[] = [
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
];

export type CatalogProductItem = {
  id: string;
  name: string;
  type: string;
  basePrice: string;
  stockLabel: string;
  category: string;
  regulated: boolean;
};

export const SETTINGS_PROFILE_PRODUCTS: CatalogProductItem[] = [
  {
    id: "prod-stoneware-dinner-set",
    name: "Stoneware dinner set (16 pcs)",
    type: "Product",
    basePrice: "UGX 185,000",
    stockLabel: "42 in stock",
    category: "Home & Living / Tableware",
    regulated: false,
  },
  {
    id: "prod-handwoven-basket",
    name: "Handwoven storage basket",
    type: "Product",
    basePrice: "UGX 65,000",
    stockLabel: "19 in stock",
    category: "Home & Living / Storage",
    regulated: false,
  },
  {
    id: "prod-home-styling-visit",
    name: "Home styling visit (2 hrs)",
    type: "Service",
    basePrice: "UGX 150,000",
    stockLabel: "Slots",
    category: "Services / Home Styling",
    regulated: false,
  },
  {
    id: "prod-essential-oils",
    name: "Essential oils starter set",
    type: "Product",
    basePrice: "UGX 98,000",
    stockLabel: "8 in stock",
    category: "Health & Wellness / Aromas",
    regulated: true,
  },
  {
    id: "prod-kids-makeover",
    name: "Kids room makeover package",
    type: "Service",
    basePrice: "UGX 480,000",
    stockLabel: "By booking",
    category: "Services / Interior",
    regulated: false,
  },
];
