// Round 4 – Page 12: Content Submission & Review Page (Creator Side)
// Purpose: Formal hand off of non-live deliverables (videos, post drafts).
// Flow:
// • Choose campaign & deliverable
// • Upload file(s) or paste post URL/draft caption
// • Add notes, tags, proposed publish time

// Status:
// • Review status banner (Pending, Changes requested, Approved)
// • Comments thread between seller and creator
// Premium extras:
// • Auto check for missing disclosures (e.g. “#ad” in captions)
// • AI thumbnail picker / generator (UI only in this demo)

import React, { useState, useMemo } from "react";

import { PageHeader } from "../../../components/PageHeader";

type StatusMeta = {
  id: string;
  label: string;
  color: string;
};



// const SUPPORTED_TYPES = ["video/mp4", "video/quicktime", "image/jpeg", "image/png", "application/pdf"];

type Comment = {
  id: number;
  from: "seller" | "creator";
  name: string;
  body: string;
  time: string;
};

import { CONTRACTS } from "../../../data/mockContracts";

// Removed static CAMPAIGNS in favor of CONTRACTS
const MOCK_SUBMISSIONS: Record<string, string> = {
  "C-101-2": "pending", // Contract C-101, Deliverable 2
};

// Helper to guess icon based on label
const getDeliverableIcon = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes("video") || l.includes("clip") || l.includes("reel")) return "🎬";
  if (l.includes("post") || l.includes("feed")) return "📝";
  if (l.includes("story")) return "📱";
  return "📦";
};

const STATUS_OPTIONS = [
  {
    id: "pending",
    label: "Pending review",
    color: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700"
  },
  {
    id: "changes",
    label: "Changes requested",
    color: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700"
  },
  {
    id: "approved",
    label: "Approved",
    color: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700"
  }
];

const AI_THUMBNAILS = [
  {
    id: 1,
    label: "Face close-up + product",
    style: "High-conversion beauty thumbnail"
  },
  {
    id: 2,
    label: "Before / After split",
    style: "Strong visual impact for skincare"
  },
  {
    id: 3,
    label: "Text-heavy “20% OFF”",
    style: "Offer-first layout"
  },
  {
    id: 4,
    label: "Minimal product only",
    style: "Clean, brand-safe"
  }
];

type ContentSubmissionReviewPageProps = {
  onChangePage?: (page: string) => void;
};

