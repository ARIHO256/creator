import { created, ok } from "../lib/http.js";
import { ensure, id, nowIso, pushAudit, requireFields, applyFilter, applySearch, paginate } from "../lib/utils.js";

const PROPOSAL_STATUSES = ["draft", "sent_to_brand", "in_negotiation", "accepted", "declined", "contract_created", "archived"];
const CONTRACT_STATUSES = ["active", "at_risk", "completed", "termination_requested", "terminated", "paused", "upcoming"];
const CONTRACT_HEALTH = ["on_track", "at_risk", "overdue", "complete", "terminated"];
const TASK_COLUMNS = ["todo", "in_progress", "submitted", "approved", "needs_changes"];
const TASK_PRIORITIES = ["low", "medium", "high", "critical"];
const ASSET_STATUSES = ["draft", "pending_supplier", "pending_admin", "approved", "changes_requested", "rejected"];
const ASSET_MEDIA_TYPES = ["video", "image", "template", "script", "overlay", "link", "doc"];

function toDateOnly(value) {
  return String(value || "").slice(0, 10);
}

function addDaysToIsoDate(value, days) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function buildInitials(value) {
  const parts = String(value || "")
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] || "C";
  const second = parts[1]?.[0] || parts[0]?.[1] || "R";
  return `${first}${second}`.toUpperCase();
}

