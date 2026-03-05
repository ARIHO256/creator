import { created, ok } from "../lib/http.js";
import { ensure, id, pushAudit, requireFields, applySearch, applyFilter, paginate } from "../lib/utils.js";

function normalizeAdStatus(value, generated = false) {
  const raw = String(value || (generated ? "pending_approval" : "draft")).trim().toLowerCase();
  if (["draft", "pending_approval", "scheduled", "live", "paused", "completed", "archived"].includes(raw)) {
    return raw;
  }
  if (generated) return "pending_approval";
  return "draft";
}

function buildDefaultPerformance() {
  return {
    period: "7d",
    clicks: 0,
    purchases: 0,
    conversionPct: 0,
    earnings: 0,
    byPlatform: []
  };
}

function normalizeLinkTab(value) {
  const raw = String(value || "live").trim().toLowerCase();
  if (["live", "live_sessionz", "live sessionz", "replay"].includes(raw)) return "live";
  if (["shoppable", "shop", "shopping", "adz", "adz_campaign"].includes(raw)) return "shoppable";
  if (["general", "other"].includes(raw)) return "general";
  return "live";
}

function normalizeLinkStatus(value) {
  const raw = String(value || "active").trim().toLowerCase();
  if (["active", "scheduled", "paused", "expired", "draft", "archived"].includes(raw)) return raw;
  return "active";
}

function normalizeLinkMetrics(value, fallback = {}) {
  const source = value && typeof value === "object" ? value : fallback && typeof fallback === "object" ? fallback : {};
  return {
    clicks: Number(source.clicks || 0),
    purchases: Number(source.purchases || 0),
    conversionPct: Number(source.conversionPct || 0),
    earnings: Number(source.earnings || 0),
    currency: String(source.currency || "USD")
  };
}

function normalizeLinkChannels(value) {
  return Array.isArray(value)
    ? value.map((entry, index) => ({
        id: String(entry?.id || `channel_${index + 1}`),
        name: String(entry?.name || `Channel ${index + 1}`),
        url: String(entry?.url || ""),
        hint: entry?.hint ? String(entry.hint) : ""
      }))
    : [];
}

function normalizeRegionVariants(value, primaryUrl, shortUrl) {
  if (Array.isArray(value) && value.length) {
    return value.map((entry, index) => ({
      id: String(entry?.id || `variant_${index + 1}`),
      region: String(entry?.region || `Region ${index + 1}`),
      url: String(entry?.url || shortUrl || primaryUrl),
      note: entry?.note ? String(entry.note) : ""
    }));
  }

  return [
    {
      id: "variant_global",
      region: "Global",
      url: String(shortUrl || primaryUrl),
      note: "Default tracked link"
    }
  ];
}

function normalizeRegionMetrics(value, metrics) {
  if (Array.isArray(value) && value.length) {
    return value.map((entry, index) => ({
      id: String(entry?.id || `region_metric_${index + 1}`),
      region: String(entry?.region || `Region ${index + 1}`),
      clicks: Number(entry?.clicks || 0),
      purchases: Number(entry?.purchases || 0),
      conversionPct: Number(entry?.conversionPct || 0),
      earnings: Number(entry?.earnings || 0),
      currency: String(entry?.currency || metrics.currency || "USD")
    }));
  }

  return [
    {
      id: "region_metric_global",
      region: "Global",
      clicks: Number(metrics.clicks || 0),
      purchases: Number(metrics.purchases || 0),
      conversionPct: Number(metrics.conversionPct || 0),
      earnings: Number(metrics.earnings || 0),
      currency: String(metrics.currency || "USD")
    }
  ];
}

function normalizeSharePack(value, title, shortUrl) {
  const source = value && typeof value === "object" ? value : {};
  return {
    headline: String(source.headline || title || "Tracked link"),
    bullets: Array.isArray(source.bullets) ? source.bullets.map((entry) => String(entry)) : [],
    captions: Array.isArray(source.captions)
      ? source.captions.map((entry, index) => ({
          id: String(entry?.id || `caption_${index + 1}`),
          platform: String(entry?.platform || `Channel ${index + 1}`),
          text: String(entry?.text || shortUrl || "")
        }))
      : [],
    hashtags: Array.isArray(source.hashtags) ? source.hashtags.map((entry) => String(entry)) : []
  };
}

