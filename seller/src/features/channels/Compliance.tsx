import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalization } from "../../localization/LocalizationProvider";
import { useRolePageContent } from "../../mock/shared/pageContent";
import type { ComplianceDoc, ComplianceDocStatus, ComplianceQueueItem } from "../../mock/shared/types";

// Seller — Compliance Center (EVzone) v2 — JS only
// Route: /compliance

export default function SellerComplianceCenterEVzoneV2() {
  const { t, language, setLanguage, languageOptions } = useLocalization();
  const { role, content } = useRolePageContent("compliance");
  const isProvider = role === "provider";
  const { primaryChannel, defaultDocType, heroSubtitle, channelOptions, autoRules, autoDefault } = content;
  const brand = useMemo(() => ({ green: '#03CD8C', orange: '#F77F00', grey: '#A6A6A6', greyLight: '#F2F2F2', black: '#111827' }), []);
  type HeadingWithIconProps = {
    as?: React.ElementType;
    children: React.ReactNode;
    className?: string;
    withIcon?: boolean;
  } & React.HTMLAttributes<HTMLElement>;

  const HeadingWithIcon = ({ as: Tag = "div", children, className = "", withIcon = false, ...rest }: HeadingWithIconProps) => (
    <Tag className={`flex items-center gap-2 ${className}`} {...rest}>
      {withIcon && <img src="/logo2.jpeg" alt="" className="h-6 w-6 flex-shrink-0 object-contain" />}
      <span>{children}</span>
    </Tag>
  );

  // const LANGS removed, use languageOptions
  // const [lang,setLang] removed, use useLocalization

  const REGIONS = ["UG", "KE", "TZ", "RW", "NG", "ZA", "CN", "AE", "GB", "US"];

  const DOC_STATUSES = ["Approved", "ExpiringSoon", "Missing", "Expired", "Rejected", "Submitted"] as const;
  type DocStatus = ComplianceDocStatus;
  const isDocStatus = (value: string): value is DocStatus =>
    DOC_STATUSES.includes(value as DocStatus);

  // ---- Seeds & persistence ----
  const DOCS_KEY = isProvider ? "provider_compliance_docs_v2" : "seller_compliance_docs_v2";
  const Q_KEY = isProvider ? "provider_compliance_missing_v2" : "seller_compliance_missing_v2";
  const loadDocs = (): ComplianceDoc[] => {
    try {
      const s = localStorage.getItem(DOCS_KEY);
      if (s) return JSON.parse(s) as ComplianceDoc[];
    } catch {
      // ignore
    }
    return content.docs;
  };
  const loadQueue = (): ComplianceQueueItem[] => {
    try {
      const s = localStorage.getItem(Q_KEY);
      if (s) return JSON.parse(s) as ComplianceQueueItem[];
    } catch {
      // ignore
    }
    return content.queue;
  };

  const [docs, setDocs] = useState<ComplianceDoc[]>(loadDocs());
  const [queue, _setQueue] = useState<ComplianceQueueItem[]>(loadQueue());
  useEffect(() => {
    setDocs(loadDocs());
    _setQueue(loadQueue());
  }, [DOCS_KEY, Q_KEY, role]);
  useEffect(() => { try { localStorage.setItem(DOCS_KEY, JSON.stringify(docs)); } catch { } }, [docs]);
  useEffect(() => { try { localStorage.setItem(Q_KEY, JSON.stringify(queue)); } catch { } }, [queue]);

  // ---- Helpers ----
  const today = () => new Date().toISOString().slice(0, 10);
  const inDays = (iso?: string) => { if (!iso) return Infinity; const ms = new Date(iso).getTime() - Date.now(); return Math.floor(ms / 86400000); };

  const computeStatus = useCallback((d: ComplianceDoc) => {
    if (!d.fileName) return 'Missing';
    const days = inDays(d.expiresAt);
    if (days < 0) return 'Expired';
    if (days <= 45) return 'ExpiringSoon';
    return d.status === 'Rejected' ? 'Rejected' : (d.status === 'Submitted' ? 'Submitted' : 'Approved');
  }, []);

  const score = useMemo(() => {
    const total = docs.filter((d) => d.channel === primaryChannel).length || 1;
    const ok = docs.filter((d) => d.channel === primaryChannel && ["Approved", "ExpiringSoon"].includes(computeStatus(d))).length;
    return Math.round((ok / total) * 100);
  }, [docs, computeStatus, primaryChannel]);
  const metrics = useMemo(
    () => [
      { label: t("Compliance coverage"), value: `${score}%` },
      { label: t(`${primaryChannel} documents`), value: docs.filter((d) => d.channel === primaryChannel).length },
      { label: t("Queue size"), value: queue.length },
    ],
    [docs.length, queue.length, score, t, primaryChannel]
  );

  // ---- Auto-requirements engine (simple rules) ----
  const autoRequired = (channel: string, path: string) => {
    if (channel !== primaryChannel) return [];
    const p = (path || "").toLowerCase();
    const rule = autoRules.find((r) => p.includes(r.match.toLowerCase()));
    return rule?.required ?? autoDefault;
  };
  const docsHas = (docType: string) =>
    docs.some(
      (d) => t(d.type) === t(docType) && ['Approved', 'Submitted', 'ExpiringSoon'].includes(computeStatus(d))
    );

  // ---- UI state ----
  const [tab, setTab] = useState('Overview'); // 'Overview'|'Documents'|'Missing'|'Reminders'
  const [filterStatus, setFilterStatus] = useState('All'); // DocStatus | 'All'
  const [filterType, setFilterType] = useState('All');
  const [q, setQ] = useState('');

  // ---- Add/Edit document drawer ----
  const [openDoc, setOpenDoc] = useState<ComplianceDoc | null>(null); // doc or null
  const fileRef = useRef<HTMLInputElement | null>(null);
  const updateOpenDoc = (updater: (doc: ComplianceDoc) => ComplianceDoc) =>
    setOpenDoc((doc) => (doc ? updater(doc) : doc));
  const saveDoc = () => {
    if (!openDoc) return;
    const d = openDoc;
    if (!d.type || !d.channel) return alert(t("Type & channel required"));
    setDocs(list => {
      const idx = list.findIndex(x => x.id === d.id);
      if (idx >= 0) {
        const n = [...list];
        n[idx] = d;
        return n;
      }
      return [d, ...list];
    });
    setOpenDoc(null);
  };
  const newDoc = (): ComplianceDoc => ({
    id: "DOC-" + (1000 + docs.length + 1),
    type: defaultDocType,
    channel: primaryChannel,
    regions: [],
    status: "Submitted",
    uploadedAt: today(),
  });

  // ---- Import/Export ----
  const importCSV = (f: File | null) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const text = String(r.result || "");
        const [head, ...lines] = text.trim().split(/\r?\n/);
        const cols = head.split(',');
        const get = (arr: string[], k: string) => arr[cols.indexOf(k)] || "";
        const out: ComplianceDoc[] = [];
        for (const ln of lines) {
          const parts = ln.split(',');
          const rawStatus = get(parts, "status");
          const status = isDocStatus(rawStatus) ? rawStatus : "Submitted";
          out.push({
            id: get(parts, "id") || ("DOC-" + (1000 + docs.length + out.length + 1)),
            type: get(parts, "type"),
            channel: get(parts, "channel"),
            regions: (get(parts, "regions") || "").split("|").filter(Boolean),
            fileName: get(parts, "fileName") || undefined,
            uploadedAt: get(parts, "uploadedAt") || undefined,
            expiresAt: get(parts, "expiresAt") || undefined,
            status,
            notes: get(parts, "notes") || undefined
          });
        }
        setDocs(list => [...out, ...list]);
      } catch {
        alert(t("Invalid CSV"));
      }
    };
    r.readAsText(f);
  };
  const exportCSV = () => {
    const header = ['id', 'type', 'channel', 'regions', 'fileName', 'uploadedAt', 'expiresAt', 'status', 'notes'];
    const data = docs.map(d => [
      d.id,
      d.type,
      d.channel,
      d.regions.join('|'),
      d.fileName || '',
      d.uploadedAt || '',
      d.expiresAt || '',
      computeStatus(d),
      d.notes || ''
    ]);
    const csv = header.join(',') + '\n' + data.map(r => r.join(',')).join('\n');
    const url = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const a = document.createElement('a');
    a.href = url;
    a.download = t("compliance_docs.csv");
    a.click();
  };
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(docs, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = t("compliance_docs.json");
    a.click();
  };

  // ---- Filtered lists ----
  const filteredDocs = useMemo(() => docs.filter(d => { if (filterStatus !== 'All' && computeStatus(d) !== filterStatus) return false; if (filterType !== 'All' && d.type !== filterType) return false; if (q.trim()) { const s = q.toLowerCase(); if (!(`${d.id} ${d.type} ${d.fileName || ''} ${d.channel}`.toLowerCase().includes(s))) return false; } return true; }), [docs, filterStatus, filterType, q, computeStatus]);

  // ---- Checklist drawer ----
  const [openChecklist, setOpenChecklist] = useState<ComplianceQueueItem | null>(null);
  const computedMissing = (row: ComplianceQueueItem) => {
    const auto = autoRequired(row.channel, row.path); const req = Array.from(new Set([...(row.required || []), ...auto])); const missing = req.filter(t => !docsHas(t)); return { required: req, missing };
  };

  // ---- Reminders ----
  const [remind, setRemind] = useState({ expiringSoon: true, missing: true, frequency: 'weekly' });
  const sendTestReminder = (kind) => {
    const label = kind === "expiringSoon" ? t("Expiring-Soon") : t("Missing documents");
    alert(t("Sent {kind} reminder (demo)").replace("{kind}", label));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <style>{`
        :root{ --ev-green:${brand.green}; --ev-orange:${brand.orange}; --ev-grey:${brand.grey}; --ev-grey-light:${brand.greyLight}; --ev-ink:${brand.black}; }
        .btn-primary{ background:var(--ev-orange); color:#fff; border-radius:12px; padding:10px 14px; font-weight:800; }
        .btn-ghost{ background:var(--surface-1); border:1px solid var(--border-color); color:var(--text-primary); border-radius:12px; padding:10px 14px; font-weight:700; }
        .chip{ border-radius:9999px; padding:2px 8px; font-weight:800; font-size:11px; }
        .card{ border:1px solid var(--border-color); border-radius:16px; background:var(--surface-1); color:var(--text-primary); box-shadow: 0 1px 2px rgba(0,0,0,.03); }
        .input{ border:1px solid var(--border-color); border-radius:10px; padding:8px 10px; background:var(--surface-1); color:var(--text-primary); }
        .hero-card{ border-radius:28px; border:1px solid var(--border-color); background:var(--surface-1); color:var(--text-primary); padding:32px; box-shadow:0 20px 60px -50px rgba(15,23,42,.25); }
        .hero-content{ display:flex; flex-direction:column; gap:16px; }
        @media (min-width:1024px){ .hero-content{ flex-direction:row; align-items:center; justify-content:space-between; } }
        .hero-actions{ display:flex; flex-wrap:wrap; gap:12px; }
        .hero-title{ font-size:24px; font-weight:900; color:var(--text-primary); margin:0; }
        .hero-sub{ font-size:13px; color:var(--text-secondary); }
        .hero-metrics{ margin-top:24px; display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; }
        .hero-metric{ border-radius:16px; border:1px solid var(--border-color); padding:16px; background:var(--surface-2); }
        .hero-metric span{ font-size:10px; text-transform:uppercase; letter-spacing:.3em; color:var(--text-secondary); }
        .hero-metric strong{ display:block; margin-top:4px; font-size:24px; color:var(--text-primary); }
      `}</style>

      <section className="w-full max-w-none px-3 sm:px-4 py-4">
        <div className="hero-card">
          <div className="hero-content">
            <div>
              <HeadingWithIcon as="h2" withIcon className="hero-title">{t("Compliance at a glance")}</HeadingWithIcon>
              <p className="hero-sub">{t(heroSubtitle)}</p>
            </div>
            <div className="hero-actions">
              <button onClick={() => setOpenDoc(newDoc())} className="btn-primary">{t("Add document")}</button>
              <button onClick={() => setRemind((r) => ({ ...r, expiringSoon: !r.expiringSoon }))} className="btn-ghost">
                {remind.expiringSoon ? t("Pause reminders") : t("Enable reminders")}
              </button>
            </div>
          </div>
          <div className="hero-metrics">
            {metrics.map((metric) => (
              <div key={metric.label} className="hero-metric">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <main className="w-full max-w-none px-[0.55%] py-6">
        <div className="flex flex-wrap items-center gap-2">
          {['Overview', 'Documents', 'Missing', 'Reminders'].map(tabName => (<button key={tabName} onClick={() => setTab(tabName)} className={`chip ${tab === tabName ? 'bg-[var(--ev-green)] text-white' : 'bg-[var(--ev-grey-light)] text-[var(--text-primary)]'}`}>{t(tabName)}</button>))}
          <div className="ml-auto relative"><input value={q} onChange={e => setQ(e.target.value)} placeholder={t("Search docs…")} className="input pl-9" /><span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-3.5-3.5" /></svg></span></div>
        </div>

        {/* Overview */}
        {tab === 'Overview' && (
          <section>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card p-4">
                <div className="text-xs text-gray-600">{t(`Compliance score (${primaryChannel})`)}</div>
                <div className="mt-1 text-2xl font-extrabold">{score}%</div>
                <div className="mt-1 h-2 w-full rounded bg-[var(--surface-2)]"><div className="h-2 rounded" style={{ width: `${score}%`, background: brand.green }} /></div>
              </div>
              <div className="card p-4"><div className="text-xs text-gray-600">{t("Expiring soon (≤45d)")}</div><div className="mt-1 text-2xl font-extrabold">{docs.filter(d => computeStatus(d) === 'ExpiringSoon').length}</div></div>
              <div className="card p-4"><div className="text-xs text-gray-600">{t("Expired")}</div><div className="mt-1 text-2xl font-extrabold">{docs.filter(d => computeStatus(d) === 'Expired').length}</div></div>
              <div className="card p-4"><div className="text-xs text-gray-600">{t("Missing")}</div><div className="mt-1 text-2xl font-extrabold">{docs.filter(d => computeStatus(d) === 'Missing').length}</div></div>
            </div>

            {/* Expiring soon list */}
            <div className="mt-4 card p-4">
              <div className="flex items-center justify-between"><h3 className="font-bold">{t("Expiring soon")}</h3><span className="text-xs text-gray-500">{t("next 45 days")}</span></div>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--surface-2)] text-[var(--text-secondary)]"><tr className="text-left"><th className="px-3 py-2">#</th><th className="px-3 py-2">{t("Type")}</th><th className="px-3 py-2">{t("File")}</th><th className="px-3 py-2">{t("Expires")}</th><th className="px-3 py-2">{t("In")}</th></tr></thead>
                  <tbody>
                    {docs.filter(d => computeStatus(d) === 'ExpiringSoon').sort((a, b) => inDays(a.expiresAt) - inDays(b.expiresAt)).map(d => (
                      <tr key={d.id} className="odd:bg-[var(--surface-1)] even:bg-[var(--surface-2)]">
                        <td className="px-3 py-2 font-mono text-xs">{d.id}</td>
                        <td className="px-3 py-2">{t(d.type)}</td>
                        <td className="px-3 py-2">{d.fileName || t("—")}</td>
                        <td className="px-3 py-2">{d.expiresAt || t("—")}</td>
                        <td className="px-3 py-2">{inDays(d.expiresAt)} {t("Days")}</td>
                      </tr>
                    ))}
                    {docs.filter(d => computeStatus(d) === 'ExpiringSoon').length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-gray-500">
                          {t("None")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Documents */}
        {tab === 'Documents' && (
          <section>
            <div className="mt-4 card p-4">
              <div className="flex items-center justify-between"><h3 className="font-bold">{t("Documents Vault")}</h3>
                <div className="inline-flex items-center gap-2 text-sm">
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input">
                    {['All', 'Approved', 'Submitted', 'ExpiringSoon', 'Expired', 'Missing', 'Rejected'].map(s => <option key={s} value={s}>{t(s)}</option>)}
                  </select>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input">
                    {['All', ...Array.from(new Set(docs.map(d => d.type)))].map((typeKey) => (
                      <option key={typeKey} value={typeKey}>{t(typeKey)}</option>
                    ))}
                  </select>
                  <label className="btn-ghost">
                    <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) importCSV(f); e.target.value = ''; }} />{t("Import CSV")}
                  </label>
                  <button onClick={() => setOpenDoc(newDoc())} className="btn-primary">{t("+ New")}</button>
                </div>
              </div>

              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--surface-2)] text-[var(--text-secondary)]"><tr className="text-left"><th className="px-3 py-2">#</th><th className="px-3 py-2">{t("Type")}</th><th className="px-3 py-2">{t("Channel")}</th><th className="px-3 py-2">{t("File")}</th><th className="px-3 py-2">{t("Uploaded")}</th><th className="px-3 py-2">{t("Expires")}</th><th className="px-3 py-2">{t("Status")}</th><th className="px-3 py-2">{t("Actions")}</th></tr></thead>
                  <tbody>
                    {filteredDocs.map(d => (
                      <tr key={d.id} className="odd:bg-[var(--surface-1)] even:bg-[var(--surface-2)]">
                        <td className="px-3 py-2 font-mono text-xs">{d.id}</td>
                        <td className="px-3 py-2">{t(d.type)}</td>
                        <td className="px-3 py-2">{t(d.channel)}</td>
                        <td className="px-3 py-2">{d.fileName || t("—")}</td>
                        <td className="px-3 py-2">{d.uploadedAt || t("—")}</td>
                        <td className="px-3 py-2">{d.expiresAt || t("—")}</td>
                        <td className="px-3 py-2">{t(computeStatus(d))}</td>
                        <td className="px-3 py-2 inline-flex items-center gap-2"><button className="btn-ghost" onClick={() => setOpenDoc({ ...d })}>{t("Open")}</button></td>
                      </tr>
                    ))}
                    {filteredDocs.length === 0 && (<tr><td colSpan={8} className="px-3 py-4 text-center text-gray-500">{t("No documents in this view.")}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Missing Queue */}
        {tab === 'Missing' && (
          <section>
            <div className="mt-4 card p-4">
              <div className="flex items-center justify-between"><h3 className="font-bold">{t("Missing-Documents Queue")}</h3><span className="text-xs text-gray-500">{t("Auto-requirements based on channel & taxonomy path")}</span></div>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--surface-2)] text-[var(--text-secondary)]"><tr className="text-left"><th className="px-3 py-2">{t("Listing")}</th><th className="px-3 py-2">{t("Channel")}</th><th className="px-3 py-2">{t("Path")}</th><th className="px-3 py-2">{t("Missing")}</th><th className="px-3 py-2">{t("Actions")}</th></tr></thead>
                  <tbody>
                    {queue.map(row => {
                      const cm = computedMissing(row);
                      return (
                        <tr key={row.listingId} className="odd:bg-[var(--surface-1)] even:bg-[var(--surface-2)]">
                          <td className="px-3 py-2 font-mono text-xs">
                            {row.listingId}
                            <div className="text-gray-600 not-italic">{t(row.title)}</div>
                          </td>
                          <td className="px-3 py-2">{t(row.channel)}</td>
                          <td className="px-3 py-2">{t(row.path)}</td>
                          <td className="px-3 py-2">{cm.missing.map((item) => t(item)).join(', ') || t("—")}</td>
                          <td className="px-3 py-2"><button className="btn-ghost" onClick={() => setOpenChecklist(row)}>{t("Checklist")}</button></td>
                        </tr>
                      );
                    })}
                    {queue.length === 0 && (<tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500">{t("Nothing missing 🎉")}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Reminders */}
        {tab === 'Reminders' && (
          <section>
            <div className="mt-4 card p-4">
              <div className="flex items-center justify-between"><h3 className="font-bold">{t("Reminders")}</h3><span className="text-xs text-gray-500">{t("Saved locally")}</span></div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!remind.expiringSoon} onChange={e => setRemind(r => ({ ...r, expiringSoon: e.target.checked }))} /> {t("Expiring-Soon")}</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!remind.missing} onChange={e => setRemind(r => ({ ...r, missing: e.target.checked }))} /> {t("Missing documents")}</label>
                <div><div className="text-xs text-gray-600">{t("Frequency")}</div><select value={remind.frequency} onChange={e => setRemind(r => ({ ...r, frequency: e.target.value }))} className="input w-full"><option value="weekly">{t("Weekly")}</option><option value="monthly">{t("Monthly")}</option><option value="off">{t("Off")}</option></select></div>
              </div>
              <div className="mt-2 inline-flex items-center gap-2 text-sm">
                <button className="btn-ghost" onClick={() => sendTestReminder('expiringSoon')}>{t("Send expiring-soon test")}</button>
                <button className="btn-ghost" onClick={() => sendTestReminder('missing')}>{t("Send missing test")}</button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Document Drawer */}
      {openDoc && (
        <section className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface-1)] p-4 text-[var(--text-primary)] shadow-xl">
            <div className="flex items-center justify-between"><h3 className="font-bold">{openDoc.id}</h3><button onClick={() => setOpenDoc(null)} className="btn-ghost">{t("Close")}</button></div>
            <div className="mt-3 grid grid-cols-1 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-600">{t("Type")}</div>
                <input value={t(openDoc.type || "")} onChange={e => updateOpenDoc(d => ({ ...d, type: e.target.value }))} className="input w-full" />
              </div>
              <div>
                <div className="text-xs text-gray-600">{t("Channel")}</div>
                <select value={openDoc.channel || primaryChannel} onChange={e => updateOpenDoc(d => ({ ...d, channel: e.target.value }))} className="input w-full">
                  {channelOptions.map((c) => (
                    <option key={c} value={c}>
                      {t(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div><div className="text-xs text-gray-600">{t("Regions")}</div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{REGIONS.map(r => (<label key={r} className="inline-flex items-center gap-2"><input type="checkbox" checked={!!(openDoc.regions || []).includes(r)} onChange={e => { const set = new Set(openDoc.regions || []); if (e.target.checked) set.add(r); else set.delete(r); updateOpenDoc(d => ({ ...d, regions: Array.from(set) })); }} /> {r}</label>))}</div></div>
              <div className="grid grid-cols-2 gap-2">
                <div><div className="text-xs text-gray-600">{t("Uploaded")}</div><input value={openDoc.uploadedAt || today()} onChange={e => updateOpenDoc(d => ({ ...d, uploadedAt: e.target.value }))} type="date" className="input w-full" /></div>
                <div><div className="text-xs text-gray-600">{t("Expires")}</div><input value={openDoc.expiresAt || ""} onChange={e => updateOpenDoc(d => ({ ...d, expiresAt: e.target.value }))} type="date" className="input w-full" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><div className="text-xs text-gray-600">{t("File")}</div><div className="inline-flex items-center gap-2"><input ref={fileRef} type="file" className="input" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) { updateOpenDoc(d => ({ ...d, fileName: f.name })); } }} /></div></div>
                <div><div className="text-xs text-gray-600">{t("Status")}</div><select value={openDoc.status || "Submitted"} onChange={e => { const next = e.target.value; updateOpenDoc(d => ({ ...d, status: isDocStatus(next) ? next : "Submitted" })); }} className="input w-full"><option value="Approved">{t("Approved")}</option><option value="Submitted">{t("Submitted")}</option><option value="Rejected">{t("Rejected")}</option></select></div>
              </div>
              <div><div className="text-xs text-gray-600">{t("Notes")}</div><input value={openDoc.notes || ""} onChange={e => updateOpenDoc(d => ({ ...d, notes: e.target.value }))} className="input w-full" /></div>
            </div>
            <div className="mt-4 text-right"><button className="btn-primary" onClick={saveDoc}>{t("Save")}</button></div>
          </div>
        </section>
      )}

      {/* Checklist Drawer */}
      {openChecklist && (
        <section className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface-1)] p-4 text-[var(--text-primary)] shadow-xl">
            <div className="flex items-center justify-between"><h3 className="font-bold">{t("Checklist")} — {openChecklist.listingId}</h3><button onClick={() => setOpenChecklist(null)} className="btn-ghost">{t("Close")}</button></div>
            <div className="mt-2 text-sm">{t(openChecklist.title)} • {t(openChecklist.channel)} • {t(openChecklist.path)}</div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-1)] p-3">
                <div className="text-sm font-bold">{t("Required")}</div>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {computedMissing(openChecklist).required.map((req, i) => (<li key={i}>{t(req)}</li>))}
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-1)] p-3">
                <div className="text-sm font-bold">{t("Missing")}</div>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {computedMissing(openChecklist).missing.map((item, i) => (<li key={i}>{t(item)}</li>))}
                  {computedMissing(openChecklist).missing.length === 0 && (<li>{t("None 🎉")}</li>)}
                </ul>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-600">{t("Attach documents in the Documents tab, then return to re-check this listing.")}</div>
            <div className="mt-3 text-right"><button className="btn-primary" onClick={() => setOpenChecklist(null)}>{t("Done")}</button></div>
          </div>
        </section>
      )}

      {/* Dev tests */}
    </div>
  );
}
