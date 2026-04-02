export type LineStatus = "active" | "suspended";

export type CatalogLineNode = {
  id: string;
  name: string;
  type: string;
  description?: string;
};

export type CatalogLine = {
  id: string;
  nodeId: string;
  status: LineStatus;
  path: CatalogLineNode[];
};

function normalizePathNode(value: unknown, index: number, fallbackNodeId: string): CatalogLineNode | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const id = typeof input.id === "string" && input.id ? input.id : `${fallbackNodeId}-path-${index + 1}`;
  const name = typeof input.name === "string" ? input.name : "";
  if (!name) return null;
  return {
    id,
    name,
    type: typeof input.type === "string" && input.type ? input.type : "Category",
    description: typeof input.description === "string" ? input.description : undefined,
  };
}

function normalizePath(path: unknown, fallbackNodeId: string): CatalogLineNode[] {
  if (!Array.isArray(path)) return [];
  return path
    .map((entry, index) => normalizePathNode(entry, index, fallbackNodeId))
    .filter((entry): entry is CatalogLineNode => Boolean(entry));
}

export function mapCoverageRecordToCatalogLine(value: Record<string, unknown>): CatalogLine | null {
  const nodeId = typeof value.taxonomyNodeId === "string" ? value.taxonomyNodeId : "";
  if (!nodeId) return null;
  const path = normalizePath(value.pathSnapshot, nodeId);
  return {
    id: typeof value.id === "string" && value.id ? value.id : nodeId,
    nodeId,
    status: String(value.status).toUpperCase() === "SUSPENDED" ? "suspended" : "active",
    path,
  };
}

export function mapStorefrontTaxonomyToCatalogLine(value: Record<string, unknown>): CatalogLine | null {
  const nodeId = typeof value.id === "string" ? value.id : "";
  if (!nodeId) return null;
  const path = normalizePath(value.pathSnapshot, nodeId);
  return {
    id: nodeId,
    nodeId,
    status: "active",
    path,
  };
}

export function dedupeCatalogLines(lines: CatalogLine[]) {
  const seen = new Set<string>();
  return lines.filter((line) => {
    if (!line.nodeId || seen.has(line.nodeId)) return false;
    seen.add(line.nodeId);
    return true;
  });
}

export function mapLineToCatalogEntry(line: CatalogLine | null) {
  if (!line) return null;
  const leaf = line.path[line.path.length - 1];
  const categoryPath = line.path
    .filter((node) => node.type !== "Marketplace")
    .map((node) => node.name)
    .join(" / ");
  const friendlyName = leaf?.name ? `${leaf.name} listing` : "New product line";
  return {
    id: line.id,
    nodeId: line.nodeId,
    name: friendlyName,
    type: leaf?.type === "Service" ? "Service" : "Product",
    basePrice: "Set price after listing",
    stockLabel: leaf?.type === "Sub-Category" ? "Slots" : "Manage inventory",
    category: categoryPath || "Uncategorized",
    regulated: false,
    path: line.path,
    status: line.status,
  };
}
