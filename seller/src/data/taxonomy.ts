import { useCallback, useEffect, useState } from "react";
import type { ListingTaxonomyNode } from "./pageTypes";
import { resolveApiUrl } from "../lib/apiRuntime";

type TaxonomyTreeResponse = {
  id: string;
  slug?: string;
  name?: string;
  status?: string;
};

type TaxonomyNodesResponse = {
  nodes?: unknown;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
};

const unwrapEnvelope = <T>(value: unknown): T => {
  if (value && typeof value === "object" && "data" in (value as Record<string, unknown>)) {
    return ((value as ApiEnvelope<T>).data ?? value) as T;
  }
  return value as T;
};

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

export const readSellerTaxonomy = () => {
  return [];
};

async function fetchApiJson<T>(path: string): Promise<T> {
  const url = await resolveApiUrl(path);
  if (!url) {
    throw new Error(`API base URL not configured (cannot resolve ${path})`);
  }
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return unwrapEnvelope<T>(await response.json());
}

async function fetchTaxonomyTree(slug: string, kind: "seller" | "provider") {
  const payload = await fetchApiJson<TaxonomyNodesResponse>(`/api/taxonomy/trees/${slug}/nodes`);
  return transformTree(normalizeTree(payload.nodes), kind);
}

export async function fetchSellerTaxonomy(): Promise<ListingTaxonomyNode[]> {
  try {
    return await fetchTaxonomyTree("sellerfront-catalog-taxonomy", "seller");
  } catch (error) {
    const trees = await fetchApiJson<TaxonomyTreeResponse[]>(`/api/taxonomy/trees`);
    const tree =
      trees.find((item) => item.slug === "sellerfront-catalog-taxonomy") ||
      trees.find((item) => item.status === "ACTIVE") ||
      trees[0];
    if (!tree?.id) {
      throw error;
    }
    return fetchTaxonomyTree(tree.id, "seller");
  }
}

type TaxonomyQueryState = {
  taxonomy: ListingTaxonomyNode[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
};

export function useSellerTaxonomy(): TaxonomyQueryState {
  const [taxonomy, setTaxonomy] = useState<ListingTaxonomyNode[]>(() => readSellerTaxonomy());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => {
    setNonce((v) => v + 1);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void fetchSellerTaxonomy()
      .then((next) => {
        if (!active) return;
        setTaxonomy(next);
      })
      .catch((err) => {
        if (!active) return;
        setTaxonomy([]);
        setError(err instanceof Error ? err : new Error("Failed to load seller taxonomy"));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [nonce]);

  return { taxonomy, loading, error, refetch };
}

export function useProviderServiceTaxonomy(): TaxonomyQueryState {
  const [taxonomy, setTaxonomy] = useState<ListingTaxonomyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => {
    setNonce((v) => v + 1);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void fetchTaxonomyTree("provider-service-taxonomy", "provider")
      .then((next) => {
        if (!active) return;
        setTaxonomy(next);
      })
      .catch((err) => {
        if (!active) return;
        setTaxonomy([]);
        setError(err instanceof Error ? err : new Error("Failed to load provider taxonomy"));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [nonce]);

  return { taxonomy, loading, error, refetch };
}
