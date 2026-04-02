import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clearSession, useSession } from "../../auth/session";
import { sellerBackendApi } from "../../lib/backendApi";
import { useLocalization } from "../../localization/LocalizationProvider";

type ApprovalStatus = "Pending" | "Submitted" | "UnderReview" | "SendBack" | "Resubmitted" | "Approved";
type AdminDoc = { name: string; url: string; type: string };
type ChecklistItem = { id: string; text: string; done: boolean };

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function mapRole(code: string) {
  const normalized = (code || "").toLowerCase();
  const m: Record<string, string> = {
    seller: "Seller",
    provider: "Service Provider",
  };
  return m[normalized] || "Role not specified";
}

function toStatus(value: unknown): ApprovalStatus {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "approved") return "Approved";
  if (normalized === "resubmitted") return "Resubmitted";
  if (normalized === "sendback" || normalized === "send_back" || normalized === "action_required")
    return "SendBack";
  if (normalized === "underreview" || normalized === "under_review" || normalized === "in_review")
    return "UnderReview";
  if (normalized === "submitted") return "Submitted";
  return "Pending";
}

export default function OnboardingApprovalPending() {
  const { t } = useLocalization();
  const session = useSession();
  const role = session?.role || "seller";
  const [plan, setPlan] = useState("—");
  const [status, setStatus] = useState<ApprovalStatus>("Pending");
  const [etaMin, setEtaMin] = useState(60);
  const [adminReason, setAdminReason] = useState("");
  const [adminDocs, setAdminDocs] = useState<AdminDoc[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState("");
  const [dndActive, setDndActive] = useState(false);
  const [dropInfo, setDropInfo] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const [screenResult, approvalResult] = await Promise.allSettled([
          sellerBackendApi.getWorkflowScreenState("seller-onboarding"),
          sellerBackendApi.getAccountApproval(),
        ]);
        if (cancelled) return;

        const screen =
          screenResult.status === "fulfilled" && screenResult.value && typeof screenResult.value === "object"
            ? (screenResult.value as Record<string, unknown>)
            : {};
        const approval =
          approvalResult.status === "fulfilled" && approvalResult.value && typeof approvalResult.value === "object"
            ? (approvalResult.value as Record<string, unknown>)
            : {};

        const review = screen.review && typeof screen.review === "object"
          ? (screen.review as Record<string, unknown>)
          : {};
        const approvalReview = screen.approvalReview && typeof screen.approvalReview === "object"
          ? (screen.approvalReview as Record<string, unknown>)
          : {};
        const form = screen.form && typeof screen.form === "object"
          ? (screen.form as Record<string, unknown>)
          : {};

        const backendStatus = String(approval.status || "");
        const derivedStatus = backendStatus
          ? toStatus(backendStatus)
          : review.approvedAt
            ? "Approved"
            : review.inReviewAt
              ? "UnderReview"
              : review.submittedAt
                ? "Submitted"
                : "Pending";

        setPlan(
          String(
            approvalReview.plan ||
            form.plan ||
            form.planCode ||
            form.subscriptionPlan ||
            "—"
          )
        );
        setStatus(toStatus(approvalReview.status || derivedStatus));
        setEtaMin(Number(approvalReview.etaMin || 60));
        setAdminReason(String(approvalReview.adminReason || ""));
        setAdminDocs(Array.isArray(approvalReview.adminDocs) ? (approvalReview.adminDocs as AdminDoc[]) : []);
        setItems(Array.isArray(approvalReview.items) ? (approvalReview.items as ChecklistItem[]) : []);
        setNote(String(approvalReview.note || ""));
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timeoutId = window.setTimeout(() => {
      void sellerBackendApi.patchWorkflowScreenState("seller-onboarding", {
        approvalReview: {
          status,
          etaMin,
          adminReason,
          adminDocs,
          items,
          note,
          plan,
        },
      }).catch(() => undefined);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [hydrated, status, etaMin, adminReason, adminDocs, items, note, plan]);

  const steps = [
    { key: "Submitted", label: "Submitted", desc: "We received your onboarding details." },
    { key: "UnderReview", label: "Under review", desc: "Our team is verifying your information." },
    { key: "SendBack", label: "Action required", desc: "Please address the requested changes and resubmit." },
    { key: "Resubmitted", label: "Back in review", desc: "We are verifying your updates." },
    { key: "Approved", label: "Approved", desc: "We’ll unlock your dashboard and email you." },
  ] as const;

  const currentIndex = useMemo(
    () => ({ Pending: 0, Submitted: 0, UnderReview: 1, SendBack: 2, Resubmitted: 3, Approved: 4 }[status] ?? 0),
    [status]
  );
  const stateOf = (i: number) => (i < currentIndex ? "done" : i === currentIndex ? "active" : "todo");

  function refresh() {
    setEtaMin((m) => Math.max(5, m - 5));
  }

  const signInLink = (event?: React.MouseEvent<HTMLAnchorElement>) => {
    event?.preventDefault();
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/auth";
    }
  };

  const ACCEPT = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  const MAX_SIZE = 20 * 1024 * 1024;
  function formatSize(bytes?: number) {
    if (!bytes && bytes !== 0) return "—";
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(kb)} KB`;
  }
  function addFiles(list: FileList | File[] | null) {
    const arr = Array.from(list || []);
    let accepted: File[] = [];
    let ignored = 0;
    for (const f of arr) {
      if (!ACCEPT.includes(f.type) || f.size > MAX_SIZE) {
        ignored++;
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
    if (ignored > 0) setDropInfo(`${ignored} file(s) ignored (type or size not allowed)`);
    else setDropInfo(accepted.length ? `${accepted.length} file(s) added` : "");
  }
  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(e.target.files);
  }
  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDndActive(true);
  }
  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDndActive(false);
  }
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDndActive(false);
    addFiles(e.dataTransfer?.files);
  }
  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleItem(id: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  }
  function addItem() {
    const text = newItem.trim();
    if (!text) return;
    setItems((prev) => [...prev, { id: `item-${Date.now()}`, text, done: false }]);
    setNewItem("");
  }
  const allChecked = items.length === 0 || items.every((it) => it.done);
  const hasAttachmentOrNote = files.length > 0 || note.trim().length > 0;
  const canResubmit = status === "SendBack" && allChecked && hasAttachmentOrNote;

  async function resubmit() {
    setNotice("");
    if (!canResubmit) {
      setNotice("Please complete all required items and add a note or attach a file.");
      return;
    }
    setStatus("Resubmitted");
    setEtaMin(45);
  }

  function clearDraft() {
    setItems([]);
    setNote("");
    setFiles([]);
    setDropInfo("");
    setNotice("Draft cleared.");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <header className="border-b border-orange-100 bg-white dark:bg-slate-900/80 backdrop-blur shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="w-full h-16 px-[0.55%] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 shadow-sm grid place-items-center">
              <img src="/logo.jpe" alt={t("EVzone logo")} className="h-8 w-8 object-contain" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{t("Thanks, your EVzone onboarding is submitted")}</h1>
          </div>
          <Link to="/auth" onClick={signInLink} className="text-sm text-slate-600 hover:text-slate-900">
            {t("Sign in")}
          </Link>
        </div>
      </header>

      <main className="w-full px-[0.55%] py-8 space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="text-sm text-slate-500">{t("Role")}</div>
          <div className="text-lg font-bold text-slate-900">{mapRole(role)}</div>
          <div className="mt-1 text-sm text-slate-500">{t("Plan: ")}<span className="font-medium text-slate-800">{plan}</span></div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-3">{t("Approval status")}</h3>
          <ol className="relative ml-4">
            {steps.map((s, i) => (
              <StepRow key={s.key} state={stateOf(i)} first={i === 0} last={i === steps.length - 1} label={s.label} desc={s.desc} />
            ))}
          </ol>
        </section>

        {status === "SendBack" && (
          <section className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-orange-900">{t("Action required")}</h4>
                <p className="text-sm text-orange-800">{t("Please address the items below and resubmit. You can attach supporting documents and add a short note.")}</p>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full border border-orange-200 bg-white dark:bg-slate-900 text-orange-800">{t("SEND BACK")}</span>
            </div>

            {(adminReason || adminDocs.length > 0) && (
              <div className="rounded-xl border border-orange-200 bg-white dark:bg-slate-900 p-3">
                <div className="text-sm font-semibold text-orange-900">{t("Returned by admin")}</div>
                {adminReason && <p className="text-sm text-orange-800 mt-1">{adminReason}</p>}
                {adminDocs.length > 0 && (
                  <ul className="mt-2 text-sm list-disc pl-5 text-orange-900 space-y-1">
                    {adminDocs.map((d, i) => (
                      <li key={`${d.name}-${i}`}>
                        <a className="underline" href={d.url} target="_blank" rel="noreferrer">{d.name}</a>{" "}
                        <span className="text-orange-700 text-xs">({d.type || "file"})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="space-y-2">
              {items.length === 0 ? (
                <div className="text-sm text-orange-800">{t("No specific items provided. Add a note or attach a file, then resubmit.")}</div>
              ) : items.map((it) => (
                <label key={it.id} className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 mt-0.5" checked={it.done} onChange={() => toggleItem(it.id)} />
                  <span className="text-orange-900">{it.text}</span>
                </label>
              ))}
              <div className="flex items-center gap-2">
                <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder={t("Add another fix (optional)")} className="flex-1 rounded-lg border border-orange-300 bg-white dark:bg-slate-900 px-3 py-2 focus:ring-2 focus:ring-orange-300" />
                <button className="btn-secondary" onClick={addItem} type="button">{t("Add")}</button>
              </div>
            </div>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-orange-900">{t("Response note")}</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Add short context about the changes you made")} className="rounded-lg border border-orange-300 px-3 py-2 h-24 focus:ring-2 focus:ring-orange-300 bg-white dark:bg-slate-900" />
            </label>

            <div className="space-y-2">
              <div
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-xl border-2 border-dashed p-5 text-center transition ${dndActive ? 'border-orange-400 bg-orange-50' : 'border-orange-300 bg-white dark:bg-slate-900'}`}
              >
                <div className="text-sm font-medium text-orange-900">{t("Drag & drop files here")}</div>
                <div className="text-xs text-orange-700">{t("or")}</div>
                <div className="mt-2">
                  <label htmlFor="onb-file-input" className="btn-secondary cursor-pointer">{t("Choose files")}</label>
                  <input id="onb-file-input" type="file" multiple accept=".pdf,image/*" onChange={onPickFiles} className="hidden" />
                </div>
                <p className="mt-2 text-xs text-orange-700">{t("Accepted: PDF, JPG, PNG, WEBP • Max 20 MB each")}</p>
                {dropInfo && <div className="mt-2 text-xs text-orange-900">{dropInfo}</div>}
              </div>

              {files.length > 0 && (
                <ul className="text-sm border border-orange-200 bg-white dark:bg-slate-900 rounded-lg divide-y">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="px-3 py-2 flex items-center justify-between gap-2">
                      <span className="truncate max-w-[70%]">{f.name}</span>
                      <span className="text-xs text-orange-700">{formatSize(f.size)}</span>
                      <button className="text-xs text-orange-700 hover:underline" onClick={() => removeFile(i)}>{t("Remove")}</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {notice && <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">{notice}</div>}

            <div className="flex items-center justify-between">
              <button className="btn-secondary" type="button" onClick={clearDraft}>{t("Clear draft")}</button>
              <button onClick={resubmit} disabled={!canResubmit} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold shadow-sm ${canResubmit ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400'}`}>{t("Resubmit for review")}</button>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600">{t("Estimated time to approval: ")}<span className="font-semibold text-slate-800">~{etaMin} minutes</span></div>
            <div className="flex items-center gap-2">
              <button onClick={refresh} className="btn-secondary">{t("Refresh status")}</button>
              <Link className="btn-secondary" to="/contact/support">{t("Contact support")}</Link>
            </div>
          </div>
        </section>

        <p className="text-xs text-slate-400">{t("If you close this page, you can return any time — your status is saved on your account. We’ll also email you when this is approved or if more info is required.")}</p>
      </main>

      <footer className="border-t border-slate-200 py-6">
        <div className="w-full px-[0.55%] text-sm text-slate-500 flex items-center justify-between">
          <div>© {new Date().getFullYear()} EVzone. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link to="/auth" onClick={signInLink} className="hover:text-slate-900">
              {t("Back to Sign in")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepRow({ state, first, last, label, desc }: { state: string; first: boolean; last: boolean; label: string; desc: string }) {
  const { t } = useLocalization();
  const isDone = state === "done";
  const isActive = state === "active";
  return (
    <li className={cx("relative pl-8 py-4 rounded-xl transition", isActive ? "bg-emerald-50/50 ring-1 ring-emerald-200" : "")}>
      {!first && (
        <span aria-hidden className={`absolute left-3 top-0 h-1/2 w-px ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`} />
      )}
      {!last && (
        <span aria-hidden className={`absolute left-3 bottom-0 h-1/2 w-px ${isDone || isActive ? 'bg-emerald-300' : 'border-l border-dashed border-slate-300'}`} />
      )}
      <span className={cx("absolute left-1.5 top-4 grid place-items-center h-5 w-5 rounded-full border",
        isDone ? "bg-emerald-500 border-emerald-500 text-white" :
          isActive ? "bg-white dark:bg-slate-900 border-emerald-400 ring-4 ring-emerald-100 text-emerald-600" :
            "bg-slate-100 border-slate-300 text-slate-500"
      )}>
        {isDone ? <IconCheck /> : isActive ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />}
      </span>
      <div className={cx("text-sm font-medium", isActive ? "text-emerald-800" : "text-slate-900")}>{label} {isActive && <Badge>{t("CURRENT")}</Badge>}</div>
      <div className={cx("text-xs", isActive ? "text-emerald-700" : "text-slate-500")}>{desc}</div>
    </li>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="ml-2 align-middle text-[10px] px-1.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">{children}</span>;
}

function IconCheck() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 10l4 4 8-8" />
    </svg>
  );
}

const style = typeof document !== "undefined" ? document.createElement("style") : null;
if (style) {
  style.innerHTML = `
.btn-secondary{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:10px 16px;font-weight:600;font-size:0.875rem;gap:0.4rem;border:1px solid rgb(203,213,225);background:white;box-shadow:0 8px 20px rgba(15,23,42,0.04);transition:all 150ms ease-in-out;}
.btn-secondary:hover{background:rgb(248,250,252);border-color:rgb(148,163,184);box-shadow:0 10px 28px rgba(15,23,42,0.08);}
.btn-secondary:focus-visible{outline:2px solid rgb(249,115,22);outline-offset:2px;}
`;
  document.head.appendChild(style);
}
