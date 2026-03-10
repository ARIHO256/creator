import { useEffect, useState } from "react";
import { loadDb } from "../mocks/db";
import type { ListingTaxonomyNode } from "./pageTypes";

const DEFAULT_API_BASE = "http://localhost:3000/api";

type TaxonomyTreeResponse = {
  id: string;
  slug?: string;
  name?: string;
  status?: string;
};

type TaxonomyNodesResponse = {
  nodes?: unknown;
};

const getApiBase = () => String(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE).replace(/\/+$/, "");

const normalizeNode = (value: unknown): ListingTaxonomyNode | null => {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const id = typeof input.id === "string" ? input.id : "";
  const type = typeof input.type === "string" ? input.type : "";
  const name = typeof input.name === "string" ? input.name : "";
  if (!id || !type || !name) return null;
  const children = Array.isArray(input.children)
    ? input.children.map((child) => normalizeNode(child)).filter(Boolean) as ListingTaxonomyNode[]
    : [];

  return {
    id,
    type,
    name,
    description: typeof input.description === "string" ? input.description : undefined,
    metadata:
      input.metadata && typeof input.metadata === "object"
        ? (input.metadata as Record<string, unknown>)
        : null,
    children,
  };
};

const normalizeTree = (value: unknown): ListingTaxonomyNode[] =>
  Array.isArray(value)
    ? value.map((node) => normalizeNode(node)).filter(Boolean) as ListingTaxonomyNode[]
    : [];

const remapType = (value: string, kind: "seller" | "provider") => {
  if (kind !== "provider") {
    return value;
  }
  switch (value) {
    case "Marketplace":
      return "Service Marketplace";
    case "Product Family":
      return "Service Family";
    case "Category":
      return "Service Category";
    case "Sub-Category":
    case "Line":
      return "Service";
    default:
      return value;
  }
};

const transformTree = (
  nodes: ListingTaxonomyNode[],
  kind: "seller" | "provider"
): ListingTaxonomyNode[] =>
  nodes.map((node) => ({
    ...node,
    type: remapType(node.type, kind),
    children: transformTree(node.children || [], kind),
  }));

export const readSellerTaxonomy = () =>
  normalizeTree(loadDb().pageContent?.listingWizard?.seller?.taxonomy || []);

async function fetchTaxonomyTree(slug: string, kind: "seller" | "provider") {
  const nodesResponse = await fetch(`${getApiBase()}/taxonomy/trees/${slug}/nodes`, {
    headers: { Accept: "application/json" },
  });
  if (!nodesResponse.ok) {
    throw new Error(`Failed to load taxonomy nodes for ${slug}: ${nodesResponse.status}`);
  }
  const payload = (await nodesResponse.json()) as TaxonomyNodesResponse;
  return transformTree(normalizeTree(payload.nodes), kind);
}

export async function fetchSellerTaxonomy(): Promise<ListingTaxonomyNode[]> {
  try {
    return await fetchTaxonomyTree("sellerfront-catalog-taxonomy", "seller");
  } catch {
    const treesResponse = await fetch(`${getApiBase()}/taxonomy/trees`, {
      headers: { Accept: "application/json" },
    });
    if (!treesResponse.ok) {
      throw new Error(`Failed to load taxonomy trees: ${treesResponse.status}`);
    }
    const trees = (await treesResponse.json()) as TaxonomyTreeResponse[];
    const tree =
      trees.find((item) => item.slug === "sellerfront-catalog-taxonomy") ||
      trees.find((item) => item.status === "ACTIVE") ||
      trees[0];
    if (!tree?.id) {
      return [];
    }
    return fetchTaxonomyTree(tree.id, "seller");
  }
}

export function useSellerTaxonomy() {
  const [taxonomy, setTaxonomy] = useState<ListingTaxonomyNode[]>(() => readSellerTaxonomy());

  useEffect(() => {
    let active = true;
    void fetchSellerTaxonomy()
      .then((next) => {
        if (active && next.length > 0) {
          setTaxonomy(next);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return taxonomy;
}

export function useProviderServiceTaxonomy() {
  const [taxonomy, setTaxonomy] = useState<ListingTaxonomyNode[]>([]);

  useEffect(() => {
    let active = true;
    void fetchTaxonomyTree("provider-service-taxonomy", "provider")
      .then((next) => {
        if (active) {
          setTaxonomy(next);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return taxonomy;
}
