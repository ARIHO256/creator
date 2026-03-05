import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { AppRole } from "../api/types";
import { PageHeader } from "../components/PageHeader";
import { useNotification } from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";
import type { PageId } from "../layouts/CreatorShellLayout";

type RoleSwitcherPageProps = {
  onChangePage: (page: PageId) => void;
};

type RoleCardRecord = {
  id: AppRole;
  label: string;
  icon: string;
  description: string;
  color: string;
};

const ROLE_CARDS: RoleCardRecord[] = [
  {
    id: "Buyer",
    label: "Buyer",
    icon: "🛒",
    description: "Browse dealz, watch creator sessions, and follow the shopping journey from discovery to checkout.",
    color: "from-blue-500 to-indigo-600"
  },
  {
    id: "Seller",
    label: "Seller",
    icon: "🏪",
    description: "Move into the supplier lens for storefront, campaigns, invite workflows, and performance management.",
    color: "from-emerald-500 to-teal-600"
  },
  {
    id: "Creator",
    label: "Creator",
    icon: "🎥",
    description: "Return to the creator workspace for pitching, live sessions, ad builders, tracked links, and earnings.",
    color: "from-[#f77f00] to-orange-600"
  },
  {
    id: "Provider",
    label: "Provider",
    icon: "🤝",
    description: "Switch to the service-provider context for production, moderation, and creator support workflows.",
    color: "from-purple-500 to-violet-600"
  }
];

export const RoleSwitcherPage: React.FC<RoleSwitcherPageProps> = ({ onChangePage }) => {
  const { user, switchRole } = useAuth();
  const { showError, showSuccess } = useNotification();
  const [pendingRole, setPendingRole] = useState<AppRole | null>(null);
  const currentRole = user?.currentRole ?? "Creator";

  const handleSelectRole = async (role: AppRole) => {
    if (role === currentRole || pendingRole) return;
    setPendingRole(role);

    try {
      await switchRole(role);
      showSuccess(`Switched to ${role}.`);
      onChangePage("home");
    } catch (error) {
      showError(error instanceof Error ? error.message : `Could not switch to ${role}.`);
    } finally {
      setPendingRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <PageHeader
        pageTitle="Role Switcher"
        mobileViewType="hide"
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            🔁 Current role: {currentRole}
          </span>
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-3 py-6 sm:px-4 lg:px-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#f77f00]">Multi-role shell</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Choose how you want to use MyLiveDealz right now</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-300">
              This page now saves your role selection to the backend session, so your current role persists across refreshes and updates the runtime shell immediately.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ROLE_CARDS.map((role) => {
            const isCurrent = role.id === currentRole;
            const isPending = pendingRole === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => void handleSelectRole(role.id)}
                disabled={isCurrent || Boolean(pendingRole)}
                className={`group relative overflow-hidden rounded-[2rem] border p-6 text-left shadow-sm transition ${
                  isCurrent
                    ? "border-[#f77f00] bg-amber-50 dark:bg-[#f77f00]/10"
                    : "border-slate-200 bg-white hover:-translate-y-1 hover:border-[#f77f00] dark:border-slate-800 dark:bg-slate-900"
                } disabled:cursor-not-allowed`}
              >
                <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl text-white shadow-lg ${role.color}`}>
                  {role.icon}
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 transition group-hover:text-[#f77f00] dark:text-white">{role.label}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-300">{role.description}</p>
                  </div>
                  {isCurrent ? <CheckCircle2 className="h-5 w-5 text-[#f77f00]" /> : null}
                </div>

                <div className="mt-6 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em]">
                  {isCurrent ? (
                    <span className="text-[#f77f00]">Current</span>
                  ) : isPending ? (
                    <span className="text-slate-500 dark:text-slate-300">Switching...</span>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-300">Enter role</span>
                  )}
                  <span className="text-slate-400">→</span>
                </div>
              </button>
            );
          })}
        </section>
      </main>
    </div>
  );
};
