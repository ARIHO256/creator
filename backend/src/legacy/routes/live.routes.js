import { created, ok } from "../lib/http.js";
import { ensure, id, nowIso, pushAudit, requireFields, applyFilter, applySearch, paginate } from "../lib/utils.js";

function normalizeLiveStatus(value) {
  const raw = String(value || "draft").trim().toLowerCase();
  if (["draft", "ready", "scheduled", "live", "ended"].includes(raw)) return raw;
  if (raw === "end") return "ended";
  return "draft";
}

function denormalizeLiveStatus(value) {
  const normalized = normalizeLiveStatus(value);
  if (normalized === "ready") return "Ready";
  if (normalized === "scheduled") return "Scheduled";
  if (normalized === "live") return "Live";
  if (normalized === "ended") return "Ended";
  return "Draft";
}

function safeDate(value) {
  const date = new Date(value || nowIso());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}


function buildReplayFromSession(session, existingReplay = {}, overrides = {}) {
  const draft = session?.builderState?.draft && typeof session.builderState.draft === "object" ? session.builderState.draft : {};
  const baseReplayUrl = `https://mylivedealz.com/replay/${session?.id || existingReplay?.sessionId || "session"}`;
  const sourceClips = Array.isArray(overrides.clips)
    ? overrides.clips
    : Array.isArray(existingReplay.clips)
      ? existingReplay.clips
      : [];

  return {
    id: String(existingReplay.id || id("replay")),
    sessionId: String(session?.id || existingReplay.sessionId || ""),
    title: String(overrides.title || existingReplay.title || session?.title || "Untitled replay"),
    date: String(
      overrides.date ||
        existingReplay.date ||
        new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    ),
    hook: String(overrides.hook || existingReplay.hook || "Draft replay"),
    retention: String(overrides.retention || existingReplay.retention || "Pending analysis"),
    notes: Array.isArray(overrides.notes)
      ? overrides.notes.map((entry) => String(entry))
      : Array.isArray(existingReplay.notes)
        ? existingReplay.notes.map((entry) => String(entry))
        : [],
    published: Boolean(overrides.published ?? existingReplay.published ?? false),
    publishedAt:
      overrides.published === true
        ? nowIso()
        : existingReplay.publishedAt || (existingReplay.published ? nowIso() : null),
    scheduledPublishAt: overrides.scheduledPublishAt ?? existingReplay.scheduledPublishAt ?? null,
    replayUrl: String(overrides.replayUrl || existingReplay.replayUrl || draft.publicJoinUrl || baseReplayUrl),
    coverUrl: String(overrides.coverUrl || existingReplay.coverUrl || draft.heroImageUrl || ""),
    allowComments: Boolean(overrides.allowComments ?? existingReplay.allowComments ?? true),
    showProductStrip: Boolean(overrides.showProductStrip ?? existingReplay.showProductStrip ?? true),
    clips: sourceClips.map((clip, index) => ({
      id: String(clip?.id || `clip_${index + 1}`),
      title: String(clip?.title || `Clip ${index + 1}`),
      startSec: Number(clip?.startSec || 0),
      endSec: Number(clip?.endSec || 30),
      format: String(clip?.format || "9:16"),
      status: String(clip?.status || "Draft")
    })),
    updatedAt: nowIso()
  };
}

function buildScheduledForFromDraft(draft) {
  if (!draft || typeof draft !== "object") return nowIso();
  const dateISO = typeof draft.startDateISO === "string" ? draft.startDateISO : "";
  const time = typeof draft.startTime === "string" ? draft.startTime : "";
  if (!dateISO || !time) return nowIso();
  const candidate = new Date(`${dateISO}T${time}`);
  return Number.isNaN(candidate.getTime()) ? nowIso() : candidate.toISOString();
}

