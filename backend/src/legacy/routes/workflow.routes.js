import { created, ok } from "../lib/http.js";
import { ensure, id, nowIso, pushAudit, requireFields } from "../lib/utils.js";

function ensureWorkflowCollections(db) {
  if (!Array.isArray(db.uploads)) db.uploads = [];
  if (!Array.isArray(db.onboardingWorkflows)) db.onboardingWorkflows = [];
  if (!Array.isArray(db.accountApprovals)) db.accountApprovals = [];
  if (!Array.isArray(db.contentApprovals)) db.contentApprovals = [];
}

function normalizeHandle(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.startsWith("@") ? raw : `@${raw}`;
}

function kindFromMime(mimeType) {
  const normalized = String(mimeType || "").toLowerCase();
  if (normalized.startsWith("image/")) return "image";
  if (normalized.startsWith("video/")) return "video";
  if (normalized === "application/pdf" || normalized.includes("document") || normalized.includes("sheet") || normalized.includes("text/")) {
    return "document";
  }
  return "file";
}

function createUploadRecord(auth, body) {
  const mimeType = String(body.type || body.mimeType || "application/octet-stream");
  const name = String(body.name || body.fileName || "upload.bin");
  const uploadId = id("upload");
  return {
    id: uploadId,
    userId: auth.user.id,
    name,
    fileName: name,
    mimeType,
    kind: kindFromMime(mimeType),
    size: Number(body.size || 0),
    purpose: String(body.purpose || "general"),
    relatedEntityType: body.relatedEntityType ? String(body.relatedEntityType) : null,
    relatedEntityId: body.relatedEntityId ? String(body.relatedEntityId) : null,
    status: "stored",
    createdAt: nowIso(),
    url: body.url ? String(body.url) : `mldz://upload/${uploadId}/${encodeURIComponent(name)}`
  };
}

function buildDefaultOnboardingForm(auth, db) {
  const profile = auth.profile || {};
  const settings = db.settings || {};
  const profileSettings = settings.profile || {};
  const preferences = settings.preferences || {};
  const kyc = settings.kyc || {};
  const payout = settings.payout || {};

  return {
    profile: {
      name: profile.name || profileSettings.name || "",
      handle: normalizeHandle(profile.handle || profileSettings.handle || ""),
      tagline: profile.tagline || profileSettings.tagline || "",
      country: profileSettings.country || "",
      timezone: profileSettings.timezone || "Africa/Kampala",
      currency: profileSettings.currency || "USD",
      bio: profile.bio || profileSettings.bio || "",
      contentLanguages: profileSettings.contentLanguages || profile.languages || [],
      audienceRegions: profileSettings.audienceRegions || profile.regions || [],
      creatorType: profileSettings.creatorType || "Individual",
      email: profileSettings.email || auth.user.email || "",
      phone: profileSettings.phone || "",
      whatsapp: profileSettings.whatsapp || "",
      profilePhotoName: profileSettings.profilePhotoName || "",
      mediaKitName: profileSettings.mediaKitName || "",
      team: profileSettings.team || { name: "", type: "", size: "", website: "", logoName: "" },
      agency: profileSettings.agency || { name: "", type: "", website: "", logoName: "" }
    },
    socials: {
      instagram: "",
      tiktok: "",
      youtube: "",
      primaryPlatform: "Instagram",
      primaryOtherPlatform: "",
      primaryOtherCustomName: "",
      primaryOtherHandle: "",
      primaryOtherFollowers: "",
      extra: []
    },
    kyc: {
      status: kyc.status || "pending",
      documentType: kyc.documentType || "Passport",
      idFileName: kyc.idFileName || "",
      selfieFileName: kyc.selfieFileName || "",
      addressFileName: kyc.addressFileName || "",
      idUploaded: Boolean(kyc.idUploaded),
      selfieUploaded: Boolean(kyc.selfieUploaded),
      addressUploaded: Boolean(kyc.addressUploaded),
      org: kyc.org || {
        registrationFileName: "",
        taxFileName: "",
        authorizationFileName: "",
        registrationUploaded: false,
        taxUploaded: false,
        authorizationUploaded: false
      }
    },
    payout: {
      method: payout.method || "",
      currency: payout.currency || profileSettings.currency || "USD",
      schedule: payout.schedule || "Weekly",
      minThreshold: Number(payout.minThreshold || 50),
      acceptPayoutPolicy: Boolean(payout.acceptPayoutPolicy),
      verificationDeliveryMethod: "Email",
      verificationContactValue: profileSettings.email || auth.user.email || "",
      verification: payout.verification || { status: "not_started", code: "" },
      bank: payout.bank || { bankName: "", accountName: "", accountNumber: "", swift: "" },
      mobile: payout.mobile || { provider: "", phone: "" },
      wallet: payout.wallet || { email: "" },
      alipay: payout.alipay || { name: "", account: "" },
      wechat: payout.wechat || { name: "", wechatId: "", phone: "" },
      tax: payout.tax || { residencyCountry: profileSettings.country || "", taxId: "" },
      scrolledToBottomPayout: false
    },
    preferences: {
      lines: preferences.lines || [],
      formats: preferences.formats || [],
      models: preferences.models || [],
      availability: preferences.availability || { days: [], timeWindow: "" },
      rateCard: preferences.rateCard || { minFlatFee: "", preferredCommissionPct: "", notes: "" },
      inviteRules: preferences.inviteRules || "",
      supplierType: preferences.supplierType || ""
    },
    review: {
      seenPolicies: { platform: false, content: false, payout: false },
      scrolledToBottom: false,
      confirmMultiUserCompliance: false,
      acceptTerms: false
    }
  };
}

