import type { UserRole } from "../types/roles";

export type Role = UserRole;

export type ThreadTag =
  | "Order"
  | "RFQ"
  | "Booking"
  | "Quote"
  | "Consultation"
  | "Proposal"
  | "MyLiveDealz"
  | "Support";

export type MessageThread = {
  id: string;
  title: string;
  participants: Array<{ name: string; role: "buyer" | "client" | "creator" | "agent" | "you" }>;
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
  tags: ThreadTag[];
  customerLang: string;
  myLang: string;
  responseSlaDueAt?: string;
  priority?: "normal" | "high";
};

export type AttachmentType = "image" | "video" | "pdf" | "doc" | "link" | "other";

export type MessageAttachment = {
  id: string;
  type: AttachmentType;
  name: string;
  sizeLabel: string;
  url?: string;
  mimeType?: string;
  caption?: string;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  sender: "me" | "other";
  text: string;
  lang: string;
  at: string;
  attachments?: MessageAttachment[];
};

export type TemplateCategory =
  | "Greeting"
  | "Pricing"
  | "Shipping"
  | "Booking"
  | "Negotiation"
  | "Compliance"
  | "Support";

export type MessageTemplate = {
  id: string;
  title: string;
  category: TemplateCategory;
  body: string;
  pinned?: boolean;
};

export type MessagesContent = {
  tagOptions: ThreadTag[];
  threads: MessageThread[];
  messages: ChatMessage[];
  templates: MessageTemplate[];
};

export type NotifCategory =
  | "Orders"
  | "RFQs"
  | "Bookings"
  | "Quotes"
  | "Consultations"
  | "Finance"
  | "MyLiveDealz"
  | "Security"
  | "System";

export type NotifPriority = "low" | "medium" | "high";

export type NotifItem = {
  id: string;
  title: string;
  message: string;
  category: NotifCategory;
  priority: NotifPriority;
  createdAt: string;
  unread: boolean;
  route?: string;
  actor?: string;
};

export type Watch = {
  id: string;
  name: string;
  desc: string;
  enabled: boolean;
  category: NotifCategory;
};

export type NotificationsContent = {
  categories: NotifCategory[];
  items: NotifItem[];
  watches: Watch[];
};

export type AnalyticsKpi = {
  label: string;
  value: string;
  delta: string;
  hint: string;
};

export type AnalyticsAttributionRow = {
  channel: string;
  share: number;
  roas: number;
  note: string;
};

export type AnalyticsHighlights = {
  topDriver: string;
  risk: string;
  recommendation: string;
};

export type AnalyticsCohortContent = {
  subtitle: string;
  bullets: string[];
  grid: number[][];
};

export type AlertRuleConfig = {
  id: string;
  name: string;
  metric: string;
  condition: "drops" | "rises" | "exceeds";
  threshold: number;
  window: "Today" | "7D" | "30D" | "90D";
  enabled: boolean;
};

export type AnalyticsContent = {
  marketplaceOptions: string[];
  overviewKpis: AnalyticsKpi[];
  attributionRows: AnalyticsAttributionRow[];
  highlights: AnalyticsHighlights;
  cohort: AnalyticsCohortContent;
  alertRules: AlertRuleConfig[];
  metricOptions: string[];
  seriesByRange: Partial<Record<AlertRuleConfig["window"], number[]>>;
};

export type HelpSupportKBItem = { id: string; cat: string; title: string; url: string };
export type HelpSupportFAQItem = { q: string; a: string };
export type HelpSupportStatusItem = { id: string; name: string; state: string };
export type HelpSupportTicket = {
  id: string;
  createdAt: string;
  status: string;
  marketplace: string;
  category: string;
  subject: string;
  severity: string;
  ref?: string;
};
export type HelpSupportFormDefaults = {
  marketplace: string;
  category: string;
  severity: string;
  subject: string;
  ref: string;
  email: string;
  phone: string;
  desc: string;
  sla: string;
};
export type HelpSupportContent = {
  kb: HelpSupportKBItem[];
  faq: HelpSupportFAQItem[];
  status: HelpSupportStatusItem[];
  tickets: HelpSupportTicket[];
  formDefaults: HelpSupportFormDefaults;
  marketplaceOptions: string[];
  categoryOptions: string[];
  refLabel: string;
  refPlaceholder: string;
};

export type ComplianceDocStatus =
  | "Approved"
  | "ExpiringSoon"
  | "Missing"
  | "Expired"
  | "Rejected"
  | "Submitted";

export type ComplianceDoc = {
  id: string;
  type: string;
  channel: string;
  regions: string[];
  fileName?: string;
  uploadedAt?: string;
  expiresAt?: string;
  status?: ComplianceDocStatus;
  notes?: string;
};

export type ComplianceQueueItem = {
  listingId: string;
  channel: string;
  title: string;
  path: string;
  required: string[];
  missing: string[];
};

export type ComplianceAutoRule = { match: string; required: string[] };

export type ComplianceContent = {
  primaryChannel: string;
  defaultDocType: string;
  heroSubtitle: string;
  docs: ComplianceDoc[];
  queue: ComplianceQueueItem[];
  channelOptions: string[];
  autoRules: ComplianceAutoRule[];
  autoDefault: string[];
};

