import React from "react";
import { ArrowRight, BadgeCheck, Briefcase, ShoppingBag, Users } from "lucide-react";

// LiveDealz Feed · Small card component
// Theme: EVzone Green accents, CTA button is Orange
// Update: Removed the green accent line at the bottom of the card
// Title: “Who are MyLiveDealz Suppliers?”
// Definitions:
// suppliers = Sellers + Providers
// Sellers = Suppliers of Products
// Providers = Service Providers


const ORANGE = "#f77f00";
const ORANGE_DARK = "#e26f00";

function Pill({
    children,
    tone = "neutral"
}: {
    children: React.ReactNode;
    tone?: "neutral" | "success" | "brand";
}) {
    const cls =
        tone === "brand"
            ? "bg-[#eafff6] text-[#02664b] border-[#9cf3d8]"
            : tone === "success"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-50 text-slate-700 border-slate-200";

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] ${cls}`}>
            {children}
        </span>
    );
}

function MiniTile({
    icon,
    title,
    desc
}: {
    icon: React.ReactNode;
    title: string;
    desc: string;
}) {
    return (
        <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-3 py-2.5">
            <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    {icon}
                </div>
                <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-white truncate">{title}</div>
                    <div className="text-[10px] text-white/70 truncate">{desc}</div>
                </div>
            </div>
        </div>
    );
}

export function LiveDealzSuppliersCard({
    onExploreSuppliers
}: {
    onExploreSuppliers?: () => void;
}) {
    return (
        <section className="w-full">
            <div
                className="relative overflow-hidden rounded-3xl border border-slate-200 shadow-sm"
                style={{
                    background:
                        "radial-gradient(900px 420px at 15% 20%, rgba(3,205,140,0.22), transparent 55%), radial-gradient(900px 420px at 85% 30%, rgba(255,255,255,0.10), transparent 60%), linear-gradient(135deg, #0b1220 0%, #111827 55%, #0b1220 100%)"
                }}
            >
                {/* Subtle grid */}
                <div
                    className="absolute inset-0 opacity-[0.10]"
                    style={{
                        backgroundImage:
                            "linear-gradient(to right, rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.25) 1px, transparent 1px)",
                        backgroundSize: "22px 22px"
                    }}
                />

                <div className="relative p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <div className="h-9 w-9 rounded-2xl flex items-center justify-center bg-white/10 text-white">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-[13px] font-semibold text-white truncate">
                                        Who are MyLiveDealz Suppliers?
                                    </h3>
                                    <div className="mt-0.5 text-[10px] text-white/70 truncate">
                                        Suppliers = Sellers + Providers
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <Pill tone="brand">SUPPLIERS</Pill>
                            <Pill tone="success">
                                <BadgeCheck className="h-3.5 w-3.5" />
                                Verified network
                            </Pill>
                        </div>
                    </div>

                    {/* Copy */}
                    <p className="mt-3 text-[11px] leading-relaxed text-white/80">
                        Suppliers are the businesses you collaborate with on MyLiveDealz.{" "}
                        <span className="text-white font-medium">Sellers</span> supply high-quality{" "}
                        <span className="text-white font-medium">products</span>, and{" "}
                        <span className="text-white font-medium">Providers</span> deliver professional{" "}
                        <span className="text-white font-medium">services</span>. Follow the right suppliers,
                        pitch collaborations, then run{" "}
                        <span className="text-white font-medium">Live Sessionz</span> and{" "}
                        <span className="text-white font-medium">Shoppable Adz</span> that convert.
                    </p>

                    {/* Tiles */}
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                        <MiniTile
                            icon={<ShoppingBag className="h-4 w-4" />}
                            title="Sellers"
                            desc="Suppliers of products"
                        />
                        <MiniTile
                            icon={<Briefcase className="h-4 w-4" />}
                            title="Providers"
                            desc="Service providers"
                        />
                    </div>

                    {/* CTA (Orange only) */}
                    <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="text-[10px] text-white/70">
                            Tip: use your best categories to find higher-fit suppliers.
                        </div>
                        <button
                            type="button"
                            onClick={onExploreSuppliers}
                            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[11px] font-semibold text-white border border-white/10 hover:border-white/20"
                            style={{ background: ORANGE }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.background = ORANGE_DARK;
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.background = ORANGE;
                            }}
                        >
                            Explore Suppliers Directory
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