function buildTrackedLink(db, auth, body, existing = null) {
  const safeBody = body && typeof body === "object" ? body : {};
  const createdAt = existing?.createdAt || new Date().toISOString();
  const updatedAt = new Date().toISOString();
  const primaryUrl = String(safeBody.primaryUrl || existing?.primaryUrl || "");
  const shortUrl = String(safeBody.shortUrl || existing?.shortUrl || primaryUrl);
  const metrics = normalizeLinkMetrics(safeBody.metrics, existing?.metrics);
  const campaignSource = safeBody.campaign && typeof safeBody.campaign === "object" ? safeBody.campaign : existing?.campaign || {};
  const supplierSource = safeBody.supplier && typeof safeBody.supplier === "object" ? safeBody.supplier : existing?.supplier || {};

  return {
    id: String(existing?.id || id("link")),
    userId: auth.user.id,
    tab: normalizeLinkTab(safeBody.tab || existing?.tab),
    title: String(safeBody.title || existing?.title || "Untitled tracked link"),
    subtitle: String(safeBody.subtitle || existing?.subtitle || ""),
    status: normalizeLinkStatus(safeBody.status || existing?.status),
    createdAt,
    updatedAt,
    expiresAt: safeBody.expiresAt !== undefined ? safeBody.expiresAt : existing?.expiresAt || null,
    campaign: {
      id: String(campaignSource.id || ""),
      name: String(campaignSource.name || "")
    },
    supplier: {
      name: String(supplierSource.name || ""),
      type: String(supplierSource.type || "Seller")
    },
    primaryUrl,
    shortUrl,
    channels: normalizeLinkChannels(safeBody.channels !== undefined ? safeBody.channels : existing?.channels),
    metrics,
    regionVariants: normalizeRegionVariants(safeBody.regionVariants !== undefined ? safeBody.regionVariants : existing?.regionVariants, primaryUrl, shortUrl),
    regionMetrics: normalizeRegionMetrics(safeBody.regionMetrics !== undefined ? safeBody.regionMetrics : existing?.regionMetrics, metrics),
    sharePack: normalizeSharePack(safeBody.sharePack !== undefined ? safeBody.sharePack : existing?.sharePack, String(safeBody.title || existing?.title || "Tracked link"), shortUrl),
    pinned: Boolean(safeBody.pinned ?? existing?.pinned ?? false),
    note: String(safeBody.note || existing?.note || ""),
    thumbnailUrl: String(safeBody.thumbnailUrl || existing?.thumbnailUrl || "")
  };
}