export type DashboardQuickAction = {
  key: string;
  label: string;
  to: string;
};

export type DashboardHero = {
  name: string;
  sub: string;
  ctaLabel: string;
  ctaTo: string;
  chipWhenMLDZ: string;
  chipWhenNoMLDZ: string;
};

export type DashboardFeatured = {
  title: string;
  sub: string;
  ctaLabel: string;
  ctaTo: string;
};

export type DashboardBases = {
  revenueBase: number;
  ordersBase: number;
  trustBase: number;
};

export type DashboardContent = {
  quickActions: DashboardQuickAction[];
  hero: DashboardHero;
  featured: DashboardFeatured;
  bases: DashboardBases;
};

export type SellerOrderRow = {
  id: string;
  customer: string;
  channel: string;
  items: number;
  total: number;
  currency: string;
  status: string;
  warehouse: string;
  createdAt?: string;
  updatedAt: string;
  slaDueAt: string;
};

export type SellerReturnRow = {
  id: string;
  orderId: string;
  status: string;
  reason: string;
  pathway: string;
  amount: number;
  currency: string;
  createdAt: string;
};

export type SellerDisputeRow = {
  id: string;
  orderId: string;
  type: string;
  status: string;
  risk: number;
  createdAt: string;
  updatedAt: string;
};

export type ProviderBookingStage =
  | "Requested"
  | "Confirmed"
  | "In progress"
  | "Completed"
  | "Canceled";

export type ProviderBookingRow = {
  id: string;
  client: string;
  service: string;
  price: number;
  currency: string;
  scheduledFor: string;
  stage: ProviderBookingStage;
};

export type OrdersContent = {
  orders?: SellerOrderRow[];
  returns?: SellerReturnRow[];
  disputes?: SellerDisputeRow[];
  bookings?: ProviderBookingRow[];
  stages?: ProviderBookingStage[];
  headline: string;
  subhead: string;
  offlineNotice?: string;
};

export type ListingInventorySlot = {
  id: string;
  location: string;
  onHand: number;
  reserved: number;
};

export type ListingTier = {
  qty: number;
  price: number;
};

export type ListingCompliance = {
  state: "ok" | "warn" | "issue";
  issues: string[];
  lastScanAt: string | null;
};

export type ListingKpis = {
  views: number;
  addToCart: number;
  orders: number;
  conversion: number;
  revenue: number;
};

export type ListingTrend = {
  views: number[];
  orders: number[];
};

export type ListingRow = {
  id: string;
  title: string;
  kind: string;
  marketplace: string;
  category: string;
  currency: string;
  retailPrice: number;
  compareAt: number;
  moq: number;
  wholesaleTiers: ListingTier[];
  stock: number;
  inventory: ListingInventorySlot[];
  images: number;
  translations: number;
  description: string;
  tags: string[];
  status: string;
  updatedAt: string;
  compliance: ListingCompliance;
  kpis: ListingKpis;
  trend: ListingTrend;
};

export type ListingsLabels = {
  hubTitle: string;
  hubSubtitle: string;
  newListingLabel: string;
  newListingToastTitle: string;
  newListingToastMessage: string;
  newListingToastAction: string;
  listingsLabel: string;
  selectedListingLabel: string;
  emptyTitle: string;
  emptyMessage: string;
  kpiViewsLabel: string;
  kpiAddLabel: string;
  kpiOrdersLabel: string;
  ordersTrendLabel: string;
  previewTitle: string;
  previewSubtitle: string;
  retailLabel: string;
  wholesaleLabel: string;
  compareLabel: string;
  moqLabel: string;
  bestTierLabel: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
};

export type ListingsContent = {
  labels: ListingsLabels;
  rows: ListingRow[];
};

export type ListingTaxonomyNode = {
  id: string;
  type: string;
  name: string;
  description?: string;
  metadata?: Record<string, unknown> | null;
  children?: ListingTaxonomyNode[];
};

export type ListingLineStatus = "active" | "suspended";

export type ListingLineSeed = {
  nodeId: string;
  status: ListingLineStatus;
};

export type ListingWizardCopy = {
  heroTitle: string;
  heroSubtitle: string;
  manageLinesLabel: string;
  approvedLinesTitle: string;
  approvedLinesSubtitle: string;
  selectedLineTitle: string;
  selectedLineEmptyTitle: string;
  selectedLineEmptySubtitle: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptySubtitle: string;
  suspendedHint: string;
  eligibleHint: string;
  tipText: string;
  addLineLabel: string;
  listingIntentLabel: string;
  listingIntentOptions: Array<{ value: "new" | "restock" | "variant"; label: string }>;
  suspendedCardTitle: string;
  suspendedCardBody: string;
  previewCta: string;
  startCta: string;
  nextStepsTitle: string;
  nextSteps: Array<{ title: string; description: string }>;
  taxonomyFallback: string;
};

export type ListingWizardContent = {
  taxonomy: ListingTaxonomyNode[];
  baseLines: ListingLineSeed[];
  copy: ListingWizardCopy;
};
