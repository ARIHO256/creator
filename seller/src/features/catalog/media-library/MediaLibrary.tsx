import React, { useEffect, useMemo, useState } from "react";
import { useLocalization } from "../../../localization/LocalizationProvider";
import { sellerBackendApi } from "../../../lib/backendApi";

// Seller — Catalog — Media Library v1 (EVzone) — JS only (fixed)
// Route: /catalog/media-library
// Purpose: Asset manager (images/video) to reuse across listings/promos
// Design preserved from original TS version

export default function SellerCatalogMediaLibraryEVzoneV1_JS() {
  const brand = useMemo(() => ({ green: '#03CD8C', orange: '#F77F00', grey: '#A6A6A6', greyLight: '#F2F2F2', black: '#111827' }), []);
  const { t, language, setLanguage, languageOptions } = useLocalization();

  const mapAsset = (row: any) => ({
    id: String(row.id),
    url: String(row.url || ""),
    type: String(row.kind || row.type || "image"),
    tags: Array.isArray(row.metadata?.tags) ? row.metadata.tags : [],
    usage: Number(row.metadata?.usage || 0),
    title: String(row.metadata?.title || row.name || ""),
  });
  const [rows, setRows] = useState<any[]>([]);
  const [backendError, setBackendError] = useState('');
  useEffect(() => {
    let active = true;
    void sellerBackendApi
      .getMediaAssets()
      .then((payload) => {
        if (!active) return;
        setBackendError('');
        setRows(Array.isArray(payload) ? payload.map(mapAsset) : []);
      })
      .catch((error) => {
        if (!active) return;
        setBackendError(error instanceof Error ? error.message : 'Failed to load media assets');
      });
    return () => {
      active = false;
    };
  }, []);

  const [q, setQ] = useState(''); const [ft, setFt] = useState('All'); // 'All'|'image'|'video'
  const [toast, setToast] = useState(''); const toastIt = (t) => { setToast(t); setTimeout(() => setToast(''), 1300); };

  const filtered = useMemo(() => rows.filter(r => (ft === 'All' || r.type === ft) && (!q.trim() || `${r.id} ${r.title || ''} ${(r.tags || []).join(' ')}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, ft]);

  const addAsset = async (url, type, tags, title) => {
    let created;
    try {
      created = await sellerBackendApi.createMediaAsset({
        name: title || url,
        kind: type,
        url,
        visibility: "PUBLIC",
        metadata: {
          tags: String(tags || '').split(',').map((x) => x.trim()).filter(Boolean),
          usage: 0,
          title: title || ''
        }
      });
    } catch {
      toastIt(t('Failed'));
      return;
    }
    setRows((list) => [mapAsset(created), ...list]);
    toastIt(t('Added'));
  };
  const remove = async (id) => {
    let result;
    try {
      result = await sellerBackendApi.deleteMediaAsset(id);
    } catch {
      toastIt(t('Failed'));
      return;
    }
    if (!result?.deleted) return;
    setRows((list) => list.filter((x) => x.id !== id));
  };
  const bumpUsage = async (id) => {
    const current = rows.find((entry) => entry.id === id);
    if (!current) return;
    const nextUsage = Number(current.usage || 0) + 1;
    let updated = null;
    try {
      updated = await sellerBackendApi.patchMediaAsset(id, {
        name: current.title || current.id,
        kind: current.type,
        url: current.url,
        metadata: {
          tags: current.tags || [],
          usage: nextUsage,
          title: current.title || ""
        }
      });
    } catch {
      toastIt(t('Failed'));
    }
    setRows((list) =>
      updated
        ? list.map((asset) => asset.id === id ? { ...asset, usage: nextUsage } : asset)
        : list
    );
  };

  const exportJSON = () => { try { const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'media_library.json'; a.click(); } catch { } };
  const importJSON = (file) => { if (!file) return; const r = new FileReader(); r.onload = () => { try { const arr = JSON.parse(String(r.result || '[]')); setRows(Array.isArray(arr) ? arr : rows); toastIt(t('Imported')); } catch { toastIt(t('Invalid JSON')); } }; r.readAsText(file); };

  // --- Render ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <style>{`:root{ --ev-green:${brand.green}; --ev-orange:${brand.orange}; --ev-grey:${brand.grey}; --ev-grey-light:${brand.greyLight}; } .btn-primary{ background:var(--ev-orange); color:#fff; border-radius:12px; padding:12px 14px; font-weight:800; min-height:44px;} @media (min-width:640px){ .btn-primary{ padding:10px 14px; min-height:auto; } } .btn-ghost{ background:var(--surface-1); border:1px solid #e5e7eb; border-radius:12px; padding:10px 14px; font-weight:700; min-height:44px;} @media (min-width:640px){ .btn-ghost{ min-height:auto; } } .chip{ border-radius:9999px; padding:2px 8px; font-weight:800; font-size:11px; } .input{ border:1px solid #e5e7eb; border-radius:10px; padding:12px 10px; min-height:44px;} @media (min-width:640px){ .input{ padding:8px 10px; min-height:auto; } }`}</style>

      <header className="sticky top-0 z-20 border-b bg-white dark:bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-white dark:bg-slate-900/60"><div className="w-full max-w-none px-[0.55%] py-3 flex flex-col gap-3 sm:flex-row sm:items-center"><div className="text-sm"><div className="font-extrabold" style={{ color: 'var(--ev-ink)' }}>{t('Media Library')}</div><div className="text-xs text-gray-500">{t('Manage reusable images & video')}</div></div><div className="ml-auto inline-flex items-center gap-2">
        <select value={language} onChange={e => setLanguage(e.target.value)} className="rounded-lg border border-gray-200 dark:border-slate-800 px-2 py-1 text-sm bg-white dark:bg-slate-900 cursor-pointer">
          {languageOptions.map((option) => (
            <option key={option.code} value={option.code}>{option.label}</option>
          ))}
        </select>
        <button onClick={exportJSON} className="btn-ghost">{t('Export')}</button><label className="btn-ghost"><input type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) importJSON(f); }} />{t('Import')}</label></div></div></header>

      <main className="w-full max-w-none px-[0.55%] py-6">
        {backendError ? <div className="mb-3 text-xs text-amber-600">{backendError}</div> : null}
        {/* Add asset */}
        <section>
          <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div className="text-sm font-bold">{t('Add Asset')}</div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4 text-sm">
              <div className="sm:col-span-2"><div className="text-xs text-gray-600">{t('URL')}</div><input id="assetUrl" placeholder={t("https://…")} className="input w-full" /></div>
              <div><div className="text-xs text-gray-600">{t('Type')}</div><select id="assetType" className="input w-full"><option value="image">{t('image')}</option><option value="video">{t('video')}</option></select></div>
              <div><div className="text-xs text-gray-600">{t('Tags (comma)')}</div><input id="assetTags" placeholder={t("hero,ev")} className="input w-full" /></div>
              <div className="sm:col-span-4"><div className="text-xs text-gray-600">{t('Title (optional)')}</div><input id="assetTitle" placeholder={t("Wallbox hero")} className="input w-full" /></div>
              <div className="sm:col-span-4 text-right">
                <button
                  onClick={() => {
                    const urlEl = document.getElementById("assetUrl") as HTMLInputElement | null;
                    const typeEl = document.getElementById("assetType") as HTMLSelectElement | null;
                    const tagsEl = document.getElementById("assetTags") as HTMLInputElement | null;
                    const titleEl = document.getElementById("assetTitle") as HTMLInputElement | null;
                    const u = urlEl?.value || "";
                    const tType = typeEl?.value || "image";
                    const g = tagsEl?.value || "";
                    const title = titleEl?.value || "";
                    if (!u) return;
                    addAsset(u, tType, g, title);
                    if (urlEl) urlEl.value = "";
                    if (tagsEl) tagsEl.value = "";
                    if (titleEl) titleEl.value = "";
                  }}
                  className="btn-primary"
                >
                  {t("Add")}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section>
          <div className="mt-4 flex flex-wrap items-center gap-2"><input value={q} onChange={e => setQ(e.target.value)} placeholder={t('Search by id/title/tag…')} className="input" />{['All', 'image', 'video'].map(ftItem => (<button key={ftItem} onClick={() => setFt(ftItem)} className={`chip ${ft === ftItem ? 'bg-[var(--ev-green)] text-white' : 'bg-[#f2f2f2] text-[#111827]'}`}>{t(ftItem)}</button>))}</div>
        </section>

        {/* Grid */}
        <section>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(a => (
              <article key={a.id} className="rounded-2xl border border-gray-100 dark:border-slate-800 p-3 shadow-sm">
                <div className="text-sm font-bold">{a.title || a.id}</div>
                <div className="mt-1 text-xs text-gray-600">{a.type} • {t('Tags')}: {(a.tags || []).join(', ') || '—'} • {t('Usage')}: {a.usage || 0}</div>
                <div className="mt-2 rounded-lg border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-2">
                  {a.type === 'image' ? <img src={a.url} alt={a.title || a.id} className="max-h-40 w-full object-contain" /> : <video src={a.url} controls className="max-h-40 w-full" />}
                </div>
                <div className="mt-2 inline-flex items-center gap-2 text-sm"><button onClick={() => { try { navigator.clipboard && navigator.clipboard.writeText(a.url); toastIt(t('URL copied')); } catch { toastIt(t('Copy failed')); } }} className="btn-ghost">{t('Copy URL')}</button><button onClick={() => remove(a.id)} className="btn-ghost">{t('Delete')}</button><button onClick={() => bumpUsage(a.id)} className="btn-ghost">{t('+ Usage')}</button></div>
              </article>
            ))}
            {filtered.length === 0 && (<div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-gray-500">{t('No assets match.')}</div>)}
          </div>
        </section>
      </main>

      {toast && (<div className="fixed bottom-4 left-0 right-0 z-40 text-center"><span className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 text-sm font-semibold"><span className="inline-block h-2 w-2 rounded-full" style={{ background: brand.green }} /> {toast}</span></div>)}
    </div>
  );
}
