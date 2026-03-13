export const SELLER_CATALOG_TAXONOMY_TREE_ID = 'taxonomy_tree_seller_catalog';
export const SELLER_CATALOG_TAXONOMY_TREE_SLUG = 'sellerfront-catalog-taxonomy';
export const SELLER_CATALOG_TAXONOMY_TREE_NAME = 'Sellerfront Catalog Taxonomy';

export type SellerCatalogSeedNode = {
  id: string;
  type: string;
  name: string;
  description: string;
  metadata?: Record<string, unknown>;
  children: SellerCatalogSeedNode[];
};

const leaf = (
  id: string,
  name: string,
  description: string,
  metadata?: Record<string, unknown>
): SellerCatalogSeedNode => ({
  id,
  type: 'Sub-Category',
  name,
  description,
  metadata,
  children: []
});

const category = (
  id: string,
  name: string,
  description: string,
  children: SellerCatalogSeedNode[]
): SellerCatalogSeedNode => ({
  id,
  type: 'Category',
  name,
  description,
  children
});

const family = (
  id: string,
  name: string,
  description: string,
  children: SellerCatalogSeedNode[]
): SellerCatalogSeedNode => ({
  id,
  type: 'Product Family',
  name,
  description,
  children
});

const marketplace = (
  id: string,
  name: string,
  description: string,
  children: SellerCatalogSeedNode[]
): SellerCatalogSeedNode => ({
  id,
  type: 'Marketplace',
  name,
  description,
  metadata: { role: 'seller', surface: 'seller_onboarding' },
  children
});

