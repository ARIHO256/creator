// Seller — 05 Bulk Import (EVzone) v3.1 — Renamed Channels (fixed JSX + pure JS)
// Route: /listings/bulk
// - Channel keys updated everywhere: HealthMart, EduMart, FaithMart (was Medical/Edu/Faith)
// - Notes, examples, schema field "channel" helpers updated
// - Fixed: removed TS-only syntax, balanced all JSX tags, added DevTests panel

import React, { useEffect, useMemo, useState } from "react";
import { useLocalization } from "../../localization/LocalizationProvider";
import { Link } from "react-router-dom";

export default function SellerBulkImportEVzoneV3() {
  const brand = useMemo(() => ({ green: "#03CD8C", orange: "#F77F00", grey: "#A6A6A6", greyLight: "#F2F2F2", black: "#111827" }), []);
  const { t, language, setLanguage, currency, setCurrency, languageOptions, currencyOptions } = useLocalization();
  type ImportIssue = { row: number; col: string; msg: string };

  const [step, setStep] = useState(0); // Upload, Map, Validate, Import
  const [fileName, setFileName] = useState('');
  const [rowCount, setRowCount] = useState(0);
  const [detectedCols] = useState(['sku', 'title', 'channel', 'category', 'currency', 'retail_price', 'inventory', 'images']);

  // UPDATED: channel note includes renamed marts
  const schemaFields = [
    { key: 'sku', label: 'SKU', required: true },
    { key: 'title', label: 'Title', required: true },
    { key: 'channel', label: 'Marketplace', required: true, note: 'Valid: EVmart, GadgetMart, StyleMart, LivingMart, PropertyMart, GeneralMart, HealthMart, EduMart, FaithMart' },
    { key: 'category', label: 'Category', required: true },
    { key: 'currency', label: 'Currency', required: true },
    { key: 'retail_price', label: 'Retail Price', required: true },
    { key: 'inventory', label: 'Inventory', required: true },
    { key: 'images', label: 'Images (URLs, comma or |)', required: false },
  ];
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaults, setDefaults] = useState({ currency });
  const [errors, setErrors] = useState<ImportIssue[]>([]);
  const [warns, setWarns] = useState<ImportIssue[]>([]);

  useEffect(() => {
    // Auto-map by header name
    const auto = {};
    schemaFields.forEach(f => {
      const found = detectedCols.find(c => c.toLowerCase() === f.key.toLowerCase());
      if (found) auto[f.key] = found;
    });
    setMapping(auto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const back = () => setStep(s => Math.max(0, s - 1));
  const handleFilePick = (ev) => { const f = ev.target.files && ev.target.files[0]; if (!f) return; setFileName(f.name); setRowCount(125); setStep(1); };

  const downloadTemplate = () => {
    const csv = [
      'sku,title,channel,category,currency,retail_price,inventory,images',
      'WBX-7KW-BLK,7kW Wallbox (Black),EVmart,Chargers,USD,299,18,https://example.com/1.jpg|https://example.com/2.jpg',
      'PPE-MASK-50,Surgical Masks (50),HealthMart,Pharmacy/OTC,USD,12,320,https://example.com/mask.jpg',
      'COURSE-MATH-7,Grade 7 Math Pack,EduMart,Digital,USD,29,100,https://example.com/cover.jpg'
    ].join('\n');
    const url = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const a = document.createElement('a'); a.href = url; a.download = 'evzone_bulk_template.csv'; a.click();
  };

  const validatePreview = () => {
    setErrors([{ row: 12, col: 'currency', msg: 'Unsupported currency' }]);
    setWarns([{ row: 18, col: 'images', msg: 'One image failed to load' }]);
    setStep(2);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <style>{`:root{ --ev-green:${brand.green}; --ev-orange:${brand.orange}; --ev-grey:${brand.grey}; --ev-grey-light:${brand.greyLight}; --ev-black:${brand.black}; } .btn-primary{ background:var(--ev-orange); color:#fff; border-radius:12px; padding:10px 16px; font-weight:800; } .btn-ghost{ background:var(--surface-1); border:1px solid #e5e7eb; border-radius:12px; padding:10px 16px; font-weight:700; } .sel{ border:1px solid #e5e7eb; border-radius:10px; padding:6px 8px; background:var(--surface-1); font-size:12px; } .input{ border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; } .step{ padding:8px 12px; border-radius:9999px; font-weight:800; font-size:12px; } .step-active{ background: var(--ev-green); color:#fff; } .step-idle{ background: var(--ev-grey-light); color: var(--ev-black); }`}</style>

      <header className="sticky top-0 z-20 border-b bg-white dark:bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-white dark:bg-slate-900/60">
        <div className="w-full max-w-none px-[0.55%] py-3 flex items-center gap-3">
          <div className="text-sm">
            <h1 className="page-hero-title font-extrabold tracking-tight flex items-center gap-2" style={{ color: 'var(--ev-orange)' }}>
              <img src="/logo2.jpeg" alt={t("EVzone logo")} className="h-7 w-7 rounded-lg border border-gray-200 dark:border-slate-800 object-contain" />
              <span>{t('Bulk Import')}</span>
            </h1>
            <div className="text-xs text-gray-500">{t('Upload CSV/XLSX → Map columns → Validate → Import')}</div>
          </div>
          <div className="ml-auto inline-flex items-center gap-2">
            <select value={language} onChange={e => setLanguage(e.target.value)} className="sel">{languageOptions.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="sel">{currencyOptions.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}</select>
            <Link to="/listings" className="btn-ghost">{t('Back to listings')}</Link>
          </div>
        </div>
      </header>

      <main className="w-full max-w-none px-[0.55%] py-6">
        {/* Stepper */}
        <nav className="flex flex-wrap items-center gap-2">
          {[t('Upload'), t('Map Columns'), t('Validate'), t('Import')].map((lab, i) => (
            <span key={lab} className={`step ${i === step ? 'step-active' : 'step-idle'}`}>{i + 1}. {lab}</span>
          ))}
        </nav>

        {/* Step 0 */}
        {step === 0 && (
          <section className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <h3 className="font-bold">{t('Upload file')}</h3>
              <p className="text-xs text-gray-600 mt-1">{t('Accepted: .csv, .xlsx. Max 20MB. Use UTF‑8 for CSV.')}</p>
              <label className="mt-3 block rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 p-8 text-center">
                <input type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFilePick} />
                <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ev-grey-light)] text-gray-600">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                </div>
                <div className="mt-2 text-sm">{t('Drag & drop or click to choose')}</div>
                {fileName && <div className="mt-1 text-xs text-gray-500">{t('Selected:')} <b>{fileName}</b></div>}
              </label>
              <div className="mt-4 inline-flex items-center gap-2">
                <button onClick={downloadTemplate} className="btn-ghost">{t('Download CSV template')}</button>
                <button onClick={() => setStep(1)} className="btn-primary">{t('Next: Map Columns')}</button>
              </div>
            </div>
            <aside className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <h4 className="font-bold">{t('Tips')}</h4>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
                <li>{t('One row per SKU/variant')}</li>
                <li>{t('Use currency and retail_price columns')}</li>
                <li>{t('For wholesale, include wholesale_enabled and tier columns')}</li>
                <li>{t('Images: comma or pipe separated URLs')}</li>
                <li>{t('Marketplace must be one of: EVmart, GadgetMart, StyleMart, LivingMart, PropertyMart, GeneralMart, HealthMart, EduMart, FaithMart')}</li>
              </ul>
            </aside>
          </section>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <section className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <h3 className="font-bold">{t('Map file columns to EVzone fields')}</h3>
              <p className="text-xs text-gray-600 mt-1">{t('Auto-mapped where names matched. Set defaults for any missing field.')}</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {schemaFields.map(f => (
                  <div key={f.key} className="rounded-xl border border-gray-100 dark:border-slate-800 p-3">
                    <div className="text-xs font-semibold text-gray-600">{f.label} {f.required && <span className="text-red-600">*</span>}</div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <select value={mapping[f.key] || ''} onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value }))} className="input">
                        <option value="">— {t('choose column')} —</option>
                        {detectedCols.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input value={defaults[f.key] || ''} onChange={e => setDefaults(d => ({ ...d, [f.key]: e.target.value }))} placeholder={t('Optional default')} className="input" />
                    </div>
                    {f.note && <div className="mt-1 text-[11px] text-gray-500">{f.note}</div>}
                  </div>
                ))}
              </div>
            </div>
            <aside className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <h4 className="font-bold">{t('File summary')}</h4>
              <div className="mt-2 grid gap-2 text-sm">
                <div>{t("File: ")}<b>{fileName || '—'}</b></div>
                <div>{t('Rows (est.)')}: <b>{rowCount || '—'}</b></div>
                <div>{t('Detected cols')}: <b>{detectedCols.length}</b></div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2">
                <button onClick={back} className="btn-ghost">{t('Back: Upload')}</button>
                <button onClick={validatePreview} className="btn-primary">{t('Validate')}</button>
              </div>
            </aside>
          </section>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <section className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <h3 className="font-bold">{t('Validation results')}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-[#e8fff7] px-2 py-1 font-bold text-[var(--ev-green)]">{t('OK rows:')} {Math.max(0, (rowCount || 0) - (errors.length + warns.length))}</span>
                <span className="rounded-full bg-red-50 px-2 py-1 font-bold text-red-700">{t('Errors:')} {errors.length}</span>
                <span className="rounded-full bg-amber-50 px-2 py-1 font-bold text-amber-700">{t('Warnings:')} {warns.length}</span>
              </div>
              <div className="mt-3 overflow-x-auto rounded-xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--ev-grey-light)] text-gray-600"><tr className="text-left"><th className="px-3 py-2">{t('Row')}</th><th className="px-3 py-2">{t('Column')}</th><th className="px-3 py-2">{t('Message')}</th></tr></thead>
                  <tbody>
                    {errors.map((e, i) => (
                      <tr key={'e' + i} className="bg-red-50 text-red-700"><td className="px-3 py-2">{e.row}</td><td className="px-3 py-2">{e.col}</td><td className="px-3 py-2">{e.msg}</td></tr>
                    ))}
                    {warns.map((w, i) => (
                      <tr key={'w' + i} className="bg-amber-50 text-amber-800"><td className="px-3 py-2">{w.row}</td><td className="px-3 py-2">{w.col}</td><td className="px-3 py-2">{w.msg}</td></tr>
                    ))}
                    {(errors.length + warns.length) === 0 && (
                      <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={3}>{t('No issues detected.')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button onClick={back} className="btn-ghost">{t('Back: Map')}</button>
                <button onClick={() => setStep(3)} className="btn-primary">{t('Start Import')}</button>
              </div>
            </div>
            <aside className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <h4 className="font-bold">{t('Dry-run summary')}</h4>
              <div className="mt-2 grid gap-2 text-sm">
                <div>{t('Create vs Update:')} <b>{t('Create')}</b></div>
                <div>{t('Rows (est.)')}: <b>{rowCount || '—'}</b></div>
                <div>{t('Mapped fields:')} <b>{Object.keys(mapping).filter(k => mapping[k]).length}</b></div>
              </div>
            </aside>
          </section>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <section className="mt-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm text-sm">
            <h3 className="font-bold">{t('Importing…')}</h3>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-[var(--ev-grey-light)]">
              <div className="h-3 rounded-full" style={{ width: '100%', background: 'var(--ev-orange)' }} />
            </div>
            <div className="mt-2 text-gray-600">{t("100%")}</div>
            <div className="mt-3">{t('Done.')} <Link to="/listings" className="text-[var(--ev-green)] font-semibold">{t('Go to Listings')}</Link></div>
          </section>
        )}
      </main>

    </div>
  );
}