function upsertAdBuilderCampaign(db, auth, body, { publish = false, publishStatus } = {}) {
  ensure(body && typeof body === "object", "An ad builder payload is required.", "VALIDATION_ERROR", 400);
  const builderState = body.builderState && typeof body.builderState === "object" ? body.builderState : null;
  ensure(builderState?.builder && typeof builderState.builder === "object", "A shoppable ad draft payload is required.", "VALIDATION_ERROR", 400);

  const draft = builderState.builder;
  const summary = body.summary && typeof body.summary === "object" ? body.summary : {};
  const requestedId = String(body.adId || "").trim();
  const adId = requestedId || id("adz");
  const existing = db.adzCampaigns.find((entry) => entry.id === adId && entry.userId === auth.user.id);

  const generated = Boolean(publish ? true : summary.generated ?? builderState.isGenerated ?? existing?.generated);
  const status = normalizeAdStatus(publish ? publishStatus || summary.status || existing?.status : summary.status || existing?.status, generated);
  const normalizedBuilderState = {
    ...builderState,
    ts: Number(builderState.ts || Date.now()),
    savedAt: new Date().toISOString(),
    ...(existing?.builderState?.publishedAt ? { publishedAt: existing.builderState.publishedAt } : {}),
    ...(publish ? { publishedAt: new Date().toISOString() } : {}),
    isGenerated: generated,
    builder: {
      ...draft
    }
  };

  const campaign = existing || {
    id: adId,
    userId: auth.user.id,
    campaignId: null,
    campaignName: "Untitled Shoppable Ad",
    campaignSubtitle: "",
    sellerId: null,
    supplier: { name: "Unassigned seller", category: "", logoUrl: "" },
    creator: {
      name: auth.profile?.name || "Creator",
      handle: `@${auth.profile?.handle || "creator"}`,
      avatarUrl: auth.profile?.avatarUrl || "",
      verified: true
    },
    status: "draft",
    platforms: [],
    startISO: new Date().toISOString(),
    endISO: new Date().toISOString(),
    timezone: "Africa/Kampala",
    heroImageUrl: "",
    heroIntroVideoUrl: "",
    compensation: { model: "flat_fee", flatFee: 0, commissionPct: 0, currency: "USD" },
    offers: [],
    generated: false,
    hasBrokenLink: false,
    lowStock: false,
    performance: buildDefaultPerformance(),
    builderState: normalizedBuilderState
  };

  const offers = Array.isArray(summary.offers)
    ? summary.offers.map((offer) => ({ ...offer }))
    : Array.isArray(existing?.offers)
      ? existing.offers
      : [];

  Object.assign(campaign, {
    campaignId: summary.campaignId ?? campaign.campaignId ?? null,
    campaignName: String(summary.title || summary.campaignName || campaign.campaignName || "Untitled Shoppable Ad"),
    campaignSubtitle: String(summary.subtitle || campaign.campaignSubtitle || ""),
    sellerId: summary.sellerId ?? campaign.sellerId ?? null,
    supplier: {
      name: String(summary.sellerName || campaign.supplier?.name || "Unassigned seller"),
      category: campaign.supplier?.category || "",
      logoUrl: campaign.supplier?.logoUrl || ""
    },
    status,
    platforms: Array.isArray(summary.platforms)
      ? summary.platforms.map((entry) => String(entry))
      : Array.isArray(draft.platforms)
        ? draft.platforms.map((entry) => String(entry))
        : campaign.platforms,
    startISO: String(summary.startISO || campaign.startISO || new Date().toISOString()),
    endISO: String(summary.endISO || campaign.endISO || new Date().toISOString()),
    timezone: String(summary.timezone || campaign.timezone || "Africa/Kampala"),
    heroImageUrl: String(summary.heroImageUrl || campaign.heroImageUrl || ""),
    heroIntroVideoUrl: String(summary.heroIntroVideoUrl || campaign.heroIntroVideoUrl || ""),
    offers,
    generated,
    hasBrokenLink: Boolean(campaign.hasBrokenLink),
    lowStock: offers.some((offer) => Number(offer?.stockLeft || 0) > 0 && Number(offer?.stockLeft || 0) <= 5),
    performance: campaign.performance || buildDefaultPerformance(),
    builderState: normalizedBuilderState
  });

  if (!existing) {
    db.adzCampaigns.unshift(campaign);
  }

  pushAudit(db, {
    actor: auth.user.email,
    action: publish ? "Ad builder campaign published" : existing ? "Ad builder campaign saved" : "Ad builder campaign created",
    detail: campaign.campaignName,
    severity: "info"
  });

  return campaign;
}