function buildLiveStudioFromDraft(draft, existingStudio = {}) {
  const products = Array.isArray(draft?.products)
    ? draft.products.map((item, index) => ({
        id: String(item?.id || `product_${index}`),
        name: String(item?.name || item?.title || `Featured item ${index + 1}`),
        price:
          typeof item?.retailPricePreview === "string" && item.retailPricePreview
            ? item.retailPricePreview
            : typeof item?.startingFrom === "string" && item.startingFrom
              ? item.startingFrom
              : typeof item?.price === "number"
                ? `${item.currency || "USD"} ${item.price}`
                : "Price on page",
        stock:
          typeof item?.stock === "number"
            ? `${item.stock} left`
            : item?.kind === "service"
              ? "Booking slots"
              : "In stock",
        tag: String(item?.badge || item?.goalMetric || "Featured")
      }))
    : [];

  return {
    mode: existingStudio.mode || "builder",
    micOn: existingStudio.micOn ?? true,
    camOn: existingStudio.camOn ?? true,
    screenShareOn: existingStudio.screenShareOn ?? false,
    activeSceneId: existingStudio.activeSceneId || "scene_intro",
    scenes: Array.isArray(existingStudio.scenes) && existingStudio.scenes.length
      ? existingStudio.scenes
      : [
          { id: "scene_intro", label: "Intro Card" },
          { id: "scene_main", label: "Main Cam" },
          { id: "scene_products", label: "Product Focus" }
        ],
    products,
    coHosts: Array.isArray(existingStudio.coHosts) ? existingStudio.coHosts : [],
    chat: Array.isArray(existingStudio.chat) ? existingStudio.chat : [],
    momentMarkers: Array.isArray(existingStudio.momentMarkers) ? existingStudio.momentMarkers : [],
    commerceGoal:
      existingStudio.commerceGoal || {
        soldUnits: 0,
        targetUnits: products.reduce((sum, item) => {
          const match = Array.isArray(draft?.products)
            ? draft.products.find((candidate) => String(candidate?.id) === item.id)
            : null;
          return sum + Number(match?.goalTarget || 0);
        }, 0),
        cartCount: 0,
        last5MinSales: 0
      }
  };
}

function computeWorkloadScore(durationMin, productsCount, simulcastCount) {
  return Math.max(10, Math.min(95, Math.round(durationMin / 2 + productsCount * 8 + simulcastCount * 5)));
}

function sumGiveawayQuantityForEntry(session, entry) {
  const draft = session?.builderState?.draft && typeof session.builderState.draft === "object" ? session.builderState.draft : null;
  const giveaways = Array.isArray(draft?.giveaways) ? draft.giveaways : [];
  const normalizedEntryTitle = String(entry?.title || "").trim().toLowerCase();

  return giveaways.reduce((sum, giveaway) => {
    const quantity = Math.max(0, Number(giveaway?.quantity || 0));
    if (!quantity) return sum;

    if (String(giveaway?.campaignGiveawayId || "") === String(entry.id)) {
      return sum + quantity;
    }

    if (entry.type === "featured") {
      if (entry.itemId && String(giveaway?.linkedItemId || "") === String(entry.itemId)) {
        return sum + quantity;
      }
      return sum;
    }

    const giveawayTitle = String(giveaway?.title || "").trim().toLowerCase();
    if (normalizedEntryTitle && giveawayTitle === normalizedEntryTitle) {
      return sum + quantity;
    }

    return sum;
  }, 0);
}

function buildCampaignGiveawayInventory(db, campaignId) {
  const inventoryEntries = Array.isArray(db.campaignGiveaways)
    ? db.campaignGiveaways.filter((entry) => String(entry.campaignId) === String(campaignId))
    : [];

  const sessions = Array.isArray(db.liveSessions)
    ? db.liveSessions.filter((session) => {
        const draftCampaignId = session?.builderState?.draft?.campaignId;
        return String(draftCampaignId || "") === String(campaignId);
      })
    : [];

  const hydratedEntries = inventoryEntries.map((entry) => {
    const totalQuantity = Math.max(0, Number(entry.totalQuantity || 0));
    const allocatedQuantity = sessions.reduce((sum, session) => sum + sumGiveawayQuantityForEntry(session, entry), 0);
    return {
      ...entry,
      totalQuantity,
      allocatedQuantity,
      availableQuantity: Math.max(0, totalQuantity - allocatedQuantity)
    };
  });

  return {
    campaignId: String(campaignId),
    featuredItems: hydratedEntries.filter((entry) => entry.type === "featured"),
    customGiveaways: hydratedEntries.filter((entry) => entry.type === "custom")
  };
}

