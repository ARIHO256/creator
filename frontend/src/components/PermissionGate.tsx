import React from "react";
import { Link, ShieldAlert } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { useWorkspaceAccess } from "../hooks/useWorkspaceAccess";

export function PermissionGate({ permission, pageTitle, subtitle, children }: {
  permission: string;
  pageTitle: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const access = useWorkspaceAccess(permission);

  if (access.isLoading) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 transition-colors">
        <PageHeader pageTitle={pageTitle} mobileViewType="hide" />
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-sm text-slate-500 dark:text-slate-400 shadow-sm">
            Loading role permissions...
          </section>
        </main>
      </div>
    );
  }

  if (!access.allowed) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 transition-colors">
        <PageHeader pageTitle={pageTitle} mobileViewType="hide" />
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 p-8 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-[#f77f00]" />
              <div>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">Access restricted by role</div>
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">{subtitle}</div>
                <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-sm text-slate-700 dark:text-slate-200">
                  <Link className="h-4 w-4" />
                  Ask the workspace owner to enable this page from Roles & Permissions.
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
