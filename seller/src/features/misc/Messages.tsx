import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Bot,
  Briefcase,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  File,
  FileText,
  Filter,
  Globe,
  Image as ImageIcon,
  Inbox,
  Languages,
  Link2,
  MessageCircle,
  Paperclip,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  StickyNote,
  Tag,
  Timer,
  User,
  Video,
  X,
} from "lucide-react";
import { useRolePageContent } from "../../data/pageContent";
import type {
  AttachmentType,
  ChatMessage,
  MessageAttachment,
  MessageTemplate,
  MessageThread,
  ThreadTag,
} from "../../data/pageTypes";
import { sellerBackendApi } from "../../lib/backendApi";
import { useThemeMode } from "../../theme/themeMode";

/**
 * SupplierHub Premium Messages Page
 * Route: /messages
 * Core: inbox, threads, attachments, templates
 * Super premium: auto-translation, SLA timers, convert to quote/booking/proposal
 *
 * Notes:
 * - This file is standalone and runnable.
 * - Hook data + translation + attachments storage to your backend later.
 */

type Role = "seller" | "provider";
type NavigateFn = (to: string) => void;

type Attachment = MessageAttachment & { file?: File };
type Thread = MessageThread;
type Template = MessageTemplate;

type Toast = {
  id: string;
  title: string;
  message?: string;
  tone?: "default" | "success" | "warning" | "danger";
  action?: { label: string; onClick: () => void };
};

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function msToClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const hh = h > 0 ? `${h}h ` : "";
  return `${hh}${m}m ${ss}s`;
}

function bytesToLabel(bytes: number) {
  if (!Number.isFinite(bytes)) return "-";
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function pseudoTranslate(text: string, to: string) {
  // Placeholder translation. Replace with your translation provider.
  return `[${to.toUpperCase()}] ${text}`;
}

function guessAttachmentType(filename: string): AttachmentType {
  const f = filename.toLowerCase();
  if (f.match(/\.(png|jpg|jpeg|webp|gif)$/)) return "image";
  if (f.match(/\.(mp4|mov|webm|m4v|avi)$/)) return "video";
  if (f.endsWith(".pdf")) return "pdf";
  if (f.match(/\.(doc|docx|ppt|pptx|xls|xlsx)$/)) return "doc";
  if (f.startsWith("http")) return "link";
  return "other";
}

function attachmentIcon(type: AttachmentType) {
  if (type === "image") return ImageIcon;
  if (type === "video") return Video;
  if (type === "pdf") return FileText;
  if (type === "doc") return File;
  if (type === "link") return Link2;
  return Paperclip;
}

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "green" | "orange" | "slate" | "danger";
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "orange" && "bg-orange-50 text-orange-700",
        tone === "slate" && "bg-slate-100 text-slate-700 dark:text-slate-200",
        tone === "danger" && "bg-rose-50 text-rose-700"
      )}
    >
      {children}
    </span>
  );
}

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 shadow-[0_12px_40px_rgba(2,16,23,0.06)] backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 transition hover:bg-gray-50 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}

