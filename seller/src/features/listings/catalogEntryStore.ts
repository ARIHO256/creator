import { readSellerModule, writeSellerModule } from "../../lib/frontendState";

const MOCK_KEY = "catalog.lines";

export type CatalogLineNode = {
  id?: string;
  name: string;
  type: string;
};

export type CatalogLine = {
  id: string;
  nodeId?: string;
  path: CatalogLineNode[];
  status?: string;
};

export type CatalogEntry = {
  id: string;
  nodeId?: string;
  name: string;
  type: "Service" | "Product";
  basePrice: string;
  stockLabel: string;
  category: string;
  regulated: boolean;
  path: CatalogLineNode[];
  status?: string;
};

export function loadCatalogLines(): CatalogLine[] {
  return readSellerModule<CatalogLine[]>(MOCK_KEY, []);
}

export function persistCatalogLines(lines: CatalogLine[]) {
  void writeSellerModule(MOCK_KEY, lines);
}

export function mapLineToCatalogEntry(line: CatalogLine | null): CatalogEntry | null {
  if (!line || !Array.isArray(line.path)) return null;
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
