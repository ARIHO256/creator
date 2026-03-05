import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  Layers3,
  LifeBuoy,
  Loader2,
  Mail,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle
} from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { PermissionGate } from "../../components/PermissionGate";
import { useSubscriptionQuery, useUpdateSubscriptionMutation } from "../../hooks/api/useFinance";
import type {
  SubscriptionComparisonRow,
  SubscriptionCycle,
  SubscriptionFeatureCell,
  SubscriptionPlanCatalogEntry,
  SubscriptionPlanKey,
  SubscriptionRecord,
  SubscriptionUsageRecord
} from "../../api/types";

const ORANGE = "#f77f00";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatMoney(value: number) {
  return value === 0 ? "Free" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function csvEscape(value: string) {
  const clean = value.replace(/"/g, '""');
  return /[",\n]/.test(clean) ? `"${clean}"` : clean;
}

function downloadInvoicesCsv(subscription: SubscriptionRecord) {
  if (typeof window === "undefined" || !subscription.invoices.length) return;
  const rows = subscription.invoices.map((invoice) => ({
    Invoice: invoice.id,
    IssuedAt: invoice.issuedAt,
    Description: invoice.description || "",
    Status: invoice.status,
    Amount: invoice.amountLabel || `${invoice.amount} ${invoice.currency}`,
    BilledTo: invoice.billedTo || subscription.billingEmail || ""
  }));
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((header) => csvEscape(String(row[header as keyof typeof row] ?? ""))).join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `mylivedealz-subscription-invoices-${subscription.plan}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function statusTone(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("active") || normalized.includes("paid")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20";
  }
  if (normalized.includes("pending") || normalized.includes("review")) {
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20";
  }
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";
}

function comparisonTone(cell: SubscriptionFeatureCell) {
  if (cell.value === "included") {
    return { icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, label: "Included" };
  }
  if (cell.value === "limited") {
    return { icon: <BadgeCheck className="h-4 w-4" style={{ color: ORANGE }} />, label: "Limited" };
  }
  return { icon: <XCircle className="h-4 w-4 text-slate-400" />, label: "Not included" };
}

function SectionCard({
  title,
  subtitle,
  icon,
  right,
  children
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon ? <div className="shrink-0">{icon}</div> : null}
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">{title}</h2>
          </div>
          {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function PlanPill({ plan }: { plan: SubscriptionPlanCatalogEntry }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
      <span>{plan.emoji}</span>
      <span>{plan.name}</span>
    </div>
  );
}

function StatTile({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100">
          {icon}
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-50">{value}</div>
        </div>
      </div>
      {hint ? <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
    </div>
  );
}

function UsageCard({ usage }: { usage: SubscriptionUsageRecord }) {
  const percentage = usage.utilizationPct ?? 0;
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{usage.label}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{usage.helper}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{usage.usedLabel}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{usage.limitLabel}</div>
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${usage.cap ? percentage : 100}%`, background: usage.cap ? ORANGE : "#10b981" }}
        />
      </div>
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{usage.remainingLabel}</div>
    </div>
  );
}

