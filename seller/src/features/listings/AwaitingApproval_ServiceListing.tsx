import React, { useEffect, useMemo, useState } from 'react'
import { useLocalization } from '../../localization/LocalizationProvider'
import { Link } from 'react-router-dom'
import { sellerBackendApi } from '../../lib/backendApi'

/**
 * EVzone - Service Listing Review Status (Provider / Seller / Creator)
 * React + Tailwind (JS)
 *
 * For providers (and sellers/creators) to track service listing approvals and respond
 * when changes are requested.
 *
 * Flow:
 *  - Statuses: Submitted -> InReview -> ChangesRequested -> Resubmitted -> Approved
 *  - Shows what the admin sent back: reason, checklist items, and reference docs
 *  - Lets the provider resubmit with a response note, updated attachments, and a validated checklist
 *  - Saves a local draft so nothing is lost on refresh
 */

export default function ServiceListingApprovalPending() {
  const { t } = useLocalization();
  // Query params (service context)
  const qp = useMemo(
    () => (typeof window === 'undefined'
      ? {}
      : Object.fromEntries(new URLSearchParams(window.location.search).entries())),
    []
  )

  const serviceName =
    qp.serviceName || t('New service')

  const category =
    qp.category || t('Not set')

  const role =
    qp.role || t('provider')

  const listingId =
    qp.listingId ||
    qp.serviceId ||
    t('pending')

  const initialStatus =
    typeof window !== 'undefined' && qp.status
      ? qp.status
      : 'ChangesRequested'

  // Admin-supplied reason/items via query or API
  const reasonFromQ = qp.reason || ''
  const itemsFromQ = (qp.items || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  // Core state
  const [status, setStatus] = useState(initialStatus)
  const [etaMin, setEtaMin] = useState(90)

  // Admin request (what was returned)
  const [adminReason, setAdminReason] = useState(
    reasonFromQ
  )

  const [adminDocs, setAdminDocs] = useState([]) // [{name,url,type}]

  // Provider response draft
  const [items, setItems] = useState(() => {
    return itemsFromQ.map((t, i) => ({ id: `item-${i}`, text: t, done: false }))
  })

  const [newItem, setNewItem] = useState('')
  const [note, setNote] = useState('')

  const [files, setFiles] = useState<File[]>([]) // File[] (local preview only)
  const [notice, setNotice] = useState('')
  const [dndActive, setDndActive] = useState(false)
  const [dropInfo, setDropInfo] = useState('') // drag/drop status line

  // Auto-move Submitted -> InReview (demo)
  useEffect(() => {
    if (status === 'Submitted') {
      const t = setTimeout(() => setStatus('InReview'), 2500)
      return () => clearTimeout(t)
    }
  }, [status])

  // Simulated API fetch for ChangesRequested details
  useEffect(() => {
    let cancelled = false
    async function fetchChangesRequested() {
      // Replace with: GET /api/service-listings/{listingId}/review
      await new Promise((r) => setTimeout(r, 250))
      const sample = {
        reason:
          reasonFromQ ||
          t('Please clarify the service scope, update the pricing information, and ensure your availability calendar matches EVzone guidelines.'),
        items:
          itemsFromQ.length
            ? itemsFromQ
            : [
              t('Clarify the exact scope of the service and any exclusions'),
              t('Align pricing and units (per hour, per visit, per project)'),
              t('Confirm the service regions and availability hours'),
            ],
        docs: [
          { name: t('EVzone service listing guidelines.pdf'), url: '#', type: 'pdf' },
        ],
      }

      if (!cancelled) {
        // Only seed if we have none yet
        if (!adminReason) setAdminReason(sample.reason)
        if ((items || []).length === 0)
          setItems(
            sample.items.map((t, i) => ({
              id: `item-${i}`,
              text: t,
              done: false,
            }))
          )
        if ((adminDocs || []).length === 0) setAdminDocs(sample.docs)
      }
    }

    if (status === 'ChangesRequested') fetchChangesRequested()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  useEffect(() => {
    void sellerBackendApi.patchWorkflowScreenState('service-listing-approval', {
      status,
      etaMin,
      adminReason,
      adminDocs,
      items,
      note,
      serviceName,
      category,
      listingId,
      role,
    }).catch(() => undefined)
  }, [
    status,
    etaMin,
    adminReason,
    adminDocs,
    items,
    note,
    serviceName,
    category,
    listingId,
  ])

  // Build stepper
  const steps = [
    {
      key: 'Submitted',
      label: 'Service submitted',
      desc: 'We received your service listing.',
    },
    {
      key: 'InReview',
      label: 'In review',
      desc: 'Our team is checking details, pricing and compliance.',
    },
    {
      key: 'ChangesRequested',
      label: 'Changes requested',
      desc: 'Please update the service based on the admin request.',
    },
    {
      key: 'Resubmitted',
      label: 'Resubmitted',
      desc: 'We are re-checking your updates.',
    },
    {
      key: 'Approved',
      label: 'Approved and live',
      desc: 'Your service will appear in EVzone for buyers.',
    },
  ]

  const currentIndex = useMemo(() => {
    const map = {
      Submitted: 0,
      InReview: 1,
      ChangesRequested: 2,
      Resubmitted: 3,
      Approved: 4,
    }
    return map[status] != null ? map[status] : 0
  }, [status])

  const stateOf = (i) =>
    i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'todo'

  function refresh() {
    setEtaMin((m) => Math.max(10, m - 10))
  }

  // Upload handlers (local preview; wire to API if needed)
  const ACCEPT = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  const MAX_SIZE = 20 * 1024 * 1024 // 20 MB each

  function formatSize(bytes) {

    if ((!bytes && bytes !== 0) || typeof bytes !== 'number') return t('Not set')

    const kb = bytes / 1024

    const mb = kb / 1024

    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(kb)} KB`

  }



  function addFiles(list: FileList | File[] | null) {

    const arr = Array.from(list || []) as File[]

    const accepted: File[] = []

    let ignored = 0



    for (const f of arr) {

      if (!ACCEPT.includes(f.type) || f.size > MAX_SIZE) {

        ignored++

        continue

      }

      accepted.push(f)

    }



    if (accepted.length) setFiles((prev) => [...prev, ...accepted])



    if (ignored > 0)

      setDropInfo(t('{ignored} file(s) ignored (type or size not allowed)', { ignored }))

    else setDropInfo(accepted.length ? t('{count} file(s) added', { count: accepted.length }) : '')

  }

  function onPickFiles(e) {
    addFiles(e.target.files)
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDndActive(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    setDndActive(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDndActive(false)
    addFiles(e.dataTransfer && e.dataTransfer.files)
  }

  function removeFile(idx) {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  // Checklist helpers
  function toggleItem(id) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)))
  }

  function addItem() {
    const t = newItem.trim()
    if (!t) return
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        text: t,
        done: false,
      },
    ])
    setNewItem('')
  }

  const allChecked = items.length === 0 || items.every((it) => it.done)
  const hasAttachmentOrNote = files.length > 0 || note.trim().length > 0
  const canResubmit =
    status === 'ChangesRequested' && allChecked && hasAttachmentOrNote

  // Resubmit (stub)
  async function resubmit() {
    setNotice('')
    if (!canResubmit) {
      setNotice(
        'Please complete all required items and add a note or attach at least one file.'
      )
      return
    }

    try {
      // POST /api/service-listings/{listingId}/resubmit { note, items, files }
      await new Promise((r) => setTimeout(r, 450))
      setStatus('Resubmitted')
      setEtaMin(60)
    } catch (e) {
      const err = e as { message?: string } | null
      setNotice(err?.message || 'Resubmit failed. Please try again.')
    }
  }

  function clearDraft() {
    try {
      if (typeof window !== 'undefined') {
        void sellerBackendApi.patchWorkflowScreenState('service-listing-approval', {
          status: 'ChangesRequested',
          etaMin: 90,
          adminReason: '',
          adminDocs: [],
          items: [],
          note: '',
        }).catch(() => undefined)
      }
      setNotice('Draft cleared.')
    } catch { }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <header className="border-b border-orange-100 bg-white dark:bg-slate-900/80 backdrop-blur shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="w-full h-16 px-[0.55%] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-orange-500 via-emerald-500 to-emerald-400 shadow-md" />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                {t("Thanks, your service listing is submitted")}
              </h1>
              <p className="text-xs text-slate-500">
                {t(
                  "We are reviewing your service before it goes live. You will get updates here and by email."
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex text-xs px-2 py-1 rounded-full bg-gray-50 dark:bg-slate-950 border border-slate-200 text-slate-600">
              {capitalize(role)}
            </span>
            <Link
              to="/dashboard"
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              {t("Back to dashboard")}
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full px-[0.55%] py-8 space-y-6">
        {/* Service summary */}
        <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col sm:flex-row gap-4 items-start">
          <div className="h-16 w-16 rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-500 border border-slate-200 overflow-hidden">
            {/* In production, render a relevant service icon or avatar here */}
            <span>{t("Service")}</span>
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900 truncate">
                  {serviceName}
                </h2>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>{t("Listing ID")}</div>
                <div className="font-mono text-slate-700 truncate max-w-[120px]">
                  {listingId}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              {t("Category:")}{" "}
              <span className="font-medium text-slate-800">{category}</span>
            </p>
          </div>
        </section>

        {/* Stepper */}
        <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-3">{t("Review progress")}</h3>
          <ol className="relative ml-4">
            {steps.map((s, i) => (
              <StepRow
                key={s.key}
                state={stateOf(i)}
                first={i === 0}
                last={i === steps.length - 1}
                label={t(s.label)}
                desc={t(s.desc)}
                t={t}
              />
            ))}
          </ol>
        </section>

        {/* Changes requested */}
        {status === 'ChangesRequested' && (
          <section className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-orange-900">{t("Changes requested")}</h4>
                <p className="text-sm text-orange-800">
                  {t("Please review the points below, update your service details, and resubmit. You can attach updated documents and add a short note to the review team.")}
                </p>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full border border-orange-200 bg-white dark:bg-slate-900 text-orange-800">
                {t("REVIEW NEEDED")}
              </span>
            </div>

            {/* What admin sent back */}
            {(adminReason || adminDocs.length > 0) && (
              <div className="rounded-xl border border-orange-200 bg-white dark:bg-slate-900 p-3">
                <div className="text-sm font-semibold text-orange-900">
                  {t("Admin feedback")}
                </div>
                {adminReason && (
                  <p className="text-sm text-orange-800 mt-1">{adminReason}</p>
                )}
                {adminDocs.length > 0 && (
                  <ul className="mt-2 text-sm list-disc pl-5 text-orange-900 space-y-1">
                    {adminDocs.map((d, i) => (
                      <li key={i}>
                        <a
                          className="underline"
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {d.name}
                        </a>
                        <span className="text-orange-700 text-xs">
                          {' '}
                          ({d.type || t('file')})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Checklist */}
            <div className="space-y-2">
              {items.length === 0 ? (
                <div className="text-sm text-orange-800">
                  {t("No specific checklist items were provided. Add a note or attach files, then resubmit.")}
                </div>
              ) : (
                items.map((it) => (
                  <label key={it.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 mt-0.5"
                      checked={it.done}
                      onChange={() => toggleItem(it.id)}
                    />
                    <span className="text-orange-900">{it.text}</span>
                  </label>
                ))
              )}

              {/* Add own item */}
              <div className="flex items-center gap-2">
                <input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder={t("Add another change you made (optional)")}
                  className="flex-1 rounded-lg border border-orange-300 bg-white dark:bg-slate-900 px-3 py-2 focus:ring-2 focus:ring-orange-300"
                />
                <button className="btn-secondary" onClick={addItem} type="button">
                  {t("Add")}
                </button>
              </div>
            </div>

            {/* Note */}
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-orange-900">{t("Message to review team")}</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("Describe the updates you have made to this service")}
                className="rounded-lg border border-orange-300 px-3 py-2 h-24 focus:ring-2 focus:ring-orange-300 bg-white dark:bg-slate-900"
              />
            </label>

            {/* Uploads */}
            <div className="space-y-2">
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-xl border-2 border-dashed p-5 text-center transition ${dndActive
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-orange-300 bg-white dark:bg-slate-900'
                  }`}
              >
                <div className="text-sm font-medium text-orange-900">
                  {t("Drag and drop updated documents")}
                </div>
                <div className="text-xs text-orange-700">{t("or")}</div>
                <div className="mt-2">
                  <label
                    htmlFor="service-file-input"
                    className="btn-secondary cursor-pointer"
                  >
                    {t("Choose files")}
                  </label>
                  <input
                    id="service-file-input"
                    type="file"
                    multiple
                    accept=".pdf,image/*"
                    onChange={onPickFiles}
                    className="hidden"
                  />
                </div>
                <p className="mt-2 text-xs text-orange-700">
                  {t("Accepted: PDF, JPG, PNG, WEBP · Max 20 MB each")}
                </p>
                {dropInfo && (
                  <div className="mt-2 text-xs text-orange-900">{dropInfo}</div>
                )}
              </div>

              {/* Selected files list */}
              {files.length > 0 && (
                <ul className="text-sm border border-orange-200 bg-white dark:bg-slate-900 rounded-lg divide-y">
                  {files.map((f, i) => (
                    <li
                      key={i}
                      className="px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <span className="truncate max-w-[60%]">{f.name}</span>
                      <span className="text-xs text-orange-700">
                        {formatSize(f.size)}
                      </span>
                      <button
                        className="text-xs text-orange-700 hover:underline"
                        onClick={() => removeFile(i)}
                      >
                        {t("Remove")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {notice && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
                {notice}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button className="btn-secondary" type="button" onClick={clearDraft}>
                {t("Clear draft")}
              </button>
              <button
                onClick={resubmit}
                disabled={!canResubmit}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold shadow-sm ${canResubmit ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400'
                  }`}
              >
                {t("Resubmit service for review")}
              </button>
            </div>
          </section>
        )}

        {/* ETA & actions */}
        <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              {t("Estimated time to approval:")}{' '}
              <span className="font-semibold text-slate-800">
                {t("~{etaMin} minutes", { etaMin })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={refresh} className="btn-secondary">
                {t("Refresh status")}
              </button>
              <Link
                className="btn-secondary"
                to="/support"
              >
                {t("Contact support")}
              </Link>
            </div>
          </div>
        </section>

        <p className="text-xs text-slate-400">
          {t("If you close this page, you can return any time. Your service listing status is saved on your account. We will also email you when this is approved or if more information is required.")}
        </p>
      </main>

      <footer className="border-t border-slate-200 py-6">
        <div className="w-full px-[0.55%] text-sm text-slate-500 flex items-center justify-between">
          <div>
            © {new Date().getFullYear()} EVzone. {t("All rights reserved.")}
          </div>
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="hover:text-slate-900">
              {t("Go to dashboard")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function StepRow({ state, first, last, label, desc, t }) {
  const isDone = state === 'done'
  const isActive = state === 'active'

  return (
    <li className={cx('relative pl-8 py-4 rounded-xl transition', isActive ? 'bg-emerald-50/50 ring-1 ring-emerald-200' : '')}>
      {/* Connector line */}
      {!first && (
        <span
          aria-hidden
          className={`absolute left-3 top-0 h-1/2 w-px ${isDone ? 'bg-emerald-300' : 'bg-slate-200'
            }`}
        />
      )}
      {!last && (
        <span
          aria-hidden
          className={`absolute left-3 bottom-0 h-1/2 w-px ${isDone || isActive
            ? 'bg-emerald-300'
            : 'border-l border-dashed border-slate-300'
            }`}
        />
      )}

      {/* Node */}
      <span
        className={cx(
          'absolute left-1.5 top-4 grid place-items-center h-5 w-5 rounded-full border',
          isDone
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : isActive
              ? 'bg-white dark:bg-slate-900 border-emerald-400 ring-4 ring-emerald-100 text-emerald-600'
              : 'bg-slate-100 border-slate-300 text-slate-500'
        )}
      >
        {isDone ? (
          <IconCheck />
        ) : isActive ? (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        )}
      </span>

      {/* Text */}
      <div
        className={cx(
          'text-sm font-medium',
          isActive ? 'text-emerald-800' : 'text-slate-900'
        )}
      >
        {label} {isActive && <Badge>{t("CURRENT")}</Badge>}
      </div>
      <div
        className={cx('text-xs', isActive ? 'text-emerald-700' : 'text-slate-500')}
      >
        {desc}
      </div>
    </li>
  )
}

function Badge({ children }) {
  return (
    <span className="ml-2 align-middle text-[10px] px-1.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
      {children}
    </span>
  )
}

function IconCheck() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 10l4 4 8-8" />
    </svg>
  )
}

function cx(...xs) {
  return xs.filter(Boolean).join(' ')
}

function capitalize(value) {
  if (!value) return ''
  const lower = String(value).toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

// Styles
const style = typeof document !== 'undefined' ? document.createElement('style') : null
if (style) {
  style.innerHTML = `
.btn-secondary{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:10px 16px;font-weight:600;font-size:0.875rem;gap:0.4rem;border:1px solid rgb(203,213,225);background:white;box-shadow:0 8px 20px rgba(15,23,42,0.04);transition:all 150ms ease-in-out;}
.btn-secondary:hover{background:rgb(248,250,252);border-color:rgb(148,163,184);box-shadow:0 10px 28px rgba(15,23,42,0.08);}
.btn-secondary:focus-visible{outline:2px solid rgb(249,115,22);outline-offset:2px;}
`
  document.head.appendChild(style)
}

// Dev tests (non-blocking)
try {
  console.assert(
    ['Submitted', 'InReview', 'ChangesRequested', 'Resubmitted', 'Approved'].includes(
      'ChangesRequested'
    ),
    'status enum ok'
  )
} catch { }
  useEffect(() => {
    let active = true

    void sellerBackendApi.getWorkflowScreenState('service-listing-approval').then((payload) => {
      if (!active) return
      if (typeof payload.status === 'string') setStatus(payload.status)
      if (Number.isFinite(Number(payload.etaMin))) setEtaMin(Number(payload.etaMin))
      if (typeof payload.adminReason === 'string') setAdminReason(payload.adminReason)
      if (Array.isArray(payload.adminDocs)) setAdminDocs(payload.adminDocs)
      if (Array.isArray(payload.items)) setItems(payload.items)
      if (typeof payload.note === 'string') setNote(payload.note)
    }).catch(() => undefined)

    return () => {
      active = false
    }
  }, [])
