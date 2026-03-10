import { getModuleData, setModuleData, shouldEnableMocks } from "../../mocks";

const STORAGE_KEY = "seller_catalog_entries_v1";
const isBrowser = typeof window !== "undefined";
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

function safeParseCatalogLines(raw: string | null): CatalogLine[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CatalogLine[];
    if (Array.isArray(parsed)) return parsed;
  } catch (error) {
    console.error("[catalogEntryStore] failed to parse stored catalog lines", error);
  }
  return [];
}

export function loadCatalogLines(): CatalogLine[] {
  if (shouldEnableMocks()) {
    return getModuleData<CatalogLine[]>(MOCK_KEY, []);
  }
  if (!isBrowser) return [];
  const payload = window.localStorage.getItem(STORAGE_KEY);
  return safeParseCatalogLines(payload);
}

export function persistCatalogLines(lines: CatalogLine[]) {
  if (shouldEnableMocks()) {
    setModuleData(MOCK_KEY, lines);
    return;
  }
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch (error) {
    console.error("[catalogEntryStore] failed to persist catalog lines", error);
  }
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
