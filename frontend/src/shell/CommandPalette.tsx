import React from "react";
import { useScrollLock } from "../hooks/useScrollLock";
import type { PageId } from "../layouts/CreatorShellLayout";
import { useWorkspaceAccess } from "../hooks/useWorkspaceAccess";

type CommandPaletteProps = {
  onClose: () => void;
  onChangePage: (page: PageId) => void;
  triggerRect?: DOMRect | null;
};

type CommandItem = {
  id: PageId;
  label: string;
};

// Static command list
const COMMANDS: CommandItem[] = [
  { id: "home", label: "Go to Home / LiveDealz Feed" },
  { id: "shell", label: "Open My Day Dashboard" },
  { id: "onboarding", label: "Creator Onboarding (Dev)" },
  { id: "profile-public", label: "View Public Profile" },
  { id: "opportunities", label: "Open Opportunities Board" },
  { id: "sellers", label: "Open Suppliers Directory" },
  { id: "my-sellers", label: "View My Suppliers" },
  { id: "invites", label: "View Invites from Suppliers" },
  { id: "creator-campaigns", label: "Open Campaigns Board" },
  { id: "proposals", label: "Open Proposals Inbox" },
  { id: "proposal-room", label: "Open Negotiation Room" },
  { id: "contracts", label: "View Contracts" },
  { id: "task-board", label: "Open Task Board" },

  { id: "link-tools", label: "Open Links Hub" },
  { id: "link-tool", label: "Create New Link" },
  { id: "live-schedule", label: "View Live Schedule" },
  { id: "live-studio", label: "Go to Live Studio" },
  { id: "reviews", label: "Open Reviews" },
  { id: "earnings", label: "View Earnings Dashboard" },
  { id: "request-payout", label: "Request Payout" },
  { id: "analytics", label: "View Analytics & Rank" },
  { id: "settings", label: "Open Creator Settings" },
  { id: "subscription", label: "Manage My Subscription" },
  { id: "audit-log", label: "Open Audit Log" },
  { id: "roles", label: "Open Role Switcher" }
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onClose,
  onChangePage,
  triggerRect
}) => {
  const reviewsAccess = useWorkspaceAccess("reviews.view");
  const subscriptionAccess = useWorkspaceAccess("subscription.view");
  const auditAccess = useWorkspaceAccess("admin.audit");
  const [query, setQuery] = React.useState("");

  // Lock background scroll when open
  useScrollLock(true);

  const filteredCommands = React.useMemo(() => {
    const allowedCommands = COMMANDS.filter((cmd) => {
      if (cmd.id === "reviews") return reviewsAccess.allowed;
      if (cmd.id === "subscription") return subscriptionAccess.allowed;
      if (cmd.id === "audit-log") return auditAccess.allowed;
      return true;
    });

    const q = query.trim().toLowerCase();
    if (!q) return allowedCommands;
    return allowedCommands.filter((cmd) => cmd.label.toLowerCase().includes(q));
  }, [auditAccess.allowed, query, reviewsAccess.allowed, subscriptionAccess.allowed]);

  const handleSelect = React.useCallback((id: PageId) => {
    onChangePage(id);
    onClose();
  }, [onChangePage, onClose]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "Enter") {
        // If query exists and we have results, select the first one
        if (filteredCommands.length > 0) {
          e.preventDefault();
          handleSelect(filteredCommands[0].id);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, filteredCommands, handleSelect]); // Dependency on filteredCommands for Enter key

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[60px] px-3 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="fixed w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all ring-1 ring-black/5"
        style={
          triggerRect
            ? {
              top: triggerRect.bottom + 8,
              left: triggerRect.left,
              width: triggerRect.width,
              transform: "none",
              maxWidth: "none"
            }
            : {
              // fallback if no rect
              top: "4rem",
              left: "50%",
              transform: "translateX(-50%)",
              maxWidth: "42rem"
            }
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-100 dark:border-slate-700/50 px-4 py-3 text-sm flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <span className="font-semibold text-slate-700 dark:text-slate-200">Quick actions</span>
          <button
            className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600 text-[10px] font-medium hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors uppercase tracking-wider"
            onClick={onClose}
          >
            Esc
          </button>
        </div>
        <div className="p-2">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <span className="text-slate-400 text-lg">🔍</span>
            </div>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-evz-orange/20 focus:border-evz-orange dark:focus:border-evz-orange bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-medium"
              placeholder="Type to filter commands…"
            />
          </div>
          <div className="mt-2 px-1 pb-1">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5 px-2">Navigation</div>
            <ul className="max-h-[60vh] overflow-y-auto text-sm space-y-0.5 custom-scrollbar">
              {filteredCommands.length === 0 ? (
                <li className="px-3 py-4 text-center text-slate-500 dark:text-slate-400 text-xs italic">
                  No commands found matching "{query}"
                </li>
              ) : (
                filteredCommands.map((cmd) => (
                  <li key={cmd.id}>
                    <button
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2 group"
                      onClick={() => handleSelect(cmd.id)}
                    >
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 text-xs">›</span>
                      {highlightMatch(cmd.label, query)}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper to highlight matching text
function highlightMatch(text: string, query: string) {
  if (!query) return text;
  // Escape regex special chars to prevent crashing
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="text-[#f77f00] font-semibold bg-orange-50 dark:bg-orange-900/30 rounded-[1px]">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}