function ContentSubmissionReviewPage({ onChangePage: _onChangePage }: ContentSubmissionReviewPageProps) {

  const [selectedContractId, setSelectedContractId] = useState("C-101");
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<number>(2); // Default to a pending one
  // Local submissions state to simulate database
  const [submissions, setSubmissions] = useState(MOCK_SUBMISSIONS);

  const [caption, setCaption] = useState(
    "GlowUp serum keeps my skin glowing all day!"
  );
  const [postUrl, setPostUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("beauty,serum,flash dealz");
  const [proposedDate, setProposedDate] = useState("");
  const [proposedTime, setProposedTime] = useState("");
  const [selectedThumbnailId, setSelectedThumbnailId] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const [comments, setComments] = useState<Comment[]>([
    {
      id: 1,
      from: "seller",
      name: "GlowUp Hub",
      body: "Thanks for the first cut. Can you emphasise the 20% flash window a bit more in the caption?",
      time: "Yesterday"
    },
    {
      id: 2,
      from: "creator",
      name: "You",
      body: "Sure – I’ll add a line with the exact window and a stronger CTA.",
      time: "5h ago"
    }
  ]);
  const [commentDraft, setCommentDraft] = useState("");

  const contract = useMemo(
    () => CONTRACTS.find((c) => c.id === selectedContractId) || CONTRACTS[0],
    [selectedContractId]
  );

  // Determine current status based on selection
  const submissionKey = `${selectedContractId}-${selectedDeliverableId}`;
  const currentStatus = submissions[submissionKey] || "pending"; // Default to pending for demo or "new"

  const statusMeta: StatusMeta =
    STATUS_OPTIONS.find((s) => s.id === currentStatus) || STATUS_OPTIONS[0];

  // Deliverables for this contract (filtering out "done" ones isn't strictly necessary, but helpful)
  // For this demo, we show all so user can switch between them
  const deliverables = contract.deliverables;

  const isFormValid = useMemo(() => {
    const hasContent = selectedFiles.length > 0 || postUrl.trim().length > 0;
    const hasCaption = caption.trim().length > 0;
    const hasNotes = notes.trim().length > 0;

    let timeIsValid = true;
    if (proposedDate) {
      const dateTimeStr = `${proposedDate}T${proposedTime || "23:59"}`;
      const selectedDateTime = new Date(dateTimeStr);
      timeIsValid = selectedDateTime >= new Date();
    }

    return hasContent && hasCaption && hasNotes && timeIsValid;
  }, [selectedFiles, postUrl, caption, notes, proposedDate, proposedTime]);

  const isTimeInPast = useMemo(() => {
    if (!proposedDate) return false;
    const dateTimeStr = `${proposedDate}T${proposedTime || "23:59"}`;
    const selectedDateTime = new Date(dateTimeStr);
    return selectedDateTime < new Date();
  }, [proposedDate, proposedTime]);

  const todayISO = new Date().toISOString().split("T")[0];

  const handleSubmit = () => {
    // Simulate submission persistence
    const newSubmission = {
      id: `SUB-${Math.floor(1000 + Math.random() * 9000)}`,
      title: deliverables.find(d => d.id === selectedDeliverableId)?.label || "New Deliverable",
      campaign: contract.campaign,
      supplier: { name: contract.brand, type: "Seller" as const },
      channel: "Instagram",
      type: "Video",
      desk: "General" as const,
      status: "Pending" as const,
      riskScore: 25,
      submittedAtISO: new Date().toISOString(),
      dueAtISO: "",
      notesFromCreator: notes,
      caption: caption,
      assets: selectedFiles.map(f => ({
        name: f.name,
        type: "Video" as const,
        size: `${(f.size / 1024 / 1024).toFixed(2)} MB`
      })),
      flags: {
        missingDisclosure: !hasDisclosure,
        sensitiveClaim: false,
        brandRestriction: false
      },
      lastUpdatedISO: new Date().toISOString(),
      audit: [{ atISO: new Date().toISOString(), msg: "Submitted via Content Hub" }]
    };

    const existing = JSON.parse(localStorage.getItem("pendingSubmissions") || "[]");
    localStorage.setItem("pendingSubmissions", JSON.stringify([newSubmission, ...existing]));

    if (_onChangePage) {
      _onChangePage("awaiting-approval");
    } else {
      alert("Content submitted! Navigation handler missing.");
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setSubmissions(prev => ({
      ...prev,
      [submissionKey]: newStatus
    }));
  };

  // Auto-disclosure check
  const lowerCaption = (caption || "").toLowerCase();
  const hasDisclosure =
    lowerCaption.includes("#ad") || lowerCaption.includes("#sponsored");
  const disclosureWarning =
    !hasDisclosure && caption.length > 5; // Simple check

  // const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setFileError("");
  //   if (e.target.files && e.target.files.length > 0) {
  //     const newFiles = Array.from(e.target.files);
  //     const validFiles: File[] = [];

  //     newFiles.forEach(file => {
  //       if (file.size > MAX_FILE_SIZE_BYTES) {
  //         setFileError(`File "${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
  //         return;
  //       }
  //       // Basic type check (optional, as accept attribute handles most)
  //       // if (!SUPPORTED_TYPES.some(t => file.type.match(t))) { ... }
  //       validFiles.push(file);
  //     });

  //     if (validFiles.length > 0) {
  //       setSelectedFiles(prev => [...prev, ...validFiles]);
  //     }
  //   }
  //   if (e.target) e.target.value = '';
  // };

  const handleAddComment = () => {
    const trimmed = commentDraft.trim();
    if (!trimmed) return;
    setComments((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        from: "creator",
        name: "You",
        body: trimmed,
        time: "Now"
      }
    ]);
    setCommentDraft("");
  };

  const handleAddDisclosure = () => {
    if (hasDisclosure) return;
    const suffix = caption.endsWith(" ") || caption.length === 0 ? "" : " ";
    setCaption(caption + suffix + "#ad");
  };

  // const selectedThumb =
  //   AI_THUMBNAILS.find((t) => t.id === selectedThumbnailId) || AI_THUMBNAILS[0];

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="Content Submission & Review"
        mobileViewType="hide"
        badge={
          <span className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-800 transition-colors">
            <span>📤</span>
            <span>Non-live deliverables handoff</span>
          </span>
        }
        rightContent={
          <div className="flex items-center gap-2">
            <button
              onClick={() => _onChangePage && _onChangePage("awaiting-approval")}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              View Waiting Page
            </button>
          </div>
        }
      />

      {/* Mobile-only action button (moved out of header) */}
      <div className="sm:hidden w-full px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-end">
        <button
          onClick={() => _onChangePage && _onChangePage("awaiting-approval")}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          View Waiting Page
        </button>
      </div>

      <main className="flex-1 flex flex-col w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 gap-6 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] gap-4 items-start">
          {/* Left: Form */}
          <section className="flex flex-col gap-3">
            {/* Status banner */}
            <StatusBanner
              statusMeta={statusMeta}
              onChangeStatus={handleStatusChange}
              onSubmit={handleSubmit}
            />

            {/* Campaign & deliverable selection */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-3 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold dark:font-bold">Campaign</label>
                  <select
                    className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none transition-colors"
                    value={selectedContractId}
                    onChange={(e) => {
                      setSelectedContractId(e.target.value);
                      // Reset deliverable to first one when contract changes
                      const newItem = CONTRACTS.find(c => c.id === e.target.value)?.deliverables[0];
                      if (newItem) setSelectedDeliverableId(newItem.id);
                    }}
                  >
                    {CONTRACTS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.campaign} · {c.brand}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                    Brand: <span className="font-medium">{contract.brand}</span>{" "}
                    · {contract.status}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold dark:font-bold">
                    Deliverable (from contract)
                  </label>
                  <select
                    className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-600 outline-none transition-colors"
                    value={selectedDeliverableId}
                    onChange={(e) => setSelectedDeliverableId(Number(e.target.value))}
                  >
                    {deliverables.map(d => (
                      <option key={d.id} value={d.id}>
                        {getDeliverableIcon(d.label)} {d.label} (Due: {d.due})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Content submission form */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-3 text-sm">
              <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-1">Content submission</h2>
              <p className="text-xs text-slate-500 dark:text-slate-300 mb-1">
                Upload the final file or paste the draft caption / URL. The brand will review and
                either approve or request changes.
              </p>

              {/* File / URL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-medium">Upload file(s)</label>
                  <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg px-2 py-3 bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 transition-colors">
                    <p>
                      Drag &amp; drop your video, image or doc here or click to choose.
                    </p>
                    <input
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const newFiles = Array.from(e.target.files);
                          setSelectedFiles(prev => [...prev, ...newFiles]);
                        }
                        if (e.target) e.target.value = '';
                      }}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      ref={cameraInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const newFiles = Array.from(e.target.files);
                          setSelectedFiles(prev => [...prev, ...newFiles]);
                        }
                        if (e.target) e.target.value = '';
                      }}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        className="px-3 py-1 rounded-full border border-[#f77f00] bg-white dark:bg-slate-900 text-[#f77f00] text-xs hover:bg-[#fff5e8] transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Choose files
                      </button>
                      <button
                        className="px-3 py-1 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <span>📷</span>
                        <span>Camera</span>
                      </button>
                    </div>
                    {fileError && (
                      <p className="mt-2 text-xs text-red-500 font-medium">
                        {fileError}
                      </p>
                    )}
                    <p className="mt-1 text-tiny text-slate-400 dark:text-slate-400">
                      Supported: MP4, MOV, JPG, PNG, PDF · Max 500MB
                    </p>

                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              {file.type.startsWith("image/") ? (
                                <div className="h-8 w-8 rounded bg-slate-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden">
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt="preview"
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <span className="text-lg">📄</span>
                              )}
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-[150px] sm:max-w-xs">
                                  {file.name}
                                </span>
                                <span className="text-tiny text-slate-400">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
                              }}
                              className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium">
                    Post URL (if already drafted)
                  </label>
                  <input
                    className="border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-400 outline-none transition-colors"
                    placeholder="https://instagram.com/p/… or platform draft link"
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-300">
                    Optional: paste a direct draft URL if the platform supports it.
                  </p>
                </div>
              </div>

              {/* Caption / notes / tags / time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-medium flex items-center gap-1">
                    <span>Draft caption / post text</span>
                    <span className="text-tiny text-slate-400 dark:text-slate-400">
                      (auto-checks for disclosures)
                    </span>
                  </label>
                  <textarea
                    rows={5}
                    className="border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-400 outline-none resize-none transition-colors"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write or paste your caption here…"
                  />
                  {disclosureWarning && (
                    <div className="mt-1 border border-amber-200 dark:border-amber-700 rounded-lg px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1 transition-colors">
                      <span>⚠️</span>
                      <div>
                        <p>
                          We couldn’t detect a disclosure like{" "}
                          <span className="font-mono">#ad</span> or{" "}
                          <span className="font-mono">#sponsored</span> in this
                          caption.
                        </p>
                        <button
                          type="button"
                          className="mt-0.5 px-2 py-0.5 rounded-full border border-[#f77f00] bg-white dark:bg-slate-900 text-[#f77f00] text-xs hover:bg-[#fff5e8] transition-colors"
                          onClick={handleAddDisclosure}
                        >
                          Add #ad to caption
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-medium">
                      Notes for the brand / reviewer
                    </label>
                    <textarea
                      rows={3}
                      className="border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-400 outline-none resize-none transition-colors"
                      placeholder="Explain how this content fits the brief, any variations you tried, etc."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-medium">Tags</label>
                    <input
                      className="border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-400 outline-none transition-colors"
                      placeholder="e.g. beauty,serum,flash dealz"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-300">
                      Comma-separated tags help you and the brand quickly find
                      this asset later.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-medium">
                      Proposed publish time
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        min={todayISO}
                        className={`flex-1 border rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-400 outline-none transition-colors ${isTimeInPast ? "border-red-500 text-red-600" : "border-slate-200 dark:border-slate-800"
                          }`}
                        value={proposedDate}
                        onChange={(e) => setProposedDate(e.target.value)}
                      />
                      <input
                        type="time"
                        className={`w-28 border rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-400 outline-none transition-colors ${isTimeInPast ? "border-red-500 text-red-600" : "border-slate-200 dark:border-slate-800"
                          }`}
                        value={proposedTime}
                        onChange={(e) => setProposedTime(e.target.value)}
                      />
                    </div>
                    {isTimeInPast && (
                      <p className="text-tiny text-red-500 font-medium">
                        ⚠️ Time cannot be in the past.
                      </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-300">
                      Optional: suggest the best time window based on your
                      audience.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Footer */}
            <div className={`bg-white dark:bg-slate-900 rounded-2xl transition-all shadow-lg p-5 flex flex-col md:flex-row items-center justify-between gap-4 border-2 ${isFormValid ? "border-[#f77f00]/20" : "border-slate-200 dark:border-slate-800"}`}>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ready to submit?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isFormValid
                    ? "All fields complete. Ensure your caption has required disclosures."
                    : "Please upload a file or provide a URL, and add a caption and notes to submit."
                  }
                </p>
              </div>
              <button
                onClick={handleSubmit}
                disabled={!isFormValid}
                className={`w-full md:w-auto px-8 py-3 rounded-xl bg-[#f77f00] text-white font-black shadow-lg shadow-orange-500/20 transform transition-all text-sm uppercase tracking-wider ${isFormValid
                  ? "hover:bg-[#e26f00] hover:scale-105 active:scale-95"
                  : "opacity-40 cursor-not-allowed filter grayscale"
                  }`}
              >
                Submit for review
              </button>
            </div>
          </section>

          {/* Right: Status + AI thumbnail + comments */}
          <section className="flex flex-col gap-3 text-sm">
            <AiThumbnailPanel
              selectedId={selectedThumbnailId}
              onSelect={setSelectedThumbnailId}
              caption={caption}
            />

            <CommentsPanel
              comments={comments}
              commentDraft={commentDraft}
              onCommentDraftChange={setCommentDraft}
              onAddComment={handleAddComment}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

type StatusBannerProps = {
  statusMeta: StatusMeta;
  onChangeStatus: (statusId: string) => void;
  onSubmit: () => void;
};

function StatusBanner({ statusMeta, onChangeStatus }: Pick<StatusBannerProps, "statusMeta" | "onChangeStatus"> & { onSubmit?: () => void }) {
  return (
    <div
      className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border rounded-2xl px-3 py-2 text-sm ${statusMeta.color}`}
    >
      <div className="flex items-center gap-2">
        <span>📋</span>
        <div>
          <p className="text-sm font-semibold dark:font-bold">
            Review status: {statusMeta.label}
          </p>
          <p className="text-xs opacity-90">
            This submission will be visible to the brand once you hit Submit.
            They can approve or request changes here.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 text-xs">
        <span className="text-slate-700 dark:text-slate-100 mr-1">Set status:</span>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`px-2 py-0.5 rounded-full border text-xs ${opt.id === statusMeta.id
              ? "bg-[#f77f00] border-[#f77f00] text-white"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              }`}
            onClick={() => onChangeStatus(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type AiThumbnailPanelProps = {
  selectedId: number;
  onSelect: (id: number) => void;
  caption: string;
};

function AiThumbnailPanel({ selectedId, onSelect, caption }: AiThumbnailPanelProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <h3 className="text-xs font-semibold dark:font-bold">AI thumbnail picker</h3>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              Choose a thumbnail style. In the full app, this would generate
              real options.
            </p>
          </div>
        </div>
      </div>
      <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 flex flex-col gap-1 transition-colors">
        <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">
          We’ve analysed your caption and campaign to suggest a few thumbnail
          directions:
        </p>
        <ul className="space-y-1">
          {AI_THUMBNAILS.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-1">
              <div>
                <span className="text-sm font-medium">{t.label}</span>
                <p className="text-xs text-slate-500 dark:text-slate-300">{t.style}</p>
              </div>
              <button
                className={`px-2 py-0.5 rounded-full border text-xs ${selectedId === t.id
                  ? "bg-[#f77f00] border-[#f77f00] text-white"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  }`}
                onClick={() => onSelect(t.id)}
              >
                {selectedId === t.id ? "Selected" : "Use"}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-300">
        Caption signal:{" "}
        <span className="font-medium">
          {caption.length > 0
            ? caption.length < 80
              ? "Short & punchy – great for overlays"
              : "Longer caption – consider a simpler thumbnail"
            : "No caption yet"}
        </span>
      </p>
    </div>
  );
}

type CommentsPanelProps = {
  comments: Comment[];
  commentDraft: string;
  onCommentDraftChange: (value: string) => void;
  onAddComment: () => void;
};

function CommentsPanel({ comments, commentDraft, onCommentDraftChange, onAddComment }: CommentsPanelProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold dark:font-bold">Comments</h3>
        <span className="text-xs text-slate-500 dark:text-slate-300">
          Seller & Creator discussion
        </span>
      </div>
      <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 max-h-48 overflow-y-auto space-y-1.5 transition-colors">
        {comments.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-300">No comments yet.</p>
        )}
        {comments.map((c: Comment) => (
          <div key={c.id} className="text-xs">
            <span className="font-semibold dark:font-bold">
              {c.from === "creator" ? "You" : c.name}
            </span>
            <span className="text-slate-400 ml-1">· {c.time}</span>
            <p className="text-slate-600 dark:text-slate-200 whitespace-pre-line">{c.body}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-1">
        <textarea
          rows={2}
          className="flex-1 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-400 outline-none resize-none transition-colors"
          placeholder="Add a comment for the brand…"
          value={commentDraft}
          onChange={(e) => onCommentDraftChange(e.target.value)}
        />
        <button
          className="px-2.5 py-1 rounded-full bg-[#f77f00] text-white text-sm font-semibold dark:font-bold hover:bg-[#e26f00]"
          onClick={onAddComment}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export { ContentSubmissionReviewPage };
