import React, { useEffect, useMemo, useState } from "react";
import { useLocalization } from "../../../localization/LocalizationProvider";
import { sellerBackendApi } from "../../../lib/backendApi";

export default function SellerCatalogTemplatesEVzoneV1_JS() {
  const brand = useMemo(() => ({ green: '#03CD8C', orange: '#F77F00', grey: '#A6A6A6', greyLight: '#F2F2F2', black: '#111827' }), []);
  const { t, language, setLanguage, languageOptions } = useLocalization();

  type TemplateAttr = { name: string; type: string; required: boolean; options: string };
  type Template = { id: string; name: string; category: string; notes?: string; attrs: TemplateAttr[] };
  const mapTemplate = (row: any): Template => ({
    id: String(row.id),
    name: String(row.name || ""),
    category: String(row.category || ""),
    notes: row.notes || "",
    attrs: Array.isArray(row.attrs)
      ? row.attrs
      : Array.isArray(row.attributes)
        ? row.attributes
        : Array.isArray(row.payload?.attrs)
          ? row.payload.attrs
          : [],
  });
  const [rows, setRows] = useState<Template[]>([]);
  const [backendError, setBackendError] = useState("");
  useEffect(() => {
    let active = true;
    void sellerBackendApi
      .getCatalogTemplates()
      .then((payload) => {
        if (!active) return;
        setBackendError("");
        setRows(Array.isArray(payload.templates) ? payload.templates.map(mapTemplate) : []);
      })
      .catch((error) => {
        if (!active) return;
        setBackendError(error instanceof Error ? error.message : "Failed to load templates");
      });
    return () => {
      active = false;
    };
  }, []);

  // --- UI state ---
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Template | null>(null); // template or null
  const [toast, setToast] = useState(''); const toastIt = (t) => { setToast(t); setTimeout(() => setToast(''), 1300); };

  const filtered = useMemo(() => rows.filter(r => !q.trim() || `${r.id} ${r.name} ${r.category}`.toLowerCase().includes(q.toLowerCase())), [rows, q]);

  // --- Actions ---
  const addTemplate = () => { const id = 'TMP-' + (1000 + rows.length + 1); setOpen({ id, name: '', category: '', notes: '', attrs: [] }); };
  const saveTemplate = async () => {
    if (!open) return;
    if (!open.name || !open.category) { toastIt(t('Name + category required')); return; }
    const payload = { name: open.name, category: open.category, notes: open.notes || "", kind: "ATTRIBUTE_SET", attrs: open.attrs };
    let saved;
    try {
      saved = rows.some((entry) => entry.id === open.id)
        ? await sellerBackendApi.patchCatalogTemplate(open.id, payload)
        : await sellerBackendApi.createCatalogTemplate(payload);
    } catch {
      toastIt(t('Failed'));
      return;
    }
    const next = mapTemplate(saved);
    setRows((list) => {
      const idx = list.findIndex((x) => x.id === open.id || x.id === next.id);
      if (idx >= 0) {
        const copy = [...list];
        copy[idx] = next;
        return copy;
      }
      return [next, ...list];
    });
    setOpen(null);
    toastIt(t('Saved'));
  };
  const delTemplate = async (id) => {
    let result;
    try {
      result = await sellerBackendApi.deleteCatalogTemplate(id);
    } catch {
      toastIt(t('Failed'));
      return;
    }
    if (!result?.deleted) { toastIt(t('Failed')); return; }
    setRows((list) => list.filter((x) => x.id !== id));
  };
  const dupTemplate = async (item) => {
    const copy = JSON.parse(JSON.stringify(item));
    copy.name = item.name + ' (Copy)';
    let created;
    try {
      created = await sellerBackendApi.createCatalogTemplate({
        name: copy.name,
        category: copy.category,
        notes: copy.notes || "",
        kind: "ATTRIBUTE_SET",
        attrs: copy.attrs || [],
      });
    } catch {
      toastIt(t('Failed'));
      return;
    }
    setRows((list) => [mapTemplate(created), ...list]);
  };
  const pushToWizard = async (item) => {
    try {
      await sellerBackendApi.patchUiState({ catalog: { wizardTemplate: item } });
      toastIt(t('Pushed to wizard'));
    } catch {
      toastIt(t('Failed'));
    }
  };

  // --- Attribute helpers ---
  const addAttr = () => setOpen(o => o ? { ...o, attrs: [...(o.attrs || []), { name: '', type: 'text', required: false, options: '' }] } : o);
  const setAttr = (i, patch) => setOpen(o => o ? { ...o, attrs: o.attrs.map((a, idx) => idx === i ? ({ ...a, ...patch }) : a) } : o);
  const remAttr = (i) => setOpen(o => o ? { ...o, attrs: o.attrs.filter((_, idx) => idx !== i) } : o);

  // --- Export / Import ---
  const exportJSON = () => { try { const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'templates.json'; a.click(); } catch { } };
  const importJSON = (file) => { if (!file) return; const r = new FileReader(); r.onload = () => { try { const arr = JSON.parse(String(r.result || '[]')); if (Array.isArray(arr)) setRows(arr); toastIt(t('Imported')); } catch { toastIt(t('Invalid JSON')); } }; r.readAsText(file); };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <style>{`:root{ --ev-green:${brand.green}; --ev-orange:${brand.orange}; --ev-grey:${brand.grey}; --ev-grey-light:${brand.greyLight}; } .btn-primary{ background:var(--ev-orange); color:#fff; border-radius:12px; padding:10px 14px; font-weight:800;} .btn-ghost{ background:var(--surface-1); border:1px solid #e5e7eb; border-radius:12px; padding:10px 14px; font-weight:700;} .chip{ border-radius:9999px; padding:2px 8px; font-weight:800; font-size:11px; } .input{ border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; } .card{ border:1px solid #f1f5f9; border-radius:16px; background:var(--surface-1); box-shadow:0 1px 2px rgba(0,0,0,.03); }`}</style>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-white dark:bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-white dark:bg-slate-900/60"><div className="w-full max-w-none px-[0.55%] py-3 flex items-center gap-3"><div className="text-sm"><div className="font-extrabold" style={{ color: 'var(--ev-ink)' }}>{t('Templates')}</div><div className="text-xs text-gray-500">{t('Attribute sets for fast listing')}</div></div><div className="ml-auto inline-flex items-center gap-2"><input value={q} onChange={e => setQ(e.target.value)} placeholder={t('Search templates…')} className="input" /><select value={language} onChange={e => setLanguage(e.target.value)} className="rounded-lg border border-gray-200 dark:border-slate-800 px-2 py-1 text-sm">{languageOptions.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select><button onClick={addTemplate} className="btn-primary">{t('+ New')}</button><button onClick={exportJSON} className="btn-ghost">{t('Export')}</button><label className="btn-ghost"><input type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) importJSON(f); }} />{t('Import')}</label></div></div></header>

      <main className="w-full max-w-none px-[0.55%] py-6">
        {backendError ? <div className="mb-3 text-xs text-amber-600">{backendError}</div> : null}
        {/* Grid */}
        <section>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(tItem => (
              <article key={tItem.id} className="card p-4">
                <div className="flex items-start justify-between"><div><div className="font-bold">{tItem.name}</div><div className="mt-1 text-xs text-gray-600">{tItem.category} • {t('Attributes')}: {tItem.attrs.length}</div>{tItem.notes && <div className="mt-1 text-xs text-gray-600">{tItem.notes}</div>}</div><span className="chip bg-[var(--ev-green)] text-white">{tItem.id}</span></div>
                <div className="mt-2 inline-flex items-center gap-2 text-sm"><button onClick={() => setOpen(JSON.parse(JSON.stringify(tItem)))} className="btn-ghost">{t('Open')}</button><button onClick={() => dupTemplate(tItem)} className="btn-ghost">{t('Duplicate')}</button><button onClick={() => delTemplate(tItem.id)} className="btn-ghost">{t('Delete')}</button><button onClick={() => pushToWizard(tItem)} className="btn-ghost">{t('Push to Wizard')}</button></div>
              </article>
            ))}
            {filtered.length === 0 && (<div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-gray-500">{t('No templates match.')}</div>)}
          </div>
        </section>
      </main>

      {/* Editor Drawer */}
      {open && (
        <section className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xl">
            <div className="flex items-center justify-between"><h3 className="font-bold">{open.id}</h3><button onClick={() => setOpen(null)} className="btn-ghost">{t('Close')}</button></div>
            <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div><div className="text-xs text-gray-600">{t('Name')}</div><input value={open.name} onChange={e => setOpen(o => o ? { ...o, name: e.target.value } : o)} className="input w-full" /></div>
              <div><div className="text-xs text-gray-600">{t('Category')}</div><input value={open.category} onChange={e => setOpen(o => o ? { ...o, category: e.target.value } : o)} className="input w-full" /></div>
              <div className="sm:col-span-2"><div className="text-xs text-gray-600">{t('Notes')}</div><input value={open.notes || ''} onChange={e => setOpen(o => o ? { ...o, notes: e.target.value } : o)} className="input w-full" /></div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between"><div className="text-sm font-bold">{t('Attributes')}</div><button onClick={addAttr} className="btn-ghost">{t('+ Add Attribute')}</button></div>
              <div className="mt-2 space-y-2">
                {(open.attrs || []).map((a, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-end gap-2">
                    <div className="col-span-4"><div className="text-xs text-gray-600">{t('Name')}</div><input value={a.name} onChange={e => setAttr(idx, { name: e.target.value })} className="input w-full" /></div>
                    <div className="col-span-3"><div className="text-xs text-gray-600">{t('Type')}</div><select value={a.type} onChange={e => setAttr(idx, { type: e.target.value })} className="input w-full"><option value="text">{t("text")}</option><option value="number">{t("number")}</option><option value="select">{t("select")}</option><option value="bool">{t("bool")}</option></select></div>
                    <div className="col-span-2"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!a.required} onChange={e => setAttr(idx, { required: e.target.checked })} /> {t('Required')}</label></div>
                    <div className="col-span-3"><div className="text-xs text-gray-600">{t('Options (select)')}</div><input value={a.options || ''} onChange={e => setAttr(idx, { options: e.target.value })} placeholder={t("A|B|C")} className="input w-full" /></div>
                    <div className="col-span-12 text-right"><button onClick={() => remAttr(idx)} className="btn-ghost">{t('Remove')}</button></div>
                  </div>
                ))}
                {(open.attrs || []).length === 0 && (<div className="rounded border border-dashed p-3 text-center text-gray-500">{t('No attributes yet.')}</div>)}
              </div>
            </div>
            <div className="mt-3 text-right inline-flex items-center gap-2"><button onClick={saveTemplate} className="btn-primary">{t('Save')}</button></div>
          </div>
        </section>
      )}

      {/* Toast */}
      {toast && (<div className="fixed bottom-4 left-0 right-0 z-40 text-center"><span className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 text-sm font-semibold"><span className="inline-block h-2 w-2 rounded-full" style={{ background: brand.green }} /> {toast}</span></div>)}
    </div>
  );
}