export function registerAdzRoutes(router) {
  router.add("GET", "/api/adz/builder/:id", { tag: "adz-builder", auth: true, description: "Load a persisted Shoppable Ad Builder draft." }, async ({ auth, params, store }) => {
    const db = store.load();
    const campaign = db.adzCampaigns.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
    ensure(campaign, "Ad builder campaign not found.", "ADZ_NOT_FOUND", 404);
    return ok(campaign);
  });

  router.add("POST", "/api/adz/builder/save", { tag: "adz-builder", auth: true, description: "Create or update a persisted Shoppable Ad Builder draft." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    const campaign = store.update((db) => upsertAdBuilderCampaign(db, auth, body));
    return created(campaign);
  });

  router.add("POST", "/api/adz/builder/:id/publish", { tag: "adz-builder", auth: true, description: "Publish a saved Shoppable Ad Builder draft." }, async ({ auth, params, readBody, store }) => {
    const body = (await readBody()) || {};
    const campaign = store.update((db) => {
      const existing = db.adzCampaigns.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(existing, "Ad builder campaign not found.", "ADZ_NOT_FOUND", 404);
      const payload = {
        ...body,
        adId: params.id,
        builderState: body?.builderState || existing.builderState,
        summary: {
          ...(body?.summary || {}),
          generated: true
        }
      };
      return upsertAdBuilderCampaign(db, auth, payload, { publish: true, publishStatus: body?.status || "pending_approval" });
    });
    return ok(campaign);
  });

  router.add("GET", "/api/adz/campaigns", { tag: "adz", auth: true, description: "List creator ad campaigns." }, async ({ auth, query, store }) => {
    const db = store.load();
    let items = db.adzCampaigns.filter((campaign) => campaign.userId === auth.user.id);
    items = applySearch(items, query.get("q"), ["campaignName", "campaignSubtitle", (item) => item.supplier?.name, (item) => item.platforms]);
    items = applyFilter(items, query.get("status"), "status");
    const page = paginate(items, query);
    return ok(page.data, page.meta);
  });

  router.add("GET", "/api/adz/campaigns/:id", { tag: "adz", auth: true, description: "Return one creator ad campaign." }, async ({ auth, params, store }) => {
    const db = store.load();
    const campaign = db.adzCampaigns.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
    ensure(campaign, "Ad campaign not found.", "ADZ_NOT_FOUND", 404);
    return ok(campaign);
  });

  router.add("GET", "/api/adz/marketplace", { tag: "adz", auth: true, description: "Marketplace cards for ad opportunities." }, async ({ auth, query, store }) => {
    const db = store.load();
    let items = db.adzCampaigns.filter((item) => item.userId === auth.user.id);
    items = applySearch(items, query.get("q"), ["campaignName", "campaignSubtitle", (item) => item.supplier?.name, (item) => item.platforms]);
    items = applyFilter(items, query.get("status"), "status");
    if (query.get("sellerId")) {
      items = items.filter((item) => String(item.sellerId || "") === String(query.get("sellerId")));
    }
    if (query.get("generated")) {
      const generated = String(query.get("generated")) === "true";
      items = items.filter((item) => Boolean(item.generated) === generated);
    }
    if (query.get("lowStock")) {
      const lowStock = String(query.get("lowStock")) === "true";
      items = items.filter((item) => Boolean(item.lowStock) === lowStock);
    }

    const cards = items
      .map((item) => {
        const linkedLinks = db.links.filter((link) => String(link.campaign?.id || "") === String(item.campaignId || item.id));
        return {
          ...item,
          seller: item.supplier?.name || "Unknown seller",
          offerCount: Array.isArray(item.offers) ? item.offers.length : 0,
          linkedLinks: linkedLinks.length,
          clicks: Number(item.performance?.clicks || 0),
          purchases: Number(item.performance?.purchases || 0),
          earnings: Number(item.performance?.earnings || 0),
          currency: String(item.compensation?.currency || item.performance?.currency || "USD")
        };
      })
      .sort((left, right) => String(right.startISO || "").localeCompare(String(left.startISO || "")));

    const page = paginate(cards, query);
    return ok(page.data, page.meta);
  });

  router.add("POST", "/api/adz/campaigns", { tag: "adz", auth: true, description: "Create a new shoppable ad campaign draft." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    requireFields(body, ["campaignName", "sellerId"]);

    const campaign = store.update((db) => {
      const seller = db.sellers.find((entry) => entry.id === body.sellerId);
      ensure(seller, "Seller not found.", "SELLER_NOT_FOUND", 404);

      const campaign = {
        id: id("adz"),
        userId: auth.user.id,
        campaignName: String(body.campaignName),
        campaignSubtitle: body.campaignSubtitle || "",
        sellerId: seller.id,
        supplier: { name: seller.name, category: seller.categories?.[0] || "", logoUrl: "" },
        creator: { name: auth.profile?.name || "Creator", handle: `@${auth.profile?.handle || "creator"}`, avatarUrl: "", verified: true },
        status: body.status || "draft",
        platforms: Array.isArray(body.platforms) ? body.platforms : [],
        startISO: body.startISO || new Date().toISOString(),
        endISO: body.endISO || new Date().toISOString(),
        timezone: body.timezone || "Africa/Kampala",
        heroImageUrl: body.heroImageUrl || "",
        heroIntroVideoUrl: body.heroIntroVideoUrl || "",
        compensation: body.compensation || { model: "flat_fee", flatFee: 0, commissionPct: 0, currency: "USD" },
        offers: Array.isArray(body.offers) ? body.offers : [],
        generated: Boolean(body.generated),
        hasBrokenLink: false,
        lowStock: false,
        performance: buildDefaultPerformance()
      };

      db.adzCampaigns.unshift(campaign);
      pushAudit(db, { actor: auth.user.email, action: "Ad campaign created", detail: campaign.campaignName, severity: "info" });
      return campaign;
    });

    return created(campaign);
  });

  router.add("PATCH", "/api/adz/campaigns/:id", { tag: "adz", auth: true, description: "Update ad campaign metadata." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    const campaign = store.update((db) => {
      const campaign = db.adzCampaigns.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(campaign, "Ad campaign not found.", "ADZ_NOT_FOUND", 404);

      Object.assign(campaign, {
        ...(body.campaignName !== undefined ? { campaignName: String(body.campaignName) } : {}),
        ...(body.campaignSubtitle !== undefined ? { campaignSubtitle: String(body.campaignSubtitle) } : {}),
        ...(body.status !== undefined ? { status: String(body.status) } : {}),
        ...(body.platforms !== undefined ? { platforms: body.platforms } : {}),
        ...(body.offers !== undefined ? { offers: body.offers } : {})
      });

      pushAudit(db, { actor: auth.user.email, action: "Ad campaign updated", detail: campaign.campaignName, severity: "info" });
      return campaign;
    });
    return ok(campaign);
  });

  router.add("GET", "/api/adz/campaigns/:id/performance", { tag: "adz", auth: true, description: "Return performance metrics for one ad campaign." }, async ({ auth, params, store }) => {
    const db = store.load();
    const campaign = db.adzCampaigns.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
    ensure(campaign, "Ad campaign not found.", "ADZ_NOT_FOUND", 404);
    return ok(campaign.performance);
  });

  router.add("GET", "/api/promo-ads/:id", { tag: "adz", auth: true, description: "Promo ad detail surface." }, async ({ auth, params, store }) => {
    const db = store.load();
    const campaign = db.adzCampaigns.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
    ensure(campaign, "Promo ad not found.", "ADZ_NOT_FOUND", 404);

    return ok({
      campaign,
      links: db.links.filter((link) => link.campaign.id === (campaign.campaignId || campaign.id) || link.title.toLowerCase().includes(campaign.campaignName.toLowerCase().slice(0, 5)))
    });
  });

  router.add("GET", "/api/links", { tag: "adz", auth: true, description: "Tracked links and link hub rows." }, async ({ auth, query, store }) => {
    const db = store.load();
    let items = db.links.filter((link) => link.userId === auth.user.id);
    items = applySearch(items, query.get("q"), ["title", "subtitle", (item) => item.supplier?.name, (item) => item.campaign?.name, (item) => item.channels?.map((channel) => channel.name)]);
    items = applyFilter(items, query.get("status"), "status");
    items = applyFilter(items, query.get("tab"), "tab");
    if (query.get("campaignId")) {
      const campaignId = String(query.get("campaignId"));
      items = items.filter((item) => String(item.campaign?.id || "") === campaignId);
    }
    items = applyFilter(items, query.get("pinned"), "pinned", (value) => String(Boolean(value)));
    items = items.sort((left, right) => String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || "")));
    const page = paginate(items, query);
    return ok(page.data, page.meta);
  });

  router.add("GET", "/api/links/:id", { tag: "adz", auth: true, description: "Return one tracked link." }, async ({ auth, params, store }) => {
    const db = store.load();
    const link = db.links.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
    ensure(link, "Tracked link not found.", "LINK_NOT_FOUND", 404);
    return ok(link);
  });

  router.add("POST", "/api/links", { tag: "adz", auth: true, description: "Create a tracked link." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    requireFields(body, ["title", "primaryUrl"]);

    const link = store.update((db) => {
      const link = buildTrackedLink(db, auth, body);
      db.links.unshift(link);
      pushAudit(db, { actor: auth.user.email, action: "Tracked link created", detail: link.title, severity: "info" });
      return link;
    });

    return created(link);
  });

  router.add("PATCH", "/api/links/:id", { tag: "adz", auth: true, description: "Update an existing tracked link." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    const link = store.update((db) => {
      const existing = db.links.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(existing, "Tracked link not found.", "LINK_NOT_FOUND", 404);
      const nextLink = buildTrackedLink(db, auth, body, existing);
      Object.assign(existing, nextLink);
      pushAudit(db, { actor: auth.user.email, action: "Tracked link updated", detail: existing.title, severity: "info" });
      return existing;
    });
    return ok(link);
  });
}