export const SELLER_CATALOG_TAXONOMY: SellerCatalogSeedNode[] = [
  marketplace('marketplace-evmart', 'EVmart', 'Electric vehicles, charging, energy and workshop inventory.', [
    family('family-ev-cars', 'Electric Vehicles', 'New, used and two-wheel EV inventory.', [
      category('category-new-ev-cars', 'New Electric Cars', 'Brand-new electric vehicles for retail and fleet buyers.', [
        leaf('subcategory-new-ev-sedans', 'Electric Sedans', 'Battery-powered sedans for city and business use.'),
        leaf('subcategory-new-ev-suvs', 'Electric SUVs', 'Electric SUVs and crossovers.'),
        leaf('subcategory-new-ev-hatchbacks', 'Electric Hatchbacks', 'Compact hatchbacks for urban mobility.'),
        leaf('subcategory-new-ev-pickups', 'Electric Pickups', 'Electric pickups for commercial and utility use.')
      ]),
      category('category-used-ev-cars', 'Used Electric Cars', 'Pre-owned EV inventory from dealers and resellers.', [
        leaf('subcategory-used-ev-sedans', 'Used Electric Sedans', 'Pre-owned electric sedans.'),
        leaf('subcategory-used-ev-suvs', 'Used Electric SUVs', 'Pre-owned electric SUVs and crossovers.'),
        leaf('subcategory-used-ev-vans', 'Used Electric Vans', 'Pre-owned electric vans for logistics and family use.')
      ]),
      category('category-ev-bikes-scooters', 'Electric Bikes & Scooters', 'Light mobility vehicles for personal and delivery use.', [
        leaf('subcategory-commuter-ebikes', 'Commuter E-Bikes', 'Electric bikes built for urban commuting.'),
        leaf('subcategory-cargo-ebikes', 'Cargo E-Bikes', 'Delivery and utility-focused electric bikes.'),
        leaf('subcategory-electric-scooters', 'Electric Scooters', 'Two-wheel electric scooters for city transport.')
      ])
    ]),
    family('family-charging-energy', 'Charging & Energy', 'Charging infrastructure, batteries and energy support.', [
      category('category-home-chargers', 'Home Chargers', 'Residential charging hardware and smart charging gear.', [
        leaf('subcategory-wallbox-chargers', 'Wallbox Chargers', 'Mounted AC charging stations for home and office use.'),
        leaf('subcategory-portable-chargers', 'Portable Chargers', 'Travel-friendly portable charging units.'),
        leaf('subcategory-smart-chargers', 'Smart Chargers', 'Connected chargers with scheduling and monitoring.')
      ]),
      category('category-public-charging', 'Public Charging', 'Commercial and public charging infrastructure.', [
        leaf('subcategory-dc-fast-chargers', 'DC Fast Chargers', 'High-power DC charging stations.'),
        leaf('subcategory-ac-charging-stations', 'AC Charging Stations', 'Public and semi-public AC charging points.'),
        leaf('subcategory-charging-accessories', 'Charging Accessories', 'Connectors, adaptors, cable organizers and mounts.')
      ]),
      category('category-batteries-storage', 'Batteries & Storage', 'Energy storage and battery inventory.', [
        leaf('subcategory-home-battery-packs', 'Home Battery Packs', 'Battery backup and storage systems for homes.'),
        leaf('subcategory-solar-storage', 'Solar Storage Systems', 'Hybrid storage solutions paired with solar systems.'),
        leaf('subcategory-ev-battery-modules', 'EV Battery Modules', 'Replacement or repurposed EV battery modules.')
      ])
    ]),
    family('family-workshop-parts', 'Workshop & Parts', 'Maintenance parts, tools and workshop essentials.', [
      category('category-ev-spare-parts', 'EV Spare Parts', 'Common parts for maintenance and repair.', [
        leaf('subcategory-ev-brakes', 'Brake Components', 'Brake pads, discs and related components for EVs.'),
        leaf('subcategory-ev-suspension', 'Suspension Parts', 'Shock absorbers, struts and suspension kits.'),
        leaf('subcategory-ev-body-parts', 'Body Parts', 'Panels, mirrors, lights and exterior replacement parts.')
      ]),
      category('category-ev-tyres-wheels', 'Tyres & Wheels', 'Tyres, rims and wheel accessories.', [
        leaf('subcategory-ev-tyres', 'EV Tyres', 'Low-resistance tyres optimized for EV efficiency.'),
        leaf('subcategory-alloy-wheels', 'Alloy Wheels', 'Aftermarket and OEM alloy wheels.'),
        leaf('subcategory-wheel-accessories', 'Wheel Accessories', 'Wheel nuts, caps, pressure sensors and tools.')
      ]),
      category('category-workshop-tools', 'Workshop Tools', 'Diagnostic and safety equipment for EV workshops.', [
        leaf('subcategory-diagnostic-tools', 'Diagnostic Tools', 'Scanners, software kits and troubleshooting tools.'),
        leaf('subcategory-charging-testers', 'Charging Testers', 'Cable, connector and charger testing tools.'),
        leaf('subcategory-workshop-safety-gear', 'Workshop Safety Gear', 'Insulated gloves, mats, helmets and PPE.')
      ])
    ])
  ]),
  marketplace('marketplace-gadgetmart', 'GadgetMart', 'Phones, laptops, computing and smart living devices.', [
    family('family-phones-tablets', 'Phones & Tablets', 'Mobile devices and related accessories.', [
      category('category-smartphones', 'Smartphones', 'Smartphones across consumer and rugged segments.', [
        leaf('subcategory-android-phones', 'Android Phones', 'Android smartphones from multiple brands.'),
        leaf('subcategory-ios-phones', 'iOS Phones', 'Apple iPhones and compatible stock.'),
        leaf('subcategory-rugged-phones', 'Rugged Phones', 'Durable smartphones for field and industrial use.')
      ]),
      category('category-tablets-readers', 'Tablets & Readers', 'Productivity and entertainment devices.', [
        leaf('subcategory-android-tablets', 'Android Tablets', 'Android tablets for work, school and media.'),
        leaf('subcategory-ipad-tablets', 'iPad Tablets', 'Apple iPad inventory and accessories.'),
        leaf('subcategory-ereaders', 'E-Readers', 'Dedicated e-reading devices and bundles.')
      ]),
      category('category-phone-accessories', 'Phone Accessories', 'High-demand accessories for mobile devices.', [
        leaf('subcategory-phone-chargers', 'Chargers & Cables', 'Charging bricks, USB cables and adaptors.'),
        leaf('subcategory-power-banks', 'Power Banks', 'Portable charging and backup power accessories.'),
        leaf('subcategory-phone-cases', 'Cases & Screen Protection', 'Cases, covers and tempered glass protectors.')
      ])
    ]),
    family('family-computing', 'Laptops & Computing', 'Laptops, desktops and accessories.', [
      category('category-laptops', 'Laptops', 'Portable computers for gaming, business and students.', [
        leaf('subcategory-gaming-laptops', 'Gaming Laptops', 'Performance laptops for gaming and creative workloads.'),
        leaf('subcategory-business-laptops', 'Business Laptops', 'Professional laptops for office and enterprise use.'),
        leaf('subcategory-student-laptops', 'Student Laptops', 'Entry to mid-range laptops for learning and study.')
      ]),
      category('category-desktops-workstations', 'Desktops & Workstations', 'Desktop computing hardware for home and office.', [
        leaf('subcategory-gaming-desktops', 'Gaming Desktops', 'Desktop PCs built for gaming and streaming.'),
        leaf('subcategory-office-desktops', 'Office Desktops', 'Reliable desktop PCs for day-to-day office work.'),
        leaf('subcategory-mini-pcs', 'Mini PCs', 'Compact desktop systems for retail and business setups.')
      ]),
      category('category-computer-accessories', 'Computer Accessories', 'Display, input and storage accessories.', [
        leaf('subcategory-monitors', 'Monitors', 'Business, gaming and creative display monitors.'),
        leaf('subcategory-keyboards-mice', 'Keyboards & Mice', 'Input devices and combo packs.'),
        leaf('subcategory-storage-devices', 'Storage Devices', 'External drives, SSDs and storage expansion.')
      ])
    ]),
    family('family-smart-living', 'Smart Living', 'Connected home, wearables and networking.', [
      category('category-smart-home', 'Smart Home', 'Devices for connected homes and offices.', [
        leaf('subcategory-smart-cameras', 'Smart Cameras', 'Security and monitoring cameras.'),
        leaf('subcategory-smart-lighting', 'Smart Lighting', 'Connected bulbs, strips and lighting kits.'),
        leaf('subcategory-smart-locks', 'Smart Locks', 'Digital door locks and access control devices.')
      ]),
      category('category-wearables-audio', 'Wearables & Audio', 'Wearables and personal audio.', [
        leaf('subcategory-smart-watches', 'Smart Watches', 'Smartwatches for fitness, messaging and payments.'),
        leaf('subcategory-fitness-bands', 'Fitness Bands', 'Entry-level and mid-tier activity trackers.'),
        leaf('subcategory-wireless-earbuds', 'Wireless Earbuds', 'True wireless earbuds and accessories.')
      ]),
      category('category-networking', 'Networking', 'Connectivity hardware for homes and teams.', [
        leaf('subcategory-wifi-routers', 'Wi-Fi Routers', 'Single-unit routers for home and small office use.'),
        leaf('subcategory-mesh-systems', 'Mesh Systems', 'Multi-node mesh Wi-Fi systems.'),
        leaf('subcategory-network-extenders', 'Range Extenders', 'Signal boosters and network repeaters.')
      ])
    ])
  ]),
  marketplace('marketplace-stylemart', 'StyleMart', 'Fashion, beauty and personal style products.', [
    family('family-womens-fashion', "Women's Fashion", 'Women-focused apparel and accessories.', [
      category('category-womens-apparel', "Women's Apparel", 'Core fashion categories for women.', [
        leaf('subcategory-womens-dresses', 'Dresses', 'Casual, office and occasion dresses.'),
        leaf('subcategory-womens-tops', 'Tops & Blouses', 'Shirts, blouses and fashion tops.'),
        leaf('subcategory-womens-bottoms', 'Jeans & Bottoms', 'Jeans, trousers, skirts and leggings.')
      ]),
      category('category-womens-footwear', "Women's Footwear", 'Footwear for casual and occasion wear.', [
        leaf('subcategory-womens-sneakers', 'Sneakers', 'Lifestyle and active sneakers.'),
        leaf('subcategory-womens-heels', 'Heels', 'Formal heels and dress shoes.'),
        leaf('subcategory-womens-sandals', 'Sandals', 'Open footwear and casual sandals.')
      ]),
      category('category-womens-accessories', "Women's Accessories", 'Fashion accessories and bags.', [
        leaf('subcategory-womens-handbags', 'Handbags', 'Handbags, totes and shoulder bags.'),
        leaf('subcategory-womens-jewelry', 'Jewelry', 'Fashion jewelry and statement pieces.'),
        leaf('subcategory-womens-watches', 'Watches', 'Fashion and premium watches.')
      ])
    ]),
    family('family-mens-fashion', "Men's Fashion", 'Menswear, footwear and accessories.', [
      category('category-mens-apparel', "Men's Apparel", 'Core menswear categories.', [
        leaf('subcategory-mens-shirts', 'Shirts & Polos', 'Casual shirts, polos and dress shirts.'),
        leaf('subcategory-mens-trousers', 'Trousers & Jeans', 'Formal trousers, denim and chinos.'),
        leaf('subcategory-mens-outerwear', 'Outerwear', 'Jackets, hoodies and coats.')
      ]),
      category('category-mens-footwear', "Men's Footwear", 'Shoes and sneakers for men.', [
        leaf('subcategory-mens-sneakers', 'Sneakers', 'Casual and sports sneakers.'),
        leaf('subcategory-mens-formal-shoes', 'Formal Shoes', 'Leather shoes, loafers and office footwear.'),
        leaf('subcategory-mens-boots', 'Boots', 'Boots for work, fashion and outdoor use.')
      ]),
      category('category-mens-accessories', "Men's Accessories", 'Belts, bags and style accessories.', [
        leaf('subcategory-mens-belts', 'Belts', 'Leather and casual belts.'),
        leaf('subcategory-mens-wallets', 'Wallets', 'Wallets, card holders and money clips.'),
        leaf('subcategory-mens-bags', 'Bags', 'Backpacks, messenger bags and duffels.')
      ])
    ]),
    family('family-beauty-care', 'Beauty & Care', 'Beauty, skincare and haircare ranges.', [
      category('category-makeup', 'Makeup', 'Makeup essentials and beauty kits.', [
        leaf('subcategory-face-makeup', 'Face Makeup', 'Foundations, powders and concealers.'),
        leaf('subcategory-eye-makeup', 'Eye Makeup', 'Mascara, liner, shadow and brows.'),
        leaf('subcategory-lip-products', 'Lip Products', 'Lipsticks, glosses and liners.')
      ]),
      category('category-skincare', 'Skincare', 'Daily and treatment skincare lines.', [
        leaf('subcategory-cleansers-toners', 'Cleansers & Toners', 'Face cleansers, toners and wash sets.'),
        leaf('subcategory-moisturizers-serums', 'Moisturizers & Serums', 'Hydration and treatment serums.'),
        leaf('subcategory-sunscreen-treatment', 'Sunscreen & Treatments', 'Sun protection and targeted skincare.')
      ]),
      category('category-haircare', 'Haircare', 'Hair products and care routines.', [
        leaf('subcategory-shampoo-conditioner', 'Shampoo & Conditioner', 'Hair cleansing and conditioning products.'),
        leaf('subcategory-hair-styling', 'Hair Styling', 'Gels, sprays, creams and styling kits.'),
        leaf('subcategory-hair-tools', 'Hair Tools', 'Dryers, straighteners and curling tools.')
      ])
    ])
  ]),
  marketplace('marketplace-homemart', 'HomeMart', 'Furniture, kitchen appliances and household essentials.', [
    family('family-furniture-decor', 'Furniture & Decor', 'Interior furniture and decor inventory.', [
      category('category-living-room', 'Living Room Furniture', 'Furniture for lounges and shared spaces.', [
        leaf('subcategory-sofas-sectionals', 'Sofas & Sectionals', 'Sofas, sectionals and seating sets.'),
        leaf('subcategory-coffee-tv-units', 'Coffee Tables & TV Units', 'Tables, stands and entertainment furniture.'),
        leaf('subcategory-living-room-decor', 'Living Room Decor', 'Rugs, wall art and decorative accents.')
      ]),
      category('category-bedroom', 'Bedroom Furniture', 'Bedroom furnishings and storage.', [
        leaf('subcategory-beds-mattresses', 'Beds & Mattresses', 'Bed frames, mattresses and base sets.'),
        leaf('subcategory-wardrobes-storage', 'Wardrobes & Storage', 'Wardrobes, drawers and storage chests.'),
        leaf('subcategory-bedding-linen', 'Bedding & Linen', 'Sheets, duvets, pillows and bedding sets.')
      ]),
      category('category-office-furniture', 'Office Furniture', 'Furniture for offices and home workspaces.', [
        leaf('subcategory-office-desks', 'Office Desks', 'Executive, gaming and study desks.'),
        leaf('subcategory-office-chairs', 'Office Chairs', 'Ergonomic, task and executive chairs.'),
        leaf('subcategory-office-storage', 'Office Storage', 'Cabinets, shelves and organizers.')
      ])
    ]),
    family('family-kitchen-appliances', 'Kitchen & Appliances', 'Kitchen equipment and appliances.', [
      category('category-cooking-appliances', 'Cooking Appliances', 'Appliances used for meal preparation.', [
        leaf('subcategory-cookers-ovens', 'Cookers & Ovens', 'Gas, electric and built-in cooking units.'),
        leaf('subcategory-microwaves-airfryers', 'Microwaves & Air Fryers', 'Compact cooking and reheating appliances.'),
        leaf('subcategory-blenders-mixers', 'Blenders & Mixers', 'Food processors, blenders and mixers.')
      ]),
      category('category-refrigeration', 'Refrigeration', 'Cooling and preservation appliances.', [
        leaf('subcategory-fridges-freezers', 'Fridges & Freezers', 'Single and double-door refrigeration units.'),
        leaf('subcategory-water-dispensers', 'Water Dispensers', 'Dispensers for office and home use.'),
        leaf('subcategory-coolers-ice-makers', 'Coolers & Ice Makers', 'Portable cooling and ice-making units.')
      ]),
      category('category-kitchenware', 'Kitchenware', 'Cookware and serving essentials.', [
        leaf('subcategory-cookware-sets', 'Cookware Sets', 'Pots, pans and cookware bundles.'),
        leaf('subcategory-dinnerware', 'Dinnerware', 'Plates, bowls, cups and serving sets.'),
        leaf('subcategory-storage-organizers', 'Storage & Organizers', 'Kitchen racks, containers and organizers.')
      ])
    ]),
    family('family-tools-garden', 'Tools & Garden', 'Home improvement and outdoor supplies.', [
      category('category-power-tools', 'Power Tools', 'Electric and cordless tool inventory.', [
        leaf('subcategory-drills-saws', 'Drills & Saws', 'Power drills, circular saws and related tools.'),
        leaf('subcategory-grinders-sanders', 'Grinders & Sanders', 'Grinding, sanding and polishing tools.'),
        leaf('subcategory-tool-kits', 'Tool Kits', 'Multi-purpose kits for household and workshop use.')
      ]),
      category('category-hand-tools', 'Hand Tools', 'Manual tools for repairs and setup.', [
        leaf('subcategory-hammers-spanners', 'Hammers & Spanners', 'Mechanical hand tools for repair tasks.'),
        leaf('subcategory-measuring-tools', 'Measuring Tools', 'Levels, tapes and calibration tools.'),
        leaf('subcategory-fasteners-hardware', 'Fasteners & Hardware', 'Screws, nails, hinges and fixings.')
      ]),
      category('category-garden-outdoor', 'Garden & Outdoor', 'Outdoor maintenance and gardening products.', [
        leaf('subcategory-garden-tools', 'Garden Tools', 'Rakes, pruners, shovels and watering tools.'),
        leaf('subcategory-outdoor-furniture', 'Outdoor Furniture', 'Patio seating, tables and umbrellas.'),
        leaf('subcategory-planters-supplies', 'Planters & Supplies', 'Pots, planters and soil accessories.')
      ])
    ])
  ]),
  marketplace('marketplace-healthmart', 'HealthMart', 'Health devices, mobility support and wellness supplies.', [
    family('family-personal-health', 'Personal Health Devices', 'Devices for home wellness and monitoring.', [
      category('category-health-monitors', 'Health Monitors', 'Monitoring devices for everyday health checks.', [
        leaf('subcategory-bp-monitors', 'Blood Pressure Monitors', 'Digital blood pressure monitors.'),
        leaf('subcategory-thermometers', 'Thermometers', 'Infrared and digital thermometers.'),
        leaf('subcategory-pulse-oximeters', 'Pulse Oximeters', 'Oxygen saturation and pulse monitoring devices.')
      ]),
      category('category-wellness-devices', 'Wellness Devices', 'Supportive wellness and therapy devices.', [
        leaf('subcategory-massagers', 'Massagers', 'Percussion, handheld and relaxation massagers.'),
        leaf('subcategory-air-purifiers', 'Air Purifiers', 'Air quality and allergen control devices.'),
        leaf('subcategory-humidifiers', 'Humidifiers', 'Humidifiers and aroma devices for home wellness.')
      ]),
      category('category-fitness-recovery', 'Fitness & Recovery', 'Recovery products and fitness wellness tools.', [
        leaf('subcategory-recovery-boots', 'Recovery Boots', 'Compression recovery systems.'),
        leaf('subcategory-foam-rollers', 'Foam Rollers & Mats', 'Recovery mats and rollers.'),
        leaf('subcategory-resistance-bands', 'Resistance Bands', 'Light fitness and rehab accessories.')
      ])
    ]),
    family('family-mobility-rehab', 'Mobility & Rehab', 'Mobility support and rehabilitation inventory.', [
      category('category-mobility-aids', 'Mobility Aids', 'Products that support movement and daily mobility.', [
        leaf('subcategory-wheelchairs', 'Wheelchairs', 'Manual and powered mobility chairs.'),
        leaf('subcategory-walkers-rollators', 'Walkers & Rollators', 'Support aids for walking and balance.'),
        leaf('subcategory-crutches-canes', 'Crutches & Canes', 'Walking sticks, canes and crutches.')
      ]),
      category('category-orthopedic-support', 'Orthopedic Support', 'Braces and support products.', [
        leaf('subcategory-back-support', 'Back Support', 'Lumbar belts and posture support products.'),
        leaf('subcategory-knee-ankle-support', 'Knee & Ankle Support', 'Joint support braces and wraps.'),
        leaf('subcategory-arm-neck-support', 'Arm & Neck Support', 'Slings, collars and upper-body support products.')
      ]),
      category('category-rehab-equipment', 'Rehab Equipment', 'Rehabilitation and therapy gear.', [
        leaf('subcategory-therapy-balls', 'Therapy Balls', 'Therapy and balance balls.'),
        leaf('subcategory-exercise-pedals', 'Exercise Pedals', 'Compact rehab and physiotherapy pedals.'),
        leaf('subcategory-therapy-bands', 'Therapy Bands', 'Stretching and physiotherapy band sets.')
      ])
    ]),
    family('family-medical-supplies', 'Medical Supplies', 'Home and clinic-use consumables and support supplies.', [
      category('category-first-aid', 'First Aid', 'Basic emergency and first-response kits.', [
        leaf('subcategory-first-aid-kits', 'First Aid Kits', 'Ready-made first aid and trauma kits.'),
        leaf('subcategory-bandages-dressings', 'Bandages & Dressings', 'Dressings, gauze and wound care essentials.'),
        leaf('subcategory-disinfectants', 'Disinfectants', 'Sanitizers, antiseptics and cleaning agents.')
      ]),
      category('category-home-care', 'Home Care Supplies', 'Consumables and support tools for home care.', [
        leaf('subcategory-gloves-masks', 'Gloves & Masks', 'Protective gloves and masks.'),
        leaf('subcategory-adult-care', 'Adult Care', 'Adult diapers, pads and hygiene supplies.'),
        leaf('subcategory-bedside-support', 'Bedside Support', 'Bed rails, commodes and patient support aids.')
      ]),
      category('category-clinic-consumables', 'Clinic Consumables', 'Frequently used clinic and pharmacy consumables.', [
        leaf('subcategory-syringes', 'Syringes & Needles', 'Injection consumables and accessories.'),
        leaf('subcategory-test-strips', 'Test Strips', 'Test strips and small diagnostic consumables.'),
        leaf('subcategory-disposable-supplies', 'Disposable Supplies', 'Single-use medical and hygiene supplies.')
      ])
    ])
  ])
];
