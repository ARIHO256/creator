import React from "react";
import { useNavigate } from "react-router-dom";
import { useLandingContentQuery } from "../../hooks/api/useWorkspace";
import { useAuth } from "../../contexts/AuthContext";

type CreatorPlatformLandingProps = {
  onEnter: () => void;
};

function openPath(navigate: ReturnType<typeof useNavigate>, isAuthenticated: boolean, path: string | undefined) {
  if (!path) return;
  if (path.startsWith("http")) {
    window.location.href = path;
    return;
  }

  if (path.startsWith("/profile-public") && !isAuthenticated) {
    navigate("/auth");
    return;
  }

  navigate(path);
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
      {message}
    </div>
  );
}

export default function CreatorPlatformLanding({ onEnter }: CreatorPlatformLandingProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const landingQuery = useLandingContentQuery();
  const content = landingQuery.data;

  const handleEnter = () => {
    onEnter();
    navigate(isAuthenticated ? "/home" : "/auth");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 rounded-full border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <img src="/MyliveDealz PNG Icon 1.png" alt="MyLiveDealz" className="h-10 w-10 rounded-full bg-white/10 p-1" />
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-amber-300">MyLiveDealz</p>
              <p className="text-sm text-slate-300">Creator portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleEnter}
              className="rounded-full bg-[#f77f00] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#dd7200]"
            >
              Enter workspace
            </button>
          </div>
        </header>

        <main className="flex-1 py-8 sm:py-12">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-center">
            <div className="space-y-5">
              <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
                {content?.hero.eyebrow ?? "Creator commerce workspace"}
              </span>
              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                  {content?.hero.title ?? "Run every creator workflow from one backend-driven workspace."}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  {content?.hero.subtitle ??
                    "Move from discovery and pitch to live delivery, replay distribution, Shoppable Adz, analytics, and payouts with one connected creator backend."}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openPath(navigate, isAuthenticated, content?.hero.primaryCta?.href ?? "/auth")}
                  className="rounded-full bg-[#f77f00] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#dd7200]"
                >
                  {content?.hero.primaryCta?.label ?? "Enter creator workspace"}
                </button>
                <button
                  type="button"
                  onClick={() => openPath(navigate, isAuthenticated, content?.hero.secondaryCta?.href ?? "/auth")}
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {content?.hero.secondaryCta?.label ?? "View creator profile"}
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-5 shadow-2xl backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">What is already connected</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(content?.stats ?? []).map((stat) => (
                  <div key={stat.id} className="rounded-3xl border border-white/10 bg-slate-900/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                    <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
                    <p className="mt-1 text-sm text-slate-300">{stat.detail}</p>
                  </div>
                ))}
              </div>
              {!content && !landingQuery.isLoading ? <EmptyState message="Landing content is not available yet." /> : null}
            </div>
          </section>

          <section className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(content?.features ?? []).map((feature) => (
              <article key={feature.id} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-amber-200">{feature.tag}</p>
                <h2 className="mt-3 text-xl font-bold text-white">{feature.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">{feature.description}</p>
              </article>
            ))}
          </section>

          <section className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Workflow</p>
              <div className="mt-5 space-y-4">
                {(content?.workflow ?? []).map((step, index) => (
                  <div key={step.id} className="flex gap-4 rounded-3xl border border-white/10 bg-slate-900/50 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f77f00] text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">{step.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Featured suppliers</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {(content?.featuredBrands ?? []).map((brand) => (
                    <div key={brand.id} className="rounded-3xl border border-white/10 bg-slate-900/50 p-4">
                      <p className="text-sm font-semibold text-white">{brand.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{brand.category}</p>
                      <p className="mt-2 text-sm text-amber-200">{brand.badge}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Creator stories</p>
                <div className="mt-4 space-y-3">
                  {(content?.stories ?? []).map((story) => (
                    <div key={story.id} className="rounded-3xl border border-white/10 bg-slate-900/50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{story.title}</p>
                          <p className="text-sm text-slate-300">{story.seller}</p>
                        </div>
                        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-200">
                          ${Number(story.value || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{story.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-12 rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Frequently asked</p>
            <div className="mt-4 space-y-3">
              {(content?.faq ?? []).map((item) => (
                <details key={item.id} className="rounded-3xl border border-white/10 bg-slate-900/50 p-4">
                  <summary className="cursor-pointer list-none text-base font-semibold text-white">{item.question}</summary>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
