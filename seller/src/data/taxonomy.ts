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
    children,
  };
};

const normalizeTree = (value: unknown): ListingTaxonomyNode[] =>
  Array.isArray(value)
    ? value.map((node) => normalizeNode(node)).filter(Boolean) as ListingTaxonomyNode[]
    : [];

export const readSellerTaxonomy = () =>
  normalizeTree(loadDb().pageContent?.listingWizard?.seller?.taxonomy || []);

export async function fetchSellerTaxonomy(): Promise<ListingTaxonomyNode[]> {
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

  const nodesResponse = await fetch(`${getApiBase()}/taxonomy/trees/${tree.id}/nodes`, {
    headers: { Accept: "application/json" },
  });
  if (!nodesResponse.ok) {
    throw new Error(`Failed to load taxonomy nodes: ${nodesResponse.status}`);
  }

  const payload = (await nodesResponse.json()) as TaxonomyNodesResponse;
  return normalizeTree(payload.nodes);
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