function upsertLiveBuilderSession(db, auth, body, { publish = false, publishStatus } = {}) {
  ensure(body && typeof body === "object", "A live builder payload is required.", "VALIDATION_ERROR", 400);
  const builderState = body.builderState && typeof body.builderState === "object" ? body.builderState : null;
  ensure(builderState?.draft && typeof builderState.draft === "object", "A live draft payload is required.", "VALIDATION_ERROR", 400);

  const draft = builderState.draft;
  const summary = body.summary && typeof body.summary === "object" ? body.summary : {};
  const requestedId = String(body.sessionId || draft.id || "").trim();
  const sessionId = requestedId || id("live");
  const existing = db.liveSessions.find((entry) => entry.id === sessionId && entry.userId === auth.user.id);

  const scheduledFor = String(summary.scheduledFor || existing?.scheduledFor || buildScheduledForFromDraft(draft));
  const scheduledDate = safeDate(scheduledFor);
  const nextStatus = publish
    ? normalizeLiveStatus(publishStatus || summary.status || draft.status || existing?.status || "scheduled")
    : normalizeLiveStatus(summary.status || draft.status || existing?.status || "draft");
  const simulcast = Array.isArray(summary.simulcast)
    ? summary.simulcast.map((entry) => String(entry))
    : Array.isArray(draft.platforms)
      ? draft.platforms.map((entry) => String(entry))
      : Array.isArray(existing?.simulcast)
        ? existing.simulcast
        : [];
  const durationMin = Number(summary.durationMin || draft.durationMinutes || existing?.durationMin || 60);
  const productsCount = Number(summary.productsCount || (Array.isArray(draft.products) ? draft.products.length : 0) || existing?.productsCount || 0);
  const scriptsReady = Boolean(
    summary.scriptsReady ??
      (typeof draft.teleprompterScript === "string" && draft.teleprompterScript.trim().length > 0) ??
      existing?.scriptsReady
  );
  const assetsReady = Boolean(
    summary.assetsReady ??
      Boolean(draft.heroImageUrl || draft.heroVideoUrl || draft?.creatives?.openerAssetId || draft?.creatives?.lowerThirdAssetId) ??
      existing?.assetsReady
  );

  const normalizedBuilderState = {
    ...builderState,
    ts: Number(builderState.ts || Date.now()),
    savedAt: nowIso(),
    ...(existing?.builderState?.publishedAt ? { publishedAt: existing.builderState.publishedAt } : {}),
    ...(publish ? { publishedAt: nowIso() } : {}),
    draft: {
      ...draft,
      id: sessionId,
      status: denormalizeLiveStatus(nextStatus)
    }
  };

  const studio = buildLiveStudioFromDraft(normalizedBuilderState.draft, existing?.studio);
  if (publish && nextStatus === "live") {
    studio.mode = "broadcast";
  }
  if (publish && nextStatus === "ended") {
    studio.mode = "ended";
  }

  const session = existing || {
    id: sessionId,
    userId: auth.user.id,
    title: "Untitled live session",
    campaignId: null,
    campaign: "",
    sellerId: null,
    seller: "",
    weekday: "TBD",
    dateLabel: "TBD",
    scheduledFor,
    time: "",
    location: "Remote studio",
    simulcast: [],
    status: "draft",
    role: "Host",
    durationMin: 60,
    scriptsReady: false,
    assetsReady: false,
    productsCount: 0,
    workloadScore: 10,
    conflict: false,
    studio,
    builderState: normalizedBuilderState
  };

  Object.assign(session, {
    title: String(summary.title || draft.title || session.title || "Untitled live session"),
    campaignId: summary.campaignId ?? draft.campaignId ?? session.campaignId ?? null,
    campaign: String(summary.campaignName || draft.campaignId || session.campaign || "Unassigned campaign"),
    sellerId: summary.sellerId ?? draft.supplierId ?? session.sellerId ?? null,
    seller: String(summary.sellerName || draft.supplierId || session.seller || "Unassigned seller"),
    weekday: scheduledDate.toLocaleDateString("en-US", { weekday: "short" }),
    dateLabel: scheduledDate.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short"
    }),
    scheduledFor,
    time: String(summary.time || draft.startTime || session.time || ""),
    location: String(summary.location || draft.locationLabel || session.location || "Remote studio"),
    simulcast,
    status: nextStatus,
    role: String(summary.role || session.role || "Host"),
    durationMin,
    scriptsReady,
    assetsReady,
    productsCount,
    workloadScore: computeWorkloadScore(durationMin, productsCount, simulcast.length),
    conflict: false,
    studio,
    builderState: normalizedBuilderState
  });

  if (!existing) {
    db.liveSessions.unshift(session);
  }

  pushAudit(db, {
    actor: auth.user.email,
    action: publish ? "Live builder session published" : existing ? "Live builder session saved" : "Live builder session created",
    detail: session.title,
    severity: publish ? "info" : "info"
  });

  return session;
}