function formatDueLabel(dueAt) {
  const target = new Date(dueAt);
  if (Number.isNaN(target.getTime())) return "TBD";
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOfTarget = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()));
  const diffDays = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days overdue`;
}

function normalizeProposalStatus(value) {
  const normalized = normalizeToken(value);
  switch (normalized) {
    case "sent":
    case "sent_to_seller":
    case "sent_to_brand":
      return "sent_to_brand";
    case "negotiating":
    case "in_negotiation":
    case "in_discussion":
      return "in_negotiation";
    case "won":
      return "accepted";
    case "rejected":
      return "declined";
    default:
      return PROPOSAL_STATUSES.includes(normalized) ? normalized : "draft";
  }
}

function normalizeContractStatus(value) {
  const normalized = normalizeToken(value);
  switch (normalized) {
    case "attention":
    case "at_risk":
    case "risk":
      return "at_risk";
    case "termination_requested":
    case "termination":
      return "termination_requested";
    case "done":
      return "completed";
    default:
      return CONTRACT_STATUSES.includes(normalized) ? normalized : "active";
  }
}

function normalizeContractHealth(value) {
  const normalized = normalizeToken(value);
  switch (normalized) {
    case "complete":
    case "completed":
      return "complete";
    case "on_track":
    case "healthy":
      return "on_track";
    default:
      return CONTRACT_HEALTH.includes(normalized) ? normalized : "on_track";
  }
}

function normalizeTaskColumn(value) {
  const normalized = normalizeToken(value);
  switch (normalized) {
    case "todo":
    case "to_do":
      return "todo";
    case "inprogress":
    case "in_progress":
      return "in_progress";
    case "submitted":
    case "awaiting_review":
    case "in_review":
    case "review":
      return "submitted";
    case "approved":
    case "done":
    case "completed":
      return "approved";
    case "needschanges":
    case "needs_changes":
    case "changes_requested":
      return "needs_changes";
    default:
      return "todo";
  }
}

function normalizeTaskPriority(value) {
  const normalized = normalizeToken(value);
  switch (normalized) {
    case "normal":
      return "medium";
    default:
      return TASK_PRIORITIES.includes(normalized) ? normalized : "medium";
  }
}

function normalizeAssetStatus(value) {
  const normalized = normalizeToken(value);
  switch (normalized) {
    case "supplier_review":
    case "pending_supplier_review":
      return "pending_supplier";
    case "admin_review":
    case "pending_admin_review":
      return "pending_admin";
    case "needs_changes":
      return "changes_requested";
    default:
      return ASSET_STATUSES.includes(normalized) ? normalized : "draft";
  }
}

function normalizeAssetMediaType(value) {
  const normalized = normalizeToken(value);
  switch (normalized) {
    case "document":
    case "pdf":
    case "docx":
      return "doc";
    default:
      return ASSET_MEDIA_TYPES.includes(normalized) ? normalized : "image";
  }
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeChecklist(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => ({
      id: entry?.id ? String(entry.id) : id(`check_${index + 1}`),
      text: String(entry?.text || entry?.label || "").trim(),
      done: Boolean(entry?.done)
    }))
    .filter((entry) => entry.text);
}

function normalizeComments(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => ({
    id: entry?.id ? String(entry.id) : `comment_${index + 1}`,
    author: String(entry?.author || entry?.name || "Creator"),
    body: String(entry?.body || "").trim(),
    createdAt: String(entry?.createdAt || nowIso())
  }));
}

function normalizeAttachments(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => ({
      id: entry?.id ? String(entry.id) : `attachment_${index + 1}`,
      name: String(entry?.name || entry?.label || entry?.url || "Attachment"),
      url: entry?.url ? String(entry.url) : "",
      sizeLabel: entry?.sizeLabel ? String(entry.sizeLabel) : "",
      note: entry?.note ? String(entry.note) : "",
      kind: entry?.kind ? String(entry.kind) : entry?.url ? "link" : "file",
      createdAt: String(entry?.createdAt || nowIso())
    }))
    .filter((entry) => entry.name || entry.url);
}

function normalizeTimeline(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => ({
      id: entry?.id ? String(entry.id) : `timeline_${index + 1}`,
      when: String(entry?.when || entry?.date || nowIso().slice(0, 10)),
      what: String(entry?.what || entry?.label || entry?.title || "").trim()
    }))
    .filter((entry) => entry.what);
}

function normalizeDeliverables(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => ({
      id: entry?.id ? String(entry.id) : `deliverable_${index + 1}`,
      label: String(entry?.label || entry?.title || "").trim(),
      done: Boolean(entry?.done),
      type: entry?.type ? String(entry.type) : "task",
      dueAt: entry?.dueAt ? String(entry.dueAt) : undefined
    }))
    .filter((entry) => entry.label);
}

function enrichContract(db, contract) {
  const seller = db.sellers.find((entry) => entry.id === contract.sellerId);
  const proposal = db.proposals.find((entry) => entry.id === contract.proposalId);
  const campaign = db.campaigns.find((entry) => entry.id === contract.campaignId);
  const deliverables = normalizeDeliverables(contract.deliverables);
  const timeline = normalizeTimeline(contract.timeline);
  const tasks = db.tasks.filter((entry) => entry.contractId === contract.id);
  const activeTasks = tasks.filter((entry) => normalizeTaskColumn(entry.column) !== "approved").length;

  return {
    ...structuredClone(contract),
    title: String(contract.title || proposal?.campaign || campaign?.title || "Untitled contract"),
    status: normalizeContractStatus(contract.status),
    health: normalizeContractHealth(contract.health),
    brand: seller?.brand || proposal?.brand || seller?.name || "Seller",
    sellerName: seller?.name || proposal?.brand || "Seller",
    campaignTitle: campaign?.title || proposal?.campaign || contract.title,
    proposalId: contract.proposalId || proposal?.id || null,
    deliverables,
    deliverablesCompleted: deliverables.filter((entry) => entry.done).length,
    deliverablesTotal: deliverables.length,
    linkedTasks: tasks.length,
    linkedTasksOpen: activeTasks,
    timeline,
    parties: {
      creator: {
        name: contract.parties?.creator?.name || db.creatorProfiles.find((entry) => entry.userId === contract.userId)?.name || "Creator",
        handle: contract.parties?.creator?.handle || `@${db.creatorProfiles.find((entry) => entry.userId === contract.userId)?.handle || "creator"}`
      },
      seller: {
        name: contract.parties?.seller?.name || seller?.name || proposal?.brand || "Seller",
        manager: contract.parties?.seller?.manager || "Brand manager"
      }
    },
    termination: {
      requested: Boolean(contract.termination?.requested),
      reason: contract.termination?.reason ? String(contract.termination.reason) : null,
      explanation: contract.termination?.explanation ? String(contract.termination.explanation) : null
    }
  };
}

function enrichTask(task) {
  const dueAt = task.dueAt ? String(task.dueAt) : nowIso();
  const normalizedColumn = normalizeTaskColumn(task.column);
  const dueLabel = task.dueLabel ? String(task.dueLabel) : formatDueLabel(dueAt);
  const createdAt = task.createdAt ? String(task.createdAt) : dueAt;
  const updatedAt = task.updatedAt ? String(task.updatedAt) : createdAt;
  const overdue = task.overdue !== undefined ? Boolean(task.overdue) : new Date(dueAt).getTime() < Date.now();

  return {
    ...structuredClone(task),
    contractId: task.contractId || null,
    column: normalizedColumn,
    type: String(task.type || "task"),
    priority: normalizeTaskPriority(task.priority),
    supplierInitials: task.supplierInitials || buildInitials(task.supplier || task.brand || "Supplier"),
    dueAt,
    dueLabel,
    overdue,
    description: task.description ? String(task.description) : "",
    assignee: task.assignee ? String(task.assignee) : "@me",
    watchers: Array.isArray(task.watchers) ? task.watchers.map((entry) => String(entry)) : [],
    checklist: normalizeChecklist(task.checklist),
    dependencyIds: Array.isArray(task.dependencyIds) ? task.dependencyIds.map((entry) => String(entry)) : [],
    refLinks: Array.isArray(task.refLinks) ? task.refLinks.map((entry) => String(entry)) : [],
    reminder: task.reminder ? String(task.reminder) : "none",
    comments: normalizeComments(task.comments),
    attachments: normalizeAttachments(task.attachments),
    createdAt,
    updatedAt
  };
}

function inferPreviewKind(mediaType) {
  const normalized = normalizeAssetMediaType(mediaType);
  if (normalized === "video") return "video";
  if (["image", "overlay", "template"].includes(normalized)) return "image";
  return undefined;
}

function enrichAsset(asset) {
  const mediaType = normalizeAssetMediaType(asset.mediaType);
  const status = normalizeAssetStatus(asset.status);
  const updatedAt = asset.updatedAt ? String(asset.updatedAt) : nowIso();
  return {
    ...structuredClone(asset),
    mediaType,
    status,
    source: String(asset.source || "creator"),
    tags: normalizeTags(asset.tags),
    previewKind: asset.previewKind || inferPreviewKind(mediaType),
    previewUrl: asset.previewUrl ? String(asset.previewUrl) : "",
    thumbnailUrl: asset.thumbnailUrl ? String(asset.thumbnailUrl) : "",
    subtitle: asset.subtitle ? String(asset.subtitle) : "",
    ownerLabel: asset.ownerLabel ? String(asset.ownerLabel) : "Owner: Creator",
    role: asset.role ? String(asset.role) : "asset",
    usageNotes: asset.usageNotes ? String(asset.usageNotes) : "",
    restrictions: asset.restrictions ? String(asset.restrictions) : "",
    reviewNote: asset.reviewNote ? String(asset.reviewNote) : "",
    createdAt: asset.createdAt ? String(asset.createdAt) : updatedAt,
    updatedAt,
    lastUpdatedLabel: asset.lastUpdatedLabel ? String(asset.lastUpdatedLabel) : "Just now"
  };
}

function maybeCreateContract(db, proposal) {
  const existing = db.contracts.find((contract) => contract.proposalId === proposal.id);
  if (existing) return existing;

  const today = toDateOnly(nowIso());
  const contract = {
    id: id("contract"),
    userId: proposal.userId,
    sellerId: proposal.sellerId,
    campaignId: db.campaigns.find((campaign) => campaign.sellerId === proposal.sellerId)?.id || null,
    proposalId: proposal.id,
    title: proposal.campaign,
    status: "active",
    health: "on_track",
    value: proposal.estimatedValue,
    currency: proposal.currency,
    startDate: today,
    endDate: addDaysToIsoDate(today, 7),
    deliverables: [
      { id: id("deliverable"), label: proposal.terms.deliverables || "Contract deliverable", done: false, type: "mixed" }
    ],
    timeline: [
      { when: today, what: "Contract created from proposal." }
    ],
    parties: {
      creator: { name: "Ronald Isabirye", handle: "@ronald.creates" },
      seller: { name: proposal.brand, manager: "Auto-generated" }
    },
    termination: { requested: false, reason: null, explanation: null }
  };
  db.contracts.unshift(contract);
  return contract;
}

export function registerCollaborationRoutes(router) {
  router.add("GET", "/api/campaigns", { tag: "collaboration", auth: true, description: "List campaign board rows." }, async ({ auth, query, store }) => {
    const db = store.load();
    let items = db.campaigns.filter((campaign) => campaign.ownerUserId === auth.user.id);
    items = applySearch(items, query.get("q"), ["title", "seller", "type", "stage", "note"]);
    items = applyFilter(items, query.get("stage"), "stage");
    const page = paginate(items, query);
    return ok(page.data, page.meta);
  });

  router.add("GET", "/api/proposals", { tag: "collaboration", auth: true, description: "List proposal inbox items." }, async ({ auth, query, store }) => {
    const db = store.load();
    let items = db.proposals.filter((proposal) => proposal.userId === auth.user.id);
    items = applySearch(items, query.get("q"), ["brand", "campaign", "offerType", "category", "region", "notesShort"]);
    if (query.get("status")) {
      const normalizedStatus = normalizeProposalStatus(query.get("status"));
      items = items.filter((proposal) => normalizeProposalStatus(proposal.status) === normalizedStatus);
    }
    if (query.get("origin")) {
      items = items.filter((proposal) => normalizeToken(proposal.origin) === normalizeToken(query.get("origin")));
    }
    const page = paginate(items, query);
    return ok(page.data, page.meta);
  });

  router.add("POST", "/api/proposals", { tag: "collaboration", auth: true, description: "Create a new proposal or pitch." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    requireFields(body, ["sellerId", "campaign", "offerType", "category", "region"]);

    const proposal = store.update((db) => {
      const seller = db.sellers.find((entry) => entry.id === body.sellerId);
      ensure(seller, "Seller not found.", "SELLER_NOT_FOUND", 404);

      const proposal = {
        id: id("proposal"),
        userId: auth.user.id,
        sellerId: seller.id,
        brand: seller.name,
        initials: seller.initials,
        campaign: String(body.campaign),
        origin: body.origin || "creator",
        offerType: String(body.offerType),
        category: String(body.category),
        region: String(body.region),
        baseFeeMin: Number(body.baseFeeMin || 0),
        baseFeeMax: Number(body.baseFeeMax || body.baseFeeMin || 0),
        currency: body.currency || "USD",
        commissionPct: Number(body.commissionPct || 0),
        estimatedValue: Number(body.estimatedValue || body.baseFeeMax || body.baseFeeMin || 0),
        status: "draft",
        lastActivity: "Draft saved - just now",
        notesShort: body.notesShort || "",
        terms: {
          deliverables: body.deliverables || "",
          schedule: body.schedule || "",
          compensation: body.compensation || "",
          exclusivityWindow: body.exclusivityWindow || "",
          killFee: body.killFee || ""
        },
        messages: []
      };

      db.proposals.unshift(proposal);
      pushAudit(db, { actor: auth.user.email, action: "Proposal created", detail: proposal.campaign, severity: "info" });
      return proposal;
    });

    return created(proposal);
  });

  router.add("GET", "/api/proposals/:id", { tag: "collaboration", auth: true, description: "Get proposal room data." }, async ({ auth, params, store }) => {
    const db = store.load();
    const proposal = db.proposals.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
    ensure(proposal, "Proposal not found.", "PROPOSAL_NOT_FOUND", 404);
    return ok(proposal);
  });

  router.add("PATCH", "/api/proposals/:id", { tag: "collaboration", auth: true, description: "Update proposal terms or summary fields." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();

    const proposal = store.update((db) => {
      const proposal = db.proposals.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(proposal, "Proposal not found.", "PROPOSAL_NOT_FOUND", 404);

      if (body.status !== undefined) {
        const normalizedStatus = normalizeProposalStatus(body.status);
        ensure(PROPOSAL_STATUSES.includes(normalizedStatus), "Unsupported proposal status.");
        proposal.status = normalizedStatus;
      }

      Object.assign(proposal, {
        ...(body.campaign !== undefined ? { campaign: String(body.campaign) } : {}),
        ...(body.offerType !== undefined ? { offerType: String(body.offerType) } : {}),
        ...(body.category !== undefined ? { category: String(body.category) } : {}),
        ...(body.region !== undefined ? { region: String(body.region) } : {}),
        ...(body.baseFeeMin !== undefined ? { baseFeeMin: Number(body.baseFeeMin) } : {}),
        ...(body.baseFeeMax !== undefined ? { baseFeeMax: Number(body.baseFeeMax) } : {}),
        ...(body.currency !== undefined ? { currency: String(body.currency) } : {}),
        ...(body.commissionPct !== undefined ? { commissionPct: Number(body.commissionPct) } : {}),
        ...(body.estimatedValue !== undefined ? { estimatedValue: Number(body.estimatedValue) } : {}),
        ...(body.notesShort !== undefined ? { notesShort: String(body.notesShort) } : {})
      });

      if (body.terms && typeof body.terms === "object" && !Array.isArray(body.terms)) {
        proposal.terms = {
          ...proposal.terms,
          ...(body.terms.deliverables !== undefined ? { deliverables: String(body.terms.deliverables) } : {}),
          ...(body.terms.schedule !== undefined ? { schedule: String(body.terms.schedule) } : {}),
          ...(body.terms.compensation !== undefined ? { compensation: String(body.terms.compensation) } : {}),
          ...(body.terms.exclusivityWindow !== undefined ? { exclusivityWindow: String(body.terms.exclusivityWindow) } : {}),
          ...(body.terms.killFee !== undefined ? { killFee: String(body.terms.killFee) } : {})
        };
      }

      if (proposal.status === "accepted" || proposal.status === "contract_created") {
        maybeCreateContract(db, proposal);
      }

      proposal.lastActivity = body.status ? `${proposal.status} - just now` : "Updated - just now";
      pushAudit(db, { actor: auth.user.email, action: "Proposal updated", detail: proposal.campaign, severity: "info" });
      return proposal;
    });

    return ok(proposal);
  });

  router.add("POST", "/api/proposals/:id/messages", { tag: "collaboration", auth: true, description: "Add a message in the negotiation room." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    requireFields(body, ["body"]);

    const proposal = store.update((db) => {
      const proposal = db.proposals.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(proposal, "Proposal not found.", "PROPOSAL_NOT_FOUND", 404);

      proposal.messages.push({
        id: id("msg"),
        from: "creator",
        name: auth.profile?.name || "Creator",
        avatar: buildInitials(auth.profile?.name || "Creator"),
        time: nowIso(),
        body: String(body.body)
      });
      proposal.lastActivity = "Message sent - just now";

      pushAudit(db, { actor: auth.user.email, action: "Proposal message sent", detail: proposal.campaign, severity: "info" });
      return proposal;
    });

    return created(proposal);
  });

  router.add("POST", "/api/proposals/:id/transition", { tag: "collaboration", auth: true, description: "Advance or update proposal state." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    requireFields(body, ["status"]);
    const normalizedStatus = normalizeProposalStatus(body.status);
    ensure(PROPOSAL_STATUSES.includes(normalizedStatus), "Unsupported proposal status.");

    const result = store.update((db) => {
      const proposal = db.proposals.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(proposal, "Proposal not found.", "PROPOSAL_NOT_FOUND", 404);

      proposal.status = normalizedStatus;
      proposal.lastActivity = `${normalizedStatus} - just now`;
      if (body.note) {
        proposal.notesShort = String(body.note);
      }

      let contract = null;
      if (normalizedStatus === "contract_created" || normalizedStatus === "accepted") {
        contract = maybeCreateContract(db, proposal);
      }

      pushAudit(db, { actor: auth.user.email, action: "Proposal transitioned", detail: `${proposal.campaign} -> ${normalizedStatus}`, severity: "info" });
      return { proposal, contract };
    });

    return ok(result);
  });

  router.add("GET", "/api/contracts", { tag: "collaboration", auth: true, description: "List contract rows." }, async ({ auth, query, store }) => {
    const db = store.load();
    let items = db.contracts.filter((contract) => contract.userId === auth.user.id).map((contract) => enrichContract(db, contract));
    items = applySearch(items, query.get("q"), ["title", "status", "health", "brand", "sellerName", "campaignTitle"]);
    if (query.get("status")) {
      const normalizedStatus = normalizeContractStatus(query.get("status"));
      items = items.filter((contract) => contract.status === normalizedStatus);
    }
    const page = paginate(items, query);
    return ok(page.data, page.meta);
  });

  router.add("GET", "/api/contracts/:id", { tag: "collaboration", auth: true, description: "Get contract detail." }, async ({ auth, params, store }) => {
    const db = store.load();
    const contract = db.contracts.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
    ensure(contract, "Contract not found.", "CONTRACT_NOT_FOUND", 404);
    return ok(enrichContract(db, contract));
  });

  router.add("POST", "/api/contracts/:id/terminate-request", { tag: "collaboration", auth: true, description: "Submit a termination request." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    requireFields(body, ["reason", "explanation"]);

    const contract = store.update((db) => {
      const contract = db.contracts.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(contract, "Contract not found.", "CONTRACT_NOT_FOUND", 404);
      contract.termination = {
        requested: true,
        reason: String(body.reason),
        explanation: String(body.explanation)
      };
      contract.status = "termination_requested";
      contract.health = "at_risk";
      contract.timeline = normalizeTimeline(contract.timeline);
      contract.timeline.unshift({ id: id("timeline"), when: toDateOnly(nowIso()), what: "Termination request submitted." });

      pushAudit(db, { actor: auth.user.email, action: "Termination requested", detail: contract.title, severity: "warn" });
      return enrichContract(db, contract);
    });

    return created(contract);
  });

  router.add("GET", "/api/tasks", { tag: "collaboration", auth: true, description: "List task board items." }, async ({ auth, query, store }) => {
    const db = store.load();
    let items = db.tasks.filter((task) => task.userId === auth.user.id).map((task) => enrichTask(task));
    items = applySearch(items, query.get("q"), ["title", "campaign", "supplier", "brand", "type", "description"]);
    if (query.get("column")) {
      const normalizedColumn = normalizeTaskColumn(query.get("column"));
      items = items.filter((task) => task.column === normalizedColumn);
    }
    if (query.get("contractId")) {
      items = items.filter((task) => task.contractId === query.get("contractId"));
    }
    if (query.get("overdueOnly") === "true") {
      items = items.filter((task) => task.overdue);
    }
    items.sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());
    const page = paginate(items, query);
    return ok(page.data, page.meta);
  });

  router.add("GET", "/api/tasks/:id", { tag: "collaboration", auth: true, description: "Get task detail." }, async ({ auth, params, store }) => {
    const db = store.load();
    const task = db.tasks.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
    ensure(task, "Task not found.", "TASK_NOT_FOUND", 404);
    return ok(enrichTask(task));
  });

  router.add("POST", "/api/tasks", { tag: "collaboration", auth: true, description: "Create a task." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    requireFields(body, ["title"]);

    const task = store.update((db) => {
      let contract = null;
      let seller = null;
      let campaign = null;

      if (body.contractId) {
        contract = db.contracts.find((entry) => entry.id === body.contractId && entry.userId === auth.user.id) || null;
        ensure(contract, "Contract not found.", "CONTRACT_NOT_FOUND", 404);
        seller = db.sellers.find((entry) => entry.id === contract.sellerId) || null;
        campaign = db.campaigns.find((entry) => entry.id === contract.campaignId) || null;
      }

      const campaignName = body.campaign || campaign?.title || contract?.title;
      const supplierName = body.supplier || seller?.name || contract?.parties?.seller?.name;
      requireFields({ campaign: campaignName, supplier: supplierName }, ["campaign", "supplier"]);

      const dueAt = body.dueAt ? String(body.dueAt) : nowIso();
      const task = {
        id: id("task"),
        userId: auth.user.id,
        contractId: contract?.id || body.contractId || null,
        campaign: String(campaignName),
        supplier: String(supplierName),
        supplierInitials: buildInitials(supplierName),
        brand: body.brand || seller?.brand || supplierName,
        column: normalizeTaskColumn(body.column),
        title: String(body.title),
        type: body.type ? String(body.type) : "task",
        priority: normalizeTaskPriority(body.priority),
        dueLabel: body.dueLabel || formatDueLabel(dueAt),
        dueAt,
        overdue: body.overdue !== undefined ? Boolean(body.overdue) : new Date(dueAt).getTime() < Date.now(),
        earnings: Number(body.earnings || 0),
        currency: body.currency || contract?.currency || "USD",
        description: body.description ? String(body.description) : "",
        assignee: body.assignee ? String(body.assignee) : "@me",
        watchers: Array.isArray(body.watchers) ? body.watchers.map((entry) => String(entry)) : [],
        checklist: normalizeChecklist(body.checklist),
        dependencyIds: Array.isArray(body.dependencyIds) ? body.dependencyIds.map((entry) => String(entry)) : [],
        refLinks: Array.isArray(body.refLinks) ? body.refLinks.map((entry) => String(entry)) : [],
        reminder: body.reminder ? String(body.reminder) : "none",
        comments: normalizeComments(body.comments),
        attachments: normalizeAttachments(body.attachments),
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      db.tasks.unshift(task);
      pushAudit(db, { actor: auth.user.email, action: "Task created", detail: task.title, severity: "info" });
      return enrichTask(task);
    });
    return created(task);
  });

  router.add("PATCH", "/api/tasks/:id", { tag: "collaboration", auth: true, description: "Update a task." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    const task = store.update((db) => {
      const task = db.tasks.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(task, "Task not found.", "TASK_NOT_FOUND", 404);

      if (body.title !== undefined) task.title = String(body.title);
      if (body.column !== undefined) task.column = normalizeTaskColumn(body.column);
      if (body.priority !== undefined) task.priority = normalizeTaskPriority(body.priority);
      if (body.dueAt !== undefined) task.dueAt = String(body.dueAt);
      if (body.dueLabel !== undefined) task.dueLabel = String(body.dueLabel);
      if (body.description !== undefined) task.description = String(body.description);
      if (body.assignee !== undefined) task.assignee = String(body.assignee);
      if (body.watchers !== undefined) task.watchers = Array.isArray(body.watchers) ? body.watchers.map((entry) => String(entry)) : [];
      if (body.checklist !== undefined) task.checklist = normalizeChecklist(body.checklist);
      if (body.dependencyIds !== undefined) task.dependencyIds = Array.isArray(body.dependencyIds) ? body.dependencyIds.map((entry) => String(entry)) : [];
      if (body.refLinks !== undefined) task.refLinks = Array.isArray(body.refLinks) ? body.refLinks.map((entry) => String(entry)) : [];
      if (body.attachments !== undefined) task.attachments = normalizeAttachments(body.attachments);
      if (body.reminder !== undefined) task.reminder = String(body.reminder);
      if (body.overdue !== undefined) task.overdue = Boolean(body.overdue);
      if (body.earnings !== undefined) task.earnings = Number(body.earnings || 0);
      if (body.currency !== undefined) task.currency = String(body.currency || "USD");
      if (body.type !== undefined) task.type = String(body.type);
      if (body.brand !== undefined) task.brand = String(body.brand);
      if (body.supplier !== undefined) {
        task.supplier = String(body.supplier);
        task.supplierInitials = buildInitials(task.supplier);
      }
      if (body.campaign !== undefined) task.campaign = String(body.campaign);
      if (body.dueAt !== undefined && body.dueLabel === undefined) {
        task.dueLabel = formatDueLabel(task.dueAt);
        task.overdue = new Date(task.dueAt).getTime() < Date.now() && normalizeTaskColumn(task.column) !== "approved";
      }
      task.updatedAt = nowIso();

      pushAudit(db, { actor: auth.user.email, action: "Task updated", detail: task.title, severity: "info" });
      return enrichTask(task);
    });
    return ok(task);
  });

  router.add("POST", "/api/tasks/:id/comments", { tag: "collaboration", auth: true, description: "Comment on a task." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    requireFields(body, ["body"]);
    const task = store.update((db) => {
      const task = db.tasks.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(task, "Task not found.", "TASK_NOT_FOUND", 404);
      task.comments = normalizeComments(task.comments);
      task.comments.push({
        id: id("comment"),
        author: auth.profile?.name || "Creator",
        body: String(body.body),
        createdAt: nowIso()
      });
      task.updatedAt = nowIso();
      pushAudit(db, { actor: auth.user.email, action: "Task commented", detail: task.title, severity: "info" });
      return enrichTask(task);
    });
    return created(task);
  });

  router.add("POST", "/api/tasks/:id/attachments", { tag: "collaboration", auth: true, description: "Attach a file or reference link to a task." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    ensure(body.name || body.url, "Provide an attachment name or a URL.", "VALIDATION_ERROR", 400);

    const task = store.update((db) => {
      const task = db.tasks.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(task, "Task not found.", "TASK_NOT_FOUND", 404);
      task.attachments = normalizeAttachments(task.attachments);
      task.attachments.push({
        id: id("attachment"),
        name: String(body.name || body.url || "Attachment"),
        url: body.url ? String(body.url) : "",
        sizeLabel: body.sizeLabel ? String(body.sizeLabel) : "",
        note: body.note ? String(body.note) : "",
        kind: body.kind ? String(body.kind) : body.url ? "link" : "file",
        createdAt: nowIso()
      });
      task.updatedAt = nowIso();
      pushAudit(db, { actor: auth.user.email, action: "Task attachment added", detail: task.title, severity: "info" });
      return enrichTask(task);
    });

    return created(task);
  });

  router.add("GET", "/api/assets", { tag: "collaboration", auth: true, description: "List asset library items." }, async ({ auth, query, store }) => {
    const db = store.load();
    let items = db.assets.filter((asset) => asset.userId === auth.user.id).map((asset) => enrichAsset(asset));
    items = applySearch(items, query.get("q"), ["title", "subtitle", "brand", "tags", "status", "mediaType", "usageNotes", "restrictions"]);
    if (query.get("status")) {
      const normalizedStatus = normalizeAssetStatus(query.get("status"));
      items = items.filter((asset) => asset.status === normalizedStatus);
    }
    if (query.get("mediaType")) {
      const normalizedMediaType = normalizeAssetMediaType(query.get("mediaType"));
      items = items.filter((asset) => asset.mediaType === normalizedMediaType);
    }
    if (query.get("campaignId")) {
      items = items.filter((asset) => String(asset.campaignId || "") === query.get("campaignId"));
    }
    if (query.get("source")) {
      items = items.filter((asset) => normalizeToken(asset.source) === normalizeToken(query.get("source")));
    }
    items.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
    const page = paginate(items, query);
    return ok(page.data, page.meta);
  });

  router.add("GET", "/api/assets/:id", { tag: "collaboration", auth: true, description: "Get asset detail." }, async ({ auth, params, store }) => {
    const db = store.load();
    const asset = db.assets.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
    ensure(asset, "Asset not found.", "ASSET_NOT_FOUND", 404);
    return ok(enrichAsset(asset));
  });

  router.add("POST", "/api/assets", { tag: "collaboration", auth: true, description: "Create an asset metadata record." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    requireFields(body, ["title", "mediaType"]);
    const asset = store.update((db) => {
      const campaign = body.campaignId ? db.campaigns.find((entry) => entry.id === body.campaignId) || null : null;
      const seller = campaign ? db.sellers.find((entry) => entry.id === campaign.sellerId) || null : null;
      const mediaType = normalizeAssetMediaType(body.mediaType);
      const status = normalizeAssetStatus(body.status || "pending_supplier");
      const asset = {
        id: id("asset"),
        userId: auth.user.id,
        title: String(body.title),
        subtitle: body.subtitle || (campaign ? `${campaign.title} · ${campaign.seller}` : ""),
        campaignId: body.campaignId || campaign?.id || null,
        supplierId: body.supplierId || campaign?.sellerId || null,
        brand: body.brand || seller?.brand || campaign?.seller || "",
        tags: normalizeTags(body.tags),
        mediaType,
        source: body.source || "creator",
        ownerLabel: "Owner: Creator",
        status,
        lastUpdatedLabel: "Just now",
        previewUrl: body.previewUrl || body.url || body.linkUrl || "",
        thumbnailUrl: body.thumbnailUrl || "",
        previewKind: body.previewKind || inferPreviewKind(mediaType),
        role: body.role || "asset",
        usageNotes: body.usageNotes || body.notes || "",
        restrictions: body.restrictions || "",
        reviewNote: body.reviewNote || "",
        relatedDealId: body.relatedDealId || null,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      db.assets.unshift(asset);
      pushAudit(db, { actor: auth.user.email, action: "Asset created", detail: asset.title, severity: "info" });
      return enrichAsset(asset);
    });
    return created(asset);
  });

  router.add("PATCH", "/api/assets/:id/review", { tag: "collaboration", auth: true, description: "Update asset review state." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    requireFields(body, ["status"]);
    const normalizedStatus = normalizeAssetStatus(body.status);
    const asset = store.update((db) => {
      const asset = db.assets.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(asset, "Asset not found.", "ASSET_NOT_FOUND", 404);
      asset.status = normalizedStatus;
      asset.reviewNote = body.note ? String(body.note) : asset.reviewNote || "";
      asset.lastUpdatedLabel = "Just now";
      asset.updatedAt = nowIso();
      pushAudit(db, { actor: auth.user.email, action: "Asset review updated", detail: `${asset.title} -> ${normalizedStatus}`, severity: "info" });
      return enrichAsset(asset);
    });
    return ok(asset);
  });
}
