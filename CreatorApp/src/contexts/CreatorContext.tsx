import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

// Shared creator tier used across Analytics/Rank and Live Builder.
export type RankTier = "Bronze" | "Silver" | "Gold";

type CreatorPersistedStateV1 = {
    followedSellerIds: number[];
    rankTier: RankTier;
};

// Persisting this context keeps rank tier + follows stable across refresh.
const CREATOR_CONTEXT_STORAGE_KEY = "mldz:creatorContext:v1";

function safeReadCreatorContext(): Partial<CreatorPersistedStateV1> {
    if (typeof window === "undefined") return {};
    try {
        const raw = window.localStorage.getItem(CREATOR_CONTEXT_STORAGE_KEY);
        if (!raw) return {};

        const parsed = JSON.parse(raw) as any;
        // Support either direct { followedSellerIds, rankTier } or wrapped { state: {...} }
        const state = (parsed?.state ?? parsed) as any;

        const followedSellerIds = Array.isArray(state?.followedSellerIds)
            ? state.followedSellerIds
                  .map((n: any) => (typeof n === "number" ? n : Number(n)))
                  .filter((n: any) => Number.isFinite(n))
            : undefined;

        const rankTier: RankTier | undefined =
            state?.rankTier === "Bronze" || state?.rankTier === "Silver" || state?.rankTier === "Gold"
                ? state.rankTier
                : undefined;

        return { followedSellerIds, rankTier };
    } catch {
        return {};
    }
}

function safeWriteCreatorContext(next: CreatorPersistedStateV1) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(CREATOR_CONTEXT_STORAGE_KEY, JSON.stringify(next));
    } catch {
        // ignore
    }
}

type CreatorContextType = {
    followedSellerIds: number[];
    toggleFollowSeller: (id: number) => void;
    isFollowing: (id: number) => boolean;

    rankTier: RankTier;
    setRankTier: (tier: RankTier) => void;
};

const CreatorContext = createContext<CreatorContextType | undefined>(undefined);

export function CreatorProvider({ children }: { children: ReactNode }) {
    const hydrated = useMemo(() => safeReadCreatorContext(), []);

    // Mock initial state with some IDs followed by default (e.g., 1=GlowUp Hub)
    const [followedSellerIds, setFollowedSellerIds] = useState<number[]>(() => hydrated.followedSellerIds ?? [1]);

    // Default tier is Bronze until wired to real user/rank data.
    const [rankTier, setRankTier] = useState<RankTier>(() => hydrated.rankTier ?? "Bronze");

    const toggleFollowSeller = (id: number) => {
        setFollowedSellerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const isFollowing = (id: number) => followedSellerIds.includes(id);

    useEffect(() => {
        safeWriteCreatorContext({
            followedSellerIds,
            rankTier,
        });
    }, [followedSellerIds, rankTier]);

    return (
        <CreatorContext.Provider
            value={{
                followedSellerIds,
                toggleFollowSeller,
                isFollowing,
                rankTier,
                setRankTier,
            }}
        >
            {children}
        </CreatorContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCreator() {
    const context = useContext(CreatorContext);
    if (context === undefined) {
        throw new Error("useCreator must be used within a CreatorProvider");
    }
    return context;
}