export function registerLiveRoutes(router) {
  router.add("GET", "/api/live/builder/:id", { tag: "live-builder", auth: true, description: "Load a persisted Live Builder draft." }, async ({ auth, params, store }) => {
    const db = store.load();
    const session = db.liveSessions.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
    ensure(session, "Live builder session not found.", "SESSION_NOT_FOUND", 404);
    return ok(session);
  });

  router.add("POST", "/api/live/builder/save", { tag: "live-builder", auth: true, description: "Create or update a persisted Live Builder draft." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    const session = store.update((db) => upsertLiveBuilderSession(db, auth, body));
    return created(session);
  });

  router.add("POST", "/api/live/builder/:id/publish", { tag: "live-builder", auth: true, description: "Publish a saved Live Builder draft." }, async ({ auth, params, readBody, store }) => {
    const body = (await readBody()) || {};
    const session = store.update((db) => {
      const existing = db.liveSessions.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(existing, "Live builder session not found.", "SESSION_NOT_FOUND", 404);
      const payload = {
        ...body,
        sessionId: params.id,
        builderState: body?.builderState || existing.builderState,
        summary: {
          ...(existing.builderState?.draft ? { title: existing.builderState.draft.title } : {}),
          ...(body?.summary || {})
        }
      };
      return upsertLiveBuilderSession(db, auth, payload, { publish: true, publishStatus: body?.status || "scheduled" });
    });
    return ok(session);
  });

  router.add("GET", "/api/live/campaigns/:campaignId/giveaways", { tag: "live-builder", auth: true, description: "Supplier-set giveaway inventory for a live campaign." }, async ({ params, store }) => {
    const db = store.load();
    return ok(buildCampaignGiveawayInventory(db, params.campaignId));
  });

  router.add("GET", "/api/live/sessions", { tag: "live", auth: true, description: "List live sessions and calendar rows." }, async ({ auth, query, store }) => {
    const db = store.load();
    let items = db.liveSessions.filter((session) => session.userId === auth.user.id);
    items = applySearch(items, query.get("q"), ["title", "campaign", "seller", "status", "role"]);

    // Optional filters
    // - status: supports a single status (legacy) or a comma/pipe separated list.
    //   Example: ?status=scheduled,ready,live
    // - campaignId: filter sessions assigned to a campaign
    //   Example: ?campaignId=camp_glowup or ?campaignId=unassigned
    const statusParam = String(query.get("status") || "").trim();
    if (statusParam && statusParam !== "all") {
      const tokens = statusParam
        .split(/[\,\|]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
      const allowed = new Set(tokens.map((token) => normalizeLiveStatus(token)));
      items = items.filter((session) => allowed.has(normalizeLiveStatus(session.status)));
    }

    const campaignId = String(query.get("campaignId") || "").trim();
    if (campaignId && campaignId !== "all") {
      if (campaignId === "unassigned") {
        items = items.filter((session) => !session.campaignId);
      } else {
        items = items.filter((session) => String(session.campaignId || "") === campaignId);
      }
    }
    const page = paginate(items, query);
    return ok(page.data, page.meta);
  });

  router.add("GET", "/api/live/sessions/:id", { tag: "live", auth: true, description: "Get one live session." }, async ({ auth, params, store }) => {
    const db = store.load();
    const session = db.liveSessions.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
    ensure(session, "Live session not found.", "SESSION_NOT_FOUND", 404);
    return ok(session);
  });

  // ---------------------------------------------------------------------------
  // Live Studio
  // ---------------------------------------------------------------------------
  // NOTE: This route MUST be registered before /api/live/studio/:id.
  // The Router matches the first pattern, and "default" would otherwise be treated
  // as a session id.
  router.add(
    "GET",
    "/api/live/studio/default",
    {
      tag: "live",
      auth: true,
      description:
        "Resolve and return a default live studio workspace (used when /live-studio is opened without sessionId)."
    },
    async ({ auth, store }) => {
      const workspace = store.update((db) => {
        const sessions = Array.isArray(db.liveSessions)
          ? db.liveSessions.filter((entry) => entry.userId === auth.user.id)
          : [];

        const priority = {
          live: 0,
          scheduled: 1,
          ready: 2,
          draft: 3,
          ended: 4
        };

        const sorted = [...sessions].sort((a, b) => {
          const aStatus = String(a?.status || "draft").toLowerCase();
          const bStatus = String(b?.status || "draft").toLowerCase();
          const aPriority = priority[aStatus] ?? 3;
          const bPriority = priority[bStatus] ?? 3;
          if (aPriority !== bPriority) return aPriority - bPriority;

          const now = Date.now();
          const aTime = safeDate(a?.scheduledFor).getTime();
          const bTime = safeDate(b?.scheduledFor).getTime();
          const aDelta = Math.abs(aTime - now);
          const bDelta = Math.abs(bTime - now);
          if (aDelta !== bDelta) return aDelta - bDelta;
          return bTime - aTime;
        });

        let session = sorted[0];
        if (!session) {
          const today = new Date().toISOString().slice(0, 10);
          session = upsertLiveBuilderSession(db, auth, {
            builderState: {
              ts: Date.now(),
              draft: {
                title: "Untitled live session",
                status: "Draft",
                startDateISO: today,
                startTime: "18:00",
                products: []
              }
            },
            summary: {
              title: "Untitled live session",
              status: "draft"
            }
          });
        }

        return {
          session,
          audienceNotifications: db.toolConfigs.audienceNotifications,
          liveAlerts: db.toolConfigs.liveAlerts,
          overlays: db.toolConfigs.overlays,
          streaming: db.toolConfigs.streaming,
          safety: db.toolConfigs.safety
        };
      });

      return ok(workspace);
    }
  );

  router.add("POST", "/api/live/sessions", { tag: "live", auth: true, description: "Create a live session draft." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    requireFields(body, ["title", "campaign", "sellerId", "scheduledFor"]);

    const session = store.update((db) => {
      const seller = db.sellers.find((entry) => entry.id === body.sellerId);
      ensure(seller, "Seller not found.", "SELLER_NOT_FOUND", 404);

      const session = {
        id: id("live"),
        userId: auth.user.id,
        title: String(body.title),
        campaignId: body.campaignId || null,
        campaign: String(body.campaign),
        sellerId: seller.id,
        seller: seller.name,
        weekday: body.weekday || "TBD",
        dateLabel: body.dateLabel || new Date(body.scheduledFor).toDateString(),
        scheduledFor: String(body.scheduledFor),
        time: body.time || "",
        location: body.location || "Remote studio",
        simulcast: Array.isArray(body.simulcast) ? body.simulcast : [],
        status: body.status || "draft",
        role: body.role || "Host",
        durationMin: Number(body.durationMin || 60),
        scriptsReady: Boolean(body.scriptsReady),
        assetsReady: Boolean(body.assetsReady),
        productsCount: Number(body.productsCount || 0),
        workloadScore: Number(body.workloadScore || 0),
        conflict: false,
        studio: {
          mode: "builder",
          micOn: true,
          camOn: true,
          screenShareOn: false,
          activeSceneId: "scene_intro",
          scenes: [{ id: "scene_intro", label: "Intro Card" }],
          products: [],
          coHosts: [],
          chat: [],
          momentMarkers: [],
          commerceGoal: { soldUnits: 0, targetUnits: 0, cartCount: 0, last5MinSales: 0 }
        }
      };

      db.liveSessions.unshift(session);
      pushAudit(db, { actor: auth.user.email, action: "Live session created", detail: session.title, severity: "info" });
      return session;
    });

    return created(session);
  });

  router.add("PATCH", "/api/live/sessions/:id", { tag: "live", auth: true, description: "Update session scheduling metadata." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    const session = store.update((db) => {
      const session = db.liveSessions.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(session, "Live session not found.", "SESSION_NOT_FOUND", 404);

      Object.assign(session, {
        ...(body.title !== undefined ? { title: String(body.title) } : {}),
        ...(body.scheduledFor !== undefined ? { scheduledFor: String(body.scheduledFor) } : {}),
        ...(body.time !== undefined ? { time: String(body.time) } : {}),
        ...(body.status !== undefined ? { status: String(body.status) } : {}),
        ...(body.simulcast !== undefined ? { simulcast: body.simulcast } : {})
      });

      pushAudit(db, { actor: auth.user.email, action: "Live session updated", detail: session.title, severity: "info" });
      return session;
    });
    return ok(session);
  });

  router.add("GET", "/api/live/studio/:id", { tag: "live", auth: true, description: "Fetch the live studio workspace state." }, async ({ auth, params, store }) => {
    const db = store.load();
    const session = db.liveSessions.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
    ensure(session, "Live studio session not found.", "SESSION_NOT_FOUND", 404);
    return ok({
      session,
      audienceNotifications: db.toolConfigs.audienceNotifications,
      liveAlerts: db.toolConfigs.liveAlerts,
      overlays: db.toolConfigs.overlays,
      streaming: db.toolConfigs.streaming,
      safety: db.toolConfigs.safety
    });
  });

  router.add("POST", "/api/live/studio/:id/start", { tag: "live", auth: true, description: "Mark a live session as started." }, async ({ auth, params, store }) => {
    const session = store.update((db) => {
      const session = db.liveSessions.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(session, "Live studio session not found.", "SESSION_NOT_FOUND", 404);
      session.status = "live";
      session.studio.mode = "broadcast";
      if (session.builderState?.draft && typeof session.builderState.draft === "object") {
        session.builderState.draft.status = "Live";
      }
      pushAudit(db, { actor: auth.user.email, action: "Live session started", detail: session.title, severity: "info" });
      return session;
    });
    return ok(session);
  });

  router.add("POST", "/api/live/studio/:id/end", { tag: "live", auth: true, description: "End a live session and create a replay draft." }, async ({ auth, params, store }) => {
    const result = store.update((db) => {
      const session = db.liveSessions.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(session, "Live studio session not found.", "SESSION_NOT_FOUND", 404);
      session.status = "ended";
      session.studio.mode = "ended";
      if (session.builderState?.draft && typeof session.builderState.draft === "object") {
        session.builderState.draft.status = "Ended";
      }

      const replay = buildReplayFromSession(session, {}, {});
      db.replays.unshift(replay);
      pushAudit(db, { actor: auth.user.email, action: "Live session ended", detail: session.title, severity: "info" });
      return { session, replay };
    });
    return created(result);
  });

  router.add("POST", "/api/live/studio/:id/moments", { tag: "live", auth: true, description: "Add a moment marker during live." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    requireFields(body, ["label"]);
    const session = store.update((db) => {
      const session = db.liveSessions.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(session, "Live studio session not found.", "SESSION_NOT_FOUND", 404);
      session.studio.momentMarkers.push({
        id: Date.now(),
        time: body.time || "00:00:00",
        label: String(body.label)
      });
      pushAudit(db, { actor: auth.user.email, action: "Moment marker added", detail: `${session.title}: ${body.label}`, severity: "info" });
      return session;
    });
    return created(session);
  });

  router.add("GET", "/api/live/replays", { tag: "live", auth: true, description: "List replays and clips." }, async ({ auth, query, store }) => {
    const db = store.load();
    const allowedSessionIds = new Set(db.liveSessions.filter((entry) => entry.userId === auth.user.id).map((entry) => entry.id));
    let items = db.replays.filter((entry) => allowedSessionIds.has(entry.sessionId));
    items = applySearch(items, query.get("q"), ["title", "hook", "retention", "notes"]);
    items = applyFilter(items, query.get("published"), "published", (value) => String(value));
    items = applyFilter(items, query.get("sessionId"), "sessionId");
    const page = paginate(items, query);
    return ok(page.data, page.meta);
  });


  router.add("GET", "/api/live/replays/:id", { tag: "live", auth: true, description: "Return one replay record." }, async ({ auth, params, store }) => {
    const db = store.load();
    const replay = db.replays.find((entry) => entry.id === params.id);
    ensure(replay, "Replay not found.", "REPLAY_NOT_FOUND", 404);
    const session = db.liveSessions.find((entry) => entry.id === replay.sessionId && entry.userId === auth.user.id);
    ensure(session, "Replay not found.", "REPLAY_NOT_FOUND", 404);
    return ok(replay);
  });

  router.add("GET", "/api/live/replays/by-session/:sessionId", { tag: "live", auth: true, description: "Return or initialize a replay draft for a session." }, async ({ auth, params, store }) => {
    const replay = store.update((db) => {
      const session = db.liveSessions.find((entry) => entry.id === params.sessionId && entry.userId === auth.user.id);
      ensure(session, "Live session not found.", "SESSION_NOT_FOUND", 404);
      const existing = db.replays.find((entry) => entry.sessionId === params.sessionId);
      if (existing) return existing;
      const createdReplay = buildReplayFromSession(session, {}, {});
      db.replays.unshift(createdReplay);
      return createdReplay;
    });
    return ok(replay);
  });

  router.add("PATCH", "/api/live/replays/:id", { tag: "live", auth: true, description: "Update replay draft metadata." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    const replay = store.update((db) => {
      const existing = db.replays.find((entry) => entry.id === params.id);
      ensure(existing, "Replay not found.", "REPLAY_NOT_FOUND", 404);
      const session = db.liveSessions.find((entry) => entry.id === existing.sessionId && entry.userId === auth.user.id);
      ensure(session, "Replay not found.", "REPLAY_NOT_FOUND", 404);
      const nextReplay = buildReplayFromSession(session, existing, body || {});
      Object.assign(existing, nextReplay);
      pushAudit(db, { actor: auth.user.email, action: "Replay updated", detail: existing.title, severity: "info" });
      return existing;
    });
    return ok(replay);
  });

  router.add("POST", "/api/live/replays/:id/publish", { tag: "live", auth: true, description: "Publish a replay draft." }, async ({ auth, params, readBody, store }) => {
    const body = (await readBody()) || {};
    const replay = store.update((db) => {
      const existing = db.replays.find((entry) => entry.id === params.id);
      ensure(existing, "Replay not found.", "REPLAY_NOT_FOUND", 404);
      const session = db.liveSessions.find((entry) => entry.id === existing.sessionId && entry.userId === auth.user.id);
      ensure(session, "Replay not found.", "REPLAY_NOT_FOUND", 404);
      const nextReplay = buildReplayFromSession(session, existing, { ...body, published: true });
      Object.assign(existing, nextReplay);
      pushAudit(db, { actor: auth.user.email, action: "Replay published", detail: existing.title, severity: "info" });
      return existing;
    });
    return ok(replay);
  });

  router.add("GET", "/api/live/reviews", { tag: "live", auth: true, description: "Review scores for the creator." }, async ({ auth, store }) => {
    const db = store.load();
    return ok((db.reviews || []).filter((review) => String(review.userId || "") === auth.user.id));
  });

  router.add("GET", "/api/tools/audience-notifications", { tag: "live-tools", auth: true, description: "Audience notification settings." }, async ({ store }) => ok(store.load().toolConfigs.audienceNotifications));
  router.add("GET", "/api/tools/live-alerts", { tag: "live-tools", auth: true, description: "Live alerts settings." }, async ({ store }) => ok(store.load().toolConfigs.liveAlerts));
  router.add("GET", "/api/tools/overlays", { tag: "live-tools", auth: true, description: "Overlay and CTA settings." }, async ({ store }) => ok(store.load().toolConfigs.overlays));
  router.add("GET", "/api/tools/post-live", { tag: "live-tools", auth: true, description: "Post-live publisher state." }, async ({ store }) => ok(store.load().toolConfigs.postLive));
  router.add("GET", "/api/tools/streaming", { tag: "live-tools", auth: true, description: "Streaming destination settings." }, async ({ store }) => ok(store.load().toolConfigs.streaming));
  router.add("GET", "/api/tools/safety", { tag: "live-tools", auth: true, description: "Safety and moderation settings." }, async ({ store }) => ok(store.load().toolConfigs.safety));

  const patchTool = (key, description) =>
    router.add("PATCH", `/api/tools/${key}`, { tag: "live-tools", auth: true, description }, async ({ auth, readBody, store }) => {
      const body = await readBody();
      const result = store.update((db) => {
        db.toolConfigs[key] = { ...db.toolConfigs[key], ...body, updatedAt: nowIso() };
        pushAudit(db, { actor: auth.user.email, action: `${key} updated`, detail: "Tool configuration changed", severity: "info" });
        return db.toolConfigs[key];
      });
      return ok(result);
    });

  patchTool("audienceNotifications", "Update audience notification settings.");
  patchTool("liveAlerts", "Update live alerts settings.");
  patchTool("overlays", "Update overlay settings.");
  patchTool("postLive", "Update post-live publishing settings.");
  patchTool("streaming", "Update multi-stream settings.");
  patchTool("safety", "Update moderation settings.");
}