function PillBtn({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active?: boolean;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-800 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ToastCenter({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[90] flex w-[92vw] max-w-[420px] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={cx(
              "rounded-3xl border bg-white dark:bg-slate-900/95 p-4 shadow-[0_24px_80px_rgba(2,16,23,0.18)] backdrop-blur",
              t.tone === "success" && "border-emerald-200",
              t.tone === "warning" && "border-orange-200",
              t.tone === "danger" && "border-rose-200",
              (!t.tone || t.tone === "default") && "border-slate-200/70"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cx(
                  "grid h-10 w-10 place-items-center rounded-2xl",
                  t.tone === "success" && "bg-emerald-50 text-emerald-700",
                  t.tone === "warning" && "bg-orange-50 text-orange-700",
                  t.tone === "danger" && "bg-rose-50 text-rose-700",
                  (!t.tone || t.tone === "default") && "bg-slate-100 text-slate-700 dark:text-slate-200"
                )}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900 dark:text-slate-100">{t.title}</div>
                {t.message ? <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{t.message}</div> : null}
                {t.action ? (
                  <button
                    type="button"
                    onClick={t.action.onClick}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-100"
                  >
                    {t.action.label}
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[85] flex items-center justify-center px-3 lg:pl-[calc(var(--shell-sidebar-width)+12px)] lg:pr-6"
          >
            <div className="flex max-h-[90vh] w-full max-w-[980px] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-[0_30px_120px_rgba(2,16,23,0.22)] backdrop-blur">
              <div className="border-b border-slate-200/70 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">{title}</div>
                    {subtitle ? <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
                  </div>
                  <IconBtn label="Close" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </IconBtn>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[75] h-screen w-[92vw] max-w-[440px] border-l border-slate-200/70 bg-white dark:bg-slate-900/90 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">{title}</div>
                    {subtitle ? <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
                  </div>
                  <IconBtn label="Close" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </IconBtn>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// Page content now comes from backend domain loaders via useRolePageContent.

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700 dark:text-slate-200">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <div className="text-lg font-black text-slate-900 dark:text-slate-100">{title}</div>
          <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{message}</div>
        </div>
      </div>
    </div>
  );
}

function AttachmentRow({ a, onOpen }: { a: Attachment; onOpen: () => void }) {
  const Icon = attachmentIcon(a.type);
  const hasPreview = (a.type === "image" || a.type === "video") && !!a.url;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl bg-black/5 p-2 text-left transition hover:bg-black/10"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/90 text-slate-700 dark:text-slate-200">
          {hasPreview && a.type === "image" ? (
            <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
          ) : hasPreview && a.type === "video" ? (
            <Video className="h-5 w-5" />
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-100">{a.name}</div>
          <div className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{a.sizeLabel}</div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
      </div>
      {a.caption ? <div className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300 line-clamp-2">{a.caption}</div> : null}
    </button>
  );
}

export default function MessagesPage({
  role = "seller",
  onNavigate,
}: {
  role?: Role;
  onNavigate?: NavigateFn;
}) {
  const { role: activeRole, content } = useRolePageContent("messages", role);
  const { resolvedMode } = useThemeMode();
  const isDark = resolvedMode === "dark";
  const navigate: NavigateFn =
    onNavigate ??
    ((to: string) => {
      window.location.hash = to.startsWith("/") ? to : `/${to}`;
    });

  const [threads, setThreads] = useState<Thread[]>(content.threads);
  const [messages, setMessages] = useState<ChatMessage[]>(content.messages);
  const [templates, setTemplates] = useState<Template[]>(content.templates);
  const setThreadsPersist = (updater: ((prev: Thread[]) => Thread[]) | Thread[]) => {
    setThreads((prev) => {
      return typeof updater === "function" ? (updater as (prev: Thread[]) => Thread[])(prev) : updater;
    });
  };
  const setMessagesPersist = (updater: ((prev: ChatMessage[]) => ChatMessage[]) | ChatMessage[]) => {
    setMessages((prev) => {
      return typeof updater === "function" ? (updater as (prev: ChatMessage[]) => ChatMessage[])(prev) : updater;
    });
  };
  const setTemplatesPersist = (updater: ((prev: Template[]) => Template[]) | Template[]) => {
    setTemplates((prev) => {
      return typeof updater === "function" ? (updater as (prev: Template[]) => Template[])(prev) : updater;
    });
  };

  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<ThreadTag | "All">("All");
  const [onlyUnread, setOnlyUnread] = useState(false);

  const [selectedThreadId, setSelectedThreadId] = useState<string>(threads[0]?.id ?? "");
  const selectedThread = useMemo(() => threads.find((t) => t.id === selectedThreadId) ?? null, [threads, selectedThreadId]);

  useEffect(() => {
    setThreads(content.threads);
    setMessages(content.messages);
    setTemplates(content.templates);
    setSelectedThreadId(content.threads[0]?.id ?? "");
    setTagFilter("All");
    setOnlyUnread(false);
  }, [content]);

  const [mobilePane, setMobilePane] = useState<"inbox" | "thread" | "context">("inbox");

  const [translateOn, setTranslateOn] = useState(true);
  const [translateTo, setTranslateTo] = useState("en");

  const [composer, setComposer] = useState("");
  const [composerFiles, setComposerFiles] = useState<Attachment[]>([]);

  const [templateOpen, setTemplateOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState<null | "quote" | "booking" | "proposal">(null);
  const [attachmentOpen, setAttachmentOpen] = useState<Attachment | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4500);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads
      .filter((t) => (tagFilter === "All" ? true : t.tags.includes(tagFilter)))
      .filter((t) => (onlyUnread ? t.unreadCount > 0 : true))
      .filter((t) => {
        if (!q) return true;
        const hay = [t.title, t.lastMessage, t.tags.join(" "), ...t.participants.map((p) => p.name)].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const aS = a.responseSlaDueAt ? new Date(a.responseSlaDueAt).getTime() : Number.POSITIVE_INFINITY;
        const bS = b.responseSlaDueAt ? new Date(b.responseSlaDueAt).getTime() : Number.POSITIVE_INFINITY;
        if (aS !== bS) return aS - bS;
        return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
      });
  }, [threads, query, tagFilter, onlyUnread]);

  const threadMessages = useMemo(() => messages.filter((m) => m.threadId === selectedThreadId), [messages, selectedThreadId]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [selectedThreadId, threadMessages.length]);

  const sla = useMemo(() => {
    if (!selectedThread?.responseSlaDueAt) return null;
    const due = new Date(selectedThread.responseSlaDueAt).getTime();
    const left = due - now;
    const overdue = left < 0;
    const near = left < 1000 * 60 * 10;
    return { due, left, overdue, near };
  }, [selectedThread?.responseSlaDueAt, now]);

  const openThread = (id: string) => {
    setSelectedThreadId(id);
    setThreadsPersist((s) => s.map((t) => (t.id === id ? { ...t, unreadCount: 0 } : t)));
    void sellerBackendApi.markMessageThreadRead(id).catch(() => undefined);
    setMobilePane("thread");
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: Attachment[] = [];
    Array.from(files).forEach((f) => {
      const type = guessAttachmentType(f.name);
      const canPreview = type === "image" || type === "video";
      next.push({
        id: makeId("att"),
        type,
        name: f.name,
        sizeLabel: bytesToLabel(f.size),
        mimeType: f.type || undefined,
        url: canPreview ? URL.createObjectURL(f) : undefined,
        caption: "",
        file: f,
      });
    });
    setComposerFiles((s) => [...s, ...next]);
  };

  const sendMessage = () => {
    if (!selectedThread) return;
    const text = composer.trim();
    if (!text && composerFiles.length === 0) {
      pushToast({ title: "Nothing to send", message: "Type a message or attach a file.", tone: "warning" });
      return;
    }

    const cleanAttachments = composerFiles.map(({ file, ...a }) => a);
    const newMsg: ChatMessage = {
      id: makeId("msg"),
      threadId: selectedThread.id,
      sender: "me",
      lang: "en",
      text,
      at: nowIso(),
      attachments: cleanAttachments.length ? cleanAttachments : undefined,
    };

    setMessagesPersist((s) => [...s, newMsg]);
    setComposer("");
    setComposerFiles([]);

    const attachmentSummary = cleanAttachments.length
      ? cleanAttachments.some((a) => a.type === "image" || a.type === "video")
        ? "Sent media"
        : `Sent ${cleanAttachments.length} attachment${cleanAttachments.length > 1 ? "s" : ""}`
      : "";

    setThreadsPersist((s) =>
      s.map((t) =>
        t.id === selectedThread.id
          ? { ...t, lastMessage: newMsg.text || attachmentSummary, lastAt: newMsg.at, unreadCount: 0 }
          : t
      )
    );
    void sellerBackendApi
      .replyMessageThread(selectedThread.id, {
        text,
        lang: "en",
        attachments: cleanAttachments,
      })
      .then((payload) => {
        if (Array.isArray(payload.messages)) {
          setMessages(payload.messages as ChatMessage[]);
        }
      })
      .catch(() => undefined);

    pushToast({ title: "Sent", message: "Message delivered to thread.", tone: "success" });

    window.setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  };

  const insertTemplate = (tpl: Template) => {
    setComposer((v) => (v ? `${v}\n\n${tpl.body}` : tpl.body));
    pushToast({ title: "Template inserted", message: tpl.title, tone: "default" });
  };

  const exportThread = () => {
    if (!selectedThread) return;
    const payload = {
      thread: selectedThread,
      messages: threadMessages,
      exportedAt: nowIso(),
    };
    downloadText(`thread_${selectedThread.id}.json`, JSON.stringify(payload, null, 2));
    pushToast({ title: "Export ready", message: "Thread exported as JSON.", tone: "success" });
  };

  const contextRoutes = useMemo(() => {
    const asSeller = activeRole === "seller";
    return {
      quote: asSeller ? "/wholesale/quotes" : "/provider/new-quote",
      booking: "/provider/bookings",
      proposal: "/mldz/collab/proposals",
    };
  }, [activeRole]);
  const threadViewportStyle = useMemo<React.CSSProperties>(
    () =>
      isDark
        ? {
            backgroundColor: "#0b1220",
            backgroundImage:
              "radial-gradient(circle at 25% 20%, rgba(148,163,184,0.12) 0 2px, transparent 2px), radial-gradient(circle at 75% 60%, rgba(148,163,184,0.1) 0 2px, transparent 2px)",
            backgroundSize: "28px 28px",
          }
        : {
            backgroundColor: "#e5ddd5",
            backgroundImage:
              "radial-gradient(circle at 25% 20%, rgba(255,255,255,0.28) 0 2px, transparent 2px), radial-gradient(circle at 75% 60%, rgba(255,255,255,0.28) 0 2px, transparent 2px)",
            backgroundSize: "28px 28px",
          },
    [isDark]
  );

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">Messages</div>
          <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">WhatsApp-style chat with media/PDF/document attachments and per-file captions</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTemplateOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            <StickyNote className="h-4 w-4" />
            Templates
          </button>
          <button
            type="button"
            onClick={exportThread}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            <FileText className="h-4 w-4" />
            Export
          </button>
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
            style={{ background: TOKENS.green }}
          >
            <Inbox className="h-4 w-4" />
            Notifications
          </button>
        </div>
      </div>

      {/* Mobile pane switch */}
      <div className="mb-3 flex gap-2 md:hidden">
        <PillBtn active={mobilePane === "inbox"} label="Inbox" icon={Inbox} onClick={() => setMobilePane("inbox")} />
        <PillBtn active={mobilePane === "thread"} label="Thread" icon={MessageCircle} onClick={() => setMobilePane("thread")} />
        <PillBtn active={mobilePane === "context"} label="Context" icon={Briefcase} onClick={() => setMobilePane("context")} />
      </div>

      <div className="grid gap-4 md:grid-cols-12">
        {/* Inbox */}
        <div className={cx("md:col-span-4 xl:col-span-3", mobilePane !== "inbox" && "hidden md:block")}>
          <GlassCard className="overflow-hidden">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-black text-slate-900 dark:text-slate-100">Inbox</div>
                <Badge tone="slate">{filteredThreads.length}</Badge>
              </div>

              <div className="mt-3 space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search threads"
                    className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-slate-300"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setOnlyUnread((v) => !v)}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold",
                      onlyUnread ? "border-orange-200 bg-orange-50 text-orange-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-800 dark:text-slate-100"
                    )}
                  >
                    <Filter className="h-4 w-4" />
                    {onlyUnread ? "Unread" : "All"}
                  </button>

                  <select
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value as ThreadTag | "All")}
                    className="h-9 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 text-xs font-extrabold text-slate-800 dark:text-slate-100"
                  >
                    <option value="All">All tags</option>
                    {content.tagOptions.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Smart filters", message: "Wire smart filters to your backend.", tone: "default" })}
                    className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100"
                  >
                    <Tag className="h-4 w-4" />
                    Filters
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-[68vh] overflow-y-auto p-2">
              <div className="flex flex-col gap-2">
                {filteredThreads.map((t) => {
                  const active = t.id === selectedThreadId;
                  const slaDue = t.responseSlaDueAt ? new Date(t.responseSlaDueAt).getTime() : null;
                  const left = slaDue ? slaDue - now : null;
                  const overdue = typeof left === "number" && left < 0;
                  const near = typeof left === "number" && left < 1000 * 60 * 10;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => openThread(t.id)}
                      className={cx(
                        "rounded-3xl border p-3 text-left transition",
                        active ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200/70 bg-white dark:bg-slate-900/70 hover:bg-gray-50 dark:hover:bg-slate-800"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cx(
                            "grid h-10 w-10 place-items-center rounded-2xl",
                            active ? "bg-white dark:bg-slate-900 text-emerald-700" : "bg-slate-100 text-slate-700 dark:text-slate-200"
                          )}
                        >
                          <MessageCircle className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">{t.title}</div>
                            {t.unreadCount > 0 ? <Badge tone="orange">{t.unreadCount}</Badge> : null}
                            {t.priority === "high" ? <Badge tone="danger">High</Badge> : null}
                          </div>
                          <div className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{t.lastMessage}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {t.tags.slice(0, 2).map((tg) => (
                              <Badge key={tg} tone={tg === "MyLiveDealz" ? "orange" : "slate"}>
                                {tg}
                              </Badge>
                            ))}
                            <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(t.lastAt)}</span>
                          </div>
                          {left !== null ? (
                            <div className="mt-2 flex items-center gap-2">
                              <Timer className={cx("h-4 w-4", overdue ? "text-rose-600" : near ? "text-orange-600" : "text-emerald-700")} />
                              <div
                                className={cx(
                                  "text-[11px] font-extrabold",
                                  overdue ? "text-rose-700" : near ? "text-orange-700" : "text-emerald-700"
                                )}
                              >
                                {overdue ? `Overdue by ${msToClock(Math.abs(left))}` : `Reply in ${msToClock(left)}`}
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </button>
                  );
                })}

                {filteredThreads.length === 0 ? (
                  <EmptyState title="No threads" message="Try clearing filters or searching different keywords." />
                ) : null}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Thread */}
        <div className={cx("md:col-span-8 xl:col-span-6", mobilePane !== "thread" && "hidden md:block")}>
          <GlassCard className="overflow-hidden">
            <div
              className={cx(
                "border-b p-4",
                isDark
                  ? "border-emerald-500/30 bg-gradient-to-r from-emerald-900/65 via-emerald-800/45 to-slate-900/90"
                  : "border-emerald-300/60 bg-gradient-to-r from-emerald-500 to-emerald-600"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={cx("truncate text-sm font-black", isDark ? "text-slate-100" : "text-white")}>
                      {selectedThread?.title ?? "Select a thread"}
                    </div>
                    {selectedThread?.tags?.includes("MyLiveDealz") ? <Badge tone="orange">MyLiveDealz</Badge> : <Badge tone="green">WhatsApp mode</Badge>}
                  </div>
                  <div className={cx("mt-1 truncate text-xs font-semibold", isDark ? "text-emerald-100/90" : "text-emerald-50/90")}>
                    {selectedThread ? selectedThread.participants.map((p) => p.name).join(" • ") : "Pick a conversation from the inbox"}
                  </div>

                  {sla ? (
                    <div
                      className={cx(
                        "mt-3 inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold",
                        isDark ? "border-emerald-300/20 bg-slate-900/85 text-slate-100" : "border-white/30 bg-white/95 text-slate-900 dark:text-slate-100"
                      )}
                    >
                      <Clock className="h-4 w-4 text-emerald-700" />
                      <span className={cx(sla.overdue ? "text-rose-700" : sla.near ? "text-orange-700" : "text-emerald-700")}>
                        {sla.overdue ? `SLA overdue by ${msToClock(Math.abs(sla.left))}` : `SLA reply in ${msToClock(sla.left)}`}
                      </span>
                      <span className="text-slate-400 dark:text-slate-300">Due {fmtTime(new Date(sla.due).toISOString())}</span>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <IconBtn label="Back" onClick={() => setMobilePane("inbox")}>
                    <ArrowLeft className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn
                    label="Toggle translation"
                    onClick={() => {
                      setTranslateOn((v) => !v);
                      pushToast({ title: translateOn ? "Translation off" : "Translation on", tone: "default" });
                    }}
                  >
                    <Languages className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn label="Open context" onClick={() => setMobilePane("context")}>
                    <Briefcase className="h-4 w-4" />
                  </IconBtn>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTranslateTo((v) => (v === "en" ? "fr" : v === "fr" ? "zh" : "en"))}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100"
                >
                  <Globe className="h-4 w-4" />
                  Translate to {translateTo.toUpperCase()}
                  <ChevronDown className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => pushToast({ title: "Pinned", message: "Thread pinned to top.", tone: "success" })}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100"
                >
                  <Star className="h-4 w-4" />
                  Pin
                </button>

                <button
                  type="button"
                  onClick={() => pushToast({ title: "Saved", message: "Thread saved as a view.", tone: "default" })}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100"
                >
                  <BadgeCheck className="h-4 w-4" />
                  Save
                </button>

                <button
                  type="button"
                  onClick={() => setConvertOpen("quote")}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.greenDeep }}
                >
                  <Plus className="h-4 w-4" />
                  Convert
                </button>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="max-h-[56vh] overflow-y-auto px-4 py-4"
              style={threadViewportStyle}
            >
              {selectedThread ? (
                <div className="space-y-2">
                  {threadMessages.map((m) => {
                    const isMe = m.sender === "me";
                    const bubble = isMe
                      ? isDark
                        ? "rounded-br-md border border-emerald-700/40 bg-emerald-900/45"
                        : "rounded-br-md bg-[#d9fdd3]"
                      : isDark
                      ? "rounded-bl-md border border-slate-700 bg-slate-800/90"
                      : "rounded-bl-md bg-white";
                    const align = isMe ? "items-end" : "items-start";
                    const transText = translateOn && m.text.trim() ? pseudoTranslate(m.text, translateTo) : null;

                    return (
                      <div key={m.id} className={cx("flex flex-col", align)}>
                        <div className={cx("max-w-[92%] rounded-2xl px-3 py-2", bubble)}>
                          {m.text.trim() ? (
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{m.text}</div>
                          ) : null}

                          {transText ? (
                            <div
                              className={cx(
                                "mt-2 rounded-xl border px-3 py-2",
                                isDark ? "border-slate-700 bg-slate-900/70" : "border-slate-200/70 bg-gray-50"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Bot className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                                <div className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">Auto-translation</div>
                                <span className="ml-auto"><Badge tone="slate">{translateTo.toUpperCase()}</Badge></span>
                              </div>
                              <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{transText}</div>
                            </div>
                          ) : null}

                          {m.attachments?.length ? (
                            <div className={cx("space-y-2", m.text.trim() ? "mt-2" : "")}>
                              {m.attachments.map((a) => (
                                <AttachmentRow key={a.id} a={a} onOpen={() => setAttachmentOpen(a)} />
                              ))}
                            </div>
                          ) : null}

                          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] font-extrabold text-slate-400 dark:text-slate-300">
                            <span>{new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            {isMe ? <CheckCheck className="h-3.5 w-3.5 text-emerald-600" /> : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="Select a conversation" message="Choose a thread from the inbox to view messages." />
              )}
            </div>

            {/* Composer */}
            <div className={cx("border-t border-slate-200/70 p-4", isDark ? "bg-slate-900/85" : "bg-[#f0f2f5]")}>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100"
                >
                  <Paperclip className="h-4 w-4" />
                  Attach
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100"
                >
                  <StickyNote className="h-4 w-4" />
                  Insert template
                </button>

                <button
                  type="button"
                  onClick={() => pushToast({ title: "SLA assistant", message: "This will suggest the best next reply.", tone: "default" })}
                  className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100"
                >
                  <Sparkles className="h-4 w-4" />
                  Smart reply
                </button>
              </div>

              {composerFiles.length ? (
                <div className="mt-3 grid gap-2">
                  {composerFiles.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3"
                    >
                      <div className="flex items-center gap-2">
                        {a.type === "image" && a.url ? (
                          <img src={a.url} alt={a.name} className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          React.createElement(attachmentIcon(a.type), { className: "h-5 w-5 text-slate-700 dark:text-slate-200" })
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-100">{a.name}</div>
                          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{a.sizeLabel}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setComposerFiles((s) =>
                              s.filter((x) => {
                                const keep = x.id !== a.id;
                                if (!keep && x.url && x.url.startsWith("blob:")) URL.revokeObjectURL(x.url);
                                return keep;
                              })
                            )
                          }
                          className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                          aria-label="Remove"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <textarea
                        value={a.caption ?? ""}
                        onChange={(e) =>
                          setComposerFiles((s) => s.map((x) => (x.id === a.id ? { ...x, caption: e.target.value } : x)))
                        }
                        rows={2}
                        placeholder="Add a caption"
                        className="mt-2 w-full resize-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-slate-300"
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 flex items-end gap-2">
                <textarea
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  placeholder="Type a message"
                  rows={2}
                  className="min-h-[54px] w-full resize-none rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-slate-300"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  className="grid h-12 w-12 place-items-center rounded-3xl text-white shadow-sm"
                  style={{ background: TOKENS.green }}
                  aria-label="Send"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Context */}
        <div className={cx("md:col-span-12 xl:col-span-3", mobilePane !== "context" && "hidden xl:block")}>
          <GlassCard className="overflow-hidden">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900 dark:text-slate-100">Context and actions</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Convert chat into structured work</div>
                </div>
                <IconBtn label="Close" onClick={() => setMobilePane("thread")}> 
                  <X className="h-4 w-4" />
                </IconBtn>
              </div>
            </div>

            <div className="space-y-3 p-4">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Thread signals</div>
                  <span className="ml-auto"><Badge tone={sla?.overdue ? "danger" : sla?.near ? "orange" : "green"}>{sla ? "SLA" : "No SLA"}</Badge></span>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Tags help conversion and reporting.</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(selectedThread?.tags ?? []).map((t) => (
                    <Badge key={t} tone={t === "MyLiveDealz" ? "orange" : "slate"}>{t}</Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Convert</div>
                  <span className="ml-auto"><Badge tone="green">Premium</Badge></span>
                </div>

                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={() => setConvertOpen("quote")}
                    className="flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-left text-sm font-extrabold text-slate-800 dark:text-slate-100 hover:bg-gray-50 dark:bg-slate-950"
                  >
                    <span className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Briefcase className="h-5 w-5" /></span>
                      Convert to Quote
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setConvertOpen("booking")}
                    className="flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-left text-sm font-extrabold text-slate-800 dark:text-slate-100 hover:bg-gray-50 dark:bg-slate-950"
                  >
                    <span className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700 dark:text-slate-200"><Calendar className="h-5 w-5" /></span>
                      Convert to Booking
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setConvertOpen("proposal")}
                    className="flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-left text-sm font-extrabold text-slate-800 dark:text-slate-100 hover:bg-gray-50 dark:bg-slate-950"
                  >
                    <span className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-50 text-orange-700"><Bot className="h-5 w-5" /></span>
                      Convert to Proposal
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-700 dark:text-slate-200" />
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Shortcuts</div>
                </div>
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Saved", message: "Thread saved to favorites.", tone: "success" })}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100"
                  >
                    <Star className="h-4 w-4" />
                    Favorite
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/status-center")}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Trust signals
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadText("message_rules.txt", "Example rules: No direct contacts, keep negotiation in-app, attach evidence for compliance.")}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100"
                  >
                    <FileText className="h-4 w-4" />
                    Download rules
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Templates drawer */}
      <Drawer
        open={templateOpen}
        title="Templates"
        subtitle="Insert premium replies with variables"
        onClose={() => setTemplateOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-slate-700 dark:text-slate-200" />
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Template library</div>
              <span className="ml-auto"><Badge tone="slate">{templates.length}</Badge></span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Use variables like {"{name}"}, {"{time}"}, {"{price}"}.</div>
          </div>

          {templates
            .slice()
            .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned))
            .map((tpl) => (
              <div key={tpl.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700 dark:text-slate-200">
                    <StickyNote className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-black text-slate-900 dark:text-slate-100">{tpl.title}</div>
                      <Badge tone={tpl.category === "Compliance" ? "orange" : "slate"}>{tpl.category}</Badge>
                      {tpl.pinned ? <Badge tone="green">Pinned</Badge> : null}
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{tpl.body}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => insertTemplate(tpl)}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <Plus className="h-4 w-4" />
                    Insert
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTemplatesPersist((s) => {
                        const next = s.map((x) => (x.id === tpl.id ? { ...x, pinned: !x.pinned } : x));
                        void sellerBackendApi.patchMessageTemplates({ templates: next }).catch(() => undefined);
                        return next;
                      });
                      pushToast({ title: tpl.pinned ? "Unpinned" : "Pinned", message: tpl.title, tone: "default" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100"
                  >
                    <Star className="h-4 w-4" />
                    {tpl.pinned ? "Unpin" : "Pin"}
                  </button>
                </div>
              </div>
            ))}
        </div>
      </Drawer>

      {/* Attachment preview */}
      <Modal
        open={!!attachmentOpen}
        title={attachmentOpen ? attachmentOpen.name : "Attachment"}
        subtitle={attachmentOpen ? `${attachmentOpen.type.toUpperCase()} · ${attachmentOpen.sizeLabel}` : undefined}
        onClose={() => setAttachmentOpen(null)}
      >
        {attachmentOpen ? (
          <div className="grid gap-4 md:grid-cols-12">
            <div className="md:col-span-8">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5">
                <div className="text-sm font-black text-slate-900 dark:text-slate-100">Preview</div>
                <div className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Image/video previews are shown when available; documents open as file cards.</div>

                <div className="mt-4 rounded-3xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 p-5">
                  {attachmentOpen.type === "image" && attachmentOpen.url ? (
                    <img src={attachmentOpen.url} alt={attachmentOpen.name} className="max-h-[52vh] w-full rounded-2xl object-contain" />
                  ) : attachmentOpen.type === "video" && attachmentOpen.url ? (
                    <video controls src={attachmentOpen.url} className="max-h-[52vh] w-full rounded-2xl" />
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">
                        {attachmentOpen.type === "pdf" ? (
                          <FileText className="h-6 w-6" />
                        ) : attachmentOpen.type === "doc" ? (
                          <File className="h-6 w-6" />
                        ) : attachmentOpen.type === "link" ? (
                          <Link2 className="h-6 w-6" />
                        ) : (
                          <Paperclip className="h-6 w-6" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{attachmentOpen.name}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Preview not available for this file type in demo mode.</div>
                      </div>
                    </div>
                  )}
                  {attachmentOpen.caption ? (
                    <div className="mt-3 rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Caption: {attachmentOpen.caption}
                    </div>
                  ) : null}
                  <div className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {attachmentOpen.mimeType ? `MIME type: ${attachmentOpen.mimeType}` : "MIME type unavailable"}
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-4">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5">
                <div className="text-sm font-black text-slate-900 dark:text-slate-100">Actions</div>
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      downloadText(attachmentOpen.name + ".txt", `Downloaded placeholder for ${attachmentOpen.name}`);
                      pushToast({ title: "Downloaded", message: "Demo download completed.", tone: "success" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Link copied", message: "Wire clipboard copy in your app.", tone: "default" })}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100"
                  >
                    <Link2 className="h-4 w-4" />
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachmentOpen(null)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100"
                  >
                    <Check className="h-4 w-4" />
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Convert modal */}
      <Modal
        open={!!convertOpen}
        title={convertOpen ? `Convert to ${convertOpen}` : "Convert"}
        subtitle="Turn chat into structured workflows"
        onClose={() => setConvertOpen(null)}
      >
        <ConvertWizard
          mode={convertOpen}
          role={activeRole}
          thread={selectedThread}
          messages={threadMessages}
          onClose={() => setConvertOpen(null)}
          onNavigate={navigate}
          onToast={pushToast}
          routes={contextRoutes}
        />
      </Modal>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function ConvertWizard({
  mode,
  role,
  thread,
  messages,
  onClose,
  onNavigate,
  onToast,
  routes,
}: {
  mode: null | "quote" | "booking" | "proposal";
  role: Role;
  thread: Thread | null;
  messages: ChatMessage[];
  onClose: () => void;
  onNavigate: (to: string) => void;
  onToast: (t: Omit<Toast, "id">) => void;
  routes: { quote: string; booking: string; proposal: string };
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [price, setPrice] = useState("150");
  const [currency, setCurrency] = useState("USD");
  const [date, setDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [terms, setTerms] = useState("Net 7, delivery as agreed.");

  useEffect(() => {
    if (!mode) return;
    const base = thread?.title ?? "Conversation";
    setTitle(
      mode === "quote" ? `Quote from chat: ${base}` : mode === "booking" ? `Booking from chat: ${base}` : `Proposal from chat: ${base}`
    );

    const last = messages
      .slice(-4)
      .map((m) => (m.sender === "me" ? `You: ${m.text}` : `Client: ${m.text}`))
      .join("\n");
    setSummary(last || "Summary will be generated from the conversation.");
  }, [mode, thread?.title]);

  if (!mode) return null;

  const primaryTo = mode === "quote" ? routes.quote : mode === "booking" ? routes.booking : routes.proposal;
  const primaryLabel = mode === "quote" ? "Create Quote" : mode === "booking" ? "Create Booking" : "Create Proposal";

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">Details</div>
            <span className="ml-auto"><Badge tone={mode === "proposal" ? "orange" : "green"}>Premium</Badge></span>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-slate-300"
            />

            <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={5}
              className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-slate-300"
            />

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Price</label>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-slate-300"
                />
              </div>
              <div>
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 dark:text-slate-100"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="CNY">CNY</option>
                  <option value="UGX">UGX</option>
                  <option value="KES">KES</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Target date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <label className="text-xs font-extrabold text-slate-600 dark:text-slate-300">Terms</label>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={3}
              className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-slate-300"
            />
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">Trust and audit</div>
          </div>
          <div className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            The conversion will create an audit entry, link attachments, and keep negotiation history.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="green">Audit</Badge>
            <Badge tone="slate">Attachments linked</Badge>
            <Badge tone={mode === "proposal" ? "orange" : "green"}>{mode === "proposal" ? "MyLiveDealz" : "SupplierHub"}</Badge>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-slate-700 dark:text-slate-200" />
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">Actions</div>
          </div>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => {
                onToast({
                  title: "Created",
                  message: `${primaryLabel} created from chat (demo).`,
                  tone: "success",
                  action: { label: "Open", onClick: () => onNavigate(primaryTo) },
                });
                onClose();
              }}
              className="inline-flex items-center justify-between rounded-3xl px-4 py-3 text-left text-sm font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <span className="flex items-center gap-3">
                <Plus className="h-5 w-5" />
                {primaryLabel}
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                const payload = { mode, role, title, summary, price, currency, date, terms, createdAt: nowIso() };
                downloadText(`convert_${mode}_${Date.now()}.json`, JSON.stringify(payload, null, 2));
                onToast({ title: "Evidence exported", message: "Conversion details downloaded.", tone: "default" });
              }}
              className="inline-flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-left text-sm font-extrabold text-slate-800 dark:text-slate-100"
            >
              <span className="flex items-center gap-3">
                <FileText className="h-5 w-5" />
                Export evidence
              </span>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-left text-sm font-extrabold text-slate-800 dark:text-slate-100"
            >
              <span className="flex items-center gap-3">
                <X className="h-5 w-5" />
                Cancel
              </span>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </button>
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 p-4">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-slate-700 dark:text-slate-200" />
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">SLA impact</div>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Reply speed and quality can improve your ranking and trust score.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
