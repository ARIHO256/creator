function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function mapCampaignWorkspace(value: Record<string, unknown>) {
  return {
    campaigns: asArray<Record<string, unknown>>(value.campaigns).map((campaign) => ({
      ...campaign,
      items: asArray<Record<string, unknown>>(campaign.items),
      giveaways: asArray<Record<string, unknown>>(campaign.giveaways),
    })),
    catalogItems: asArray<Record<string, unknown>>(value.catalogItems),
  };
}

export function mapCampaignBuilderRecord(value: Record<string, unknown>) {
  const data = asObject(value.data);
  return {
    id: String(value.id || data.id || "seller_campaign_builder_default"),
    builderStep: Number(data.builderStep ?? 1),
    builder: asObject(data.builder),
    giveawayUi: asObject(data.giveawayUi),
  };
}

export function buildCampaignPayload(campaign: Record<string, unknown>) {
  return {
    title: String(campaign.name || campaign.title || "Untitled campaign"),
    currency: String(campaign.currency || "USD"),
    budget: Number(campaign.estValue ?? 0),
    metadata: campaign,
  };
}

export function buildCampaignBuilderPayload(value: {
  id?: string;
  builderStep: number;
  builder: Record<string, unknown>;
  giveawayUi?: Record<string, unknown>;
}) {
  const id = String(value.id || "seller_campaign_builder_default");
  return {
    id,
    sessionId: id,
    status: "draft",
    builderStep: value.builderStep,
    builder: value.builder,
    giveawayUi: value.giveawayUi ?? {},
  };
}