function getOrCreateOnboardingWorkflow(db, auth) {
  ensureWorkflowCollections(db);
  let workflow = db.onboardingWorkflows.find((entry) => entry.userId === auth.user.id);
  if (!workflow) {
    workflow = {
      userId: auth.user.id,
      stepIndex: 0,
      maxUnlocked: 0,
      savedAt: nowIso(),
      submittedAt: null,
      approvalApplicationId: null,
      form: buildDefaultOnboardingForm(auth, db)
    };
    db.onboardingWorkflows.push(workflow);
  }
  return workflow;
}

function getPrimaryLine(snapshot, auth) {
  if (Array.isArray(snapshot?.preferences?.lines) && snapshot.preferences.lines[0]) {
    return String(snapshot.preferences.lines[0]);
  }
  if (auth.profile?.categories?.[0]) return String(auth.profile.categories[0]);
  return "Not set";
}

function buildDefaultApprovalDocs() {
  return [{ name: "Creator guidelines (PDF)", url: "#", type: "pdf" }];
}

function buildDefaultApprovalItems() {
  return [
    { id: "item_profile", text: "Refine your profile bio to clearly describe your content style", done: false },
    { id: "item_samples", text: "Upload at least 3 sample contents (video or image)", done: false },
    { id: "item_categories", text: "Confirm your primary content categories and regions", done: false }
  ];
}

function buildApprovalApplication(db, auth, workflow, overrides = {}) {
  const snapshot = workflow.form || {};
  return {
    id: overrides.id || id("approval"),
    userId: auth.user.id,
    status: overrides.status || "UnderReview",
    etaMin: overrides.etaMin ?? 90,
    submittedAt: overrides.submittedAt || workflow.submittedAt || nowIso(),
    creatorId: auth.profile?.id || `creator_${auth.user.id}`,
    displayName: overrides.displayName || snapshot?.profile?.name || auth.profile?.name || "New Creator",
    creatorHandle: overrides.creatorHandle || normalizeHandle(snapshot?.profile?.handle || auth.profile?.handle || ""),
    primaryLine: overrides.primaryLine || getPrimaryLine(snapshot, auth),
    adminReason: overrides.adminReason || "",
    adminDocs: overrides.adminDocs || [],
    items: overrides.items || [],
    note: overrides.note || "",
    attachments: Array.isArray(overrides.attachments) ? overrides.attachments : [],
    preferences: overrides.preferences || { email: true, inApp: true },
    history: overrides.history || [
      { atISO: workflow.submittedAt || nowIso(), status: overrides.status || "UnderReview", msg: "Application submitted" }
    ],
    onboardingSnapshot: snapshot
  };
}

