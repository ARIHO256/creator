import { scryptSync } from "node:crypto";

function hashPassword(password) {
  const salt = "mldzseed";
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function buildSeedData() {
  const now = new Date().toISOString();

  const userId = "user_ronald";
  const creatorId = "creator_ronald";

  const creatorProfile = {
    id: creatorId,
    userId,
    name: "Ronald Isabirye",
    handle: "ronald.creates",
    tier: "Silver",
    tagline: "Live commerce host for Beauty, Tech, and Faith-compatible offers.",
    bio: "Creator focused on trusted live selling, replay conversion, and brand-safe audience growth across East Africa.",
    categories: ["Beauty & Skincare", "Tech & Gadgets", "Faith & Wellness"],
    regions: ["East Africa", "North America"],
    languages: ["English", "Luganda"],
    followers: 18200,
    rating: 4.8,
    avgViews: 2300,
    totalSalesDriven: 31240,
    isKycVerified: true,
    followingSellerIds: ["seller_glowup", "seller_gadgetmart", "seller_grace"],
    savedOpportunityIds: ["opp_glowup_flash"],
    publicMetrics: {
      liveSessionsCompleted: 86,
      replaysPublished: 124,
      conversionRate: 4.8,
      avgOrderValue: 34
    }
  };

  const sellers = [
    {
      id: "seller_glowup",
      name: "GlowUp Hub",
      initials: "GH",
      type: "Seller",
      brand: "GlowUp Hub",
      tagline: "Beauty & skincare for glowing routines.",
      categories: ["Beauty & Skincare"],
      region: "East Africa",
      followers: 24000,
      livesCompleted: 112,
      avgOrderValue: 28,
      rating: 4.9,
      badge: "Top Brand",
      relationship: "active",
      collabStatus: "Open to collabs",
      fitScore: 96,
      fitReason: "You convert 3.1x platform average in Beauty campaigns.",
      openToCollabs: true,
      inviteOnly: false,
      trustBadges: ["Fast payouts", "Active this week"]
    },
    {
      id: "seller_gadgetmart",
      name: "GadgetMart Africa",
      initials: "GA",
      type: "Seller",
      brand: "GadgetMart Africa",
      tagline: "Everyday gadgets with an EV twist.",
      categories: ["Tech & Gadgets", "EV & Mobility"],
      region: "East Africa",
      followers: 18200,
      livesCompleted: 78,
      avgOrderValue: 61,
      rating: 4.7,
      badge: "Trusted Seller",
      relationship: "active",
      collabStatus: "Open to collabs",
      fitScore: 93,
      fitReason: "Strong Tech Friday performance with their niche.",
      openToCollabs: true,
      inviteOnly: false,
      trustBadges: ["Repeat partner", "Low refund rate"]
    },
    {
      id: "seller_grace",
      name: "Grace Living Store",
      initials: "GL",
      type: "Seller",
      brand: "Grace Living Store",
      tagline: "Faith-compatible wellness & lifestyle.",
      categories: ["Faith & Wellness"],
      region: "East Africa",
      followers: 8600,
      livesCompleted: 44,
      avgOrderValue: 24,
      rating: 4.8,
      badge: "Faith friendly",
      relationship: "active",
      collabStatus: "Invite only",
      fitScore: 90,
      fitReason: "High retention in Faith-compatible sessions.",
      openToCollabs: false,
      inviteOnly: true,
      trustBadges: ["Invite only", "Low return rate"]
    },
    {
      id: "seller_shopnow",
      name: "ShopNow Foods",
      initials: "SF",
      type: "Seller",
      brand: "ShopNow Foods",
      tagline: "Groceries & pantry delivered same day.",
      categories: ["Food & Groceries"],
      region: "East Africa",
      followers: 12400,
      livesCompleted: 39,
      avgOrderValue: 18,
      rating: 4.5,
      badge: "Everyday essentials",
      relationship: "past",
      collabStatus: "Open to collabs",
      fitScore: 78,
      fitReason: "Steady orders across the week.",
      openToCollabs: true,
      inviteOnly: false,
      trustBadges: ["Seasonal performer"]
    },
    {
      id: "seller_evgadget",
      name: "EV Gadget World",
      initials: "EG",
      type: "Provider",
      brand: "EV Gadget World",
      tagline: "Accessories & gadgets for EV owners.",
      categories: ["EV & Mobility", "Tech & Gadgets"],
      region: "East Africa",
      followers: 5200,
      livesCompleted: 14,
      avgOrderValue: 57,
      rating: 4.6,
      badge: "New Seller",
      relationship: "none",
      collabStatus: "Open to collabs",
      fitScore: 72,
      fitReason: "Category match with limited collab history.",
      openToCollabs: true,
      inviteOnly: false,
      trustBadges: ["New EV-focused potential"]
    }
  ];

  const opportunities = [
    {
      id: "opp_glowup_flash",
      title: "Autumn Beauty Flash",
      ownerUserId: userId,
      sellerId: "seller_glowup",
      seller: "GlowUp Hub",
      sellerInitials: "GH",
      category: "Beauty & Skincare",
      categories: ["Beauty & Skincare"],
      region: "East Africa",
      language: "English",
      payBand: "$400 - $700 + commission",
      budgetMin: 400,
      budgetMax: 700,
      commission: 5,
      matchScore: "96%",
      matchReason: "Strong performance in Beauty campaigns (3.1x conv.)",
      deliverables: ["Brief call", "Asset handoff", "Post clips"],
      liveWindow: "Next week",
      timeline: ["Flash dealz", "New launch", "High volume"],
      summary: "Two-part Beauty Flash live plus supporting clips and tracked links.",
      tags: ["Beauty", "Live + Clips", "High volume"],
      supplierType: "Seller",
      status: "open"
    },
    {
      id: "opp_tech_friday",
      title: "Tech Friday Mega Live",
      ownerUserId: userId,
      sellerId: "seller_gadgetmart",
      seller: "GadgetMart Africa",
      sellerInitials: "GA",
      category: "Tech & Gadgets",
      categories: ["Tech & Gadgets", "EV & Mobility"],
      region: "East Africa",
      language: "English",
      payBand: "$900 - $1,400 flat",
      budgetMin: 900,
      budgetMax: 1400,
      commission: 0,
      matchScore: "93%",
      matchReason: "Your Tech Friday lives perform above platform average.",
      deliverables: ["Script prep", "Series 1", "Series 2"],
      liveWindow: "Next week - 2-part Tech Friday series",
      timeline: ["EV gadgets", "Q&A heavy"],
      summary: "Tech Friday series focused on EV-friendly gadgets and accessories.",
      tags: ["Tech Friday", "Series", "Q&A"],
      supplierType: "Seller",
      status: "open"
    },
    {
      id: "opp_faith_morning",
      title: "Faith & Wellness Morning Dealz",
      ownerUserId: userId,
      sellerId: "seller_grace",
      seller: "Grace Living Store",
      sellerInitials: "GL",
      category: "Faith-compatible wellness",
      categories: ["Faith & Wellness"],
      region: "East Africa",
      language: "English",
      payBand: "$300 - $500 flat + 3% commission",
      budgetMin: 300,
      budgetMax: 500,
      commission: 3,
      matchScore: "90%",
      matchReason: "Great fit with faith-compatible guidelines and high retention.",
      deliverables: ["Morning live", "Shoppable Adz", "Replay clip"],
      liveWindow: "Sunday mornings - Monthly slot",
      timeline: ["Morning live"],
      summary: "Faith-compatible wellness showcase with gentle CTA and replay recap.",
      tags: ["Faith", "Morning live", "Replay"],
      supplierType: "Seller",
      status: "invite_only"
    }
  ];

  const invites = [
    {
      id: "invite_glowup",
      userId,
      sellerId: "seller_glowup",
      seller: "GlowUp Hub",
      sellerInitials: "GH",
      sellerDescription: "Beauty & skincare partner preparing a high-volume seasonal flash campaign.",
      sellerRating: 4.9,
      campaign: "Autumn Beauty Flash",
      type: "Live + Shoppable Adz",
      category: "Beauty & Skincare",
      region: "East Africa",
      timing: "3 days",
      fitReason: "You convert 3.1x platform average in Beauty & Skincare.",
      baseFee: 400,
      commissionPct: 5,
      estimatedValue: 820,
      currency: "USD",
      messageShort: "We would love you to host a 60-minute Beauty Flash session featuring the new serum launch.",
      status: "pending",
      lastActivity: "New invite - 2h ago"
    },
    {
      id: "invite_gadgetmart",
      userId,
      sellerId: "seller_gadgetmart",
      seller: "GadgetMart Africa",
      sellerInitials: "GA",
      sellerDescription: "Electronics retailer planning a three-part high-ticket tech Friday push.",
      sellerRating: 4.7,
      campaign: "Tech Friday Mega Live",
      type: "Live series (3 episodes)",
      category: "Tech & Gadgets",
      region: "East Africa",
      timing: "5 days",
      fitReason: "Strong Tech Friday performance with mid-ticket gadgets.",
      baseFee: 1200,
      commissionPct: 0,
      estimatedValue: 1200,
      currency: "USD",
      messageShort: "Looking for a host who can handle product demos, bundle reveals, and Q&A over three episodes.",
      status: "negotiating",
      lastActivity: "Countered terms - Yesterday"
    },
    {
      id: "invite_grace",
      userId,
      sellerId: "seller_grace",
      seller: "Grace Living Store",
      sellerInitials: "GL",
      sellerDescription: "Faith-compatible wellness and lifestyle supplier with a loyal repeat audience.",
      sellerRating: 4.8,
      campaign: "Faith & Wellness Morning Dealz",
      type: "Morning lives",
      category: "Faith & Wellness",
      region: "East Africa",
      timing: "Starts next week",
      fitReason: "High retention in Faith-compatible sessions.",
      baseFee: 320,
      commissionPct: 0,
      estimatedValue: 320,
      currency: "USD",
      messageShort: "Thank you for accepting. Next we should lock dates, bundle order, and clip deliverables.",
      status: "accepted",
      lastActivity: "Accepted - 3 days ago"
    },
    {
      id: "invite_evgadget",
      userId,
      sellerId: "seller_evgadget",
      seller: "EV Gadget World",
      sellerInitials: "EG",
      sellerDescription: "Emerging EV accessories supplier testing creator-led launch campaigns.",
      sellerRating: 4.6,
      campaign: "EV Accessories Launch",
      type: "Shoppable Adz + Live",
      category: "EV & Mobility",
      region: "East Africa",
      timing: "2 weeks",
      fitReason: "Good category fit but limited collab history.",
      baseFee: 350,
      commissionPct: 4,
      estimatedValue: 600,
      currency: "USD",
      messageShort: "We want a launch flow that combines explainer clips, tracked links, and a conversion-focused live session.",
      status: "pending",
      lastActivity: "New invite - 1 day ago"
    }
  ];

  const proposals = [
    {
      id: "proposal_glowup",
      userId,
      sellerId: "seller_glowup",
      brand: "GlowUp Hub",
      initials: "GH",
      campaign: "Autumn Beauty Flash",
      origin: "seller",
      offerType: "Live + Clips package",
      category: "Beauty & Skincare",
      region: "East Africa",
      baseFeeMin: 400,
      baseFeeMax: 700,
      currency: "USD",
      commissionPct: 5,
      estimatedValue: 650,
      status: "in_negotiation",
      lastActivity: "Countered terms - 2h ago",
      notesShort: "Need final alignment on payment timing and usage rights.",
      terms: {
        deliverables: "1 live session, 2 short clips, 1 link pack",
        schedule: "Beauty Flash live within 7 days",
        compensation: "$500 flat + 5% commission",
        exclusivityWindow: "14 days",
        killFee: "Not set"
      },
      messages: [
        {
          id: "msg_1",
          from: "seller",
          name: "GlowUp Hub",
          avatar: "GH",
          time: "2026-02-28T10:00:00.000Z",
          body: "Can we confirm the final script and payment schedule today?"
        },
        {
          id: "msg_2",
          from: "creator",
          name: "Ronald",
          avatar: "RI",
          time: "2026-02-28T11:00:00.000Z",
          body: "Yes. I need usage rights and kill fee clarified before I lock the live."
        }
      ]
    },
    {
      id: "proposal_gadgetmart",
      userId,
      sellerId: "seller_gadgetmart",
      brand: "GadgetMart Africa",
      initials: "GA",
      campaign: "Tech Friday Mega Live",
      origin: "creator",
      offerType: "Launch live series (3 episodes)",
      category: "Tech & Gadgets",
      region: "East Africa",
      baseFeeMin: 900,
      baseFeeMax: 1400,
      currency: "USD",
      commissionPct: 0,
      estimatedValue: 1200,
      status: "sent_to_brand",
      lastActivity: "Sent to brand - Yesterday",
      notesShort: "You pitched a 3-episode Tech Friday series with mid-ticket gadgets.",
      terms: {
        deliverables: "3 live episodes, 3 replay cuts, 1 recap thread",
        schedule: "Friday for 3 consecutive weeks",
        compensation: "$1,200 flat",
        exclusivityWindow: "21 days",
        killFee: "$250"
      },
      messages: []
    },
    {
      id: "proposal_grace",
      userId,
      sellerId: "seller_grace",
      brand: "Grace Living Store",
      initials: "GL",
      campaign: "Faith & Wellness Morning Dealz",
      origin: "seller",
      offerType: "Morning lives + Shoppable Adz",
      category: "Faith & Wellness",
      region: "East Africa",
      baseFeeMin: 300,
      baseFeeMax: 500,
      currency: "USD",
      commissionPct: 3,
      estimatedValue: 420,
      status: "draft",
      lastActivity: "Draft saved - 1 day ago",
      notesShort: "Waiting for final deliverables and replay rights wording.",
      terms: {
        deliverables: "1 morning live, 1 shoppable ad, 1 replay",
        schedule: "Sunday morning slot",
        compensation: "$350 flat + 3% commission",
        exclusivityWindow: "7 days",
        killFee: "Not set"
      },
      messages: []
    },
    {
      id: "proposal_shopnow",
      userId,
      sellerId: "seller_shopnow",
      brand: "ShopNow Foods",
      initials: "SF",
      campaign: "ShopNow Groceries - Soft Promo",
      origin: "seller",
      offerType: "Shoppable Adz",
      category: "Food & Groceries",
      region: "East Africa",
      baseFeeMin: 120,
      baseFeeMax: 200,
      currency: "USD",
      commissionPct: 2,
      estimatedValue: 165,
      status: "accepted",
      lastActivity: "Accepted - 4 days ago",
      notesShort: "Accepted: soft groceries promo with flat fee and small commission.",
      terms: {
        deliverables: "1 shoppable ad, 1 story link",
        schedule: "This week",
        compensation: "$150 flat + 2% commission",
        exclusivityWindow: "3 days",
        killFee: "$50"
      },
      messages: []
    },
    {
      id: "proposal_evgadget",
      userId,
      sellerId: "seller_evgadget",
      brand: "EV Gadget World",
      initials: "EG",
      campaign: "EV Accessories Launch",
      origin: "seller",
      offerType: "Shoppable Adz + Live",
      category: "EV & Mobility",
      region: "East Africa",
      baseFeeMin: 250,
      baseFeeMax: 450,
      currency: "USD",
      commissionPct: 4,
      estimatedValue: 360,
      status: "declined",
      lastActivity: "Declined - last week",
      notesShort: "Timing was not a fit for the current production load.",
      terms: {
        deliverables: "1 live session, 1 shoppable ad",
        schedule: "Within 5 days",
        compensation: "$300 flat + 4% commission",
        exclusivityWindow: "10 days",
        killFee: "$75"
      },
      messages: []
    }
  ];

  const campaigns = [
    {
      id: "camp_glowup",
      ownerUserId: userId,
      sellerId: "seller_glowup",
      title: "Beauty Flash with GlowUp",
      seller: "GlowUp Hub",
      type: "Shoppable Adz + Live",
      status: "active",
      stage: "active_contracts",
      note: "Live scheduled - today",
      value: 650
    },
    {
      id: "camp_gadgetmart",
      ownerUserId: userId,
      sellerId: "seller_gadgetmart",
      title: "Tech Friday Mega Live",
      seller: "GadgetMart Africa",
      type: "Live series",
      status: "in_review",
      stage: "negotiating",
      note: "Review revised terms",
      value: 1200
    },
    {
      id: "camp_grace",
      ownerUserId: userId,
      sellerId: "seller_grace",
      title: "Faith & Wellness Morning Dealz",
      seller: "Grace Living Store",
      type: "Shoppable Adz",
      status: "pitched",
      stage: "pitches_sent",
      note: "Wait for seller reply",
      value: 420
    },
    {
      id: "camp_shopnow",
      ownerUserId: userId,
      sellerId: "seller_shopnow",
      title: "ShopNow Groceries - Soft Promo",
      seller: "ShopNow Foods",
      type: "Shoppable Adz",
      status: "completed",
      stage: "completed",
      note: "Closed - review performance",
      value: 165
    }
  ];

  const contracts = [
    {
      id: "contract_glowup",
      userId,
      sellerId: "seller_glowup",
      campaignId: "camp_glowup",
      proposalId: "proposal_glowup",
      title: "Autumn Beauty Flash",
      status: "active",
      health: "on_track",
      value: 650,
      currency: "USD",
      startDate: "2026-03-02",
      endDate: "2026-03-09",
      deliverables: [
        { id: "del_1", label: "Live session", done: true, type: "live" },
        { id: "del_2", label: "2 short clips", done: false, type: "clip" },
        { id: "del_3", label: "Link pack", done: false, type: "link" }
      ],
      timeline: [
        { when: "2026-02-26", what: "Contract drafted" },
        { when: "2026-02-28", what: "Usage rights revision requested" },
        { when: "2026-03-01", what: "Live run-of-show approved" }
      ],
      parties: {
        creator: { name: "Ronald Isabirye", handle: "@ronald.creates" },
        seller: { name: "GlowUp Hub", manager: "Mary - Brand manager" }
      },
      termination: {
        requested: false,
        reason: null,
        explanation: null
      }
    },
    {
      id: "contract_gadgetmart",
      userId,
      sellerId: "seller_gadgetmart",
      campaignId: "camp_gadgetmart",
      proposalId: "proposal_gadgetmart",
      title: "Tech Friday Mega Live",
      status: "at_risk",
      health: "at_risk",
      value: 1200,
      currency: "USD",
      startDate: "2026-03-08",
      endDate: "2026-03-29",
      deliverables: [
        { id: "del_4", label: "Episode 1", done: false, type: "live" },
        { id: "del_5", label: "Episode 2", done: false, type: "live" },
        { id: "del_6", label: "Episode 3", done: false, type: "live" }
      ],
      timeline: [
        { when: "2026-02-25", what: "Series proposed" },
        { when: "2026-02-27", what: "Brand asked for revised terms" }
      ],
      parties: {
        creator: { name: "Ronald Isabirye", handle: "@ronald.creates" },
        seller: { name: "GadgetMart Africa", manager: "Derrick - Growth lead" }
      },
      termination: {
        requested: false,
        reason: null,
        explanation: null
      }
    },
    {
      id: "contract_shopnow",
      userId,
      sellerId: "seller_shopnow",
      campaignId: "camp_shopnow",
      proposalId: "proposal_shopnow",
      title: "ShopNow Groceries - Soft Promo",
      status: "completed",
      health: "complete",
      value: 165,
      currency: "USD",
      startDate: "2026-02-20",
      endDate: "2026-02-24",
      deliverables: [
        { id: "del_7", label: "Ad published", done: true, type: "ad" },
        { id: "del_8", label: "Story link", done: true, type: "link" }
      ],
      timeline: [
        { when: "2026-02-19", what: "Contract signed" },
        { when: "2026-02-24", what: "Campaign completed" }
      ],
      parties: {
        creator: { name: "Ronald Isabirye", handle: "@ronald.creates" },
        seller: { name: "ShopNow Foods", manager: "Lena - Marketing" }
      },
      termination: {
        requested: false,
        reason: null,
        explanation: null
      }
    }
  ];

  const tasks = [
    {
      id: "task_1",
      userId,
      contractId: "contract_glowup",
      campaign: "Valentine Glow Week",
      supplier: "GlowUp Hub",
      supplierInitials: "GH",
      brand: "GlowUp Hub",
      column: "todo",
      title: "Intro clip: unboxing + hook (15s)",
      type: "clip",
      priority: "high",
      dueLabel: "Today",
      dueAt: "2026-03-01T16:00:00.000Z",
      overdue: false,
      earnings: 120,
      currency: "USD",
      comments: [
        {
          id: "task_comment_1",
          author: "Supplier Manager",
          body: "Please keep the opening hook under 3 seconds.",
          createdAt: "2026-02-28T09:00:00.000Z"
        }
      ],
      attachments: []
    },
    {
      id: "task_2",
      userId,
      contractId: "contract_glowup",
      campaign: "Valentine Glow Week",
      supplier: "GlowUp Hub",
      supplierInitials: "GH",
      brand: "GlowUp Hub",
      column: "in_progress",
      title: "Live session: serum demo + consult CTA",
      type: "live",
      priority: "high",
      dueLabel: "Tomorrow",
      dueAt: "2026-03-02T14:00:00.000Z",
      overdue: false,
      earnings: 220,
      currency: "USD",
      comments: [],
      attachments: []
    },
    {
      id: "task_3",
      userId,
      contractId: "contract_gadgetmart",
      campaign: "Back-to-Work Essentials",
      supplier: "Urban Supply",
      supplierInitials: "US",
      brand: "Urban Supply",
      column: "awaiting_review",
      title: "VOD: backpack review (30-45s)",
      type: "video",
      priority: "medium",
      dueLabel: "In 2 days",
      dueAt: "2026-03-03T12:00:00.000Z",
      overdue: false,
      earnings: 150,
      currency: "USD",
      comments: [],
      attachments: []
    },
    {
      id: "task_4",
      userId,
      contractId: "contract_shopnow",
      campaign: "Home Essentials Drop",
      supplier: "ShopNow Foods",
      supplierInitials: "SF",
      brand: "ShopNow Foods",
      column: "needs_changes",
      title: "Live: recipe demo",
      type: "live",
      priority: "low",
      dueLabel: "Last week",
      dueAt: "2026-02-24T10:00:00.000Z",
      overdue: true,
      earnings: 80,
      currency: "USD",
      comments: [],
      attachments: []
    }
  ];

  const assets = [
    {
      id: "asset_hero_glowup",
      userId,
      title: "Hero image",
      subtitle: "Autumn Beauty Flash - GlowUp Hub",
      campaignId: "camp_glowup",
      supplierId: "seller_glowup",
      brand: "GlowUp Hub",
      tags: ["#ad", "#sponsored", "paid partnership"],
      mediaType: "image",
      source: "creator",
      ownerLabel: "Owner: Creator",
      status: "supplier_review",
      lastUpdatedLabel: "1h ago",
      previewUrl: "https://example.com/assets/glowup-hero.jpg",
      role: "hero"
    },
    {
      id: "asset_script_glowup",
      userId,
      title: "Opening script",
      subtitle: "Autumn Beauty Flash - GlowUp Hub",
      campaignId: "camp_glowup",
      supplierId: "seller_glowup",
      brand: "GlowUp Hub",
      tags: ["script"],
      mediaType: "document",
      source: "creator",
      ownerLabel: "Owner: Creator",
      status: "admin_review",
      lastUpdatedLabel: "Yesterday",
      previewUrl: "https://example.com/assets/glowup-script.pdf",
      role: "script"
    },
    {
      id: "asset_clip_gadgetmart",
      userId,
      title: "Hook clip",
      subtitle: "Tech Friday Mega Live - GadgetMart Africa",
      campaignId: "camp_gadgetmart",
      supplierId: "seller_gadgetmart",
      brand: "GadgetMart Africa",
      tags: ["clip", "tech"],
      mediaType: "video",
      source: "creator",
      ownerLabel: "Owner: Creator",
      status: "changes_requested",
      lastUpdatedLabel: "2 days ago",
      previewUrl: "https://example.com/assets/gadgetmart-hook.mp4",
      role: "item_video"
    }
  ];

  const liveSessions = [
    {
      id: "live_beauty_flash",
      userId,
      title: "Beauty Flash - Serum launch",
      campaignId: "camp_glowup",
      campaign: "Autumn Beauty Flash",
      sellerId: "seller_glowup",
      seller: "GlowUp Hub",
      weekday: "Thu",
      dateLabel: "Thu 10 Oct",
      scheduledFor: "2026-03-02T18:00:00.000Z",
      time: "6:00 PM EAT",
      location: "Remote studio",
      simulcast: ["TikTok Live", "Instagram Live"],
      status: "scheduled",
      role: "Host",
      durationMin: 60,
      scriptsReady: true,
      assetsReady: true,
      productsCount: 3,
      workloadScore: 74,
      conflict: false,
      studio: {
        mode: "lobby",
        micOn: true,
        camOn: true,
        screenShareOn: false,
        activeSceneId: "scene_intro",
        scenes: [
          { id: "scene_intro", label: "Intro Card" },
          { id: "scene_main", label: "Main Cam" },
          { id: "scene_split", label: "Split View" }
        ],
        products: [
          { id: "prod_serum", name: "Glow Serum", price: "$19", stock: "150 left", tag: "Best Seller" },
          { id: "prod_lipstick", name: "Matte Lipstick", price: "$12", stock: "85 left", tag: "Low Stock" },
          { id: "prod_spray", name: "Setting Spray", price: "$14", stock: "200 left", tag: "Fresh" }
        ],
        coHosts: [
          { id: 1, name: "Jessica M.", status: "Ready" },
          { id: 2, name: "David K.", status: "Standby" }
        ],
        chat: [
          { id: 1, from: "@Sarah99", body: "Can you show the texture again?", time: "18:02", system: false },
          { id: 2, from: "@MikeD", body: "Product Q", time: "18:03", system: false }
        ],
        momentMarkers: [
          { id: 1, time: "00:03:12", label: "Hook + serum demo" }
        ],
        commerceGoal: { soldUnits: 34, targetUnits: 120, cartCount: 19, last5MinSales: 7 }
      },
      builderState: {
        step: "featured-items",
        savedAt: now,
        draft: {
          id: "live_beauty_flash",
          title: "Beauty Flash - Serum launch",
          status: "Scheduled",
          supplierId: "pt_glowup",
          campaignId: "cp_autumn_beauty",
          products: [
            { id: "it_serum", name: "GlowUp Vitamin C Serum" },
            { id: "it_cleanser", name: "Barrier Repair Cleanser" }
          ],
          giveaways: [
            {
              id: "gw_seed_beauty_featured",
              source: "featured",
              campaignGiveawayId: "cg_cp_autumn_beauty_it_serum",
              linkedItemId: "it_serum",
              quantity: 50,
              showOnPromo: true
            },
            {
              id: "gw_seed_beauty_custom",
              source: "custom",
              campaignGiveawayId: "sgw_beauty_kit",
              title: "GlowUp Night Routine Kit",
              quantity: 1,
              showOnPromo: true
            }
          ]
        }
      }
    },
    {
      id: "live_tech_friday",
      userId,
      title: "Tech Friday - Gadgets Q&A",
      campaignId: "camp_gadgetmart",
      campaign: "Tech Friday Mega Live",
      sellerId: "seller_gadgetmart",
      seller: "GadgetMart Africa",
      weekday: "Fri",
      dateLabel: "Fri 11 Oct",
      scheduledFor: "2026-03-08T18:00:00.000Z",
      time: "6:00 PM EAT",
      location: "Remote studio",
      simulcast: ["YouTube Live", "Facebook Live"],
      status: "draft",
      role: "Host",
      durationMin: 75,
      scriptsReady: false,
      assetsReady: true,
      productsCount: 4,
      workloadScore: 81,
      conflict: false,
      studio: {
        mode: "builder",
        micOn: true,
        camOn: true,
        screenShareOn: true,
        activeSceneId: "scene_main",
        scenes: [
          { id: "scene_main", label: "Main Cam" },
          { id: "scene_product", label: "Product Focus" }
        ],
        products: [],
        coHosts: [],
        chat: [],
        momentMarkers: [],
        commerceGoal: { soldUnits: 0, targetUnits: 80, cartCount: 0, last5MinSales: 0 }
      },
      builderState: {
        step: "featured-items",
        savedAt: now,
        draft: {
          id: "live_tech_friday",
          title: "Tech Friday - Gadgets Q&A",
          status: "Draft",
          supplierId: "pt_gadget",
          campaignId: "cp_tech_friday",
          products: [
            { id: "it_powerbank", name: "VoltMax Pro - 30,000mAh" },
            { id: "it_cam", name: "SnapCam 4K Action - Creator Kit" }
          ],
          giveaways: [
            {
              id: "gw_seed_tech_featured",
              source: "featured",
              campaignGiveawayId: "cg_cp_tech_friday_it_powerbank",
              linkedItemId: "it_powerbank",
              quantity: 18,
              showOnPromo: true
            },
            {
              id: "gw_seed_tech_custom",
              source: "custom",
              campaignGiveawayId: "sgw_gift_card",
              title: "Tech Friday Gift Card",
              quantity: 1,
              showOnPromo: true
            }
          ]
        }
      }
    },
    {
      id: "live_faith_morning",
      userId,
      title: "Faith & Wellness Morning Dealz",
      campaignId: "camp_grace",
      campaign: "Faith & Wellness Morning Dealz",
      sellerId: "seller_grace",
      seller: "Grace Living Store",
      weekday: "Sat",
      dateLabel: "Sat 12 Oct",
      scheduledFor: "2026-03-09T08:00:00.000Z",
      time: "8:00 AM EAT",
      location: "Remote studio",
      simulcast: ["Instagram Live"],
      status: "scheduled",
      role: "Host",
      durationMin: 45,
      scriptsReady: true,
      assetsReady: false,
      productsCount: 2,
      workloadScore: 52,
      conflict: false,
      studio: {
        mode: "lobby",
        micOn: true,
        camOn: true,
        screenShareOn: false,
        activeSceneId: "scene_intro",
        scenes: [{ id: "scene_intro", label: "Intro Card" }],
        products: [],
        coHosts: [],
        chat: [],
        momentMarkers: [],
        commerceGoal: { soldUnits: 0, targetUnits: 60, cartCount: 0, last5MinSales: 0 }
      },
      builderState: {
        step: "featured-items",
        savedAt: now,
        draft: {
          id: "live_faith_morning",
          title: "Faith & Wellness Morning Dealz",
          status: "Scheduled",
          supplierId: "pt_grace",
          campaignId: "cp_wellness",
          products: [
            { id: "it_consult", name: "Live Consultation - Gadget Setup" }
          ],
          giveaways: [
            {
              id: "gw_seed_wellness_featured",
              source: "featured",
              campaignGiveawayId: "cg_cp_wellness_it_consult",
              linkedItemId: "it_consult",
              quantity: 4,
              showOnPromo: true
            }
          ]
        }
      }
    }
  ];

  const campaignGiveaways = [
    {
      id: "cg_cp_autumn_beauty_it_serum",
      campaignId: "cp_autumn_beauty",
      type: "featured",
      itemId: "it_serum",
      title: "GlowUp Vitamin C Serum",
      imageUrl: "https://example.com/assets/serum.jpg",
      notes: "Supplier-set giveaway quantity for the featured serum.",
      totalQuantity: 100
    },
    {
      id: "cg_cp_autumn_beauty_it_cleanser",
      campaignId: "cp_autumn_beauty",
      type: "featured",
      itemId: "it_cleanser",
      title: "Barrier Repair Cleanser",
      imageUrl: "https://example.com/assets/cleanser.jpg",
      notes: "Supplier-set giveaway quantity for cleanser winners.",
      totalQuantity: 40
    },
    {
      id: "sgw_beauty_kit",
      campaignId: "cp_autumn_beauty",
      type: "custom",
      title: "GlowUp Night Routine Kit",
      imageUrl: "https://example.com/assets/beauty-kit.jpg",
      notes: "Supplier custom giveaway kit.",
      totalQuantity: 6
    },
    {
      id: "sgw_vanity_pouch",
      campaignId: "cp_autumn_beauty",
      type: "custom",
      title: "Premium Vanity Pouch",
      imageUrl: "https://example.com/assets/vanity-pouch.jpg",
      notes: "Gift pouch supplied for live winners.",
      totalQuantity: 8
    },
    {
      id: "cg_cp_tech_friday_it_powerbank",
      campaignId: "cp_tech_friday",
      type: "featured",
      itemId: "it_powerbank",
      title: "VoltMax Pro - 30,000mAh",
      imageUrl: "https://example.com/assets/powerbank-item.jpg",
      notes: "Supplier-set giveaway quantity for the power bank offer.",
      totalQuantity: 60
    },
    {
      id: "cg_cp_tech_friday_it_cam",
      campaignId: "cp_tech_friday",
      type: "featured",
      itemId: "it_cam",
      title: "SnapCam 4K Action - Creator Kit",
      imageUrl: "https://example.com/assets/camera.jpg",
      notes: "Supplier-set giveaway quantity for camera creators.",
      totalQuantity: 12
    },
    {
      id: "sgw_ring_light",
      campaignId: "cp_tech_friday",
      type: "custom",
      title: "Creator Ring Light Kit",
      imageUrl: "https://example.com/assets/ring-light.jpg",
      notes: "Supplier-approved creator kit giveaway.",
      totalQuantity: 4
    },
    {
      id: "sgw_gift_card",
      campaignId: "cp_tech_friday",
      type: "custom",
      title: "Tech Friday Gift Card",
      imageUrl: "https://example.com/assets/gift-card.jpg",
      notes: "Digital voucher for live-session winners.",
      totalQuantity: 5
    },
    {
      id: "cg_cp_wellness_it_consult",
      campaignId: "cp_wellness",
      type: "featured",
      itemId: "it_consult",
      title: "Live Consultation - Gadget Setup",
      imageUrl: "https://example.com/assets/consultation.jpg",
      notes: "Supplier-set consultation giveaway slots.",
      totalQuantity: 15
    },
    {
      id: "cg_cp_wellness_it_repair",
      campaignId: "cp_wellness",
      type: "featured",
      itemId: "it_repair",
      title: "On-site Device Repair Quote",
      imageUrl: "https://example.com/assets/repair.jpg",
      notes: "Supplier-set quote giveaway capacity.",
      totalQuantity: 10
    },
    {
      id: "sgw_consult_credit",
      campaignId: "cp_wellness",
      type: "custom",
      title: "Wellness Consultation Credit",
      imageUrl: "https://example.com/assets/consult-credit.jpg",
      notes: "Supplier-set service credit for booked attendees.",
      totalQuantity: 3
    }
  ];

  const replays = [
    {
      id: "replay_glowup",
      sessionId: "live_beauty_flash",
      title: "Autumn Beauty Flash - Serum launch",
      date: "2026-02-28T18:30:00.000Z",
      hook: "Strong hook",
      retention: "High retention",
      notes: ["Serum focus", "High comment volume", "Flash deal countdown"],
      published: true,
      replayUrl: "https://mylivedealz.com/replay/live_beauty_flash",
      coverUrl: "https://example.com/assets/replay-glowup-cover.jpg",
      allowComments: true,
      showProductStrip: true,
      clips: [
        { id: "clip_glowup_hook", title: "Hook + first demo", startSec: 15, endSec: 75, format: "9:16", status: "Ready" },
        { id: "clip_glowup_offer", title: "Flash deal countdown", startSec: 900, endSec: 945, format: "1:1", status: "Ready" }
      ],
      updatedAt: now,
      publishedAt: now,
      scheduledPublishAt: null,
      views: 1543,
      sales: 62,
      durationSec: 4365
    },
    {
      id: "replay_gadgetmart",
      sessionId: "live_tech_friday",
      title: "Tech Friday Mega Live - Gadgets Q&A",
      date: "2026-02-27T20:00:00.000Z",
      hook: "Q&A heavy",
      retention: "Late peak",
      notes: ["Bundle upsells", "Replay available"],
      published: false,
      replayUrl: "https://mylivedealz.com/replay/live_tech_friday",
      coverUrl: "https://example.com/assets/replay-tech-cover.jpg",
      allowComments: true,
      showProductStrip: true,
      clips: [
        { id: "clip_tech_unboxing", title: "Gadget unboxing", startSec: 120, endSec: 180, format: "9:16", status: "Draft" }
      ],
      updatedAt: now,
      publishedAt: null,
      scheduledPublishAt: null,
      views: 2310,
      sales: 87,
      durationSec: 5283
    },
    {
      id: "replay_grace",
      sessionId: "live_faith_morning",
      title: "Faith & Wellness Morning Dealz",
      date: "2026-02-26T08:00:00.000Z",
      hook: "Soft opener",
      retention: "High replay",
      notes: ["Community chat", "High trust tone"],
      published: true,
      replayUrl: "https://mylivedealz.com/replay/live_faith_morning",
      coverUrl: "https://example.com/assets/replay-faith-cover.jpg",
      allowComments: true,
      showProductStrip: false,
      clips: [
        { id: "clip_faith_intro", title: "Warm welcome", startSec: 30, endSec: 90, format: "9:16", status: "Ready" }
      ],
      updatedAt: now,
      publishedAt: now,
      scheduledPublishAt: null,
      views: 987,
      sales: 29,
      durationSec: 3250
    }
  ];

  const reviews = [
    {
      id: "review_beauty_1",
      userId,
      creatorId,
      creatorName: creatorProfile.name,
      creatorHandle: `@${creatorProfile.handle}`,
      memberId: "member_1",
      sessionId: "live_beauty_flash",
      sessionTitle: "GlowUp Beauty Flash Live",
      endedAt: "2026-03-02T19:00:00.000Z",
      overallRating: 5,
      categoryRatings: {
        presentation: 5,
        helpfulness: 5,
        productKnowledge: 4.8,
        interaction: 4.9,
        trust: 4.9
      },
      quickTags: ["Clear demos", "Great pacing", "Trustworthy"],
      issueTags: ["Wanted more Q&A"],
      reviewText: "Loved the way the routine was explained and the checkout prompt felt natural.",
      note: "Loved the way the routine was explained and the checkout prompt felt natural.",
      dimension: "Overall experience",
      score: 5,
      wouldJoinAgain: true,
      transactionIntent: "bought",
      publicReview: true,
      anonymous: false,
      createdAt: "2026-03-02T19:18:00.000Z"
    },
    {
      id: "review_beauty_2",
      userId,
      creatorId,
      creatorName: creatorProfile.name,
      creatorHandle: `@${creatorProfile.handle}`,
      memberId: "member_1",
      sessionId: "live_beauty_flash",
      sessionTitle: "GlowUp Beauty Flash Live",
      endedAt: "2026-03-02T19:00:00.000Z",
      overallRating: 4,
      categoryRatings: {
        presentation: 4.2,
        helpfulness: 4.4,
        productKnowledge: 4.1,
        interaction: 3.8,
        trust: 4.5
      },
      quickTags: ["Good offer timing"],
      issueTags: ["Volume dips", "Wanted ingredient recap"],
      reviewText: "The live was strong overall, but I missed some details when the audio dipped near the middle.",
      note: "Strong overall, but the audio dipped near the middle.",
      dimension: "Trust & clarity",
      score: 4,
      wouldJoinAgain: true,
      transactionIntent: "added_to_cart",
      publicReview: false,
      anonymous: true,
      createdAt: "2026-03-02T19:24:00.000Z"
    },
    {
      id: "review_tech_1",
      userId,
      creatorId,
      creatorName: creatorProfile.name,
      creatorHandle: `@${creatorProfile.handle}`,
      memberId: "member_1",
      sessionId: "live_tech_friday",
      sessionTitle: "Tech Friday Deals Live",
      endedAt: "2026-02-28T18:30:00.000Z",
      overallRating: 5,
      categoryRatings: {
        presentation: 4.8,
        helpfulness: 4.9,
        productKnowledge: 5,
        interaction: 4.7,
        trust: 4.8
      },
      quickTags: ["Very knowledgeable", "Answered fast"],
      issueTags: [],
      reviewText: "Best explanation of battery life and shipping timelines I have heard on a gadget live.",
      note: "Excellent product knowledge and shipping clarity.",
      dimension: "Product / service knowledge",
      score: 5,
      wouldJoinAgain: true,
      transactionIntent: "requested_quote",
      publicReview: true,
      anonymous: false,
      createdAt: "2026-02-28T18:44:00.000Z"
    },
    {
      id: "review_tech_2",
      userId,
      creatorId,
      creatorName: creatorProfile.name,
      creatorHandle: `@${creatorProfile.handle}`,
      memberId: "member_1",
      sessionId: "live_tech_friday",
      sessionTitle: "Tech Friday Deals Live",
      endedAt: "2026-02-28T18:30:00.000Z",
      overallRating: 4,
      categoryRatings: {
        presentation: 4.1,
        helpfulness: 4.2,
        productKnowledge: 4.5,
        interaction: 4,
        trust: 4.2
      },
      quickTags: ["Helpful comparison"],
      issueTags: ["Too fast at the end"],
      reviewText: "The comparison was useful, but the closing bundle summary moved a bit too fast.",
      note: "Helpful comparison but the closing summary was rushed.",
      dimension: "Presentation & energy",
      score: 4,
      wouldJoinAgain: true,
      transactionIntent: "just_watched",
      publicReview: true,
      anonymous: false,
      createdAt: "2026-02-28T18:51:00.000Z"
    },
    {
      id: "review_faith_1",
      userId,
      creatorId,
      creatorName: creatorProfile.name,
      creatorHandle: `@${creatorProfile.handle}`,
      memberId: "member_1",
      sessionId: "live_faith_morning",
      sessionTitle: "Faith & Wellness Morning Live",
      endedAt: "2026-02-24T09:00:00.000Z",
      overallRating: 5,
      categoryRatings: {
        presentation: 4.9,
        helpfulness: 4.8,
        productKnowledge: 4.7,
        interaction: 5,
        trust: 5
      },
      quickTags: ["Warm tone", "Community feel", "Trustworthy"],
      issueTags: [],
      reviewText: "Very calming but still clear on the offer and why it mattered. Felt safe to buy from.",
      note: "Warm, clear, and safe buying experience.",
      dimension: "Audience interaction",
      score: 5,
      wouldJoinAgain: true,
      transactionIntent: "bought",
      publicReview: true,
      anonymous: false,
      createdAt: "2026-02-24T09:15:00.000Z"
    },
    {
      id: "review_team_amina_1",
      userId: "user_amina",
      creatorId: "creator_amina",
      creatorName: "Amina K.",
      creatorHandle: "@amina.live",
      memberId: "member_2",
      sessionId: "session_amina_highlights",
      sessionTitle: "Amina Highlight Reel Review",
      endedAt: "2026-03-01T17:30:00.000Z",
      overallRating: 4,
      categoryRatings: {
        presentation: 4.4,
        helpfulness: 4.2,
        productKnowledge: 4.1,
        interaction: 4,
        trust: 4.3
      },
      quickTags: ["Clean transitions", "Professional"],
      issueTags: ["Wanted more product depth"],
      reviewText: "Amina handled the flow professionally and kept transitions clean, but more product detail would help conversions.",
      note: "Professional flow with room for deeper product detail.",
      dimension: "Presentation & energy",
      score: 4,
      wouldJoinAgain: true,
      transactionIntent: "added_to_cart",
      publicReview: false,
      anonymous: true,
      createdAt: "2026-03-01T17:46:00.000Z"
    },
    {
      id: "review_team_amina_2",
      userId: "user_amina",
      creatorId: "creator_amina",
      creatorName: "Amina K.",
      creatorHandle: "@amina.live",
      memberId: "member_2",
      sessionId: "session_amina_highlights",
      sessionTitle: "Amina Highlight Reel Review",
      endedAt: "2026-03-01T17:30:00.000Z",
      overallRating: 5,
      categoryRatings: {
        presentation: 4.8,
        helpfulness: 4.7,
        productKnowledge: 4.6,
        interaction: 4.8,
        trust: 4.9
      },
      quickTags: ["Confident delivery", "Good CTA timing"],
      issueTags: [],
      reviewText: "Confident delivery and excellent CTA timing. Felt like a polished co-host segment.",
      note: "Confident delivery with strong CTA timing.",
      dimension: "Trust & clarity",
      score: 5,
      wouldJoinAgain: true,
      transactionIntent: "booked",
      publicReview: true,
      anonymous: false,
      createdAt: "2026-03-01T18:05:00.000Z"
    }
  ];

  const adzCampaigns = [
    {
      id: "adz_glowup_serum",
      userId,
      campaignId: "camp_glowup",
      campaignName: "Autumn Beauty Flash - Serum Promo",
      campaignSubtitle: "Limited-time drops - Host-first",
      sellerId: "seller_glowup",
      supplier: { name: "GlowUp Hub", category: "Beauty", logoUrl: "" },
      creator: { name: "Ronald Isabirye", handle: "@ronald.creates", avatarUrl: "", verified: true },
      status: "pending_approval",
      platforms: ["Instagram Story", "TikTok profile"],
      startISO: "2026-03-02T12:00:00.000Z",
      endISO: "2026-03-05T22:00:00.000Z",
      timezone: "Africa/Kampala",
      heroImageUrl: "https://example.com/assets/serum-hero.jpg",
      heroIntroVideoUrl: "",
      compensation: { model: "flat_fee_plus_commission", flatFee: 200, commissionPct: 5, currency: "USD" },
      offers: [
        { id: "offer_serum", type: "product", name: "GlowUp Serum Bundle", currency: "USD", price: 19, stockLeft: 150, posterUrl: "https://example.com/assets/serum.jpg" }
      ],
      generated: true,
      hasBrokenLink: false,
      lowStock: false,
      performance: {
        period: "7d",
        clicks: 832,
        purchases: 74,
        conversionPct: 8.9,
        earnings: 238,
        byPlatform: [
          { platform: "Instagram Story", clicks: 420, purchases: 38 },
          { platform: "TikTok profile", clicks: 412, purchases: 36 }
        ]
      }
    },
    {
      id: "adz_powerbank",
      userId,
      campaignId: "camp_gadgetmart",
      campaignName: "Flash Dealz: Power Bank",
      campaignSubtitle: "Limited-time drops",
      sellerId: "seller_gadgetmart",
      supplier: { name: "GadgetMart Africa", category: "Tech", logoUrl: "" },
      creator: { name: "Ronald Isabirye", handle: "@ronald.creates", avatarUrl: "", verified: true },
      status: "live",
      platforms: ["Instagram Feed", "WhatsApp"],
      startISO: "2026-03-01T08:00:00.000Z",
      endISO: "2026-03-03T18:00:00.000Z",
      timezone: "Africa/Kampala",
      heroImageUrl: "https://example.com/assets/powerbank.jpg",
      heroIntroVideoUrl: "",
      compensation: { model: "flat_fee", flatFee: 180, commissionPct: 0, currency: "USD" },
      offers: [
        { id: "offer_powerbank", type: "product", name: "20,000mAh Power Bank", currency: "USD", price: 22, stockLeft: 64, posterUrl: "https://example.com/assets/powerbank-item.jpg" }
      ],
      generated: true,
      hasBrokenLink: false,
      lowStock: true,
      performance: {
        period: "7d",
        clicks: 1240,
        purchases: 96,
        conversionPct: 7.7,
        earnings: 180,
        byPlatform: [
          { platform: "Instagram Feed", clicks: 700, purchases: 52 },
          { platform: "WhatsApp", clicks: 540, purchases: 44 }
        ]
      }
    }
  ];

  const links = [
    {
      id: "link_beauty_story",
      userId,
      tab: "live",
      title: "LIVE TODAY: Beauty Flash Dealz",
      subtitle: "Limited stock + live-only discounts",
      status: "scheduled",
      createdAt: "2026-02-28T09:00:00.000Z",
      updatedAt: now,
      expiresAt: "2026-03-05T23:59:59.000Z",
      campaign: { id: "camp_glowup", name: "Beauty Flash Dealz" },
      supplier: { name: "GlowUp Hub", type: "Seller" },
      primaryUrl: "https://mylivedealz.com/live/live_beauty_flash?creator=ronald.creates",
      shortUrl: "https://go.mylivedealz.com/bf1",
      channels: [
        { name: "Instagram Story", url: "https://go.mylivedealz.com/bf1?ch=ig_story", hint: "Best for Stories" },
        { name: "YouTube Shorts", url: "https://go.mylivedealz.com/bf1?ch=yt_shorts", hint: "Best for replay discovery" },
        { name: "WhatsApp", url: "https://go.mylivedealz.com/bf1?ch=whatsapp", hint: "Best for broadcasts" }
      ],
      metrics: { clicks: 842, purchases: 73, conversionPct: 8.7, earnings: 238, currency: "USD" },
      regionVariants: [
        { region: "Global", url: "https://go.mylivedealz.com/bf1", note: "Default" },
        { region: "Africa", url: "https://go.mylivedealz.com/bf1?rg=af", note: "Regional targeting" }
      ],
      regionMetrics: [
        { region: "Global", clicks: 842, purchases: 73, conversionPct: 8.7, earnings: 238, currency: "USD" },
        { region: "Africa", clicks: 610, purchases: 55, conversionPct: 9.0, earnings: 188, currency: "USD" }
      ],
      sharePack: {
        headline: "LIVE TODAY: Beauty Flash Dealz",
        bullets: ["Live-only discounts", "Verified seller inventory", "Tracked link supports creator earnings"],
        captions: [
          { platform: "Instagram", text: "Going live today. Join and shop with my tracked link: {LINK}" },
          { platform: "WhatsApp", text: "Join today's Beauty Flash Dealz live here: {LINK}" }
        ],
        hashtags: ["#MyLiveDealz", "#BeautyDealz", "#ShopLive"]
      },
      pinned: true,
      note: "Primary launch link"
    },
    {
      id: "link_tech_replay",
      userId,
      tab: "live",
      title: "REPLAY: Tech Friday Mega Live",
      subtitle: "Watch the demo, then shop",
      status: "active",
      createdAt: "2026-02-25T10:00:00.000Z",
      updatedAt: now,
      campaign: { id: "camp_gadgetmart", name: "Tech Friday Mega" },
      supplier: { name: "GadgetMart Africa", type: "Seller" },
      primaryUrl: "https://mylivedealz.com/replay/live_tech_friday?creator=ronald.creates",
      shortUrl: "https://go.mylivedealz.com/tf1",
      channels: [
        { name: "Instagram Feed", url: "https://go.mylivedealz.com/tf1?ch=ig_feed", hint: "Best for evergreen" },
        { name: "Telegram", url: "https://go.mylivedealz.com/tf1?ch=telegram", hint: "Best for communities" }
      ],
      metrics: { clicks: 640, purchases: 41, conversionPct: 6.4, earnings: 172, currency: "USD" },
      regionVariants: [
        { region: "Global", url: "https://go.mylivedealz.com/tf1", note: "Default" }
      ],
      regionMetrics: [
        { region: "Global", clicks: 640, purchases: 41, conversionPct: 6.4, earnings: 172, currency: "USD" }
      ],
      sharePack: {
        headline: "REPLAY: Tech Friday Mega Live",
        bullets: ["Watch the demo", "Track conversions", "Keep replay traffic measurable"],
        captions: [
          { platform: "Instagram", text: "Replay is live. Watch and shop here: {LINK}" }
        ],
        hashtags: ["#MyLiveDealz", "#Replay", "#TechDealz"]
      },
      pinned: true,
      note: "Evergreen replay link"
    },
    {
      id: "link_adz_serum",
      userId,
      tab: "shoppable",
      title: "Shoppable Ad: GlowUp Serum Bundle",
      subtitle: "Limited-time host-first promo",
      status: "active",
      createdAt: "2026-03-01T08:00:00.000Z",
      updatedAt: now,
      campaign: { id: "adz_glowup_serum", name: "Autumn Beauty Flash - Serum Promo" },
      supplier: { name: "GlowUp Hub", type: "Seller" },
      primaryUrl: "https://mylivedealz.com/a/adz_glowup_serum?ref=ronald.creates",
      shortUrl: "https://go.mylivedealz.com/serum1",
      channels: [
        { name: "Instagram Story", url: "https://go.mylivedealz.com/serum1?ch=ig_story", hint: "Swipe-up traffic" },
        { name: "TikTok Profile", url: "https://go.mylivedealz.com/serum1?ch=tiktok", hint: "Best for reach" }
      ],
      metrics: { clicks: 832, purchases: 74, conversionPct: 8.9, earnings: 238, currency: "USD" },
      regionVariants: [
        { region: "Global", url: "https://go.mylivedealz.com/serum1", note: "Default" },
        { region: "EU/UK", url: "https://go.mylivedealz.com/serum1?rg=eu", note: "Price test" }
      ],
      regionMetrics: [
        { region: "Global", clicks: 832, purchases: 74, conversionPct: 8.9, earnings: 238, currency: "USD" },
        { region: "EU/UK", clicks: 162, purchases: 16, conversionPct: 9.9, earnings: 51, currency: "USD" }
      ],
      sharePack: {
        headline: "GlowUp Serum Bundle",
        bullets: ["Tracked short link", "Attribution-ready", "Supports ad reporting"],
        captions: [
          { platform: "TikTok", text: "Shop the GlowUp Serum bundle from my tracked link: {LINK}" },
          { platform: "Instagram", text: "Flash promo now live. Shop here: {LINK}" }
        ],
        hashtags: ["#MyLiveDealz", "#GlowUp", "#ShoppableAd"]
      },
      pinned: false,
      note: "Primary shoppable ad link"
    }
  ];

  const earnings = {
    userId,
    summary: { available: 1430, pending: 680, projected: 1710, lifetime: 12840, currency: "USD" },
    composition: {
      flatFees: 4800,
      commission: 2800,
      bonuses: 600
    },
    byCampaign: [
      { label: "Autumn Beauty Flash", total: 540, category: "Beauty", seller: "GlowUp Hub" },
      { label: "Tech Friday Mega Live", total: 720, category: "Tech", seller: "GadgetMart Africa" },
      { label: "Faith & Wellness Morning", total: 170, category: "Faith", seller: "Grace Living Store" }
    ],
    bySeller: [
      { label: "GlowUp Hub", total: 540 },
      { label: "GadgetMart Africa", total: 720 },
      { label: "Grace Living Store", total: 170 }
    ],
    byMonth: [
      { label: "Jan 2026", total: 1120, projected: 1180, growth: 5 },
      { label: "Feb 2026", total: 1360, projected: 1440, growth: 7 },
      { label: "Mar 2026", total: 1430, projected: 1710, growth: 12 }
    ],
    forecast: {
      month: "Mar 2026",
      current: 1430,
      projected: 1710,
      growth: 12
    },
    payoutPolicy: {
      feeLabel: "$0.00 (Free for Silver Tier)",
      settlementWindow: "Within 48 Hours"
    },
    notes: [
      "Commission is driving most of your upside this month.",
      "Tech Friday is your strongest live-to-sale converter right now.",
      "Keeping payout details verified helps avoid review holds."
    ],
    lastUpdatedAt: "2026-03-03T09:15:00.000Z"
  };

  const payouts = [
    {
      id: "payout_1",
      userId,
      date: "2026-02-28",
      requestedAt: "2026-02-27T13:10:00.000Z",
      amount: 520,
      currency: "USD",
      status: "Paid",
      method: "Bank transfer",
      recipient: "MyLive Bank • Ronald Isabirye • ****1024",
      estimatedSettlement: "Paid in 1 business day",
      fee: 0,
      netAmount: 520,
      notes: "Completed to verified bank account.",
      reference: "MLDZ-P-1001"
    },
    {
      id: "payout_2",
      userId,
      date: "2026-02-21",
      requestedAt: "2026-02-20T16:25:00.000Z",
      amount: 300,
      currency: "USD",
      status: "Paid",
      method: "Mobile money",
      recipient: "MTN ****222",
      estimatedSettlement: "Paid same day",
      fee: 0,
      netAmount: 300,
      notes: "Processed to mobile money.",
      reference: "MLDZ-P-1000"
    },
    {
      id: "payout_3",
      userId,
      date: "2026-03-03",
      requestedAt: "2026-03-03T08:45:00.000Z",
      amount: 250,
      currency: "USD",
      status: "Scheduled",
      method: "Bank transfer",
      recipient: "MyLive Bank • Ronald Isabirye • ****1024",
      estimatedSettlement: "Within 48 Hours",
      fee: 0,
      netAmount: 250,
      notes: "Queued for next payout run.",
      reference: "MLDZ-P-1002"
    }
  ];

  const analytics = {
    userId,
    availableRanges: ["7", "30", "90"],
    availableCategories: ["All", "Beauty", "Tech", "Faith"],
    rank: {
      currentTier: "Silver",
      nextTier: "Gold",
      progressPercent: 68,
      pointsCurrent: 2040,
      pointsToNext: 3000,
      benefits: {
        Bronze: ["Basic access to campaigns", "Standard support"],
        Silver: ["Priority placement in campaign searches", "Access to mid-tier budgets", "Basic analytics & reporting"],
        Gold: ["Priority support", "High-budget campaigns & early invites", "Deeper analytics & training"]
      }
    },
    benchmarks: {
      viewersPercentile: 78,
      ctrPercentile: 72,
      conversionPercentile: 83,
      salesPercentile: 80
    },
    metricsByCategory: {
      All: {
        "7": { avgViewers: 2380, ctr: 5.4, conversion: 4.6, salesDriven: 4380 },
        "30": { avgViewers: 2300, ctr: 5.1, conversion: 4.8, salesDriven: 4200 },
        "90": { avgViewers: 2210, ctr: 4.9, conversion: 4.5, salesDriven: 3980 }
      },
      Beauty: {
        "7": { avgViewers: 2520, ctr: 5.8, conversion: 5.1, salesDriven: 4720 },
        "30": { avgViewers: 2440, ctr: 5.5, conversion: 5.0, salesDriven: 4510 },
        "90": { avgViewers: 2360, ctr: 5.2, conversion: 4.8, salesDriven: 4300 }
      },
      Tech: {
        "7": { avgViewers: 2420, ctr: 5.6, conversion: 4.4, salesDriven: 4590 },
        "30": { avgViewers: 2350, ctr: 5.3, conversion: 4.2, salesDriven: 4380 },
        "90": { avgViewers: 2280, ctr: 5.0, conversion: 4.0, salesDriven: 4120 }
      },
      Faith: {
        "7": { avgViewers: 1950, ctr: 4.8, conversion: 4.0, salesDriven: 3120 },
        "30": { avgViewers: 1880, ctr: 4.5, conversion: 3.9, salesDriven: 2960 },
        "90": { avgViewers: 1810, ctr: 4.3, conversion: 3.7, salesDriven: 2810 }
      }
    },
    campaigns: [
      { id: "analytics_camp_1", name: "Autumn Beauty Flash", seller: "GlowUp Hub", category: "Beauty", sales: 2600, engagements: 4300, convRate: 4.8 },
      { id: "analytics_camp_2", name: "Tech Friday Mega Live", seller: "GadgetMart Africa", category: "Tech", sales: 3100, engagements: 5200, convRate: 4.2 },
      { id: "analytics_camp_3", name: "Faith & Wellness Morning Dealz", seller: "Grace Living Store", category: "Faith", sales: 1200, engagements: 2100, convRate: 3.9 },
      { id: "analytics_camp_4", name: "Gadget Unboxing Marathon", seller: "GadgetMart Africa", category: "Tech", sales: 1800, engagements: 4800, convRate: 3.1 },
      { id: "analytics_camp_5", name: "Beauty Flash + Night Care", seller: "GlowUp Hub", category: "Beauty", sales: 900, engagements: 1600, convRate: 4.5 }
    ],
    trend: Array.from({ length: 90 }, (_, index) => {
      const day = index + 1;
      const beautyBoost = day % 3 === 0 ? 1.12 : 1;
      const techBoost = day % 5 === 0 ? 1.15 : 1;
      const faithBoost = day % 7 === 0 ? 1.08 : 1;
      return {
        label: `Day ${day}`,
        views: Math.round(1800 + day * 7 + Math.sin(day / 4) * 120),
        clicks: Math.round(250 + day * 1.8 + Math.cos(day / 5) * 25),
        conversions: Math.round(16 + day * 0.08 + Math.sin(day / 6) * 2),
        sales: Math.round(420 + day * 9 + Math.sin(day / 7) * 55),
        categories: {
          Beauty: { sales: Math.round((420 + day * 9) * 0.42 * beautyBoost), conversions: Math.round((16 + day * 0.08) * 0.4 * beautyBoost) },
          Tech: { sales: Math.round((420 + day * 9) * 0.38 * techBoost), conversions: Math.round((16 + day * 0.08) * 0.34 * techBoost) },
          Faith: { sales: Math.round((420 + day * 9) * 0.2 * faithBoost), conversions: Math.round((16 + day * 0.08) * 0.26 * faithBoost) }
        }
      };
    }),
    goals: [
      { id: "goal_1", label: "Average viewers per live", current: 2300, target: 2600, unit: "viewers" },
      { id: "goal_2", label: "Conversion rate", current: 4.8, target: 5.2, unit: "%" },
      { id: "goal_3", label: "Monthly sales driven", current: 4200, target: 6000, unit: "USD" }
    ],
    recommendations: [
      "Open Beauty lives with the strongest supplier hero product in the first 90 seconds.",
      "Add a mid-live CTA reminder in Tech sessions after the second demo block.",
      "Bundle replay clips with tracked links within one hour of ending the live."
    ],
    leaderboard: [
      { creator: "Amina K.", score: 95, tier: "Gold" },
      { creator: "Ronald Isabirye", score: 92, tier: "Silver" },
      { creator: "Noah K.", score: 88, tier: "Silver" }
    ],
    lastUpdatedAt: "2026-03-03T09:10:00.000Z"
  };

  const notifications = [
    {
      id: "notif_1",
      userId,
      type: "proposal",
      title: "New proposal from GlowUp Hub",
      message: "Review proposal",
      brand: "GlowUp Hub",
      campaign: "Autumn Beauty Flash",
      createdAt: "2026-03-01T08:00:00.000Z",
      read: false,
      link: "/proposals"
    },
    {
      id: "notif_2",
      userId,
      type: "contract",
      title: "Invite accepted - contract draft ready",
      message: "Open contract",
      brand: "GadgetMart Africa",
      campaign: "Tech Friday Mega Live",
      createdAt: "2026-02-28T18:00:00.000Z",
      read: false,
      link: "/contracts"
    },
    {
      id: "notif_3",
      userId,
      type: "live",
      title: "Live starts in 45 minutes",
      message: "Open Live Studio",
      brand: "GlowUp Hub",
      campaign: "Beauty Flash Live",
      createdAt: "2026-03-01T09:00:00.000Z",
      read: false,
      link: "/live-studio"
    },
    {
      id: "notif_4",
      userId,
      type: "payout",
      title: "Payout scheduled",
      message: "View payouts",
      brand: "Finance",
      campaign: "Payout",
      createdAt: "2026-02-27T12:00:00.000Z",
      read: true,
      link: "/payout-history"
    },
    {
      id: "notif_5",
      userId,
      type: "media",
      title: "Clips from your last live are ready",
      message: "Review clips",
      brand: "Media",
      campaign: "Autumn Beauty",
      createdAt: "2026-02-26T14:00:00.000Z",
      read: true,
      link: "/live-history"
    }
  ];

  const settings = {
    userId,
    profile: {
      name: creatorProfile.name,
      handle: creatorProfile.handle,
      tagline: creatorProfile.tagline,
      country: "Uganda",
      timezone: "Africa/Kampala",
      currency: "USD",
      bio: creatorProfile.bio,
      email: "creator@mylivedealz.com",
      phone: "+256700000000",
      whatsapp: "+256700000000",
      contentLanguages: creatorProfile.languages,
      audienceRegions: creatorProfile.regions,
      creatorType: "Individual"
    },
    preferences: {
      lines: ["Beauty", "Tech", "Faith"],
      models: ["Flat fee", "Flat fee + commission"],
      formats: ["Live Sessionz", "Shoppable Adz", "Replay clips", "UGC"],
      inviteRules: "Auto-allow open collaboration invites, review invite-only manually.",
      supplierType: "Seller + Provider",
      availability: {
        days: ["Mon", "Tue", "Thu", "Fri", "Sun"],
        timeWindow: "08:00 - 20:00 EAT"
      }
    },
    socials: {
      instagram: "@ronald.creates",
      tiktok: "@ronald.creates.live",
      youtube: "https://youtube.com/@ronaldcreates",
      primaryPlatform: "instagram",
      primaryOtherPlatform: "",
      primaryOtherCustomName: "",
      primaryOtherHandle: "",
      primaryOtherFollowers: "",
      extra: []
    },
    review: {
      seenPolicies: { platform: true, content: true, payout: true },
      scrolledToBottom: true,
      confirmMultiUserCompliance: false,
      acceptTerms: true,
      acceptedAt: "2026-02-20T09:15:00.000Z"
    },
    settings: {
      calendar: {
        shareAvailability: true,
        visibility: "Admins only",
        googleConnected: false
      },
      notifications: {
        proposals: true,
        liveReminders: true,
        payouts: true,
        securityAlerts: true,
        calendarUpdates: true,
        platformNews: false
      },
      privacy: {
        profileVisibility: "Public",
        allowDMsFrom: "All suppliers",
        allowExternalGuests: true,
        blockedSellers: ["Fake Dealz Ltd"]
      },
      devices: [
        { id: "device_1", name: "Chrome on MacBook", lastActive: "Today" },
        { id: "device_2", name: "Safari on iPhone", lastActive: "Yesterday" }
      ],
      audit: [
        { id: "audit_settings_seed", when: "2026-02-24T08:30:00.000Z", what: "Settings initialized", meta: "Seed settings profile" }
      ]
    },
    kyc: {
      status: "verified",
      documentType: "Passport",
      idUploaded: true,
      selfieUploaded: true,
      addressUploaded: true
    },
    payout: {
      method: "Bank transfer",
      methodType: "bank",
      detail: "MyLive Bank • Ronald Isabirye • ****1024",
      currency: "USD",
      schedule: "Weekly",
      minThreshold: 50,
      bank: {
        accountName: "Ronald Isabirye",
        bankName: "MyLive Bank",
        accountNumberMasked: "****1024"
      },
      mobile: { provider: "MTN", numberMasked: "****222" },
      verification: { status: "verified" },
      tax: { tinMasked: "TIN-***-118" },
      acceptPayoutPolicy: true
    },
    notifications: {
      proposals: true,
      liveReminders: true,
      payouts: true,
      securityAlerts: true,
      calendarUpdates: true,
      platformNews: false
    },
    security: {
      twoFactorEnabled: true,
      devices: [
        { id: "device_1", name: "Chrome on MacBook", lastActive: "Today" },
        { id: "device_2", name: "Safari on iPhone", lastActive: "Yesterday" }
      ]
    }
  };

  const uploads = [
    {
      id: "upload_seed_media_kit",
      userId,
      name: "ronald-media-kit.pdf",
      fileName: "ronald-media-kit.pdf",
      mimeType: "application/pdf",
      kind: "document",
      size: 1488896,
      purpose: "settings_media_kit",
      relatedEntityType: "settings",
      relatedEntityId: userId,
      status: "stored",
      createdAt: "2026-02-24T08:30:00.000Z",
      url: "mldz://upload/upload_seed_media_kit/ronald-media-kit.pdf"
    }
  ];

  const onboardingWorkflows = [
    {
      userId,
      stepIndex: 5,
      maxUnlocked: 5,
      savedAt: "2026-02-20T09:00:00.000Z",
      submittedAt: "2026-02-20T09:15:00.000Z",
      approvalApplicationId: "approval_seed_ronald",
      form: {
        profile: {
          name: creatorProfile.name,
          handle: `@${creatorProfile.handle}`,
          tagline: creatorProfile.tagline,
          country: "Uganda",
          timezone: "Africa/Kampala",
          currency: "USD",
          bio: creatorProfile.bio,
          contentLanguages: creatorProfile.languages,
          audienceRegions: creatorProfile.regions,
          creatorType: "Individual",
          email: "creator@mylivedealz.com",
          phone: "+256700000000",
          whatsapp: "+256700000000",
          profilePhotoName: "ronald-avatar.png",
          mediaKitName: "ronald-media-kit.pdf",
          team: { name: "", type: "", size: "", website: "", logoName: "" },
          agency: { name: "", type: "", website: "", logoName: "" }
        },
        socials: {
          instagram: "@ronald.creates",
          tiktok: "@ronald.creates.live",
          youtube: "https://youtube.com/@ronaldcreates",
          primaryPlatform: "Instagram",
          primaryOtherPlatform: "",
          primaryOtherCustomName: "",
          primaryOtherHandle: "",
          primaryOtherFollowers: "",
          extra: []
        },
        kyc: {
          status: "verified",
          documentType: "Passport",
          idFileName: "passport.pdf",
          selfieFileName: "selfie.png",
          addressFileName: "utility-bill.pdf",
          idUploaded: true,
          selfieUploaded: true,
          addressUploaded: true,
          org: {
            registrationFileName: "",
            taxFileName: "",
            authorizationFileName: "",
            registrationUploaded: false,
            taxUploaded: false,
            authorizationUploaded: false
          }
        },
        payout: {
          method: "Bank transfer",
          currency: "USD",
          schedule: "Weekly",
          minThreshold: 50,
          acceptPayoutPolicy: true,
          verificationDeliveryMethod: "Email",
          verificationContactValue: "creator@mylivedealz.com",
          verification: { status: "verified", code: "" },
          bank: {
            bankName: "MyLive Bank",
            accountName: creatorProfile.name,
            accountNumber: "1024",
            swift: "MLDZUGKA"
          },
          mobile: { provider: "MTN", phone: "+256700000000" },
          wallet: { email: "creator@mylivedealz.com" },
          alipay: { name: "", account: "" },
          wechat: { name: "", wechatId: "", phone: "" },
          tax: { residencyCountry: "Uganda", taxId: "TIN-118" },
          scrolledToBottomPayout: true
        },
        preferences: {
          lines: ["Beauty & Skincare", "Tech & Gadgets", "Faith & Wellness"],
          formats: ["Live Sessionz", "Shoppable Adz", "Replay clips"],
          models: ["Flat fee", "Commission", "Hybrid"],
          availability: { days: ["Mon", "Tue", "Thu", "Fri"], timeWindow: "08:00 - 20:00 EAT" },
          rateCard: { minFlatFee: "150", preferredCommissionPct: "12", notes: "Open to hybrid deals." },
          inviteRules: "Auto-allow open collaboration invites, review invite-only manually.",
          supplierType: "Seller + Provider"
        },
        review: {
          seenPolicies: { platform: true, content: true, payout: true },
          scrolledToBottom: true,
          confirmMultiUserCompliance: false,
          acceptTerms: true
        }
      }
    }
  ];

  const accountApprovals = [
    {
      id: "approval_seed_ronald",
      userId,
      status: "Approved",
      etaMin: 0,
      submittedAt: "2026-02-20T09:15:00.000Z",
      creatorId,
      displayName: creatorProfile.name,
      creatorHandle: `@${creatorProfile.handle}`,
      primaryLine: creatorProfile.categories[0],
      adminReason: "",
      adminDocs: [],
      items: [],
      note: "",
      attachments: [],
      preferences: { email: true, inApp: true },
      history: [
        { atISO: "2026-02-20T09:15:00.000Z", status: "UnderReview", msg: "Application submitted" },
        { atISO: "2026-02-20T11:45:00.000Z", status: "Approved", msg: "Creator account approved." }
      ],
      onboardingSnapshot: onboardingWorkflows[0].form
    }
  ];

  const contentApprovals = [
    {
      id: "submission_glowup_reel",
      userId,
      title: "IG Reel Draft — Serum Promo",
      campaign: "GlowUp Serum Promo",
      supplier: { name: "GlowUp Hub", type: "Seller" },
      channel: "Instagram",
      type: "Video",
      desk: "General",
      status: "Under Review",
      riskScore: 28,
      submittedAtISO: "2026-03-01T08:40:00.000Z",
      dueAtISO: "2026-03-03T01:00:00.000Z",
      notesFromCreator: "Short 15s hook + benefits + CTA. Please confirm compliance wording.",
      caption: "GlowUp Serum Dealz now live. Limited stock. Tap to shop with my link. #MyLiveDealz #ShoppableAdz #ad",
      assets: [
        { name: "ig-reel-draft.mp4", type: "Video", size: "14.8 MB" },
        { name: "cover-4x5.png", type: "Image", size: "1.2 MB" }
      ],
      flags: { missingDisclosure: false, sensitiveClaim: false, brandRestriction: false },
      lastUpdatedISO: "2026-03-01T08:58:00.000Z",
      audit: [
        { atISO: "2026-03-01T08:40:00.000Z", msg: "Submitted" },
        { atISO: "2026-03-01T08:58:00.000Z", msg: "Moved to Under Review" }
      ]
    },
    {
      id: "submission_gadget_script",
      userId,
      title: "TikTok Script — Tech Friday Mega",
      campaign: "Tech Friday Mega",
      supplier: { name: "GadgetMart Africa", type: "Seller" },
      channel: "TikTok",
      type: "Caption",
      desk: "General",
      status: "Changes Requested",
      riskScore: 52,
      submittedAtISO: "2026-02-28T15:20:00.000Z",
      dueAtISO: "2026-03-01T10:30:00.000Z",
      notesFromCreator: "Script focuses on unboxing + quick price anchor + bundle CTA.",
      caption: "Tech Friday Mega Live: gadgets bundles + fast checkout. Join live and shop. {LINK}",
      assets: [{ name: "tiktok-script.txt", type: "Doc", size: "12 KB" }],
      flags: { missingDisclosure: true, sensitiveClaim: false, brandRestriction: false },
      lastUpdatedISO: "2026-03-01T10:30:00.000Z",
      audit: [
        { atISO: "2026-02-28T15:20:00.000Z", msg: "Submitted" },
        { atISO: "2026-02-28T16:25:00.000Z", msg: "Changes requested: add #ad disclosure" }
      ]
    },
    {
      id: "submission_faith_clip",
      userId,
      title: "YouTube Short — Grace bundle clip",
      campaign: "Grace Wellness Bundle",
      supplier: { name: "Grace Living Store", type: "Seller" },
      channel: "YouTube",
      type: "Video",
      desk: "Faith",
      status: "Escalated",
      riskScore: 78,
      submittedAtISO: "2026-03-01T10:20:00.000Z",
      dueAtISO: "2026-03-02T18:30:00.000Z",
      notesFromCreator: "45s cut, includes pricing overlay and CTA.",
      caption: "Grace bundle now available on MyLiveDealz. Tap to view details and order. #ad",
      assets: [{ name: "grace-short-v2.mp4", type: "Video", size: "19.4 MB" }],
      flags: { missingDisclosure: false, sensitiveClaim: false, brandRestriction: true },
      lastUpdatedISO: "2026-03-01T10:42:00.000Z",
      audit: [
        { atISO: "2026-03-01T10:20:00.000Z", msg: "Submitted" },
        { atISO: "2026-03-01T10:42:00.000Z", msg: "Escalated to Faith Desk" }
      ]
    },
    {
      id: "submission_whatsapp_broadcast",
      userId,
      title: "WhatsApp Broadcast — Service Package",
      campaign: "Care Plus Service Pack",
      supplier: { name: "Care Plus Providers", type: "Provider" },
      channel: "WhatsApp",
      type: "Caption",
      desk: "Medical",
      status: "Approved",
      riskScore: 18,
      submittedAtISO: "2026-02-27T06:30:00.000Z",
      dueAtISO: "2026-02-28T10:30:00.000Z",
      notesFromCreator: "Simple broadcast message and CTA to book.",
      caption: "Care Plus service package is now open for bookings on MyLiveDealz. #ad",
      assets: [{ name: "careplus-copy.docx", type: "Doc", size: "18 KB" }],
      flags: { missingDisclosure: false, sensitiveClaim: false, brandRestriction: false },
      lastUpdatedISO: "2026-02-27T08:00:00.000Z",
      audit: [
        { atISO: "2026-02-27T06:30:00.000Z", msg: "Submitted" },
        { atISO: "2026-02-27T08:00:00.000Z", msg: "Approved" }
      ]
    },
    {
      id: "submission_faith_story",
      userId,
      title: "IG Story Set — Faith Offer",
      campaign: "Sunday Grace Picks",
      supplier: { name: "Grace Living Store", type: "Seller" },
      channel: "Instagram",
      type: "Image",
      desk: "Faith",
      status: "Pending",
      riskScore: 35,
      submittedAtISO: "2026-03-01T07:00:00.000Z",
      dueAtISO: "2026-03-02T13:00:00.000Z",
      notesFromCreator: "Please validate tone and desk guidelines.",
      caption: "Sunday Grace Picks are now live in my storefront. #ad",
      assets: [
        { name: "faith-story-1.png", type: "Image", size: "640 KB" },
        { name: "faith-story-2.png", type: "Image", size: "612 KB" }
      ],
      flags: { missingDisclosure: false, sensitiveClaim: false, brandRestriction: false },
      lastUpdatedISO: "2026-03-01T07:00:00.000Z",
      audit: [{ atISO: "2026-03-01T07:00:00.000Z", msg: "Submitted" }]
    }
  ];

  const subscription = {
    userId,
    plan: "pro",
    cycle: "monthly",
    status: "active",
    renewsAt: "2026-03-30",
    cancelAtPeriodEnd: false,
    billingEmail: "creator@mylivedealz.com",
    billingMethod: {
      type: "card",
      label: "Visa ending in 4242",
      brand: "Visa",
      last4: "4242",
      holderName: creatorProfile.name,
      expMonth: 12,
      expYear: 2028
    },
    support: {
      contactEmail: "support@mylivedealz.com",
      salesEmail: "sales@mylivedealz.com",
      helpCenterUrl: "https://support.mylivedealz.com/hc",
      managerName: "Creator Support"
    },
    notes: [
      "Subscriptions unlock creator tools like multi-platform streaming, Pro overlays, automation, and deeper analytics.",
      "Subscription access is still controlled by Roles & Permissions for the workspace.",
      "Creator rank is performance-based and is not changed by the subscription plan."
    ],
    limits: {
      liveSessionz: "Unlimited",
      shoppableAdz: "Unlimited",
      livePlusShoppables: "Unlimited",
      crewPerLive: "Unlimited",
      streamDestinations: "Unlimited",
      storage: "50 GB",
      analyticsHistory: "12 months",
      notifications: "Unlimited"
    },
    updatedAt: now
  };

  const roles = [
    {
      id: "role_creator_owner",
      name: "Creator Owner",
      badge: "System",
      description: "Full workspace access.",
      perms: {
        "dealz.view": true,
        "dealz.create": true,
        "dealz.edit": true,
        "dealz.publish_links": true,
        "analytics.view": true,
        "reviews.view": true,
        "subscription.view": true,
        "crew.manage_assignments": true,
        "roles.manage": true,
        "admin.manage_roles": true,
        "admin.manage_team": true,
        "admin.security": true,
        "admin.audit": true
      }
    },
    {
      id: "role_producer",
      name: "Producer",
      badge: "System",
      description: "Can operate live production surfaces.",
      perms: {
        "studio.switch_scenes": true,
        "dealz.pin": true,
        "chat.mute": true,
        "chat.timeout": true,
        "analytics.view": false,
        "roles.manage": false
      }
    },
    {
      id: "role_moderator",
      name: "Moderator",
      badge: "System",
      description: "Can manage audience and comment safety.",
      perms: {
        "chat.mute": true,
        "chat.timeout": true,
        "chat.delete": true,
        "studio.switch_scenes": false
      }
    }
  ];

  const members = [
    {
      id: "member_1",
      userId,
      name: "Ronald Isabirye",
      email: "creator@mylivedealz.com",
      roleId: "role_creator_owner",
      status: "active",
      seat: "Owner",
      lastActiveLabel: "Now",
      twoFA: "On"
    },
    {
      id: "member_2",
      name: "Amina K.",
      email: "amina@studio.test",
      roleId: "role_producer",
      status: "active",
      seat: "Team",
      lastActiveLabel: "2h ago",
      twoFA: "On"
    },
    {
      id: "member_3",
      name: "Noah K.",
      email: "noah@studio.test",
      roleId: "role_moderator",
      status: "invited",
      seat: "Team",
      lastActiveLabel: "Pending",
      twoFA: "Off",
      createdAtLabel: "Yesterday",
      expiresAtLabel: "In 6 days"
    }
  ];

  // Workspace-wide security & invite policies consumed by /roles-permissions.
  // These are intentionally separate from per-user settings (e.g. /api/settings).
  const workspaceSecurity = {
    require2FA: true,
    allowExternalInvites: false,
    supplierGuestExpiryHours: 24,
    inviteDomainAllowlist: ["creator.com", "studio.com", "mylivedealz.com", "studio.test"]
  };

  const crew = {
    userId,
    sessions: liveSessions.map((session) => ({
      sessionId: session.id,
      assignments: [
        { memberId: "member_2", roleId: "role_producer" },
        { memberId: "member_3", roleId: "role_moderator" }
      ]
    })),
    availabilityByMember: {
      member_2: [{ id: "evt_1", startISO: "2026-03-02T16:00:00.000Z", endISO: "2026-03-02T20:00:00.000Z", title: "GlowUp production block" }],
      member_3: [{ id: "evt_2", startISO: "2026-03-02T17:00:00.000Z", endISO: "2026-03-02T19:00:00.000Z", title: "Moderation slot" }]
    }
  };

  const toolConfigs = {
    audienceNotifications: {
      userId,
      sessionId: "live_beauty_flash",
      enabledChannels: ["WhatsApp", "SMS", "Push"],
      enabledReminders: ["T-24h", "T-1h", "Live Now", "Deal Drop"],
      replayDelayMinutes: 45
    },
    liveAlerts: {
      userId,
      sessionId: "live_beauty_flash",
      enabledDestinations: ["WhatsApp", "Telegram"],
      draftText: "We're live. Join the Beauty Flash now.",
      frequencyCapMinutes: 15
    },
    overlays: {
      userId,
      variant: "Variant B",
      qrEnabled: true,
      qrLabel: "Scan to shop",
      qrUrl: "https://go.mylivedealz.com/bf1",
      destUrl: "https://mldz.link/beautyflash"
    },
    postLive: {
      userId,
      sessionId: "live_beauty_flash",
      published: false,
      allowComments: true,
      showProductStrip: true
    },
    streaming: {
      userId,
      sessionId: "live_beauty_flash",
      selectedDestinations: ["TikTok Live", "Instagram Live"],
      advancedOpen: true,
      recordMaster: true,
      autoReplay: true,
      autoHighlights: true
    },
    safety: {
      userId,
      roleMode: "moderator",
      muteChat: false,
      slowMode: true,
      linkBlocking: true,
      keywordRules: ["spam", "scam", "external checkout"]
    }
  };

  const auditLogs = [
    { id: "audit_seed_1", at: now, actor: "System", action: "Workspace seeded", detail: "Initial demo data loaded.", severity: "info" },
    { id: "audit_seed_2", at: now, actor: "EVzone Admin", action: "KYC verified", detail: "Creator account verified.", severity: "info" },
    { id: "audit_seed_3", at: "2026-03-02T15:40:00.000Z", actor: "creator@mylivedealz.com", action: "Invite response recorded", detail: "GlowUp Hub -> negotiating", severity: "info" },
    { id: "audit_seed_4", at: "2026-03-02T16:20:00.000Z", actor: "Owner", action: "Role updated", detail: "Producer permissions adjusted.", severity: "warn" },
    { id: "audit_seed_5", at: "2026-03-02T17:05:00.000Z", actor: "Security Monitor", action: "Destination key rotation required", detail: "Reconnect TikTok destination token.", severity: "error" }
  ];

  return {
    meta: { version: 1, seededAt: now, updatedAt: now },
    users: [
      {
        id: userId,
        email: "creator@mylivedealz.com",
        passwordHash: hashPassword("Password123!"),
        roles: ["creator", "seller", "buyer", "provider"],
        currentRole: "Creator",
        approvalStatus: "APPROVED",
        onboardingCompleted: true
      }
    ],
    sessions: [],
    creatorProfiles: [creatorProfile],
    sellers,
    opportunities,
    invites,
    proposals,
    campaigns,
    contracts,
    tasks,
    assets,
    liveSessions,
    campaignGiveaways,
    replays,
    reviews,
    adzCampaigns,
    links,
    earnings,
    payouts,
    analytics,
    notifications,
    settings,
    uploads,
    onboardingWorkflows,
    accountApprovals,
    contentApprovals,
    subscription,
    workspaceSecurity,
    roles,
    members,
    crew,
    toolConfigs,
    auditLogs
  };
}
