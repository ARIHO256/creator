import React from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "../PageHeader";

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function SupportPage({
  title,
  badge,
  rightContent,
  children
}: {
  title: string;
  badge?: React.ReactNode;
  rightContent?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f2f2f2] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <PageHeader pageTitle={title} badge={badge} rightContent={rightContent} mobileViewType="inline-right" />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-6 sm:px-4 lg:px-8">{children}</main>
    </div>
  );
}

export function SupportStat({ label, value, accent = false }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={cx("mt-2 text-2xl font-bold", accent && "text-[#f77f00]")}>{value}</p>
    </div>
  );
}

export function SupportSection({
  title,
  description,
  right,
  children,
  className
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function InputLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{children}</label>;
}

export function SupportInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950",
        props.className
      )}
    />
  );
}

export function SupportTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(
        "w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950",
        props.className
      )}
    />
  );
}

export function SupportSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950",
        props.className
      )}
    />
  );
}

export function SupportButton({
  children,
  onClick,
  disabled,
  tone = "neutral",
  type = "button"
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "neutral" | "primary" | "danger";
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        tone === "primary"
          ? "bg-[#f77f00] text-white hover:bg-[#df7300]"
          : tone === "danger"
            ? "bg-rose-600 text-white hover:bg-rose-500"
            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

export function SupportToggle({ checked, onChange, disabled }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cx(
        "relative inline-flex h-6 w-11 items-center rounded-full transition",
        checked ? "bg-[#f77f00]" : "bg-slate-300 dark:bg-slate-700",
        disabled && "cursor-not-allowed opacity-50"
      )}
      aria-pressed={checked}
    >
      <span className={cx("inline-block h-5 w-5 rounded-full bg-white shadow transition", checked ? "translate-x-5" : "translate-x-1")} />
    </button>
  );
}

export function SupportCheckbox({ checked, onChange, label, description }: { checked: boolean; onChange: (value: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-[#f77f00] focus:ring-[#f77f00]" />
      <span>
        <span className="block text-sm font-semibold text-slate-900 dark:text-slate-50">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{description}</span> : null}
      </span>
    </label>
  );
}

export function LoadingState({ label = "Loading workspace…" }: { label?: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">{message}</div>;
}

export function EmptyState({ message }: { message: string }) {
  return <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{message}</div>;
}