function PlanCard({
  plan,
  currentPlan,
  cycle,
  canManage,
  pending,
  onSelect
}: {
  plan: SubscriptionPlanCatalogEntry;
  currentPlan: SubscriptionPlanKey;
  cycle: SubscriptionCycle;
  canManage: boolean;
  pending: boolean;
  onSelect: (planId: SubscriptionPlanKey) => void;
}) {
  const isCurrent = plan.id === currentPlan;
  return (
    <div
      className={cx(
        "rounded-3xl border p-4 sm:p-5 shadow-sm transition-colors",
        isCurrent
          ? "border-transparent text-white"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50"
      )}
      style={isCurrent ? { background: `linear-gradient(135deg, ${ORANGE}, #ea580c)` } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold opacity-90">{plan.emoji} {plan.name}</div>
          <div className={cx("mt-1 text-2xl font-black", isCurrent ? "text-white" : "text-slate-900 dark:text-slate-50")}>
            {formatMoney(plan.pricing[cycle])}
            {plan.pricing[cycle] === 0 ? null : <span className="text-sm font-semibold opacity-80"> / {cycle}</span>}
          </div>
          <p className={cx("mt-2 text-sm", isCurrent ? "text-white/85" : "text-slate-600 dark:text-slate-300")}>{plan.tagline}</p>
        </div>
        {plan.recommended ? (
          <span className={cx(
            "inline-flex rounded-full px-3 py-1 text-[11px] font-bold border",
            isCurrent ? "border-white/30 bg-white/10 text-white" : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          )}>
            Recommended
          </span>
        ) : null}
      </div>

      <div className={cx("mt-4 rounded-2xl p-3", isCurrent ? "bg-white/10 border border-white/15" : "bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800")}>
        <div className={cx("text-xs uppercase tracking-wide", isCurrent ? "text-white/75" : "text-slate-500 dark:text-slate-400")}>Best for</div>
        <div className={cx("mt-1 text-sm font-medium", isCurrent ? "text-white" : "text-slate-700 dark:text-slate-200")}>{plan.bestFor}</div>
      </div>

      <div className="mt-4 space-y-2">
        {plan.highlights.map((entry) => (
          <div key={entry} className="flex items-start gap-2">
            <CheckCircle2 className={cx("mt-0.5 h-4 w-4", isCurrent ? "text-white" : "text-emerald-500")} />
            <span className={cx("text-sm", isCurrent ? "text-white/90" : "text-slate-700 dark:text-slate-200")}>{entry}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={!canManage || pending || isCurrent}
        onClick={() => onSelect(plan.id)}
        className={cx(
          "mt-5 w-full rounded-2xl px-4 py-3 text-sm font-bold transition-colors border",
          isCurrent
            ? "border-white/25 bg-white/10 text-white cursor-default"
            : canManage
              ? "border-slate-200 dark:border-slate-700 bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90"
              : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
        )}
      >
        {isCurrent ? "Current plan" : canManage ? `Switch to ${plan.name}` : "View only"}
      </button>
    </div>
  );
}

function ComparisonTable({ rows }: { rows: SubscriptionComparisonRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2 text-sm">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Feature</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Basic</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Pro</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Enterprise</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const basic = comparisonTone(row.basic);
            const pro = comparisonTone(row.pro);
            const enterprise = comparisonTone(row.enterprise);
            return (
              <tr key={`${row.category}-${row.feature}`} className="bg-slate-50 dark:bg-slate-950/40">
                <td className="rounded-l-2xl px-3 py-3 align-top">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{row.category}</div>
                  <div className="mt-1 font-semibold text-slate-900 dark:text-slate-50">{row.feature}</div>
                </td>
                {[{ cell: row.basic, meta: basic }, { cell: row.pro, meta: pro }, { cell: row.enterprise, meta: enterprise }].map(({ cell, meta }, idx) => (
                  <td key={idx} className={cx("px-3 py-3 align-top", idx === 2 ? "rounded-r-2xl" : "") }>
                    <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-50">
                      {meta.icon}
                      <span>{meta.label}</span>
                    </div>
                    {cell.note ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{cell.note}</div> : null}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SubscriptionPageContent() {
  const navigate = useNavigate();
  const subscriptionQuery = useSubscriptionQuery();
  const updateSubscription = useUpdateSubscriptionMutation();
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const subscription = subscriptionQuery.data;
  const currentPlan = subscription?.currentPlanMeta;

  const topAction = useMemo(() => {
    if (!subscription || !currentPlan) return null;
    if (!subscription.canManageBilling) {
      return (
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-100"
        >
          View billing settings
        </button>
      );
    }

    return subscription.plan !== "pro" ? (
      <button
        type="button"
        onClick={() => {
          void handlePlanChange("pro");
        }}
        className="rounded-full px-3 py-1.5 text-sm font-semibold text-white"
        style={{ background: ORANGE }}
      >
        Upgrade to Pro
      </button>
    ) : (
      <button
        type="button"
        onClick={() => navigate("/settings")}
        className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-100"
      >
        Manage billing settings
      </button>
    );
  }, [currentPlan, navigate, subscription]);

  async function handlePlanChange(plan: SubscriptionPlanKey) {
    if (!subscription || !subscription.canManageBilling || plan === subscription.plan) return;
    setFeedback(null);
    try {
      const updated = await updateSubscription.mutateAsync({ plan });
      setFeedback({ kind: "success", message: `${updated.currentPlanMeta.name} is now the active plan.` });
    } catch (error) {
      setFeedback({ kind: "error", message: (error as Error)?.message || "Could not change the subscription plan." });
    }
  }

  async function handleCycleChange(cycle: SubscriptionCycle) {
    if (!subscription || !subscription.canManageBilling || cycle === subscription.cycle) return;
    setFeedback(null);
    try {
      const updated = await updateSubscription.mutateAsync({ cycle });
      setFeedback({ kind: "success", message: `Billing cycle updated to ${updated.cycle}.` });
    } catch (error) {
      setFeedback({ kind: "error", message: (error as Error)?.message || "Could not change the billing cycle." });
    }
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 transition-colors">
      <PageHeader
        pageTitle="My Subscription"
        badge={currentPlan ? <PlanPill plan={currentPlan} /> : undefined}
        rightContent={topAction || undefined}
      />

      <main className="px-3 sm:px-4 md:px-6 lg:px-8 py-6 space-y-4">
        {subscriptionQuery.isLoading ? (
          <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm flex items-center gap-3 text-slate-600 dark:text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading backend-driven subscription details...
          </section>
        ) : null}

        {subscriptionQuery.isError ? (
          <section className="rounded-3xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-slate-900 p-8 shadow-sm">
            <div className="text-base font-bold text-slate-900 dark:text-slate-50">Could not load the subscription workspace</div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {(subscriptionQuery.error as Error)?.message || "The subscription payload could not be loaded from the backend."}
            </div>
            <button
              type="button"
              onClick={() => void subscriptionQuery.refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-100"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry
            </button>
          </section>
        ) : null}

        {subscription ? (
          <>
            <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <ShieldCheck className="h-4 w-4" style={{ color: ORANGE }} />
                    Subscription unlocks tools. Rank stays performance-based.
                  </div>
                  <h1 className="mt-3 text-2xl font-black text-slate-900 dark:text-slate-50">
                    {currentPlan?.emoji} {currentPlan?.name} plan
                  </h1>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {currentPlan?.tagline} Your page visibility is controlled by Roles &amp; Permissions, while this content is now coming directly from backend subscription data.
                  </p>
                  {subscription.notes?.length ? (
                    <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                      {subscription.notes.slice(0, 2).map((note) => (
                        <li key={note} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4 min-w-[280px]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Billing cycle</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">{subscription.cycle}</div>
                    </div>
                    <div className="inline-flex rounded-full border border-slate-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-900">
                      {(["monthly", "yearly"] as SubscriptionCycle[]).map((cycle) => (
                        <button
                          key={cycle}
                          type="button"
                          disabled={updateSubscription.isPending || !subscription.canManageBilling}
                          onClick={() => {
                            void handleCycleChange(cycle);
                          }}
                          className={cx(
                            "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                            subscription.cycle === cycle
                              ? "text-white"
                              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-50"
                          )}
                          style={subscription.cycle === cycle ? { background: ORANGE } : undefined}
                        >
                          {cycle === "monthly" ? "Monthly" : "Yearly"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    {subscription.canManageBilling
                      ? "Changing the cycle persists to backend billing records immediately."
                      : "This role can view subscription status but cannot modify billing."}
                  </div>
                </div>
              </div>
            </section>

            {feedback ? (
              <section className={cx(
                "rounded-3xl border px-4 py-3 shadow-sm text-sm font-medium",
                feedback.kind === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
              )}>
                {feedback.message}
              </section>
            ) : null}

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatTile
                label="Status"
                value={subscription.status}
                hint={`Last updated ${formatDateTime(subscription.lastUpdatedAt)}`}
                icon={<BadgeCheck className="h-5 w-5" style={{ color: ORANGE }} />}
              />
              <StatTile
                label="Renews"
                value={subscription.renewalLabel || formatDate(subscription.renewsAt)}
                hint={subscription.cancelAtPeriodEnd ? "Scheduled to cancel at period end" : "Auto-renew active"}
                icon={<CalendarClock className="h-5 w-5" style={{ color: ORANGE }} />}
              />
              <StatTile
                label="Workspace seats"
                value={`${subscription.workspaceSummary.activeSeats} active / ${subscription.workspaceSummary.invitedSeats} invited`}
                hint={subscription.workspaceSummary.seatLimitLabel}
                icon={<Users className="h-5 w-5" style={{ color: ORANGE }} />}
              />
              <StatTile
                label="Billing contact"
                value={subscription.billingEmail || "—"}
                hint={subscription.support.managerName ? `Support owner: ${subscription.support.managerName}` : "Workspace billing contact"}
                icon={<Mail className="h-5 w-5" style={{ color: ORANGE }} />}
              />
            </section>

            <SectionCard
              title="Plan catalog"
              subtitle="Choose the plan that matches your creator workflow. Switching plans now persists through the backend subscription record."
              icon={<Sparkles className="h-5 w-5" style={{ color: ORANGE }} />}
            >
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {subscription.planCatalog.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    currentPlan={subscription.plan}
                    cycle={subscription.cycle}
                    canManage={subscription.canManageBilling}
                    pending={updateSubscription.isPending}
                    onSelect={handlePlanChange}
                  />
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Usage and entitlements"
              subtitle="This is the live usage snapshot coming from backend state, not mock counters."
              icon={<Layers3 className="h-5 w-5" style={{ color: ORANGE }} />}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {subscription.usage.map((usage) => (
                  <UsageCard key={usage.id} usage={usage} />
                ))}
              </div>
            </SectionCard>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
              <SectionCard
                title="Billing history"
                subtitle="Invoice rows are loaded from the backend subscription response."
                icon={<FileText className="h-5 w-5" style={{ color: ORANGE }} />}
                right={
                  <button
                    type="button"
                    onClick={() => downloadInvoicesCsv(subscription)}
                    disabled={!subscription.invoices.length}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-100 disabled:opacity-50"
                  >
                    Export CSV
                  </button>
                }
              >
                {subscription.invoices.length ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
                          <th className="py-2 pr-3">Invoice</th>
                          <th className="py-2 pr-3">Date</th>
                          <th className="py-2 pr-3">Description</th>
                          <th className="py-2 pr-3">Amount</th>
                          <th className="py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscription.invoices.map((invoice) => (
                          <tr key={invoice.id} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="py-3 pr-3 font-semibold text-slate-900 dark:text-slate-50">{invoice.id}</td>
                            <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">{formatDate(invoice.issuedAt)}</td>
                            <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">{invoice.description || currentPlan?.name}</td>
                            <td className="py-3 pr-3 font-semibold text-slate-900 dark:text-slate-50">{invoice.amountLabel || formatMoney(invoice.amount)}</td>
                            <td className="py-3">
                              <span className={cx("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", statusTone(invoice.status))}>
                                {invoice.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/40 p-4 text-sm text-slate-500 dark:text-slate-400">
                    No paid invoices yet. The free plan does not create billing invoices.
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Billing profile"
                subtitle="Subscription payment, support, and workspace governance status."
                icon={<CreditCard className="h-5 w-5" style={{ color: ORANGE }} />}
              >
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Payment method</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">{subscription.paymentMethod?.label || subscription.billingMethod?.label || "Not set"}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {subscription.paymentMethod?.holderName || subscription.billingMethod?.holderName || subscription.billingEmail}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Workspace governance</div>
                    <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <div className="flex items-center justify-between gap-3"><span>Roles & permissions</span><span className="font-semibold">{subscription.workspaceSummary.canManageRoles ? "Enabled" : "Limited"}</span></div>
                      <div className="flex items-center justify-between gap-3"><span>Approvals workflow</span><span className="font-semibold">{subscription.workspaceSummary.approvalsEnabled ? "Enabled" : "Basic only"}</span></div>
                      <div className="flex items-center justify-between gap-3"><span>Audit exports</span><span className="font-semibold">{subscription.workspaceSummary.auditExportsEnabled ? "Enabled" : "Not included"}</span></div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Support</div>
                    <div className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                      <div className="flex items-center gap-2"><LifeBuoy className="h-4 w-4" style={{ color: ORANGE }} /> {subscription.support.contactEmail}</div>
                      <div className="flex items-center gap-2"><Mail className="h-4 w-4" style={{ color: ORANGE }} /> {subscription.support.salesEmail}</div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined") window.open(subscription.support.helpCenterUrl, "_blank", "noopener,noreferrer");
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-100"
                      >
                        Open Help Center
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/roles-permissions")}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-100"
                      >
                        Manage roles
                      </button>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            <SectionCard
              title="Feature comparison"
              subtitle="Comparison content is now served from the backend subscription domain, so plan details stay consistent with runtime access logic."
              icon={<ShieldCheck className="h-5 w-5" style={{ color: ORANGE }} />}
            >
              <ComparisonTable rows={subscription.comparisonRows} />
            </SectionCard>

            <SectionCard
              title="Feature spotlights"
              subtitle="Quick jump points into the tools unlocked or expanded by your subscription."
              icon={<Sparkles className="h-5 w-5" style={{ color: ORANGE }} />}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {subscription.featureSpotlights.map((feature) => (
                  <div key={feature.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{feature.title}</div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{feature.description}</div>
                        {feature.minPlan ? (
                          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Recommended from {feature.minPlan} and above</div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(feature.route)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-100"
                      >
                        Open
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default function MySubscriptionPage() {
  return (
    <PermissionGate
      permission="subscription.view"
      pageTitle="My Subscription"
      subtitle="Subscription access is controlled from Roles & Permissions for your workspace."
    >
      <SubscriptionPageContent />
    </PermissionGate>
  );
}
