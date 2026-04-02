import React, { useEffect, useMemo, useState } from 'react'

/**
 * EVzone - Creator Onboarding Approval Pending
 * React + Tailwind (JS)
 *
 * For Creators who have finished onboarding and are awaiting approval.
 *
 * Flow:
 *  - Statuses: Submitted -> UnderReview -> SendBack (Action required) -> Resubmitted -> Approved
 *  - Shows what the admin sent back: reason, checklist items, and reference docs
 *  - Lets the Creator resubmit with a response note, updated attachments, and a validated checklist
 *  - Saves a local draft so nothing is lost on refresh
 */

type Status = 'Submitted' | 'UnderReview' | 'SendBack' | 'Resubmitted' | 'Approved';

type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

type AdminDoc = {
  name: string;
  url: string;
  type: string;
};

type Step = {
  key: string;
  label: string;
  desc: string;
};

type StepState = 'done' | 'active' | 'todo';

export default function CreatorOnboardingApprovalPending() {
  // Query params / localStorage (creator context)
  const qp = useMemo(
    () => (typeof window === 'undefined'
      ? {}
      : Object.fromEntries(new URLSearchParams(window.location.search).entries())),
    []
  )

  const displayName =
    qp.name ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('creatorOnb.name') || 'New Creator'
      : 'New Creator')

  const niche =
    qp.niche ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('creatorOnb.niche') || 'Not set'
      : 'Not set')

  const role =
    qp.role ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('signup.role') || 'creator'
      : 'creator')

  const creatorId =
    qp.creatorId ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('creatorOnb.id') || 'pending'
      : 'pending')

  const initialStatus =
    typeof window !== 'undefined' && qp.status
      ? qp.status
      : 'UnderReview'

  // Admin-supplied reason/items via query or API
  const reasonFromQ = qp.reason || ''
  const itemsFromQ = (qp.items || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  // Core state
  const [status, setStatus] = useState<Status>(initialStatus as Status)
  const [etaMin, setEtaMin] = useState(
    Number(
      (typeof window !== 'undefined' && localStorage.getItem('creatorOnb.etaMin')) ||
      90
    )
  )

  // Admin request (what was returned)
  const [adminReason, setAdminReason] = useState(
    (typeof window !== 'undefined' && localStorage.getItem('creatorOnb.adminReason')) ||
    reasonFromQ
  )

  const [adminDocs, setAdminDocs] = useState<AdminDoc[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(localStorage.getItem('creatorOnb.adminDocs') || '[]')
    } catch {
      return []
    }
  })

  // Creator response draft
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = JSON.parse(localStorage.getItem('creatorOnb.items') || '[]')
        if (Array.isArray(cached) && cached.length) return cached
      } catch {
        // Ignore parse errors
      }
    }
    return itemsFromQ.map((t, i) => ({ id: `item-${i}`, text: t, done: false }))
  })

  const [newItem, setNewItem] = useState('')
  const [note, setNote] = useState(
    (typeof window !== 'undefined' && localStorage.getItem('creatorOnb.note')) || ''
  )

  const [files, setFiles] = useState<File[]>([])
  const [notice, setNotice] = useState('')
  const [dndActive, setDndActive] = useState(false)
  const [dropInfo, setDropInfo] = useState('') // drag/drop status line

  // Auto-move Submitted -> UnderReview (demo)
  useEffect(() => {
    if (status === 'Submitted') {
      const t = setTimeout(() => setStatus('UnderReview'), 2500)
      return () => clearTimeout(t)
    }
  }, [status])

  // Simulated API fetch for SendBack details
  useEffect(() => {
    let cancelled = false
    async function fetchSendBack() {
      // Replace with: GET /api/creators/{creatorId}/onboarding-review
      await new Promise((r) => setTimeout(r, 250))
      const sample = {
        reason:
          reasonFromQ ||
          'Please refine your profile bio, upload at least 3 sample videos or images, and confirm the categories you will create for.',
        items:
          itemsFromQ.length
            ? itemsFromQ
            : [
              'Refine your profile bio to clearly describe your content style',
              'Upload at least 3 sample contents (video or image)',
              'Confirm your primary content categories and regions',
            ],
        docs: [
          { name: 'EVzone creator guidelines.pdf', url: '#', type: 'pdf' },
        ],
      }

      if (!cancelled) {
        // Only seed if we have none yet
        if (!adminReason) setAdminReason(sample.reason)
        if ((items || []).length === 0)
          setItems(
            sample.items.map((t: string, i: number) => ({
              id: `item-${i}`,
              text: t,
              done: false,
            }))
          )
        if ((adminDocs || []).length === 0) setAdminDocs(sample.docs)
      }
    }

    if (status === 'SendBack') fetchSendBack()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Persist draft
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem('creatorOnb.status', status)
      localStorage.setItem('creatorOnb.etaMin', String(etaMin))
      localStorage.setItem('creatorOnb.adminReason', adminReason || '')
      localStorage.setItem('creatorOnb.adminDocs', JSON.stringify(adminDocs || []))
      localStorage.setItem('creatorOnb.items', JSON.stringify(items || []))
      localStorage.setItem('creatorOnb.note', note || '')
      localStorage.setItem('creatorOnb.name', displayName || '')
      localStorage.setItem('creatorOnb.niche', niche || '')
      localStorage.setItem('creatorOnb.id', creatorId || '')
    } catch {
      // Ignore localStorage errors
    }
  }, [
    status,
    etaMin,
    adminReason,
    adminDocs,
    items,
    note,
    displayName,
    niche,
    creatorId,
  ])

  // Build stepper
  const steps: Step[] = [
    {
      key: 'Submitted',
      label: 'Application submitted',
      desc: 'We received your Creator onboarding details.',
    },
    {
      key: 'UnderReview',
      label: 'Under review',
      desc: 'Our team is checking your profile, samples and categories.',
    },
    {
      key: 'SendBack',
      label: 'Action required',
      desc: 'Please address the requested changes and resubmit.',
    },
    {
      key: 'Resubmitted',
      label: 'Back in review',
      desc: 'We are verifying your updates.',
    },
    {
      key: 'Approved',
      label: 'Approved',
      desc: 'We will unlock Creator tools and notify you.',
    },
  ]

  const currentIndex = useMemo(() => {
    const map: Record<Status, number> = {
      Submitted: 0,
      UnderReview: 1,
      SendBack: 2,
      Resubmitted: 3,
      Approved: 4,
    }
    return map[status] != null ? map[status] : 0
  }, [status])

  const stateOf = (i: number): StepState => (i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'todo')

  function refresh() {
    setEtaMin((m) => Math.max(10, m - 10))
  }

  // Upload handlers (local preview; wire to API if needed)
  const ACCEPT = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  const MAX_SIZE = 20 * 1024 * 1024 // 20 MB each

  function formatSize(bytes: number): string {
    if ((!bytes && bytes !== 0) || typeof bytes !== 'number') return 'Not set'
    const kb = bytes / 1024
    const mb = kb / 1024
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(kb)} KB`
  }

  function addFiles(list: FileList | null): void {
    const arr = Array.from(list || [])
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
      setDropInfo(`${ignored} file(s) ignored (type or size not allowed)`)
    else setDropInfo(accepted.length ? `${accepted.length} file(s) added` : '')
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>): void {
    addFiles(e.target.files)
  }

  function handleDragOver(e: React.DragEvent): void {
    e.preventDefault()
    setDndActive(true)
  }

  function handleDragLeave(e: React.DragEvent): void {
    e.preventDefault()
    setDndActive(false)
  }

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault()
    setDndActive(false)
    addFiles(e.dataTransfer && e.dataTransfer.files)
  }

  function removeFile(idx: number): void {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  // Checklist helpers
  function toggleItem(id: string): void {
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
    status === 'SendBack' && allChecked && hasAttachmentOrNote

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
      // POST /api/creators/{creatorId}/resubmit-onboarding { note, items, files }
      await new Promise((r) => setTimeout(r, 450))
      setStatus('Resubmitted')
      setEtaMin(60)
    } catch (e) {
      setNotice((e instanceof Error && e.message) || 'Resubmit failed. Please try again.')
    }
  }

  function clearDraft() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('creatorOnb.status')
        localStorage.removeItem('creatorOnb.etaMin')
        localStorage.removeItem('creatorOnb.adminReason')
        localStorage.removeItem('creatorOnb.adminDocs')
        localStorage.removeItem('creatorOnb.items')
        localStorage.removeItem('creatorOnb.note')
      }
      setNotice('Draft cleared.')
    } catch {
      // Ignore localStorage errors
    }
  }

  return (
    <div className="min-h-screen w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-50 transition-colors overflow-x-hidden">
      <header className="border-b border-orange-100 dark:border-orange-900/30 bg-white dark:bg-slate-900/80 backdrop-blur shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-colors w-full">
        <div className="w-full max-w-full h-16 px-3 sm:px-4 md:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-orange-500 via-emerald-500 to-emerald-400 shadow-md" />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Thanks, your Creator onboarding is submitted
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                We are reviewing your Creator application. You will get updates here and by
                email.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex text-xs px-2 py-1 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium transition-colors">
              {mapRole(role)}
            </span>
            <a
              href="/dashboard"
              className="text-sm text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-100"
            >
              Back to dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8 space-y-6">
        {/* Creator summary */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm flex flex-col sm:flex-row gap-4 items-start transition-colors">
          <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
            {/* In production, render Creator avatar here */}
            <span>{displayName.charAt(0).toUpperCase()}</span>
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold dark:font-bold text-slate-900 truncate">
                  {displayName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-300 truncate">
                  Creator ID:{' '}
                  <span className="font-mono text-slate-700 dark:text-slate-100 font-medium transition-colors">{creatorId}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-300">
              Primary niche:{' '}
              <span className="font-medium text-slate-800 dark:text-slate-50">{niche}</span>
            </p>
          </div>
        </section>

        {/* Stepper */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm transition-colors">
          <h3 className="font-semibold dark:font-bold text-slate-900 dark:text-slate-50 mb-3">Review progress</h3>
          <ol className="relative ml-4">
            {steps.map((s, i) => (
              <StepRow
                key={s.key}
                state={stateOf(i)}
                first={i === 0}
                last={i === steps.length - 1}
                label={s.label}
                desc={s.desc}
              />
            ))}
          </ol>
        </section>

        {/* Changes requested */}
        {status === 'SendBack' && (
          <section className="rounded-2xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 p-5 shadow-sm space-y-4 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold dark:font-bold text-orange-900 dark:text-orange-200">Action required</h4>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  Please review the points below, update your Creator profile or samples,
                  and resubmit. You can attach updated content and add a short note to the
                  review team.
                </p>
              </div>
              <span className="text-sm px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-700 bg-white dark:bg-slate-800 text-orange-800 dark:text-orange-300 transition-colors">
                REVIEW NEEDED
              </span>
            </div>

            {/* What admin sent back */}
            {(adminReason || adminDocs.length > 0) && (
              <div className="rounded-xl border border-orange-200 dark:border-orange-700 bg-white dark:bg-slate-800 p-3 transition-colors">
                <div className="text-sm font-semibold dark:font-bold text-orange-900 dark:text-orange-200">
                  Admin feedback
                </div>
                {adminReason && (
                  <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">{adminReason}</p>
                )}
                {adminDocs.length > 0 && (
                  <ul className="mt-2 text-sm list-disc pl-5 text-orange-900 dark:text-orange-200 space-y-1">
                    {adminDocs.map((d: AdminDoc, i: number) => (
                      <li key={i}>
                        <a
                          className="underline hover:text-orange-700 dark:hover:text-orange-300"
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {d.name}
                        </a>
                        <span className="text-orange-700 dark:text-orange-300 text-xs">
                          {' '}
                          ({d.type || 'file'})
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
                <div className="text-sm text-orange-800 dark:text-orange-200">
                  No specific checklist items were provided. Add a note or attach files,
                  then resubmit.
                </div>
              ) : (
                items.map((it) => (
                  <label key={it.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 mt-0.5 accent-orange-500 dark:accent-orange-600"
                      checked={it.done}
                      onChange={() => toggleItem(it.id)}
                    />
                    <span className="text-orange-900 dark:text-orange-200">{it.text}</span>
                  </label>
                ))
              )}

              {/* Add own item */}
              <div className="flex items-center gap-2">
                <input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="Add another change you made (optional)"
                  className="flex-1 rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-800 px-3 py-2 focus:ring-2 focus:ring-orange-300 dark:focus:ring-orange-600 transition-colors text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                />
                <button className="btn-secondary" onClick={addItem} type="button">
                  Add
                </button>
              </div>
            </div>

            {/* Note */}
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-orange-900 dark:text-orange-200">Message to review team</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Describe the updates you have made to your Creator profile"
                className="rounded-lg border border-orange-300 dark:border-orange-700 px-3 py-2 h-24 focus:ring-2 focus:ring-orange-300 dark:focus:ring-orange-600 bg-white dark:bg-slate-800 transition-colors text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
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
                  ? 'border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/30'
                  : 'border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-800'
                  }`}
              >
                <div className="text-sm font-medium text-orange-900 dark:text-orange-200">
                  Drag and drop updated samples or documents
                </div>
                <div className="text-xs text-orange-700 dark:text-orange-300">or</div>
                <div className="mt-2">
                  <label
                    htmlFor="creator-file-input"
                    className="btn-secondary cursor-pointer"
                  >
                    Choose files
                  </label>
                  <input
                    id="creator-file-input"
                    type="file"
                    multiple
                    accept=".pdf,image/*,video/*"
                    onChange={onPickFiles}
                    className="hidden"
                  />
                </div>
                <p className="mt-2 text-xs text-orange-700 dark:text-orange-300">
                  Accepted: PDF, JPG, PNG, WEBP, video · Max 20 MB each
                </p>
                {dropInfo && (
                  <div className="mt-2 text-xs text-orange-900 dark:text-orange-200">{dropInfo}</div>
                )}
              </div>

              {/* Selected files list */}
              {files.length > 0 && (
                <ul className="text-sm border border-orange-200 dark:border-orange-700 bg-white dark:bg-slate-800 rounded-lg transition-colors divide-y divide-orange-200 dark:divide-orange-700">
                  {files.map((f: File, i: number) => (
                    <li
                      key={i}
                      className="px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <span className="truncate max-w-[60%] text-slate-900 dark:text-slate-100">{f.name}</span>
                      <span className="text-xs text-orange-700 dark:text-orange-300">
                        {formatSize(f.size)}
                      </span>
                      <button
                        className="text-xs text-orange-700 dark:text-orange-300 hover:underline"
                        onClick={() => removeFile(i)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {notice && (
              <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 px-3 py-2 text-sm transition-colors">
                {notice}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button className="btn-secondary" type="button" onClick={clearDraft}>
                Clear draft
              </button>
              <button
                onClick={resubmit}
                disabled={!canResubmit}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold dark:font-bold shadow-sm ${canResubmit ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400'
                  }`}
              >
                Resubmit Creator application
              </button>
            </div>
          </section>
        )}

        {/* ETA & actions */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600 dark:text-slate-200 font-medium">
              Estimated time to approval:{' '}
              <span className="font-semibold dark:font-bold text-slate-800 dark:text-slate-50">
                ~{etaMin} minutes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={refresh} className="btn-secondary">
                Refresh status
              </button>
              <a
                className="btn-secondary"
                href="/support/creator-approvals"
              >
                Contact support
              </a>
            </div>
          </div>
        </section>

        <p className="text-xs text-slate-400 dark:text-slate-400">
          If you close this page, you can return any time. Your Creator application status
          is saved on your account. We will also email you when this is approved or if more
          information is required.
        </p>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-700 py-6 w-full">
        <div className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 text-sm text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <div>
            © {new Date().getFullYear()} EVzone. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              Go to dashboard
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

type StepRowProps = {
  state: StepState;
  first: boolean;
  last: boolean;
  label: string;
  desc: string;
};

function StepRow({ state, first, last, label, desc }: StepRowProps) {
  const isDone = state === 'done'
  const isActive = state === 'active'

  return (
    <li className={cx('relative pl-8 py-4 rounded-xl transition', isActive ? 'bg-emerald-50/50 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800' : '')}>
      {/* Connector line */}
      {!first && (
        <span
          aria-hidden
          className={`absolute left-3 top-0 h-1/2 w-px ${isDone ? 'bg-emerald-300 dark:bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'
            }`}
        />
      )}
      {!last && (
        <span
          aria-hidden
          className={`absolute left-3 bottom-0 h-1/2 w-px ${isDone || isActive
            ? 'bg-emerald-300 dark:bg-emerald-600'
            : 'border-l border-dashed border-slate-300 dark:border-slate-700'
            }`}
        />
      )}

      {/* Node */}
      <span
        className={cx(
          'absolute left-1.5 top-4 grid place-items-center h-5 w-5 rounded-full border',
          isDone
            ? 'bg-emerald-500 dark:bg-emerald-600 border-emerald-500 dark:border-emerald-600 text-white'
            : isActive
              ? 'bg-white dark:bg-slate-800 border-emerald-400 dark:border-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-900/50 text-emerald-600 dark:text-emerald-400'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'
        )}
      >
        {isDone ? (
          <IconCheck />
        ) : isActive ? (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
        )}
      </span>

      {/* Text */}
      <div
        className={cx(
          'text-sm font-medium',
          isActive ? 'text-emerald-800 dark:text-emerald-200' : 'text-slate-900 dark:text-slate-50'
        )}
      >
        {label} {isActive && <Badge>CURRENT</Badge>}
      </div>
      <div
        className={cx('text-xs', isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400')}
      >
        {desc}
      </div>
    </li>
  )
}

type BadgeProps = {
  children: React.ReactNode;
};

function Badge({ children }: BadgeProps) {
  return (
    <span className="ml-2 align-middle text-xs px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 transition-colors">
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

function cx(...xs: (string | boolean | null | undefined)[]): string {
  return xs.filter(Boolean).join(' ')
}

function mapRole(code: string): string {
  const normalized = (code || '').toLowerCase()
  const m: Record<string, string> = {
    creator: 'Creator',
  }
  return m[normalized] || 'Creator'
}

// Styles
const style = typeof document !== 'undefined' ? document.createElement('style') : null
if (style) {
  style.innerHTML = `
.btn-secondary{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:10px 16px;font-weight:600;font-size:0.875rem;gap:0.4rem;border:1px solid rgb(203,213,225);background:white;box-shadow:0 8px 20px rgba(15,23,42,0.04);transition:all 150ms ease-in-out;color:rgb(51,65,85);}
.btn-secondary:hover{background:rgb(248,250,252);border-color:rgb(148,163,184);box-shadow:0 10px 28px rgba(15,23,42,0.08);}
.btn-secondary:focus-visible{outline:2px solid rgb(249,115,22);outline-offset:2px;}
.dark .btn-secondary{background:rgb(30,41,59);border-color:rgb(51,65,85);color:rgb(226,232,240);}
.dark .btn-secondary:hover{background:rgb(51,65,85);border-color:rgb(71,85,105);}
`
  document.head.appendChild(style)
}

// Dev tests (non-blocking)
try {
  console.assert(
    ['Submitted', 'UnderReview', 'SendBack', 'Resubmitted', 'Approved'].includes(
      'SendBack'
    ),
    'status enum ok'
  )
} catch {
  // Ignore assertion errors in dev
}