function getOrCreateApprovalApplication(db, auth, workflow = null) {
  ensureWorkflowCollections(db);
  let application = db.accountApprovals.find((entry) => entry.userId === auth.user.id);
  if (!application) {
    application = buildApprovalApplication(db, auth, workflow || getOrCreateOnboardingWorkflow(db, auth), {
      status: auth.user.approvalStatus === "APPROVED" ? "Approved" : auth.user.approvalStatus === "NEEDS_ONBOARDING" ? "Submitted" : "UnderReview",
      etaMin: auth.user.approvalStatus === "APPROVED" ? 0 : 90
    });
    db.accountApprovals.push(application);
  }
  return application;
}

function snapshotNeedsChanges(snapshot) {
  const profile = snapshot?.profile || {};
  const kyc = snapshot?.kyc || {};
  return !(profile.name && profile.handle && kyc.idUploaded && kyc.selfieUploaded);
}

function appendApprovalHistory(application, status, msg) {
  application.history = [
    { atISO: nowIso(), status, msg },
    ...(Array.isArray(application.history) ? application.history : [])
  ].slice(0, 25);
}

function normalizeApprovalStatus(value) {
  const raw = String(value || "").toLowerCase();
  if (raw === "approved") return "Approved";
  if (raw === "sendback" || raw === "action_required") return "SendBack";
  if (raw === "resubmitted") return "Resubmitted";
  if (raw === "submitted") return "Submitted";
  return "UnderReview";
}

function approvalApplicationResponse(application) {
  return {
    ...application,
    attachments: Array.isArray(application.attachments) ? application.attachments : [],
    adminDocs: Array.isArray(application.adminDocs) ? application.adminDocs : [],
    items: Array.isArray(application.items) ? application.items : [],
    preferences: application.preferences || { email: true, inApp: true },
    onboardingSnapshot: application.onboardingSnapshot || null,
    history: Array.isArray(application.history) ? application.history : []
  };
}

function createContentApprovalRecord(auth, body) {
  const now = new Date();
  const submittedAtISO = now.toISOString();
  const dueAtISO = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const assetUploads = Array.isArray(body.assets) ? body.assets : [];
  return {
    id: id("submission"),
    userId: auth.user.id,
    title: String(body.title || "New submission"),
    campaign: String(body.campaign || "Creator campaign"),
    supplier: {
      name: String(body?.supplier?.name || "Seller review queue"),
      type: body?.supplier?.type === "Provider" ? "Provider" : "Seller"
    },
    channel: ["Instagram", "TikTok", "YouTube", "WhatsApp"].includes(String(body.channel)) ? String(body.channel) : "Instagram",
    type: ["Video", "Image", "Caption", "Doc"].includes(String(body.type)) ? String(body.type) : "Video",
    desk: ["General", "Faith", "Medical", "Education"].includes(String(body.desk)) ? String(body.desk) : "General",
    status: normalizeContentSubmissionStatus(body.status || "Pending"),
    riskScore: Number(body.riskScore || 22),
    submittedAtISO,
    dueAtISO,
    notesFromCreator: String(body.notesFromCreator || ""),
    caption: String(body.caption || ""),
    assets: assetUploads.map((upload) => ({
      name: String(upload.name || upload.fileName || "Attachment"),
      type: normalizeSubmissionType(upload.kind === "image" ? "Image" : upload.kind === "video" ? "Video" : "Doc"),
      size: formatBytes(upload.size || 0),
      uploadId: upload.id
    })),
    flags: {
      missingDisclosure: false,
      sensitiveClaim: false,
      brandRestriction: false
    },
    lastUpdatedISO: submittedAtISO,
    audit: [{ atISO: submittedAtISO, msg: "Submitted" }]
  };
}

