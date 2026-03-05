import React, { useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import { Download, RefreshCcw, Search } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { PermissionGate } from "../../components/PermissionGate";
import type { AuditLogRecord } from "../../api/types";
import { useAuditLogsQuery } from "../../hooks/api/useWorkspaceRoles";

function severityTone(severity: string | undefined) {
  const value = String(severity || "info").toLowerCase();
  if (value.includes("critical") || value.includes("error")) return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300";
  if (value.includes("warn")) return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function formatWhen(value: string | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function buildCsv(rows: AuditLogRecord[]) {
  const columns = ["id", "at", "actor", "action", "detail", "severity"];
  const escape = (value: unknown) => {
    const stringValue = String(value ?? "");
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const body = rows.map((row) => columns.map((column) => escape((row as Record<string, unknown>)[column])).join(","));
  return [columns.join(","), ...body].join("\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function AuditLogContent() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const auditQuery = useAuditLogsQuery({ staleTime: 10_000 });

  const rows = auditQuery.data ?? [];
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (severity !== "all" && String(row.severity || "").toLowerCase() !== severity) return false;
      if (!search.trim()) return true;
      const haystack = [row.actor, row.action, row.detail, row.id].join(" ").toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });
  }, [rows, search, severity]);

  const totals = useMemo(() => {
    return rows.reduce(
      (accumulator, row) => {
        const value = String(row.severity || "info").toLowerCase();
        accumulator.total += 1;
        if (value.includes("warn")) accumulator.warnings += 1;
        if (value.includes("critical") || value.includes("error")) accumulator.errors += 1;
        return accumulator;
      },
      { total: 0, warnings: 0, errors: 0 }
    );
  }, [rows]);

  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950">
      <PageHeader
        pageTitle="Audit Log"
        mobileViewType="inline-right"
        rightContent={
          <button
            type="button"
            onClick={() => downloadCsv(`creator_audit_log_${Date.now()}.csv`, buildCsv(filteredRows))}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-6 sm:px-4 lg:px-8">
        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total events</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{totals.total}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Warnings</p>
            <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-300">{totals.warnings}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Critical / errors</p>
            <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-300">{totals.errors}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-2xl">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search actor, action or detail"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <select
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="all">All severities</option>
                <option value="info">Info</option>
                <option value="warn">Warnings</option>
                <option value="warning">Warnings</option>
                <option value="error">Errors</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => void auditQuery.refetch()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {auditQuery.isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-300">
              <CircularProgress size={20} />
              Loading audit activity...
            </div>
          ) : auditQuery.isError ? (
            <div className="p-6 text-sm text-rose-700 dark:text-rose-300">Could not load the audit log right now.</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-6 text-sm text-slate-500 dark:text-slate-300">No audit events match the current filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-950">
                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-400">
                    <th className="px-4 py-3 font-semibold">When</th>
                    <th className="px-4 py-3 font-semibold">Actor</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">Detail</th>
                    <th className="px-4 py-3 font-semibold">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatWhen(row.at)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{row.actor}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.action}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{row.detail || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${severityTone(row.severity)}`}>
                          {String(row.severity || "info")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function CreatorAuditLogPage() {
  return (
    <PermissionGate
      permission="admin.audit"
      pageTitle="Audit Log"
      subtitle="This page is restricted to owners or roles with audit visibility enabled in Roles & Permissions."
    >
      <AuditLogContent />
    </PermissionGate>
  );
}