function normalizeContentSubmissionStatus(value) {
  const raw = String(value || "").toLowerCase();
  if (raw === "under review" || raw === "under_review") return "Under Review";
  if (raw === "escalated") return "Escalated";
  if (raw === "changes requested" || raw === "changes_requested") return "Changes Requested";
  if (raw === "approved") return "Approved";
  if (raw === "rejected") return "Rejected";
  return "Pending";
}

function normalizeSubmissionType(value) {
  const raw = String(value || "").toLowerCase();
  if (raw === "image") return "Image";
  if (raw === "caption") return "Caption";
  if (raw === "doc" || raw === "document") return "Doc";
  return "Video";
}

function formatBytes(value) {
  const size = Number(value || 0);
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function applyContentApprovalUpdate(record, patch) {
  if (patch.title !== undefined) record.title = String(patch.title);
  if (patch.campaign !== undefined) record.campaign = String(patch.campaign);
  if (patch.channel !== undefined) record.channel = ["Instagram", "TikTok", "YouTube", "WhatsApp"].includes(String(patch.channel)) ? String(patch.channel) : record.channel;
  if (patch.type !== undefined) record.type = normalizeSubmissionType(patch.type);
  if (patch.desk !== undefined) record.desk = ["General", "Faith", "Medical", "Education"].includes(String(patch.desk)) ? String(patch.desk) : record.desk;
  if (patch.notesFromCreator !== undefined) record.notesFromCreator = String(patch.notesFromCreator);
  if (patch.caption !== undefined) record.caption = String(patch.caption);
  if (patch.status !== undefined) record.status = normalizeContentSubmissionStatus(patch.status);
  if (Array.isArray(patch.assets)) {
    record.assets = patch.assets.map((asset) => ({
      name: String(asset.name || "Attachment"),
      type: normalizeSubmissionType(asset.type || "Doc"),
      size: String(asset.size || "0 B"),
      ...(asset.uploadId ? { uploadId: String(asset.uploadId) } : {})
    }));
  }
  record.lastUpdatedISO = nowIso();
}

export function registerWorkflowRoutes(router) {
  router.add("GET", "/api/uploads", { tag: "workflow", auth: true, description: "List upload metadata records for the creator." }, async ({ auth, query, store }) => {
    const db = store.load();
    ensureWorkflowCollections(db);
    let items = db.uploads.filter((entry) => entry.userId === auth.user.id);
    if (query.get("purpose")) items = items.filter((entry) => entry.purpose === query.get("purpose"));
    if (query.get("relatedEntityType")) items = items.filter((entry) => entry.relatedEntityType === query.get("relatedEntityType"));
    if (query.get("relatedEntityId")) items = items.filter((entry) => entry.relatedEntityId === query.get("relatedEntityId"));
    return ok(items);
  });

  router.add("POST", "/api/uploads", { tag: "workflow", auth: true, description: "Store upload metadata for onboarding, approval, and settings surfaces." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    requireFields(body, ["name"]);
    const upload = store.update((db) => {
      ensureWorkflowCollections(db);
      const upload = createUploadRecord(auth, body);
      db.uploads.unshift(upload);
      pushAudit(db, { actor: auth.user.email, action: "Upload stored", detail: `${upload.purpose}: ${upload.name}`, severity: "info" });
      return upload;
    });
    return created(upload);
  });

  router.add("GET", "/api/onboarding", { tag: "workflow", auth: true, description: "Return the creator onboarding workflow state." }, async ({ auth, store }) => {
    const db = store.load();
    const workflow = getOrCreateOnboardingWorkflow(db, auth);
    return ok(workflow);
  });

  router.add("PATCH", "/api/onboarding", { tag: "workflow", auth: true, description: "Save onboarding draft progress." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    const workflow = store.update((db) => {
      const workflow = getOrCreateOnboardingWorkflow(db, auth);
      if (body.form !== undefined) {
        ensure(typeof body.form === "object" && body.form !== null, "Onboarding form must be an object.");
        workflow.form = body.form;
      }
      if (body.stepIndex !== undefined) workflow.stepIndex = Math.max(0, Number(body.stepIndex || 0));
      if (body.maxUnlocked !== undefined) workflow.maxUnlocked = Math.max(0, Number(body.maxUnlocked || 0));
      workflow.savedAt = nowIso();
      pushAudit(db, { actor: auth.user.email, action: "Onboarding draft saved", detail: `Step ${workflow.stepIndex}`, severity: "info" });
      return workflow;
    });
    return ok(workflow);
  });

  router.add("POST", "/api/onboarding/reset", { tag: "workflow", auth: true, description: "Reset onboarding progress to a fresh draft." }, async ({ auth, store }) => {
    const workflow = store.update((db) => {
      const workflow = getOrCreateOnboardingWorkflow(db, auth);
      workflow.stepIndex = 0;
      workflow.maxUnlocked = 0;
      workflow.savedAt = nowIso();
      workflow.submittedAt = null;
      workflow.approvalApplicationId = null;
      workflow.form = buildDefaultOnboardingForm(auth, db);

      const application = db.accountApprovals.find((entry) => entry.userId === auth.user.id);
      if (application) {
        application.status = "Submitted";
        application.etaMin = 90;
        application.adminReason = "";
        application.adminDocs = [];
        application.items = [];
        application.note = "";
        application.attachments = [];
        application.onboardingSnapshot = workflow.form;
        appendApprovalHistory(application, "Submitted", "Onboarding reset and returned to draft state.");
      }

      auth.user.approvalStatus = "NEEDS_ONBOARDING";
      auth.user.onboardingCompleted = false;
      pushAudit(db, { actor: auth.user.email, action: "Onboarding reset", detail: "Creator onboarding workflow reset", severity: "warn" });
      return workflow;
    });
    return ok(workflow);
  });

  router.add("POST", "/api/onboarding/submit", { tag: "workflow", auth: true, description: "Submit onboarding and transition the account into approval review." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    const payload = store.update((db) => {
      const workflow = getOrCreateOnboardingWorkflow(db, auth);
      if (body.form !== undefined) {
        ensure(typeof body.form === "object" && body.form !== null, "Onboarding form must be an object.");
        workflow.form = body.form;
      }
      if (body.stepIndex !== undefined) workflow.stepIndex = Math.max(0, Number(body.stepIndex || 0));
      if (body.maxUnlocked !== undefined) workflow.maxUnlocked = Math.max(0, Number(body.maxUnlocked || 0));
      workflow.savedAt = nowIso();
      workflow.submittedAt = nowIso();

      const profile = db.creatorProfiles.find((entry) => entry.userId === auth.user.id);
      const snapshot = workflow.form || {};
      const snapshotProfile = snapshot.profile || {};
      if (profile) {
        if (snapshotProfile.name) profile.name = String(snapshotProfile.name);
        if (snapshotProfile.handle) profile.handle = String(snapshotProfile.handle).replace(/^@/, "");
        if (snapshotProfile.tagline !== undefined) profile.tagline = String(snapshotProfile.tagline || "");
        if (snapshotProfile.bio !== undefined) profile.bio = String(snapshotProfile.bio || "");
        if (Array.isArray(snapshotProfile.contentLanguages)) profile.languages = snapshotProfile.contentLanguages.map((entry) => String(entry));
        if (Array.isArray(snapshotProfile.audienceRegions)) profile.regions = snapshotProfile.audienceRegions.map((entry) => String(entry));
        if (Array.isArray(snapshot?.preferences?.lines)) profile.categories = snapshot.preferences.lines.map((entry) => String(entry));
      }

      if (db.settings?.userId === auth.user.id) {
        db.settings.profile = {
          ...db.settings.profile,
          ...(snapshot.profile || {})
        };
        db.settings.preferences = {
          ...db.settings.preferences,
          ...(snapshot.preferences || {})
        };
        db.settings.kyc = {
          ...db.settings.kyc,
          ...(snapshot.kyc || {})
        };
        db.settings.payout = {
          ...db.settings.payout,
          ...(snapshot.payout || {})
        };
      }

      let application = db.accountApprovals.find((entry) => entry.userId === auth.user.id);
      if (!application) {
        application = buildApprovalApplication(db, auth, workflow, {
          status: "UnderReview",
          etaMin: 90,
          submittedAt: workflow.submittedAt
        });
        db.accountApprovals.push(application);
      } else {
        application.status = "UnderReview";
        application.etaMin = 90;
        application.submittedAt = workflow.submittedAt;
        application.displayName = snapshotProfile.name || application.displayName;
        application.creatorHandle = normalizeHandle(snapshotProfile.handle || application.creatorHandle || "");
        application.primaryLine = getPrimaryLine(snapshot, auth);
        application.adminReason = "";
        application.adminDocs = [];
        application.items = [];
        application.note = "";
        application.attachments = [];
        application.onboardingSnapshot = snapshot;
        appendApprovalHistory(application, "UnderReview", "Onboarding submitted for review.");
      }

      workflow.approvalApplicationId = application.id;
      auth.user.approvalStatus = "AWAITING_APPROVAL";
      auth.user.onboardingCompleted = true;
      pushAudit(db, { actor: auth.user.email, action: "Onboarding submitted", detail: application.id, severity: "info" });
      return {
        onboarding: workflow,
        approval: approvalApplicationResponse(application)
      };
    });
    return ok(payload);
  });

  router.add("GET", "/api/account-approval", { tag: "workflow", auth: true, description: "Return the creator account approval review state." }, async ({ auth, store }) => {
    const db = store.load();
    const application = getOrCreateApprovalApplication(db, auth, getOrCreateOnboardingWorkflow(db, auth));
    return ok(approvalApplicationResponse(application));
  });

  router.add("PATCH", "/api/account-approval", { tag: "workflow", auth: true, description: "Persist approval draft note, checklist, attachments, and communication preferences." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    const application = store.update((db) => {
      const application = getOrCreateApprovalApplication(db, auth, getOrCreateOnboardingWorkflow(db, auth));
      if (body.note !== undefined) application.note = String(body.note || "");
      if (Array.isArray(body.items)) application.items = body.items.map((item) => ({ id: String(item.id || id("item")), text: String(item.text || ""), done: Boolean(item.done) }));
      if (Array.isArray(body.attachments)) application.attachments = body.attachments;
      if (body.preferences && typeof body.preferences === "object") {
        application.preferences = {
          email: body.preferences.email !== undefined ? Boolean(body.preferences.email) : Boolean(application.preferences?.email),
          inApp: body.preferences.inApp !== undefined ? Boolean(body.preferences.inApp) : Boolean(application.preferences?.inApp)
        };
      }
      application.onboardingSnapshot = body.onboardingSnapshot || application.onboardingSnapshot;
      pushAudit(db, { actor: auth.user.email, action: "Approval draft updated", detail: application.id, severity: "info" });
      return application;
    });
    return ok(approvalApplicationResponse(application));
  });

  router.add("POST", "/api/account-approval/refresh", { tag: "workflow", auth: true, description: "Refresh approval review status using the current onboarding snapshot." }, async ({ auth, store }) => {
    const application = store.update((db) => {
      const application = getOrCreateApprovalApplication(db, auth, getOrCreateOnboardingWorkflow(db, auth));
      const currentStatus = normalizeApprovalStatus(application.status);
      application.status = currentStatus;

      if (currentStatus === "Approved") {
        application.etaMin = 0;
        return application;
      }

      if (currentStatus === "SendBack") {
        if (!application.adminReason) {
          application.adminReason = "Please refine your profile bio, upload at least 3 sample videos or images, and confirm the categories you will create for.";
        }
        if (!Array.isArray(application.items) || application.items.length === 0) application.items = buildDefaultApprovalItems();
        if (!Array.isArray(application.adminDocs) || application.adminDocs.length === 0) application.adminDocs = buildDefaultApprovalDocs();
        return application;
      }

      const nextEta = Math.max(5, Number(application.etaMin || 90) - 15);
      application.etaMin = nextEta;

      if (snapshotNeedsChanges(application.onboardingSnapshot)) {
        application.status = "SendBack";
        application.etaMin = 60;
        application.adminReason = application.adminReason || "Please refine your profile bio, upload at least 3 sample videos or images, and confirm the categories you will create for.";
        application.adminDocs = application.adminDocs?.length ? application.adminDocs : buildDefaultApprovalDocs();
        application.items = application.items?.length ? application.items : buildDefaultApprovalItems();
        appendApprovalHistory(application, "SendBack", "Action required. Additional onboarding updates were requested.");
        auth.user.approvalStatus = "AWAITING_APPROVAL";
        return application;
      }

      if (nextEta <= 10) {
        application.status = "Approved";
        application.etaMin = 0;
        appendApprovalHistory(application, "Approved", "Creator account approved.");
        auth.user.approvalStatus = "APPROVED";
        auth.user.onboardingCompleted = true;
        if (db.settings?.kyc) db.settings.kyc.status = "verified";
        const profile = db.creatorProfiles.find((entry) => entry.userId === auth.user.id);
        if (profile) profile.isKycVerified = true;
        return application;
      }

      application.status = currentStatus === "Resubmitted" ? "Resubmitted" : "UnderReview";
      appendApprovalHistory(application, application.status, application.status === "Resubmitted" ? "Back in review after resubmission." : "Still under review.");
      auth.user.approvalStatus = "AWAITING_APPROVAL";
      return application;
    });
    return ok(approvalApplicationResponse(application));
  });

  router.add("POST", "/api/account-approval/resubmit", { tag: "workflow", auth: true, description: "Resubmit updated onboarding documents and notes after a send-back." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    const application = store.update((db) => {
      const application = getOrCreateApprovalApplication(db, auth, getOrCreateOnboardingWorkflow(db, auth));
      if (body.note !== undefined) application.note = String(body.note || "");
      if (Array.isArray(body.items)) application.items = body.items.map((item) => ({ id: String(item.id || id("item")), text: String(item.text || ""), done: Boolean(item.done) }));
      if (Array.isArray(body.attachmentIds)) {
        application.attachments = body.attachmentIds
          .map((attachmentId) => db.uploads.find((entry) => entry.id === attachmentId && entry.userId === auth.user.id))
          .filter(Boolean);
      }
      if (body.preferences && typeof body.preferences === "object") {
        application.preferences = {
          email: body.preferences.email !== undefined ? Boolean(body.preferences.email) : Boolean(application.preferences?.email),
          inApp: body.preferences.inApp !== undefined ? Boolean(body.preferences.inApp) : Boolean(application.preferences?.inApp)
        };
      }

      application.status = "Resubmitted";
      application.etaMin = 60;
      application.adminReason = "";
      application.adminDocs = [];
      appendApprovalHistory(application, "Resubmitted", "Creator resubmitted onboarding updates.");
      auth.user.approvalStatus = "AWAITING_APPROVAL";
      auth.user.onboardingCompleted = true;
      pushAudit(db, { actor: auth.user.email, action: "Approval resubmitted", detail: application.id, severity: "info" });
      return application;
    });
    return ok(approvalApplicationResponse(application));
  });

  router.add("POST", "/api/account-approval/dev-approve", { tag: "workflow", auth: true, description: "Developer helper to approve the account immediately for testing." }, async ({ auth, store }) => {
    const application = store.update((db) => {
      const application = getOrCreateApprovalApplication(db, auth, getOrCreateOnboardingWorkflow(db, auth));
      application.status = "Approved";
      application.etaMin = 0;
      appendApprovalHistory(application, "Approved", "Approved for testing.");
      auth.user.approvalStatus = "APPROVED";
      auth.user.onboardingCompleted = true;
      if (db.settings?.kyc) db.settings.kyc.status = "verified";
      const profile = db.creatorProfiles.find((entry) => entry.userId === auth.user.id);
      if (profile) profile.isKycVerified = true;
      pushAudit(db, { actor: auth.user.email, action: "Approval forced", detail: application.id, severity: "warn" });
      return application;
    });
    return ok(approvalApplicationResponse(application));
  });

  router.add("GET", "/api/content-approvals", { tag: "workflow", auth: true, description: "List creator content submissions awaiting approval." }, async ({ auth, store }) => {
    const db = store.load();
    ensureWorkflowCollections(db);
    return ok(db.contentApprovals.filter((entry) => entry.userId === auth.user.id));
  });

  router.add("GET", "/api/content-approvals/:id", { tag: "workflow", auth: true, description: "Read a single content approval submission." }, async ({ auth, params, store }) => {
    const db = store.load();
    ensureWorkflowCollections(db);
    const item = db.contentApprovals.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
    ensure(item, "Submission not found.", "SUBMISSION_NOT_FOUND", 404);
    return ok(item);
  });

  router.add("POST", "/api/content-approvals", { tag: "workflow", auth: true, description: "Create a new content submission awaiting approval." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    const item = store.update((db) => {
      ensureWorkflowCollections(db);
      const createdRecord = createContentApprovalRecord(auth, body);
      db.contentApprovals.unshift(createdRecord);
      pushAudit(db, { actor: auth.user.email, action: "Content submission created", detail: createdRecord.id, severity: "info" });
      return createdRecord;
    });
    return created(item);
  });

  router.add("PATCH", "/api/content-approvals/:id", { tag: "workflow", auth: true, description: "Update a content submission draft or fields before review." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    const item = store.update((db) => {
      ensureWorkflowCollections(db);
      const item = db.contentApprovals.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(item, "Submission not found.", "SUBMISSION_NOT_FOUND", 404);
      applyContentApprovalUpdate(item, body);
      item.audit = [{ atISO: nowIso(), msg: "Creator updated submission" }, ...(item.audit || [])].slice(0, 20);
      pushAudit(db, { actor: auth.user.email, action: "Content submission updated", detail: item.id, severity: "info" });
      return item;
    });
    return ok(item);
  });

  router.add("POST", "/api/content-approvals/:id/nudge", { tag: "workflow", auth: true, description: "Nudge the reviewer for a content submission." }, async ({ auth, params, store }) => {
    const item = store.update((db) => {
      ensureWorkflowCollections(db);
      const item = db.contentApprovals.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(item, "Submission not found.", "SUBMISSION_NOT_FOUND", 404);
      item.lastUpdatedISO = nowIso();
      item.audit = [{ atISO: nowIso(), msg: "Creator nudged reviewer" }, ...(item.audit || [])].slice(0, 20);
      pushAudit(db, { actor: auth.user.email, action: "Submission nudged", detail: item.id, severity: "info" });
      return item;
    });
    return ok(item);
  });

  router.add("POST", "/api/content-approvals/:id/withdraw", { tag: "workflow", auth: true, description: "Withdraw a pending content submission." }, async ({ auth, params, store }) => {
    const item = store.update((db) => {
      ensureWorkflowCollections(db);
      const item = db.contentApprovals.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(item, "Submission not found.", "SUBMISSION_NOT_FOUND", 404);
      item.status = "Rejected";
      item.lastUpdatedISO = nowIso();
      item.audit = [{ atISO: nowIso(), msg: "Withdrawn by creator" }, ...(item.audit || [])].slice(0, 20);
      pushAudit(db, { actor: auth.user.email, action: "Submission withdrawn", detail: item.id, severity: "warn" });
      return item;
    });
    return ok(item);
  });

  router.add("POST", "/api/content-approvals/:id/resubmit", { tag: "workflow", auth: true, description: "Resubmit a content item after changes were requested." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    const item = store.update((db) => {
      ensureWorkflowCollections(db);
      const item = db.contentApprovals.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(item, "Submission not found.", "SUBMISSION_NOT_FOUND", 404);
      applyContentApprovalUpdate(item, body);
      item.status = "Pending";
      item.lastUpdatedISO = nowIso();
      item.audit = [{ atISO: nowIso(), msg: "Resubmitted" }, ...(item.audit || [])].slice(0, 20);
      pushAudit(db, { actor: auth.user.email, action: "Submission resubmitted", detail: item.id, severity: "info" });
      return item;
    });
    return ok(item);
  });
}
